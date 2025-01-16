import type Editor from '../editor'

import EventEmitter from 'events'
import $, { type Cash } from 'cash-dom'
import Creator from './creator'
import Movable from './movable'
import Pannable from './pannable'
import Zoomable from './zoomable'
import Resizable from './resizable'
import Wrappable from './wrappable'
import SnapGuidable from './snapguidable'
import Stylesheet from '../../lib/stylesheet'
import ShadowEvents from '../../lib/shadowEvents'
import FrameStyle from '../frame/styles'

export type HandleType = 'pan' 
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
  enable: HandleType[]
  $viewport: Cash
  $canvas: Cash
  element: string
  dom: 'main' | 'shadow'
  shadowRoot?: ShadowRoot
  frameStyle?: FrameStyle
  MIN_WIDTH: number
  MIN_HEIGHT: number
  WRAPPER_TAG?: string
  WRAPPER_BORDER_WIDTH?: number
  WRAPPER_HANDLE_SIZE?: number

  getScale: () => number
  setScale: ( value: number ) => void
  constraints?: <ActionTypes>( type: HandleType, action: ActionTypes, event?: KeyboardEvent ) => boolean
}
export interface HandleInterface {
  apply(): void
  discard(): void
}

class Inclusion extends EventEmitter {
  public options: HandlesOptions

  constructor( options: HandlesOptions ){
    super()
    this.options = options
  }

  /**
   * Return DOM-wise events
   */
  events( arg: Cash | Document ){
    switch( this.options.dom ){
      case 'main': return arg === document ? $(document) : (arg as Cash)
      case 'shadow': return new ShadowEvents( arg === document ? this.options.shadowRoot : (arg as Cash)[0] as any )
    }
  }
  /**
   * Add styles based on type of DOM.
   */
  styles( rel: string, sheet: string ){
    switch( this.options.dom ){
      case 'shadow': {
        if( !this.options.frameStyle )
          throw new Error('Undefined frameStyle instance option')

        this.options.frameStyle.addRules( sheet, { rel })
        return this.options.frameStyle
      }

      case 'main':
      default: return new Stylesheet( rel, { sheet, meta: true })
    }
  }
}

export default class Handles extends Inclusion {
  private editor: Editor
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
  public isZooming = false
  public isPanning = false
  public isResizing = false

  public canvasOffset = { x: 0, y: 0 }

  constructor( editor: Editor, options: HandlesOptions ){
    super( options )

    if( !options.$viewport.length || !options.$canvas.length )
      throw new Error('Invalid handles options')

    this.editor = editor
    this.$viewport = options.$viewport
    this.$canvas = options.$canvas

    // REVIEW: Options validation
    this.options = {
      WRAPPER_TAG: 'rzwrapper',
      WRAPPER_BORDER_WIDTH: 1,
      WRAPPER_HANDLE_SIZE: 6,
      
      ...options
    }

    /**
     * Override the constraints method
     * via options
     */
    if( typeof this.options.constraints == 'function' )
      this.constraints = this.options.constraints.bind(this)

    this.initialize()
  }

  /**
   * Defined constraints of triggering a
   * given handle.
   * 
   * - Keyboard 
   */
  constraints<ActionType>( type: HandleType, action: ActionType, event?: KeyboardEvent ){
    switch( type ){
      case 'wrap': {
        switch( action ){
          case 'activate': return event?.altKey || false
          case 'deactivate': return !this?.isPanning 
                                    && !this?.isZooming
                                    && !this?.isMoving
                                    && !this?.isResizing
                                    || false
          default: return true
        }
      }

      case 'move': {
        switch( action ){
          case 'start': return !this?.isPanning
                                && !this?.isZooming
                                && !this?.isResizing
                                || false
          default: return true
        }
      }

      case 'resize': {
        switch( action ){
          case 'start': return !this?.isPanning
                                && !this?.isZooming
                                && !this?.isMoving
                                || false
          default: return true
        }
      }

      default: return true
    }
  }

  initialize(){
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