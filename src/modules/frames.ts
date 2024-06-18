import type Modela from '../exports/modela'
import type { FrameOption } from '../types/frame'

import Frame from './frame'
import EventEmitter from 'events'
import { GLOBAL_CONTROL_OPTIONS } from './constants'

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

    frame.history
    .on('history.record', () => {
      const updates = { 'options.undo.disabled': false }
      this.flux.workspace.Toolbar?.grainUpdate( updates )
    })
    .on('history.undo', stackCount => {
      const updates = { 'options.undo.disabled': stackCount > 0 }
      this.flux.workspace.Toolbar?.grainUpdate( updates )
    })
    .on('history.redo', stackCount => {
      const updates = { 'options.redo.disabled': stackCount > 0 }
      this.flux.workspace.Toolbar?.grainUpdate( updates )
    })

    this.list[ frame.key ] = frame
  }

  active(){
    return this.currentFrame?.active && this.currentFrame
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

  board(){
    this.currentFrame?.dismiss()

    // Restore global toolbar without frame control
    this.flux.workspace.switch( false )
  }
  edit( key: string ){
    if( !this.has( key ) ) return
    const frame = this.get( key )

    frame.edit()
    this.currentFrame = frame
    
    // Show frame controls on global toolbar
    this.flux.workspace.switch( true )
  }

  remove( index: string ){
    this.list[ index ].delete()
  }
}