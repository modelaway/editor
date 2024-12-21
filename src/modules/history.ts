import EventEmitter from 'events'
import DMP, { Diff, patch_obj } from 'diff-match-patch'
import LZString from 'lz-string'

/**
 * Throttle and debounce combination for efficient 
 * rate limiting and delayed execution
 */
function throttleAndDebounce( fn: Function, throttleLimit: number, debounceWait: number ){
  if( throttleLimit <= 0 ) 
    throw new Error('Throttle limit must be greater than 0')
  
  if( debounceWait <= 0 )
    throw new Error('Debounce wait must be greater than 0')

  let 
  lastRan: number,
  timeout: ReturnType<typeof setTimeout>

  return function( this: unknown, ...args: unknown[] ){
    const now = Date.now()
    clearTimeout( timeout )

    if( !lastRan || now - lastRan >= throttleLimit ){
      fn.apply( this, args )
      lastRan = now
    }
    else
      timeout = setTimeout( () => {
        if( Date.now() - lastRan >= throttleLimit ){
          fn.apply( this, args )
          lastRan = Date.now()
        }
      }, Math.max( debounceWait, throttleLimit - ( now - lastRan ) ) )
  }
}

class HistoryError extends Error {
  constructor( message: string ){
    super( message )
    this.name = 'HistoryError'
  }
}

interface Range {
  start: number
  end: number
}

interface CursorState {
  positions: number[]
  selections: Range[]
}

interface DiffResult {
  diff: string
  patches: (new () => patch_obj)[]
  region?: Range
  baseChecksum?: string
}

interface RecordOptions {
  shouldRecord: boolean
  metadata?: Record<string, unknown>
  cursorState?: CursorState
}

interface HistorySnapshot {
  content: string
  timestamp: number
  checksum: string
  cursorState?: CursorState
}

interface MemoryStats {
  totalSize: number
  stackCount: number
  averageStackSize: number
  compressionRatio: number
}

interface PerformanceMetrics {
  diffCalculationTime: number
  patchApplicationTime: number
  compressionTime: number
  decompressionTime: number
  lastOperationTime: number
  checksumTime: number
}

interface RecoveryPoint {
  checkpoint: Stack
  metadata: Record<string, unknown>
  validation: () => boolean
}

interface SyncOptions {
  syncInterval: number
  conflictResolution: 'local' | 'remote' | 'merge'
  retryAttempts: number
  batchSize: number
}

type Stack = {
  content: string
  diff: DiffResult | null
  timestamp: number
  id: string
  compressed?: boolean
  cursorState?: CursorState
  metadata?: Record<string, unknown>
  checksum?: string
}

interface HistoryOptions {
  maxHistorySize: number
  throttleLimit: number
  debounceWait: number
  allowMultipleInit: boolean
  compressionThreshold: number
  snapshotInterval: number
  maxSnapshotSize: number
  enableNetworkSync: boolean
  enableContentValidation: boolean
  syncOptions?: SyncOptions
}

interface HistoryState {
  stackSize: number
  redoStackSize: number
  canUndo: boolean
  canRedo: boolean
  lastChangeTimestamp: number
  memoryStats: MemoryStats
  performanceMetrics: PerformanceMetrics
}

interface HistoryEventMap {
  'history.init': () => void
  'history.record': ( state: HistoryState ) => void
  'history.undo': ( state: HistoryState, change: { from: string, to: string } ) => void
  'history.redo': ( state: HistoryState, change: { from: string, to: string } ) => void
  'history.error': ( error: Error ) => void
  'history.snapshot': ( snapshot: HistorySnapshot ) => void
  'history.sync': ( syncState: { local: Stack, remote: Stack } ) => void
  'history.validation': ( result: { content: string, isValid: boolean } ) => void
}

export default class History extends EventEmitter {
  private readonly dmp: DMP
  private readonly options: HistoryOptions
  private initialized: boolean = false

  private stacks: Stack[] = []
  private redoStacks: Stack[] = []
  private snapshots: HistorySnapshot[] = []
  private recoveryPoints: Map<string, RecoveryPoint> = new Map()
  
  private performanceMetrics: PerformanceMetrics = {
    diffCalculationTime: 0,
    patchApplicationTime: 0,
    compressionTime: 0,
    decompressionTime: 0,
    lastOperationTime: 0,
    checksumTime: 0
  }

  private syncTimeout?: ReturnType<typeof setTimeout>

  public lateRecord: ( content: string, options?: RecordOptions ) => void

  constructor( options?: Partial<HistoryOptions> ){
    super()

    this.dmp = new DMP()
    this.options = {
      throttleLimit: 300,
      debounceWait: 500,
      maxHistorySize: 500,
      allowMultipleInit: false,
      compressionThreshold: 1000,
      snapshotInterval: 50,
      maxSnapshotSize: 10,
      enableNetworkSync: false,
      enableContentValidation: true,

      // Custom options
      ...options
    }

    // Validate options
    if( this.options.maxHistorySize <= 0 ) 
      throw new HistoryError('maxHistorySize must be greater than 0')
    if( this.options.throttleLimit <= 0 ) 
      throw new HistoryError('throttleLimit must be greater than 0')
    if( this.options.debounceWait <= 0 ) 
      throw new HistoryError('debounceWait must be greater than 0')

    /**
     * Record state efficiently by managing the frequency 
     * and timing of state saving.
     */
    this.lateRecord = throttleAndDebounce( 
      async ( content: string, options?: RecordOptions ) => {
        try { 
          await this.record( content, options ) 
        }
        catch( error ){
          this.emit('history.error', error instanceof Error ? error : new Error( String( error ) ) )
        }
      },
      this.options.throttleLimit,
      this.options.debounceWait
    )

    this.options.enableNetworkSync && this.initializeSync()
  }

  private getMemoryStats(): MemoryStats {
    const totalSize = this.stacks.reduce( ( size, stack ) => {
      return size + ( stack.compressed 
        ? LZString.compress( stack.content ).length 
        : stack.content.length )
    }, 0 )

    return {
      totalSize,
      stackCount: this.stacks.length,
      averageStackSize: totalSize / this.stacks.length,
      compressionRatio: this.stacks.filter( s => s.compressed ).length / this.stacks.length
    }
  }

  private getState(): HistoryState {
    return {
      stackSize: this.stacks.length,
      redoStackSize: this.redoStacks.length,
      canUndo: this.stacks.length > 1,
      canRedo: this.redoStacks.length > 0,
      lastChangeTimestamp: this.stacks[ this.stacks.length - 1 ]?.timestamp || 0,
      memoryStats: this.getMemoryStats(),
      performanceMetrics: { ...this.performanceMetrics }
    }
  }

  /**
   * Enhanced checksum calculation using multiple algorithms
   * for better integrity verification
   */
  private calculateChecksum( content: string ): string {
    if( !this.options.enableContentValidation ) 
      return ''

    const startTime = performance.now()

    try {
      // Convert string to UTF-8 encoded array
      const
      encoder = new TextEncoder(),
      data = encoder.encode( content )
      
      /**
       * CRC32 implementation for basic error detection
       */
      const crc32 = ( data: Uint8Array ): number => {
        let crc = -1
        const poly = 0xEDB88320
        
        for( let i = 0; i < data.length; i++ ){
          crc ^= data[i]
          for( let j = 0; j < 8; j++ )
            crc = ( crc >>> 1 ) ^ ( ( crc & 1 ) ? poly : 0 )
        }

        return ~crc >>> 0
      }

      /**
       * FNV-1a implementation for fast hash generation
       */
      const fnv1a = ( data: Uint8Array ): bigint => {
        const 
        FNV_PRIME = BigInt(16777619),
        FNV_OFFSET_BASIS = BigInt(2166136261)
        
        let hash = FNV_OFFSET_BASIS
        
        for( let i = 0; i < data.length; i++ ){
          hash ^= BigInt( data[i] )
          hash *= FNV_PRIME
        }

        return hash
      }

      /**
       * Modified Adler-32 for streaming content
       */
      const adler32 = ( data: Uint8Array ): number => {
        const MOD_ADLER = 65521
        let a = 1, b = 0
        
        for( let i = 0; i < data.length; i++ ){
          a = ( a + data[i] ) % MOD_ADLER
          b = ( b + a ) % MOD_ADLER
        }
        
        return ( b << 16 ) | a
      }

      // Calculate checksums using different algorithms
      const checksums = {
        crc32: crc32( data ).toString( 16 ).padStart( 8, '0' ),
        fnv1a: fnv1a( data ).toString( 16 ).padStart( 16, '0' ),
        adler32: adler32( data ).toString( 16 ).padStart( 8, '0' ),
        length: data.length.toString( 16 ).padStart( 8, '0' )
      }

      this.performanceMetrics.checksumTime = performance.now() - startTime

      // Combine all checksums with version identifier
      return `2.${checksums.crc32}-${checksums.fnv1a}-${checksums.adler32}-${checksums.length}`
    }
    catch( error ){
      this.performanceMetrics.checksumTime = performance.now() - startTime
      return ''
    }
  }

  /**
   * Validate checksum against content
   */
  private validateChecksum( content: string, checksum?: string ): boolean {
    if( !this.options.enableContentValidation || !checksum ) 
      return true

    try {
      const [ version, ...parts ] = checksum.split('.')
      if( version !== '2' || parts.length !== 1 )
        return false

      const newChecksum = this.calculateChecksum( content )
      const isValid = checksum === newChecksum

      this.emit('history.validation', { content, isValid })

      return isValid
    }
    catch( error ){ 
      return false 
    }
  }

  /**
   * Compare two checksums for equivalence
   */
  private compareChecksums( checksum1?: string, checksum2?: string ): boolean {
    if( !this.options.enableContentValidation || !checksum1 || !checksum2 )
      return true

    return checksum1 === checksum2
  }

  private async compressStack( stack: Stack ): Promise<void> {
    if( stack.compressed
        || stack.content.length < this.options.compressionThreshold )
      return

    const startTime = performance.now()
    
    try {
      const compressed = LZString.compress( stack.content )
      stack.content = compressed
      stack.compressed = true
      
      this.performanceMetrics.compressionTime = performance.now() - startTime
    }
    catch( error ){
      throw new HistoryError(`Compression failed: ${error instanceof Error ? error.message : String( error )}`)
    }
  }

  private async decompressStack( stack: Stack ): Promise<string> {
    if( !stack.compressed )
      return stack.content

    const startTime = performance.now()
    
    try {
      const decompressed = LZString.decompress( stack.content )
      this.performanceMetrics.decompressionTime = performance.now() - startTime
      
      return decompressed || stack.content
    }
    catch( error ){
      throw new HistoryError(`Decompression failed: ${error instanceof Error ? error.message : String( error )}`)
    }
  }

  private createSnapshot(): HistorySnapshot {
    const lastState = this.stacks[ this.stacks.length - 1 ]
    if( !lastState )
      throw new HistoryError('No state available for snapshot')

    const snapshot: HistorySnapshot = {
      content: lastState.content,
      timestamp: Date.now(),
      checksum: this.calculateChecksum( lastState.content ),
      cursorState: lastState.cursorState
    }

    // Validate snapshot content integrity if enabled
    if( this.options.enableContentValidation 
        && !this.validateChecksum( lastState.content, snapshot.checksum ) )
      throw new HistoryError('Snapshot content integrity check failed')

    this.snapshots.push( snapshot )
    this.snapshots.length > this.options.maxSnapshotSize && this.snapshots.shift()

    this.emit('history.snapshot', snapshot )

    return snapshot
  }

  private initializeSync(): void {
    if( !this.options.syncOptions )
      return

    const sync = async () => {
      // Implement your network sync logic here
      this.emit('history.sync', {
        local: this.stacks[ this.stacks.length - 1 ],
        remote: {} as Stack // Replace with actual remote state
      })

      this.syncTimeout = setTimeout( sync, this.options.syncOptions?.syncInterval || 5000 )
    }

    sync()
  }

  /**
   * Initial content as initial history state
   */
  initialize( content: string ){
    if( this.initialized && !this.options.allowMultipleInit )
      throw new HistoryError('History already initialized')

    const checksum = this.calculateChecksum( content )
    
    // Validate initial content if enabled
    if( this.options.enableContentValidation && !this.validateChecksum( content, checksum ) )
      throw new HistoryError('Initial content integrity check failed')

    this.stacks = [{
      content,
      diff: null,
      timestamp: Date.now(),
      id: crypto.randomUUID(),
      checksum
    }]
    
    this.redoStacks = []
    this.initialized = true
    
    this.createSnapshot()
    this.emit('history.init')
  }

  can( action: 'undo' | 'redo' ){
    return action === 'undo' 
                    ? this.stacks.length > 1 
                    : this.redoStacks.length > 0
  }

  /**
   * Calculate the diff between two states asynchronously
   */
  private async calculateDiff( oldContent: string, newContent: string, region?: Range ): Promise<DiffResult> {
    const startTime = performance.now()
    
    try {
      let diffContent = newContent
      if( region )
        // Only diff the changed region
        diffContent = oldContent.slice( 0, region.start )
                      + newContent.slice( region.start, region.end )
                      + oldContent.slice( region.end )

      const diff = await new Promise<Diff[]>( resolve => {
        setTimeout( () => {
          const diff = this.dmp.diff_main( oldContent, diffContent )
          this.dmp.diff_cleanupSemantic( diff )
          resolve( diff )
        }, 0 )
      })

      const patches = this.dmp.patch_make( oldContent, diff )
      const result = {
        diff: this.dmp.diff_toDelta( diff ),
        patches,
        region,
        baseChecksum: this.calculateChecksum( oldContent )
      }

      this.performanceMetrics.diffCalculationTime = performance.now() - startTime

      return result
    }
    catch( error ){
      throw new HistoryError(`Failed to calculate diff: ${error instanceof Error ? error.message : String( error )}`)
    }
  }

  /**
   * Apply the diff to get the new content
   */
  private applyDiff( content: string, diffResult: DiffResult ){
    const startTime = performance.now()
    
    try {
      // First validate the base content hasn't been modified
      if( this.options.enableContentValidation 
          && diffResult.baseChecksum 
          && !this.validateChecksum( content, diffResult.baseChecksum ) )
        throw new HistoryError('Base content has been modified, cannot apply diff')

      const [ newContent, results ] = this.dmp.patch_apply( diffResult.patches, content )
      if( !results.every( Boolean ) )
        throw new HistoryError('Failed to apply some patches')

      this.performanceMetrics.patchApplicationTime = performance.now() - startTime

      return newContent
    }
    catch( error ){
      throw new HistoryError(`Failed to apply diff: ${error instanceof Error ? error.message : String( error )}`)
    }
  }

  /**
   * Record the current state with delta encoding
   */
  async record( content: string, options: RecordOptions = { shouldRecord: true } ){
    const startTime = performance.now()

    if( !this.initialized ){
      this.initialize( content )
      return
    }

    if( !options.shouldRecord ) return

    const lastState = this.stacks[ this.stacks.length - 1 ]
    if( !lastState )
      throw new HistoryError('No previous state found')

    const lastContent = await this.decompressStack( lastState )
    // Don't record if content hasn't changed
    if( lastContent === content ) return

    try {
      const diff = await this.calculateDiff( lastContent, content )
      const checksum = this.calculateChecksum( content )

      // Memory management: remove oldest entry if needed
      this.options.maxHistorySize 
      && this.stacks.length >= this.options.maxHistorySize
      && this.stacks.shift()

      const newStack: Stack = {
        content,
        diff,
        timestamp: Date.now(),
        id: crypto.randomUUID(),
        cursorState: options.cursorState,
        metadata: options.metadata,
        checksum
      }

      // Validate content integrity before storing
      if( this.options.enableContentValidation 
          && !this.validateChecksum( content, checksum ) )
        throw new HistoryError('Content integrity check failed')

      // Compress if content exceeds threshold
      await this.compressStack( newStack )

      this.stacks.push( newStack )
      
      /**
       * Clear the redo stack whenever a new change is made
       */
      this.redoStacks = []

      // Create snapshot if needed
      this.stacks.length % this.options.snapshotInterval === 0 && this.createSnapshot()

      this.performanceMetrics.lastOperationTime = performance.now() - startTime
      this.emit('history.record', this.getState() )
    }
    catch( error ){
      throw new HistoryError(`Failed to record state: ${error instanceof Error ? error.message : String( error )}`)
    }
  }

  /**
   * Record multiple changes at once
   */
  async batchRecord( contents: string[], options: RecordOptions = { shouldRecord: true } ){
    const startTime = performance.now()

    if( !options.shouldRecord ) return

    try {
      for( const content of contents )
        await this.record( content, { 
          ...options, 
          shouldRecord: true 
        })

      this.performanceMetrics.lastOperationTime = performance.now() - startTime
    }
    catch( error ){
      throw new HistoryError(`Batch record failed: ${error instanceof Error ? error.message : String( error )}`)
    }
  }

  /**
   * Create a recovery point
   */
  createRecoveryPoint( id: string, metadata: Record<string, unknown> = {} ){
    const lastState = this.stacks[ this.stacks.length - 1 ]
    if( !lastState )
      throw new HistoryError('No state available for recovery point')

    const recoveryPoint: RecoveryPoint = {
      checkpoint: { ...lastState },
      metadata,
      validation: () => {
        const currentState = this.stacks[ this.stacks.length - 1 ]
        return currentState && this.compareChecksums( currentState.checksum, lastState.checksum )
      }
    }

    this.recoveryPoints.set( id, recoveryPoint )

    return id
  }

  /**
   * Restore to a recovery point
   */
  async restoreRecoveryPoint( id: string ){
    const recoveryPoint = this.recoveryPoints.get( id )
    if( !recoveryPoint )
      throw new HistoryError('Recovery point not found')

    const content = await this.decompressStack( recoveryPoint.checkpoint )
    
    // Validate recovery point content integrity
    if( this.options.enableContentValidation 
        && !this.validateChecksum( content, recoveryPoint.checkpoint.checksum ) )
      throw new HistoryError('Recovery point content integrity check failed')

    await this.record( content, { 
      shouldRecord: true,
      metadata: {
        recoveryPointId: id,
        ...recoveryPoint.metadata
      }
    })
  }

  /**
   * Undo
   */
  async undo( options: RecordOptions = { shouldRecord: true } ){
    if( this.stacks.length <= 1 )
      throw new HistoryError('Nothing to undo')

    const currentState = this.stacks.pop()
    if( !currentState )
      throw new HistoryError('Failed to retrieve current state')

    const currentContent = await this.decompressStack( currentState )

    // Validate current state before pushing to redo stack
    if( this.options.enableContentValidation 
        && !this.validateChecksum( currentContent, currentState.checksum ) )
      throw new HistoryError('Current state integrity check failed')

    this.redoStacks.push( currentState )

    const previousState = this.stacks[ this.stacks.length - 1 ]
    if( !previousState )
      throw new HistoryError('Failed to retrieve previous state')

    const previousContent = await this.decompressStack( previousState )

    // Validate previous state before returning
    if( this.options.enableContentValidation 
        && !this.validateChecksum( previousContent, previousState.checksum ) )
      throw new HistoryError('Previous state integrity check failed')

    this.emit('history.undo', this.getState(), {
      from: currentContent,
      to: previousContent
    })

    return previousContent
  }

  /**
   * Redo
   */
  async redo( options: RecordOptions = { shouldRecord: true } ){
    if( this.redoStacks.length < 1 )
      throw new HistoryError('Nothing to redo')

    const nextState = this.redoStacks.pop()
    if( !nextState )
      throw new HistoryError('Failed to retrieve next state')

    if( !nextState.diff )
      throw new HistoryError('Invalid redo state: missing diff')

    const previousState = this.stacks[ this.stacks.length - 1 ]
    if( !previousState )
      throw new HistoryError('Failed to retrieve previous state')

    const previousContent = await this.decompressStack( previousState )
    
    // Validate base content before applying redo
    if( this.options.enableContentValidation ){
      if( nextState.diff.baseChecksum 
          && !this.validateChecksum( previousContent, nextState.diff.baseChecksum ) )
        throw new HistoryError('Base content changed, cannot redo')
    }

    const content = this.applyDiff( previousContent, nextState.diff )
    
    // Validate resulting content after redo
    if( this.options.enableContentValidation 
        && nextState.checksum 
        && !this.validateChecksum( content, nextState.checksum ) )
      throw new HistoryError('Redo result integrity check failed')

    this.stacks.push( nextState )

    this.emit('history.redo', this.getState(), {
      from: previousContent,
      to: content
    })

    return content
  }

  /**
   * Get current history statistics
   */
  getStats(){
    return this.getState()
  }

  /**
   * Clear all history
   */
  clear(){
    const lastState = this.stacks[ this.stacks.length - 1 ]
    if( lastState ){
      this.stacks = [ lastState ]
      this.redoStacks = []
      this.snapshots = []
      this.recoveryPoints.clear()
      this.emit('history.record', this.getState() )
    }
  }

  /**
   * Clean up resources
   */
  destroy(){
    this.syncTimeout && clearTimeout( this.syncTimeout )
    
    this.removeAllListeners()
    this.clear()
  }
}