import EventEmitter from 'events'
import DMP, { Diff } from 'diff-match-patch'

/**
 * Throttle function to limit the frequency of 
 * input event handling
 */
function throttle( fn: Function, limit: number ){
  let 
  lastFunc: any,
  lastRan: number

  return function( this: Function, ...args: any[] ){
    if( !lastRan ){
      fn.apply( this, args )
      lastRan = Date.now()
    }
    else {
      clearTimeout( lastFunc )

      lastFunc = setTimeout( () => {
        if( Date.now() - lastRan >= limit ){
          fn.apply( this, args )
          lastRan = Date.now()
        }
      }, limit - ( Date.now() - lastRan ) )
    }
  }
}

/**
 * Debounce function to delay execution until 
 * after wait time has passed
 */
function debounce( fn: Function, wait: number ){
  let timeout: any

  return function( this: Function, ...args: any[] ){
    clearTimeout( timeout )
    timeout = setTimeout( () => fn.apply( this, args ), wait )
  }
}

/**
 * Combined throttling and debouncing
 */
function throttleAndDebounce( fn: Function, throttleLimit: number, debounceWait: number ){
    return debounce( throttle( fn, throttleLimit ), debounceWait )
}

type Stack = {
  content: string
  diff: any
}
type HistoryOptions = {
  maxHistorySize: number
  throttleLimit: number
  debounceWait: number
}

export default class History extends EventEmitter {
  private dmp: DMP
  private options: HistoryOptions

  private stacks: Stack[] = []
  private redoStacks: Stack[] = []

  public lateRecord: ( content: string ) => void

  constructor( options?: HistoryOptions ){
    super()

    this.dmp = new DMP()
    this.options = {
      throttleLimit: 300,
      debounceWait: 500,
      maxHistorySize: 100,

      // Custom options 
      ...options
    }

    /**
     * Record state efficiently by managing the frequency 
     * and timing of state saving.
     * 
     * Throttling ensures that the function is called 
     * at most once in a specified time period, while 
     * debouncing ensures that the function is called 
     * only after a specified period has elapsed since 
     * the last invocation.
     */
    this.lateRecord = throttleAndDebounce( async ( content: string ) => { 
      await this.record( content )
    }, this.options.throttleLimit, this.options.debounceWait )
  }

  /**
   * Initial content as initial history state
   */
  initialize( content: string ){
    this.stacks.push({ content, diff: null }) 
    this.emit('history.init')
  }

  can( action: 'undo' | 'redo' ){
    const count = ( action == 'redo' ? this.redoStacks.length : this.stacks.length )
    return count > 0
  }

  /**
   * Calculate the diff between two states asynchronously
   */
  private calculateDiff( oldContent: string, newContent: string ){
    return new Promise( resolve => {
      setTimeout( () => {
        const diff = this.dmp.diff_main( oldContent, newContent )
        this.dmp.diff_cleanupSemantic( diff )
        
        resolve( this.dmp.diff_toDelta( diff ) )
      }, 0 )
    } )
  }

  /**
   * Apply the diff to get the new content
   */
  private applyDiff( content: string, compressedDiff: string ){
    const diff = this.dmp.diff_fromDelta( content, compressedDiff )
    this.dmp.diff_cleanupSemantic( diff )

    const
    patches = this.dmp.patch_make( content, diff ),
    [ newContent, _ ] = this.dmp.patch_apply( patches, content )

    return newContent
  }

  /**
   * Record the current state with delta encoding
   */
  async record( content: string ){
    /**
     * Retrieve lastest stack record on which diff 
     * will be calculated on.
     * 
     * No last state, consider this record as
     * initial stack.
     */
    const lastState = this.stacks[ this.stacks.length - 1 ]
    if( !lastState ){
      this.initialize( content )
      return
    }

    const diff = await this.calculateDiff( lastState.content, content )

    // Remove the oldest entry to maintain max history size
    this.options.maxHistorySize 
    && this.stacks.length >= this.options.maxHistorySize 
    && this.stacks.shift()
    
    // Add new history stack
    this.stacks.push({ content, diff })

    /**
     * Clear the redo stack whenever a new change is made
     */
    this.redoStacks = []

    this.emit('history.record', this.stacks.length, this.redoStacks.length )
  }

  /**
   * Undo
   */
  undo(){
    if( this.stacks.length <= 1 ) return

    const lastState = this.stacks.pop()
    if( !lastState ) return

    this.redoStacks.push( lastState )

    const
    stackIndex = this.stacks.length - 1,
    prevState = this.stacks[ stackIndex ]

    this.emit('history.undo', stackIndex, this.redoStacks.length )
    
    return prevState.content
  }

  /**
   * Redo
   */
  redo(){
    if( this.redoStacks.length < 1 ) return
    
    const nextState = this.redoStacks.pop()
    if( !nextState ) return

    this.stacks.push( nextState )
    
    // Get the state before the current one to apply diff
    const 
    lastState = this.stacks[ this.stacks.length - 2 ],
    content = this.applyDiff( lastState.content, nextState.diff )

    this.emit('history.redo', this.stacks.length, this.redoStacks.length )

    return content
  }
}