import type { Cash } from 'cash-dom'
import type Editor from '../editor'

import EventEmitter from 'events'
import Creator from './creator'
import Movable from './movable'
import Pannable from './pannable'
import Zoomable from './zoomable'
import Resizable from './resizable'
import Wrappable from './wrappable'
import SnapGuidable from './snapguidable'

export type Handle = 'pan' 
                      | 'zoom'
                      | 'create'
                      | 'create:wrap'
                      | 'move'
                      | 'wrap'
                      | 'resize'
                      | 'snapguide'
                      | 'move:snapguide'
                      | 'resize:snapguide'
export interface HandlesOptions {
  enable: Handle[]
  $viewport: Cash
  $canvas: Cash
  element: string
  MIN_WIDTH: number
  MIN_HEIGHT: number
  WRAPPER_TAG?: string
  WRAPPER_SIZE?: number
  WRAPPER_BORDER_WIDTH?: number

  getScale(): number
  setScale( value: number ): void
}
export interface HandleInterface {
  apply(): void
  discard(): void
}

export default class Handles extends EventEmitter {
  private editor: Editor
  public options: HandlesOptions
  public manual: {
    move?: Movable
    pan?: Pannable
    zoom?: Zoomable
    wrap?: Wrappable
    create?: Creator
    resize?: Resizable
    snapguide?: SnapGuidable
  } = {}

  public $viewport: Cash
  public $canvas: Cash

  public isMoving = false
  public isPanning = false
  public isResizing = false

  public canvasOffset = { x: 0, y: 0 }

  constructor( editor: Editor, options: HandlesOptions ){
    super()

    if( !options.$viewport.length || !options.$canvas.length )
      throw new Error('Invalid handles options')

    this.editor = editor
    this.$viewport = options.$viewport
    this.$canvas = options.$canvas

    // REVIEW: Options validation
    this.options = {
      WRAPPER_TAG: 'rzwrapper',
      WRAPPER_SIZE: 10,
      WRAPPER_BORDER_WIDTH: 1,
      
      ...options
    }

    /**
     * Enable `snapguide` prior for dependency 
     * assignment.
     */
    if( this.options.enable.includes('snapguide') ){
      this.manual.snapguide = new SnapGuidable( this )
      this.manual.snapguide.apply()
    }

    /**
     * Apply and also expose manual controls 
     * over enabled handles.
     * 
     * - Eg. handles.manual.zoom.to(...)
     */
    this.options.enable.forEach( each => {
      switch( each ){
        case 'pan': {
          this.manual.pan = new Pannable( this )
          this.manual.pan.apply()
        } break
        
        case 'create':
        case 'create:wrap': {
          /**
           * [*:wrap]: Create and wrap the element automatically
           */
          let wrappable
          if( each === 'create:wrap' )
            wrappable = this.manual.wrap || new Wrappable( this )

          this.manual.create = new Creator( this, wrappable )
          this.manual.create.apply()
        } break
        
        case 'zoom': {
          this.manual.zoom = new Zoomable( this )
          this.manual.zoom.apply()
        } break
        
        case 'wrap': {
          this.manual.wrap = new Wrappable( this )
          this.manual.wrap.apply()
        } break
        
        case 'move':
        case 'move:snapguide': {
          if( !this.options.enable.includes('wrap') )
            throw new Error('Move handle only applies on wrappable elements. Expect `wrap` handle')
          
          /**
           * [*:snapguide]: Move handle must have a 
           * snapguide dependency defined
           */
          let snapguide
          if( this.options.enable.includes('snapguide') || each === 'move:snapguide' )
            snapguide = this.manual.snapguide || new SnapGuidable( this )

          this.manual.move = new Movable( this, snapguide )
          this.manual.move.apply()
        } break
        
        case 'resize':
        case 'resize:snapguide': {
          if( !this.options.enable.includes('wrap') )
            throw new Error('Resize handle only applies on wrappable elements. Expect `wrap` handle')
          
          /**
           * [*:snapguide]: Resize handle must have 
           * a snapguide dependency defined
           */
          let snapguide
          if( this.options.enable.includes('snapguide') || each === 'resize:snapguide' )
            snapguide = this.manual.snapguide || new SnapGuidable( this )

          this.manual.resize = new Resizable( this, snapguide )
          this.manual.resize.apply()
        } break
      }
    } )
  }

  transformCanvas(){
    this.options.$canvas.css('transform', `translate(${this.canvasOffset.x}px, ${this.canvasOffset.y}px) scale(${this.options.getScale()})`)
  }
  getScaleQuo(){
    return 1 / this.options.getScale()
  }
  
  discard(){
    Object
    .values( this.manual )
    .forEach( handle => handle.discard() )
  }
}