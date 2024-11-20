import type Modela from '../exports/modela'
import type { FrameOption } from '../types/frame'

import Frame from './frame'
import EventEmitter from 'events'

export default class Frames extends EventEmitter {
  private flux: Modela
  private list: ObjectType<Frame> = {}
  private currentFrame?: Frame
  
  constructor( flux: Modela ){
    super()

    this.flux = flux
  }

  /**
   * Check whether a frame is mounted into the
   * board.
   */
  has( key: string ){
    return this.list[ key ] && this.list[ key ].key === key
  }

  /**
   * Return frame mounted in editor context
   */
  get( key: string ){
    return this.list[ key ]
  }

  /**
   * Record frame
   */
  set( frame: Frame ){
    if( !frame.key ) return

    /**
     * Attach frame event listeners
     */
    frame
    .on('add', () => this.emit('frame.add', this.currentFrame ) )
    .on('load', () => this.emit('frame.load', this.currentFrame ) )
    .on('dismiss', () => this.emit('frame.dismiss', this.currentFrame ) )

    /**
     * Listen to each frames' history navigation events
     */
    const historyNavigator = ( undoCount: number, redoCount: number ) => {
      const updates = { 
        'options.undo.disabled': undoCount < 1,
        'options.redo.disabled': redoCount < 1
      }

      this.flux.workspace.Toolbar?.subInput( updates )

      /**
       * Send content change signal for every history
       * navigation action.
       */
      frame.emit('content.change')
    }

    frame.history
    .on('history.record', historyNavigator.bind(this) )
    .on('history.undo', historyNavigator.bind(this) )
    .on('history.redo', historyNavigator.bind(this) )

    this.list[ frame.key ] = frame
  }

  active(){
    return this.currentFrame?.active ? this.currentFrame : undefined
  }

  /**
   * Loop operation on all active frames
   */
  each( fn: ( frame: Frame ) => void ){
    if( typeof fn !== 'function' )
      throw new Error('Expected each callback function')

    Object.values( this.list ).map( fn )
  }

  add( options: FrameOption ){
    this.currentFrame = new Frame( this.flux, options )

    /**
     * Record new frame
     */
    this.set( this.currentFrame )

    return this.currentFrame
  }

  overview(){
    // Remove active floating
    this.flux.Floating?.destroy()
    this.flux.Floating = undefined

    // Dismiss any active view in current active frame
    this.active()?.views.dismissAll()
    // Dismiss current active frame
    this.currentFrame?.dismiss()

    // Restore global toolbar without frame control
    this.flux.workspace.switch( false )
  }
  focus( key: string ){
    if( !this.has( key ) ) return
    const frame = this.get( key )

    frame.edit()
    this.currentFrame = frame
    
    // Show frame controls on global toolbar
    this.flux.workspace.switch( true )
    // this.flux.workspace.spotOn( frame.$frame )
  }

  remove( index: string ){
    this.list[ index ].delete()
  }
}