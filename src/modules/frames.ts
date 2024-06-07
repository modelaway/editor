import type Modela from '../exports/modela'
import type { FrameOption } from '../types/frame'
import Frame from './frame'

export default class Frames {
  private flux: Modela
  private list: ObjectType<Frame> = {}
  private currentFrame?: Frame

  constructor( flux: Modela ){
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
    this.list[ frame.key ] = frame
  }

  add( options: FrameOption ){
    this.currentFrame = new Frame( this.flux, options )
    // this.currentView.mount( component as ViewComponent, to, triggerType )

    /**
     * Record new frame
     */
    this.set( this.currentFrame )
  }

  board(){
    this.currentFrame?.dismiss()
  }
  edit( key: string ){
    if( !this.has( key ) ) return
    
    const frame = this.get( key )

    frame.edit()
    this.currentFrame = frame
  }

  remove( index: string ){
    this.list[ index ].delete()
  }
}