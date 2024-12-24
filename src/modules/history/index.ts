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

  return async function( this: unknown, ...args: unknown[] ){
    const now = Date.now()
    clearTimeout( timeout )

    if( !lastRan || now - lastRan >= throttleLimit ){
      await fn.apply( this, args )
      lastRan = now
    }
    else
      timeout = setTimeout( async () => {
        if( Date.now() - lastRan >= throttleLimit ){
          await fn.apply( this, args )
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

interface HistoryEntry {
  entity: {
    type: string
    key?: string
  }
  event: string
  action?: string
  content?: string
  metadata?: Record<string, unknown>
}

interface EntityStack {
  entityType: string
  entityKey?: string
  stacks: Stack[]
  redoStacks: Stack[]
  lastContent?: string
}

interface HistorySnapshot {
  content: string
  timestamp: number
  checksum: string
  cursorState?: CursorState
  entity: {
    type: string
    key?: string
  }
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

interface Stack {
  content?: string
  event: string
  action?: string
  entity: {
    type: string
    key?: string
  }
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
  
  'history.record': ( 
    state: HistoryState,
    metadata: {
      entity: {
        type: string
        key?: string
      }
      event: string
      action?: string
    }
  ) => void
  
  'history.undo': ( 
    state: HistoryState, 
    change: { 
      from: Stack
      to: Stack
      entityId: string
    }
  ) => void
  
  'history.redo': ( 
    state: HistoryState, 
    change: { 
      from: Stack
      to: Stack
      entityId: string
    }
  ) => void
  
  'history.error': ( 
    error: Error,
    context?: {
      operation: 'push' | 'undo' | 'redo' | 'snapshot' | 'sync' | 'validation'
      entityId?: string
      metadata?: Record<string, unknown>
    }
  ) => void
  
  'history.snapshot': ( 
    snapshot: HistorySnapshot & {
      entityStats: {
        entityId: string
        stackSize: number
        redoStackSize: number
      }[]
    }
  ) => void
  
  'history.sync': ( 
    syncState: { 
      local: Stack
      remote: Stack
      entityId: string
      syncTime: number
      conflicts?: Array<{
        entityId: string
        localTimestamp: number
        remoteTimestamp: number
      }>
    }
  ) => void
  
  'history.validation': ( 
    result: {
      content: string
      isValid: boolean
      entityId?: string
      checksumType: string
      validationTime: number
    }
  ) => void

  'history.entity.created': (
    entityInfo: {
      entityId: string
      type: string
      key?: string
      timestamp: number
    }
  ) => void

  'history.entity.cleared': (
    entityInfo: {
      entityId: string
      type: string
      key?: string
      stacksRemoved: number
    }
  ) => void

  'history.entity.threshold': (
    info: {
      entityId: string
      type: string
      key?: string
      currentSize: number
      maxSize: number
    }
  ) => void
}

export default class History extends EventEmitter {
  private readonly dmp: DMP
  private readonly options: HistoryOptions
  private initialized: boolean = false

  private entityStacks: Map<string, EntityStack> = new Map()
  private linearHistory: string[] = []
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

  // public lateRecord: ( entry: HistoryEntry, options?: RecordOptions ) => void

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
      ...options
    }

    if( this.options.maxHistorySize <= 0 ) 
      throw new HistoryError('maxHistorySize must be greater than 0')
    if( this.options.throttleLimit <= 0 ) 
      throw new HistoryError('throttleLimit must be greater than 0')
    if( this.options.debounceWait <= 0 ) 
      throw new HistoryError('debounceWait must be greater than 0')

    // this.lateRecord = throttleAndDebounce(
    //   async ( entry: HistoryEntry, options?: RecordOptions ) => {
    //     try { await this.push( entry, options ) }
    //     catch( error ){
    //       this.emit('history.error', error instanceof Error ? error : new Error( String( error ) ) )
    //     }
    //   },
    //   this.options.throttleLimit,
    //   this.options.debounceWait
    // )

    this.push = throttleAndDebounce( this.push, this.options.throttleLimit, this.options.debounceWait )

    this.options.enableNetworkSync && this.initializeSync()
  }

  private getEntityId( entity: { type: string, key?: string } ): string {
    return `${entity.type}${entity.key ? `:${entity.key}` : ''}`
  }

  private getMemoryStats(): MemoryStats {
    let 
    totalSize = 0,
    stackCount = 0,
    compressedCount = 0

    for( const entityStack of this.entityStacks.values() ){
      stackCount += entityStack.stacks.length
      
      for( const stack of entityStack.stacks ){
        if( stack.content ){
          totalSize += stack.compressed 
            ? LZString.compress( stack.content ).length 
            : stack.content.length
        }
        
        stack.compressed && compressedCount++
      }
    }

    return {
      totalSize,
      stackCount,
      averageStackSize: stackCount > 0 ? totalSize / stackCount : 0,
      compressionRatio: stackCount > 0 ? compressedCount / stackCount : 0
    }
  }

  private getStackFromLinearHistory( key: string ): Stack | null {
    if( !key || !key.includes(':') )
      throw new HistoryError('Invalid history key format')

    const [ entityId, timestamp ] = key.split(':')
    if( !entityId || !timestamp )
      throw new HistoryError('Invalid history key components')

    const entityStack = this.entityStacks.get( entityId )
    if( !entityStack ) return null
    
    if( !entityStack.stacks.length )
      throw new HistoryError(`Entity stack exists but is empty: ${entityId}`)
    
    return entityStack.stacks.find( s => s.timestamp.toString() === timestamp ) || null
  }

  private getState(): HistoryState {
    const lastEntry = this.linearHistory.length > 0 
      ? this.getStackFromLinearHistory( this.linearHistory[ this.linearHistory.length - 1 ] )
      : null

    return {
      stackSize: this.linearHistory.length,
      redoStackSize: Array.from( this.entityStacks.values() ).reduce( ( total, stack ) => total + stack.redoStacks.length, 0 ),
      canUndo: this.linearHistory.length > 1,
      canRedo: Array.from( this.entityStacks.values() ).some( stack => stack.redoStacks.length > 0 ),
      lastChangeTimestamp: lastEntry?.timestamp || 0,
      memoryStats: this.getMemoryStats(),
      performanceMetrics: { ...this.performanceMetrics }
    }
  }

  private calculateChecksum( content: string ): string {
    if( !this.options.enableContentValidation ) 
      return ''

    const startTime = performance.now()

    try {
      const encoder = new TextEncoder()
      const data = encoder.encode( content )
      
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

      const adler32 = ( data: Uint8Array ): number => {
        const MOD_ADLER = 65521
        let a = 1, b = 0
        
        for( let i = 0; i < data.length; i++ ){
          a = ( a + data[i] ) % MOD_ADLER
          b = ( b + a ) % MOD_ADLER
        }
        
        return ( b << 16 ) | a
      }

      const checksums = {
        crc32: crc32( data ).toString( 16 ).padStart( 8, '0' ),
        fnv1a: fnv1a( data ).toString( 16 ).padStart( 16, '0' ),
        adler32: adler32( data ).toString( 16 ).padStart( 8, '0' ),
        length: data.length.toString( 16 ).padStart( 8, '0' )
      }

      this.performanceMetrics.checksumTime = performance.now() - startTime

      return `2.${checksums.crc32}-${checksums.fnv1a}-${checksums.adler32}-${checksums.length}`
    }
    catch( error ){
      this.performanceMetrics.checksumTime = performance.now() - startTime
      return ''
    }
  }

  private validateChecksum( content: string, checksum?: string ): boolean {
    if( !this.options.enableContentValidation || !checksum ) 
      return true

    try {
      const [ version, ...parts ] = checksum.split('.')
      if( version !== '2' || parts.length !== 1 )
        return false

      const newChecksum = this.calculateChecksum( content )

      return checksum === newChecksum
    }
    catch( error ){ 
      return false 
    }
  }

  private compareChecksums( checksum1?: string, checksum2?: string ): boolean {
    if( !this.options.enableContentValidation || !checksum1 || !checksum2 )
      return true

    return checksum1 === checksum2
  }

  private async compressStack( stack: Stack ): Promise<void> {
    if( !stack.content || stack.compressed || 
        stack.content.length < this.options.compressionThreshold )
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

  private async decompressStack( stack: Stack ): Promise<string | undefined> {
    if( !stack.content || !stack.compressed )
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
    const lastKey = this.linearHistory[ this.linearHistory.length - 1 ]
    if( !lastKey ) 
      throw new HistoryError('No state available for snapshot')

    const lastState = this.getStackFromLinearHistory( lastKey )
    if( !lastState || !lastState.content ) 
      throw new HistoryError('Invalid state for snapshot')

    const snapshot: HistorySnapshot = {
      content: lastState.content,
      timestamp: Date.now(),
      checksum: this.calculateChecksum( lastState.content ),
      cursorState: lastState.cursorState,
      entity: lastState.entity
    }

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
      const lastStack = this.getStackFromLinearHistory( this.linearHistory[ this.linearHistory.length - 1 ] )
      this.emit('history.sync', {
        local: lastStack,
        remote: {} as Stack,
        entityId: lastStack ? this.getEntityId( lastStack.entity ) : '',
        syncTime: Date.now(),
        conflicts: []
      })

      this.syncTimeout = setTimeout( sync, this.options.syncOptions?.syncInterval || 5000 )
    }

    sync()
  }

  initialize( entry: HistoryEntry ){
    if( this.initialized && !this.options.allowMultipleInit )
      throw new HistoryError('History already initialized')

    const checksum = entry.content 
      ? this.calculateChecksum( entry.content )
      : undefined
    
    if( entry.content 
        && this.options.enableContentValidation 
        && !this.validateChecksum( entry.content, checksum ) )
      throw new HistoryError('Initial content integrity check failed')

    const entityId = this.getEntityId( entry.entity )
    const stack: Stack = {
      content: entry.content,
      event: entry.event,
      action: entry.action,
      entity: entry.entity,
      diff: null,
      timestamp: Date.now(),
      id: crypto.randomUUID(),
      checksum,
      metadata: entry.metadata
    }

    this.entityStacks.set( entityId, {
      entityType: entry.entity.type,
      entityKey: entry.entity.key,
      stacks: [ stack ],
      redoStacks: [],
      lastContent: entry.content
    })

    this.linearHistory = [ `${entityId}:${stack.timestamp}` ]
    this.initialized = true
    
    entry.content && this.createSnapshot()
    
    this.emit('history.init')
  }

  can( action: 'undo' | 'redo' ){
    return action === 'undo' 
      ? this.linearHistory.length > 1 
      : Array.from( this.entityStacks.values() )
          .some( stack => stack.redoStacks.length > 0 )
  }

  private async calculateDiff( oldContent: string, newContent: string, region?: Range ): Promise<DiffResult> {
    const startTime = performance.now()
    
    try {
      let diffContent = newContent
      if( region )
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

  private applyDiff( content: string, diffResult: DiffResult ){
    const startTime = performance.now()
    
    try {
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

  async push( entry: HistoryEntry, options: RecordOptions = { shouldRecord: true } ){
    const startTime = performance.now()

    if( !this.initialized ){
      this.initialize( entry )
      return
    }

    if( !options.shouldRecord ) return

    const entityId = this.getEntityId( entry.entity )
    let entityStack = this.entityStacks.get( entityId )
    
    if( !entityStack ){
      entityStack = {
        entityType: entry.entity.type,
        entityKey: entry.entity.key,
        stacks: [],
        redoStacks: [],
        lastContent: undefined
      }
      this.entityStacks.set( entityId, entityStack )
      
      this.emit('history.entity.created', {
        entityId,
        type: entry.entity.type,
        key: entry.entity.key,
        timestamp: Date.now()
      })
    }

    // Check if entity is approaching size limit
    if( entityStack.stacks.length >= this.options.maxHistorySize * 0.8 ){
      this.emit('history.entity.threshold', {
        entityId,
        type: entry.entity.type,
        key: entry.entity.key,
        currentSize: entityStack.stacks.length,
        maxSize: this.options.maxHistorySize
      })
    }

    try {
      // Validate entity information
      if( !entry.entity || !entry.entity.type )
        throw new HistoryError('Invalid entity information in push entry')
        
      let diff: DiffResult | null = null

      // Validate content changes against existing entity state
      if( entry.content && entityStack.lastContent ){
        if( typeof entry.content !== 'string' )
          throw new HistoryError('Invalid content type in push entry')
          
        diff = await this.calculateDiff( entityStack.lastContent, entry.content )
      }

      const checksum = entry.content 
        ? this.calculateChecksum( entry.content )
        : undefined

      if( entry.content 
          && this.options.enableContentValidation 
          && !this.validateChecksum( entry.content, checksum ) )
        throw new HistoryError('Content integrity check failed')

      this.options.maxHistorySize 
        && entityStack.stacks.length >= this.options.maxHistorySize
        && entityStack.stacks.shift()

      const newStack: Stack = {
        content: entry.content,
        event: entry.event,
        action: entry.action,
        entity: entry.entity,
        diff,
        timestamp: Date.now(),
        id: crypto.randomUUID(),
        cursorState: options.cursorState,
        metadata: { ...entry.metadata, ...options.metadata },
        checksum
      }

      entry.content && await this.compressStack( newStack )

      entityStack.stacks.push( newStack )
      entityStack.lastContent = entry.content
      entityStack.redoStacks = []

      this.linearHistory.push( `${entityId}:${newStack.timestamp}` )

      this.linearHistory.length % this.options.snapshotInterval === 0 
      && entry.content 
      && this.createSnapshot()

      this.performanceMetrics.lastOperationTime = performance.now() - startTime
      this.emit('history.record', 
        this.getState(),
        {
          entity: entry.entity,
          event: entry.event,
          action: entry.action
        }
      )
    }
    catch( error ){
      throw new HistoryError(`Failed to record state: ${error instanceof Error ? error.message : String( error )}`)
    }
  }

  async batchPush( entries: HistoryEntry[], options: RecordOptions = { shouldRecord: true } ){
    const startTime = performance.now()

    if( !options.shouldRecord ) return

    try {
      for( const entry of entries )
        await this.push( entry, { ...options, shouldRecord: true })

      this.performanceMetrics.lastOperationTime = performance.now() - startTime
    }
    catch( error ){
      throw new HistoryError(`Batch record failed: ${error instanceof Error ? error.message : String( error )}`)
    }
  }

  createRecoveryPoint( id: string, metadata: Record<string, unknown> = {} ){
    if( !id || typeof id !== 'string' )
      throw new HistoryError('Invalid recovery point ID')
      
    if( this.recoveryPoints.has( id ) )
      throw new HistoryError('Recovery point ID already exists')
      
    const lastKey = this.linearHistory[ this.linearHistory.length - 1 ]
    if( !lastKey )
      throw new HistoryError('No entity state available for recovery point')

    const lastState = this.getStackFromLinearHistory( lastKey )
    if( !lastState )
      throw new HistoryError('Failed to retrieve last state')

    const recoveryPoint: RecoveryPoint = {
      checkpoint: { ...lastState },
      metadata,
      validation: () => {
        const currentState = this.getStackFromLinearHistory( this.linearHistory[ this.linearHistory.length - 1 ] )
        return currentState ? this.compareChecksums( currentState.checksum, lastState.checksum ) : false
      }
    }

    this.recoveryPoints.set( id, recoveryPoint )

    return id
  }

  async restoreRecoveryPoint( id: string ){
    if( !id || typeof id !== 'string' )
      throw new HistoryError('Invalid recovery point ID')

    const recoveryPoint = this.recoveryPoints.get( id )
    if( !recoveryPoint )
      throw new HistoryError('Recovery point not found')
      
    if( !recoveryPoint.checkpoint || !recoveryPoint.checkpoint.entity )
      throw new HistoryError('Invalid recovery point data structure')

    const content = await this.decompressStack( recoveryPoint.checkpoint )
    
    if( content 
        && this.options.enableContentValidation 
        && !this.validateChecksum( content, recoveryPoint.checkpoint.checksum ) )
      throw new HistoryError('Recovery point content integrity check failed')

    await this.push({
      entity: recoveryPoint.checkpoint.entity,
      event: 'recovery',
      action: 'restore',
      content,
      metadata: {
        recoveryPointId: id,
        ...recoveryPoint.metadata
      }
    })
  }

  async undo(){
    if( this.linearHistory.length <= 1 )
      throw new HistoryError('Nothing to undo')

    const currentKey = this.linearHistory.pop()
    if( !currentKey )
      throw new HistoryError('Failed to retrieve current entity state')

    const [ entityId, timestamp ] = currentKey.split(':')
    const entityStack = this.entityStacks.get( entityId )
    if( !entityStack )
      throw new HistoryError('Entity stack not found')

    const currentState = entityStack.stacks.pop()
    if( !currentState )
      throw new HistoryError('Failed to get current state from entity stack')

    const currentContent = await this.decompressStack( currentState )

    if( currentContent 
        && this.options.enableContentValidation 
        && !this.validateChecksum( currentContent, currentState.checksum ) )
      throw new HistoryError('Current state integrity check failed')

    entityStack.redoStacks.push( currentState )

    const previousState = entityStack.stacks[ entityStack.stacks.length - 1 ]
    if( !previousState )
      throw new HistoryError('Failed to retrieve previous entity state')

    const previousContent = await this.decompressStack( previousState )

    if( previousContent 
        && this.options.enableContentValidation 
        && !this.validateChecksum( previousContent, previousState.checksum ) )
      throw new HistoryError('Previous state integrity check failed')

    entityStack.lastContent = previousContent

    this.emit('history.undo', this.getState(), {
      from: currentState,
      to: previousState,
      entityId: this.getEntityId( currentState.entity )
    })

    return previousState
  }

  async redo(){
    if( this.linearHistory.length < 1 )
      throw new HistoryError('No base state to redo from')

    const lastKey = this.linearHistory[ this.linearHistory.length - 1 ]
    const [ entityId ] = lastKey.split(':')
    const entityStack = this.entityStacks.get( entityId )
    
    if( !entityStack || entityStack.redoStacks.length < 1 )
      throw new HistoryError('Nothing to redo')

    const nextState = entityStack.redoStacks.pop()
    if( !nextState )
      throw new HistoryError('Failed to retrieve next state')

    const previousState = entityStack.stacks[ entityStack.stacks.length - 1 ]
    if( !previousState )
      throw new HistoryError('Failed to retrieve previous state')

    if( nextState.content ){
      const previousContent = await this.decompressStack( previousState )
      if( !previousContent )
        throw new HistoryError('Failed to get previous content')

      if( this.options.enableContentValidation 
          && nextState.diff?.baseChecksum 
          && !this.validateChecksum( previousContent, nextState.diff.baseChecksum ) )
        throw new HistoryError('Base content changed, cannot redo')

      const content = nextState.diff 
        ? this.applyDiff( previousContent, nextState.diff )
        : nextState.content

      if( this.options.enableContentValidation 
          && nextState.checksum 
          && !this.validateChecksum( content, nextState.checksum ) )
        throw new HistoryError('Redo result integrity check failed')

      entityStack.lastContent = content
    }

    entityStack.stacks.push( nextState )
    this.linearHistory.push( `${entityId}:${nextState.timestamp}` )

    this.emit('history.redo', this.getState(), {
      from: previousState,
      to: nextState,
      entityId: this.getEntityId( nextState.entity )
    })

    return nextState
  }

  getStats(){
    return this.getState()
  }

  clear(){
    const lastKey = this.linearHistory[ this.linearHistory.length - 1 ]
    if( lastKey ){
      const [ entityId ] = lastKey.split(':')
      const entityStack = this.entityStacks.get( entityId )
      const lastState = this.getStackFromLinearHistory( lastKey )
      
      if( lastState ){
        const stacksRemoved = entityStack?.stacks.length || 0

        this.emit('history.entity.cleared', {
          entityId,
          type: lastState.entity.type,
          key: lastState.entity.key,
          stacksRemoved: stacksRemoved - 1  // -1 because we keep the last state
        })
        this.entityStacks = new Map([[ entityId, {
          entityType: lastState.entity.type,
          entityKey: lastState.entity.key,
          stacks: [ lastState ],
          redoStacks: [],
          lastContent: lastState.content
        }]])
        
        this.linearHistory = [ lastKey ]
        this.snapshots = []
        this.recoveryPoints.clear()

        this.emit('history.record', this.getState() )
      }
    }
  }

  destroy(){
    this.syncTimeout && clearTimeout( this.syncTimeout )
    this.removeAllListeners()
    this.clear()
  }
}