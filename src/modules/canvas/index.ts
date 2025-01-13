import $, { type Cash } from 'cash-dom'
import type Editor from '../editor'
import type { FrameOption } from '../../types/frame'

import Frame from '../frame'
import Handles from '../handles'
import EventEmitter from 'events'
import {
  FRAME_DEFAULT_MARGIN,
  CONTROL_FRAME_SELECTOR
} from '../constants'

export default class Canvas extends EventEmitter {
  private editor: Editor
  private list: Record<string, Frame> = {}
  private currentFrame?: Frame

  public $?: Cash
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
    
    this.handles = new Handles( this.editor, {
      enable: ['pan', 'zoom', 'wrap', 'move', 'snapguide', 'create', 'resize'],
      $viewport: this.editor.$viewport,
      $canvas: this.$,
      element: `div[${CONTROL_FRAME_SELECTOR}]`,
      MIN_WIDTH: 100,
      MIN_HEIGHT: 100
    })
    
    // Initial canvas state
    this.$.css({
      left: '50%',
      top: '50%',
      transform: `translate(-50%, -50%) scale(${this.handles.scale})`
    })


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
    this.handles?.discard()
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
  }

  /**
   * Loop operation on all active frames
   */
  each( fn: ( frame: Frame ) => void ){
    if( typeof fn !== 'function' )
      throw new Error('Expected each callback function')

    Object.values( this.list ).map( fn )
  }

  addFrame( options: FrameOption ){
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
        _left = parseFloat( lastFrame.$frame.css('left') as string ),
        _top = parseFloat( lastFrame.$frame.css('top') as string ),
        _width = parseFloat( lastFrame.$frame.css('width') as string )

        options.position = {
          left: `${_left + _width + FRAME_DEFAULT_MARGIN}px`,
          top: `${_top}px`
        }
      }
      // Use default origin for initial frame
      else options.position = { left: `0px`, top: `0px` }
    }

    this.currentFrame = new Frame( this.editor, options )

    /**
     * Record new frame
     */
    this.set( this.currentFrame )

    return this.currentFrame
  }
}