import type { Cash } from 'cash-dom'
import type Editor from '../editor'
import type { FrameOption, NoteOption } from '../../types/frame'

import Frame from '../frame'
import Handles from '../handles'
import EventEmitter from 'events'
import CanvasBounds from './bounds'
import {
  FRAME_DEFAULT_MARGIN,
  CONTROL_FRAME_SELECTOR,
  CONTROL_ZOOM_DEFAULT_SCALE,
  ALLOWED_CANVAS_HANDLES,
  FRAME_MIN_WIDTH,
  FRAME_MIN_HEIGHT
} from '../constants'

export default class Canvas extends EventEmitter {
  private editor: Editor
  private list: Record<string, Frame> = {}
  private currentFrame?: Frame

  public scale = CONTROL_ZOOM_DEFAULT_SCALE

  public $?: Cash
  public bounds?: CanvasBounds
  public handles?: Handles

  constructor( editor: Editor ){
    super()
    this.editor = editor
  }
  
  enable(){
    if( !this.editor.$viewport?.length )
      throw new Error('Undefined editor viewport')

    // Initial
    this.$ = this.editor.$viewport?.find(':scope > mcanvas')
    this.bounds = new CanvasBounds( this.$ )
    
    this.handles = new Handles( this.editor, {
      enable: ALLOWED_CANVAS_HANDLES,
      $viewport: this.editor.$viewport,
      $canvas: this.$,
      attribute: CONTROL_FRAME_SELECTOR,
      
      MIN_WIDTH: FRAME_MIN_WIDTH,
      MIN_HEIGHT: FRAME_MIN_HEIGHT,

      /**
       * Give control of the canvas scale value
       * to the handlers.
       */
      getScale: () => (this.scale),
      setScale: value => this.scale = value,

      /**
       * Method to create new frames by handles
       */
      createElement: ( coordinates ) => {
        const options: FrameOption = {
          transparent: true,
          coordinates,
          size: {
            width: `${FRAME_MIN_WIDTH}px`,
            height: `${FRAME_MIN_HEIGHT}px`
          }
        }

        return this.addFrame( options ).$frame
      }
    })

    // Initialy center empty canvas to viewport
    this.handles?.manual.pan?.center()

    this.handles.on('hold:grab', key => this.get( key )?.freeze() )
    this.handles.on('hold:release', key => this.get( key )?.unfreeze() )

    // Listen an process history stack
    // 'history.init'
    // 'history.snapshot'
    // 'history.sync'
    // 'history.entity.created'
    // 'history.entity.threshold'
    // 'history.entity.cleared'
    // 'history.record'
    // 'history.undo'
    // 'history.redo'
    // 'history.error'
    this.editor.history
    .on('history.undo', ( data ) => {
      console.log('undo --', data )
    })
    .on('history.redo', ( data ) => {
      console.log('redo --', data )
    })

    this.emit('canvas.enabled')
  }
  disable(){
    this.handles?.disable()
    this.emit('canvas.disabled')
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

    frame.on('content.changed', ( action: string ) => {
      this.editor.history.push({
        entity: { type: 'frame', key: frame.key },
        event: 'content.changed',
        action
      })
    })

    this.editor.history.push({
      entity: { type: 'frame', key: frame.key },
      event: 'frame.created',
      action: 'addFrame'
    })

    this.list[ frame.key ] = frame
    this.emit('frame.added', frame )
  }
  remove( index: string ){
    const frame = this.get( index )

    this.list[ index ].delete()
    this.emit('frame.dismiss', frame )

    // Refresh canvas bounds
    this.bounds?.refresh()
  }

  /**
   * Loop operation on all active frames
   */
  each( fn: ( frame: Frame ) => void ){
    if( typeof fn !== 'function' )
      throw new Error('Expected each callback function')

    Object.values( this.list ).map( fn )
  }

  /**
   * Add new frame to the canvas
   */
  addFrame( options: FrameOption, adaptability?: FrameBasedCanvasAdaptability ){
    /**
     * Determine the location coordinates the new 
     * frame next the last frame by the right side.
     */
    if( !options.coordinates ){
      const
      lastKey = Object.keys( this.list ).pop() || '*',
      lastFrame = this.get( lastKey )

      if( lastFrame ){
        const
        _left = parseFloat( lastFrame.$frame.css('left') as string ),
        _top = parseFloat( lastFrame.$frame.css('top') as string ),
        _width = parseFloat( lastFrame.$frame.css('width') as string )

        options.coordinates = {
          x: _left + _width + FRAME_DEFAULT_MARGIN,
          y: _top
        }
      }
      // Use default origin for initial frame
      else options.coordinates = { x: 0, y: 0 }
    }

    this.currentFrame = new Frame( this.editor, options )

    /**
     * Record new frame
     */
    this.set( this.currentFrame )

    // Update canvas bounds
    this.bounds?.update( this.currentFrame.$frame )
    /**
     * Pan canvas to new frame's position 
     * or center canvas on the viewport
     */
    adaptability?.autopan && this.handles?.manual.pan?.panTo( this.currentFrame.coordinates )
    adaptability?.autocenter && this.handles?.manual.pan?.center( this.bounds )
    
    return this.currentFrame
  }
  /**
   * Add many frames on a single function
   * call.
   * 
   * Useful more during initialization of the
   * canvas content, therefor set the canvas 
   * automatically to viewport center
   */
  addFrames( frames: FrameOption[] ){
    frames.forEach( frameOption => this.addFrame( frameOption, { autocenter: true }))
  }
  /**
   * TODO: Add personal note to the canvas
   * 
   * Example of node type:
   * - Instructions
   * - Comments
   * - references
   * - etc
   */
  addNote( options: NoteOption ){

  }
}