import type Modela from '../exports/modela'
import type { FrameOption } from '../types/frame'

import Frame from './frame'
import EventEmitter from 'events'
import { 
  FRAME_BLANK_DOCUMENT,
  FRAME_DEFAULT_MARGIN
} from './constants'

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
    /**
     * Create blank iframe using default HTML 
     * Document skeleton
     */
    if( !options.source && !options.content )
      options.content = FRAME_BLANK_DOCUMENT
    
    /**
     * Position the new frame next to the last frame
     * by the right side.
     */
    if( !options.position ){
      const
      lastKey = Object.keys( this.list ).pop() || '*',
      lastFrame = this.get( lastKey )

      if( lastFrame ){
        const
        _left = parseFloat( lastFrame.$frame.css('left') ),
        _top = parseFloat( lastFrame.$frame.css('top') ),
        _width = lastFrame.$frame.width() as number

        options.position = {
          left: `${_left + _width + FRAME_DEFAULT_MARGIN}px`,
          top: `${_top}px`
        }
      }
      // Use default origin for initial frame
      else options.position = { left: `0px`, top: `0px` }
    }

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