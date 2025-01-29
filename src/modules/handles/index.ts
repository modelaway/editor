import type Editor from '../editor'

import EventEmitter from 'events'
import $, { type Cash } from 'cash-dom'
import Creator from './creator'
import Movable from './movable'
import Pannable from './pannable'
import Zoomable from './zoomable'
import Resizable from './resizable'
import Holdable from './holdable'
import Selectable from './selectable'
import SnapGuidable from './snapguidable'
import Stylesheet from '../stylesheet'
import ShadowEvents from '../shadowEvents'
import FrameStyle from '../frame/styles'

export type HandleType = 'pan' 
                      | 'zoom'
                      | 'create'
                      | 'create:hold'
                      | 'move'
                      | 'hold'
                      | 'resize'
                      | 'select'
                      | 'select:hold'
                      | 'snapguide'
                      | 'move:snapguide'
                      | 'resize:snapguide'
export interface HandlesOptions {
  enable?: HandleType[]
  $viewport: Cash
  $canvas: Cash
  attribute: string
  frameStyle?: FrameStyle
  
  MIN_WIDTH: number
  MIN_HEIGHT: number

  MOVE_THRESHOLD?: number

  HOLDER_TAG?: string
  HOLDER_BORDER_WIDTH?: number
  HOLDER_HANDLE_SIZE?: number
  HOLDER_HANDLE_AUTO?: boolean
  HOLDER_HANDLE_VISIBLE_EDGES?: boolean

  DRAG_SELECT_MIN_SIZE?: number
  DRAG_SELECT_THRESHOLD?: number
  DRAG_SELECT_TAG?: string

  getScale: () => number
  setScale: ( value: number ) => void
  createElement?: ( position: { x: number, y: number }) => Cash
  constraints?: <ActionTypes>( type: HandleType, action: ActionTypes, event?: KeyboardEvent ) => boolean
}
export interface HandleInterface {
  enable(): void
  disable(): void
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
    return this.options.$viewport[0] instanceof ShadowRoot
                    ? (new ShadowEvents( arg === document ? this.options.$viewport[0] : (arg as Cash)[0] as any ))
                    : (arg === document ? $(document) : (arg as Cash))
  }
  /**
   * Add styles based on type of DOM.
   */
  styles( rel: string, sheet: string ){
    if( this.options.$viewport[0] instanceof ShadowRoot ){
      if( !this.options.frameStyle )
        throw new Error('Undefined frameStyle instance option')

      this.options.frameStyle.addRules( sheet, { rel })
      return this.options.frameStyle
    }
    
    else return new Stylesheet( rel, { sheet, meta: true })
  }
}

export default class Handles extends Inclusion {
  private editor: Editor
  public manual: {
    move?: Movable
    pan?: Pannable
    zoom?: Zoomable
    hold?: Holdable
    create?: Creator
    resize?: Resizable
    select?: Selectable
    snapguide?: SnapGuidable
  } = {}

  public $viewport: Cash
  public $canvas: Cash

  public isMoving = false
  public isZooming = false
  public isPanning = false
  public isResizing = false
  public isSelecting = false

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
      MOVE_THRESHOLD: 5,

      HOLDER_TAG: 'rzh',
      HOLDER_BORDER_WIDTH: 1,
      HOLDER_HANDLE_SIZE: 9,
      HOLDER_HANDLE_AUTO: true,
      HOLDER_HANDLE_VISIBLE_EDGES: false,

      DRAG_SELECT_TAG: 'dragselect',
      DRAG_SELECT_MIN_SIZE: 5,
      DRAG_SELECT_THRESHOLD: 10,
      
      ...options
    }

    /**
     * Override the constraints method
     * via options
     */
    if( typeof this.options.constraints == 'function' )
      this.constraints = this.options.constraints.bind(this)
    
    // Auto-enabled
    this.enable()
  }

  enable( handles?: HandleType[] ){
    // Set/Update allowed handles
    if( handles )
      this.options.enable = handles

    /**
     * Enable `snapguide` prior for dependency 
     * assignment.
     */
    if( this.options.enable?.includes('snapguide') ){
      this.manual.snapguide = new SnapGuidable( this )
      this.manual.snapguide.enable()
    }

    /**
     * Enable and also expose manual controls 
     * over enabled handles.
     * 
     * - Eg. handles.manual.zoom.to(...)
     */
    this.options.enable?.forEach( each => {
      switch( each ){
        case 'pan': {
          this.manual.pan = new Pannable( this )
          this.manual.pan.enable()
        } break
        
        case 'create':
        case 'create:hold': {
          /**
           * [*:hold]: Create and hold the element automatically
           */
          let holdable
          if( each === 'create:hold' )
            holdable = this.manual.hold || new Holdable( this )

          this.manual.create = new Creator( this, holdable )
          this.manual.create.enable()
        } break
        
        case 'zoom': {
          this.manual.zoom = new Zoomable( this )
          this.manual.zoom.enable()
        } break
        
        case 'hold': {
          this.manual.hold = new Holdable( this )
          this.manual.hold.enable()
        } break

        case 'select':
        case 'select:hold': {
          /**
           * [*:hold]: Move handle must have a 
           * hold dependency defined
           */
          let holdable
          if( this.options.enable?.includes('hold') || each === 'select:hold' )
            holdable = this.manual.hold || new Holdable( this )

          this.manual.select = new Selectable( this, holdable )
          this.manual.select.enable()
        } break
        
        case 'move':
        case 'move:snapguide': {
          if( !this.options.enable?.includes('hold') )
            throw new Error('Move handle only applies on holdable elements. Expect `hold` handle')
          
          /**
           * [*:snapguide]: Move handle must have a 
           * snapguide dependency defined
           */
          let snapguide
          if( this.options.enable.includes('snapguide') || each === 'move:snapguide' )
            snapguide = this.manual.snapguide || new SnapGuidable( this )

          this.manual.move = new Movable( this, snapguide )
          this.manual.move.enable()
        } break
        
        case 'resize':
        case 'resize:snapguide': {
          if( !this.options.enable?.includes('hold') )
            throw new Error('Resize handle only applies on holdable elements. Expect `hold` handle')
          
          /**
           * [*:snapguide]: Resize handle must have 
           * a snapguide dependency defined
           */
          let snapguide
          if( this.options.enable.includes('snapguide') || each === 'resize:snapguide' )
            snapguide = this.manual.snapguide || new SnapGuidable( this )

          this.manual.resize = new Resizable( this, snapguide )
          this.manual.resize.enable()
        } break
      }
    } )
  }
  disable( handles?: HandleType[] ){
    if( !this.options.enable )
      throw new Error('No handle defined')

    const enabled = Object.entries( this.manual )

    Array.isArray( handles ) && handles.length
                    // Only specified handles
                    ? enabled.filter( ([ type ]) => (handles.includes( type as HandleType )) )
                              .forEach( ([type, handle]) => handle.disable() )
                    
                    // Disable all enabled handles
                    : enabled.forEach( ([type, handle]) => handle.disable() )
  }

  /**
   * Defined constraints of triggering a
   * given handle.
   * 
   * - Keyboard
   * - Cursor
   * - Other handle's State
   * 
   * IMPORTANT: Can be override externally to 
   *            define custom constraints
   * 
   * @return: true - There's a contraint. Should not proceed
   *          false - Allowed to proceed
   */
  constraints<ActionType>( type: HandleType, action?: ActionType | null, event?: KeyboardEvent ){
    switch( type ){
      case 'hold': {
        switch( action ){
          case 'grab': return !event?.altKey || false
          case 'release': return this.isPanning 
                                  || this.isMoving
                                  || this.isZooming
                                  || this.isResizing
                                  || this.isSelecting
                                  || false
          // No constrain by default
          default: return false
        }
      }

      case 'move': {
        switch( action ){
          case 'start': return this.isPanning
                                || this.isZooming
                                || this.isResizing
                                || this.isSelecting
                                || false
          // No constrain by default
          default: return false
        }
      }

      case 'select': {
        switch( action ){
          case 'start': return this.isPanning
                                || this.isMoving
                                || this.isZooming
                                || this.isResizing
                                || false
          // No constrain by default
          default: return false
        }
      }

      case 'resize': {
        switch( action ){
          case 'start': return this.isPanning
                                || this.isZooming
                                || false
          // No constrain by default
          default: return false
        }
      }

      // Allow unlisted handles by default
      default: return false
    }
  }

  transformCanvas(){
    this.options.$canvas.css('transform', `translate(${this.canvasOffset.x}px, ${this.canvasOffset.y}px) scale(${this.options.getScale()})`)
  }
  getScaleQuo(){
    return 1 / this.options.getScale()
  }
  getRelativeRect( $element: Cash ): DOMRect {
    if( !$element[0] || !this.$viewport[0] )
      throw new Error('Invalid arguments')
    
    /**
     * Calculate bounding client rect relative 
     * to shadowRoot host's boundaries.
     */
    if( this.$viewport[0] instanceof ShadowRoot ){
      const 
      eRect = $element[0]?.getBoundingClientRect(),
      vRect = this.$viewport[0]?.host.getBoundingClientRect()
      
      return {
        left: eRect.left - vRect.left,
        top: eRect.top - vRect.top,
        right: eRect.right - vRect.left,
        bottom: eRect.bottom - vRect.top,
        width: eRect.width,
        height: eRect.height
      } as DOMRect
    }
    else return $element[0]?.getBoundingClientRect()
  }
}