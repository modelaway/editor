import type Editor from '../editor'
import type { FrameOption, FrameSpecs } from '../../types/frame'

import $, { type Cash } from 'cash-dom'
import EventEmitter from 'events'
import Handles from '../handles'
import Elements from '../elements'
import FrameStyles from './styles'
import { debug, generateKey } from '../utils'
import ShadowEvents from '../shadowEvents'
import {
  MEDIA_SCREENS,
  CONTROL_EDGE_MARGIN,
  CONTROL_MENU_SELECTOR,
  ELEMENT_KEY_SELECTOR,
  ELEMENT_ACTIVE_SELECTOR,
  CONTROL_FRAME_SELECTOR,
  ALLOWED_FRAME_CANVAS_HANDLES,
  CONTROL_HOLDER_SELECTOR
} from '../constants'

interface Topography {
  x: number;
  y: number;
  width: number;
  height: number;
  bottom?: number;
  right?: number;
}
interface TopographyOptions {
  includeMargins?: boolean
}

export default class Frame extends EventEmitter {
  public editor: Editor
  public $frame: Cash

  public key: string
  public styles: FrameStyles
  public handles?: Handles

  public $viewport: Cash
  public $canvas: Cash

  private options: FrameOption = {
    title: 'Unnamed Frame',
    coordinates: { x: '0px', y: '0px' }
  }
  private DOM: ShadowEvents

  /**
   * Initialize UI elements manager
   */
  public elements = new Elements( this )

  constructor( editor: Editor, options: FrameOption ){
    super()
    this.editor = editor
    this.options = {
      ...this.options,
      ...options
    }
    
    // Generate new key for the new frame
    this.key = generateKey()
    this.$frame = $(this.createFrame( this.options.coordinates ))

    // Display frame's path & name
    this.$frame.attr('pathname', this.options.title as string )

    const element = this.$frame.get(0)
    if( !element ) throw new Error('Frame node creation failed unexpectedly')
 
    element.attachShadow({ mode: 'open' })
    if( !element.shadowRoot )
      throw new Error('Frame shadow root creation failed unexpectedly')

    // Add in-frame canvas
    element.shadowRoot.innerHTML = `<fcanvas></fcanvas>`
 
    this.$viewport = $(element.shadowRoot)
    this.$canvas = this.$viewport.children().first()
    this.DOM = new ShadowEvents( element.shadowRoot as any )

    /**
     * Initialize frame styles manager with 
     * shadow root :host stylesheet
     */
    this.styles = new FrameStyles( element.shadowRoot, this.getStyleSheet() )
    /**
     * No explicit size is considered a default 
     * frame with the default screen resolution.
     */
    this.options.size ? 
            this.$frame.css( this.options.size )
            : this.setDeviceSize( options.device || 'default')

    // Append initial content
    this.options.content && this.$canvas.append( this.options.content )
    // Add frame to the board
    this.editor.canvas.$?.append( this.$frame )

    /**
     * Enable controls over the frame
     */
    this.controls()
    
    /**
     * Emit new frame added to the board
     * 
     * Caution: `add` event doesn't mean the frame is loaded
     *          To perform operation on a loaded frame, listen
     *          to `load` event instead.
     */
    this.emit('add')
  }

  private createFrame( coordinates?: FrameOption['coordinates'] ){
    return `<div ${CONTROL_FRAME_SELECTOR}="${this.key}" style="left:${coordinates?.x || '0px'};top:${coordinates?.y || '0px'};"></div>`
  }
  private getStyleSheet(){
    const
    rounded = this.options.rounded ? '2rem' : '0',
    background = this.options.transparent 
          ? `linear-gradient(45deg, #c6c6c6 25%, transparent 25%),
            linear-gradient(-45deg, #c6c6c6 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #c6c6c6 75%),
            linear-gradient(-45deg, transparent 75%, #c6c6c6 75%)`
          : 'none'

    return `
      :host {
        position: relative;
        width: 100%;
        height: 100%;
      }
      
      fcanvas {
        position: relative;
        display: block;
        width: 100%;
        height: 100%;
        border: 1px solid var(--me-border-color);
        border-radius: ${rounded};
        background-image: ${background};
        background-size: 16px 16px;
        background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
        background-color: white;
        cursor: default!important;
        /* cursor: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF0WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS41LjAiPgogPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIgogICAgPgogIDwvcmRmOkRlc2NyaXB0aW9uPgogPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KPD94cGFja2V0IGVuZD0iciI/PgxTkNUAAAAvSURBVCgVY2RgYPgPxAwMDIxQGkHDGCAApgHmwIxhxCYAV4RNM1aNxNmKbDSSFQEA8aUDVJ5PvToAAAAASUVORK5CYII=), auto!important; */
        pointer-events: auto;
        overflow: auto;
      }
    `
  }
  private controls(){
    // Define initial :root css variables (Custom properties)
    this.styles.setVariables()

    /**
     * Initialize handles
     */
    this.handles = new Handles( this.editor, {
      enable: ALLOWED_FRAME_CANVAS_HANDLES,
      $viewport: this.$viewport,
      $canvas: this.$canvas,
      attribute: ELEMENT_KEY_SELECTOR,
      frameStyle: this.styles,

      MIN_WIDTH: 1,
      MIN_HEIGHT: 1,

      /**
       * Give control of the canvas scale value
       * to the handlers.
       */
      getScale: () => (this.editor.canvas.scale),
      setScale: value => this.editor.canvas.scale = value,

      /**
       * Method to add element into frame 
       * canvas by handles
       */
      createElement: ({ x, y }) => {
        console.log('Add element to frame canvas')

        return $()
      }
    })
    // Define custom handles constraints
    this.handles.constraints = function( type, action, event ){
      switch( type ){
        case 'hold': {
          switch( action ){
            case 'grab': return false
            case 'release': return event?.shiftKey 
                                      || event?.metaKey
                                      || false
            case 'multiwrap': return !event?.shiftKey
            case 'handle': return false

            // Constrain by default
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
                                  || this.isSelecting
                                  || false
            // No Constrain by default
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
            // No Constrain by default
            default: return false
          }
        }

        // Allow unlisted handles by default
        default: return false
      }
    }
    
    /**
     * Propagate view control over the existing content
     */
    this.$canvas.length
    && this.editor.settings.autoPropagate
    && this.elements.propagate( this.$canvas )

    // Push initial content as history stack
    const initialContent = this.getContent()
    initialContent && this.emit('content.changed', initialContent )
    
    // Push new history stack after view content changed
    this.on('view.changed', () => this.emit('content.changed', this.getContent() ) )
    
    // Initialize control events
    this.events()
    // Frame fully loaded
    this.emit('load')
  }

  freeze(){
    this.$frame.addClass('frozen')
    this.emit('frame.changed', 'freeze')
  }
  unfreeze(){
    this.$frame.removeClass('frozen')
    this.emit('frame.changed', 'unfreeze')
  }

  events(){
    if( !this.$canvas.length || !this.editor.$viewport?.length ) return
    const self = this

    /**
     * Listen to View definitions or any editable tag
     */
    const selectors = `:not([${CONTROL_MENU_SELECTOR}] *, [${CONTROL_HOLDER_SELECTOR}], [${CONTROL_HOLDER_SELECTOR}] > *)`
    this.editor.settings.hoverSelect ?
              this.DOM.on('mouseover', selectors, function( this: Cash ){ self.elements.lookup.bind( self.elements )( $(this) ) })
              : this.DOM.on('click', selectors, function( this: Cash ){ self.elements.lookup.bind( self.elements )( $(this) ) })

    this.DOM
    /**
     * Mount frame to global context
     */
    .on('mouseup', () => {
      const specs: FrameSpecs = {
        key: this.key,
        title: this.options.title as string,
        content: this.getContent()
      }

      this.editor.lips.setContext('frame', specs )
    })
    /**
     * Show quickset options
     */
    .on('contextmenu', `[${ELEMENT_ACTIVE_SELECTOR}]`, function( this: Cash, e: Event ){
      e.preventDefault()

      const key = $(this).attr( ELEMENT_KEY_SELECTOR )
      debug('quickset event --', key )

      if( !key ) return

      // Show quickset
      const view = self.elements.get( key )
      view?.quickset()
    } )

    .on('input', '[contenteditable]', () => this.emit('content.change', this.getContent() ) )
    
    // .on('keydown', onUserAction )
    // .on('paste', onUserAction )
  }
  delete(){
    // Clear elements meta data
    this.elements?.clear()
    this.handles?.disable()
    
    // Remove frame element from the DOM
    this.$frame.remove()

    this.emit('frame.deleted')
  }
  duplicate(){
    
  }

  setDeviceSize( device: string ){
    if( device === 'default' ){
      const 
      screenWidth = $(window).width(),
      screenHeight = $(window).height()
      
      this.$frame.css({ width: `${screenWidth}px`, height: `${screenHeight}px` })

      this.emit('screen-mode.change', device )
      return
    }

    const mediaScrean = MEDIA_SCREENS[ device ] || Object.values( MEDIA_SCREENS ).filter( each => (each.device == device || each.type.id == device) )[0]
    if( !mediaScrean ) return

    const { width, height } = mediaScrean
    this.$frame.css({ width, height })

    this.emit('screen-mode.change', device )
  }
  /**
   * Return an element dimension and position 
   * situation in the DOM
   */
  getTopography( $elem: Cash, options: TopographyOptions = { includeMargins: false } ): Topography {
    if( !$elem.length || !$elem[0] )
      throw new Error('Invalid method call. Expected a valid element')

    const
    element: any = $elem[0],
    rect = element.getBoundingClientRect(), 
    style = window.getComputedStyle( element )

    /**
      * Calculate position coordinates relative to viewport
      * accounting for margins and transforms if requested
      */
    let
    { left, top } = { left: rect.left || CONTROL_EDGE_MARGIN, top: rect.top || CONTROL_EDGE_MARGIN },
    marginLeft = 0,
    marginTop = 0,
    marginRight = 0, 
    marginBottom = 0

    // Add margins if requested
    if( options.includeMargins ){
      marginLeft = parseFloat( style.marginLeft ) || 0
      marginTop = parseFloat( style.marginTop ) || 0
      marginRight = parseFloat( style.marginRight ) || 0 
      marginBottom = parseFloat( style.marginBottom ) || 0

      left += marginLeft
      top += marginTop
    }

    // Add scroll offsets for absolute positioning if not fixed
    const
    scrollLeft = window.scrollX || document.documentElement.scrollLeft,
    scrollTop = window.scrollY || document.documentElement.scrollTop

    left += scrollLeft
    top += scrollTop

    return {
      x: left || CONTROL_EDGE_MARGIN ,
      y: top || CONTROL_EDGE_MARGIN,
      width: rect.width + marginLeft + marginRight || 0,
      height: rect.height + marginTop + marginBottom || 0,
      right: left + rect.width + marginRight,
      bottom: top + rect.height + marginBottom
    }
  }
  
  /**
   * Retrieve frame's body content.
   */
  getContent( root = false ){
    return this.$canvas.html() || ''
  }
  /**
   * Set frame's body content
   */
  setContent( content: string, root = false ){
    this.$canvas.html( content )
  }
}