import type Editor from '../editor'
import type { FrameOption } from '../../types/frame'

import $, { type Cash } from 'cash-dom'
import EventEmitter from 'events'
import Elements from '../elements'
import { debug, generateKey } from '../utils'
import {
  MEDIA_SCREENS,
  CONTROL_EDGE_MARGIN,
  CONTROL_MENU_SELECTOR,
  VIEW_KEY_SELECTOR,
  VIEW_ACTIVE_SELECTOR,
  CONTROL_FRAME_SELECTOR,
  PATCH_CSS_SETTINGS
} from '../constants'
import FrameStyles from './styles'

const createFrame = ( key: string, position?: FrameOption['position'] ) => {
  return `<div ${CONTROL_FRAME_SELECTOR}="${key}" style="top:${position?.top || '0px'};left:${position?.left || '0px'}"></div>`
}

type EventType = keyof HTMLElementEventMap;

interface EventOptions {
  stopPropagation?: boolean;
  preventDefault?: boolean;
}

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

class ShadowDOMEvents {
  private listeners: Map<string, EventListener> = new Map()
  private root: ShadowRoot

  constructor( shadowRoot: ShadowRoot ){
    this.root = shadowRoot;
  }

  on<E extends EventType>(
    _event: E,
    selectorOrCallback: string | EventListener,
    callbackOrOptions?: EventListener | EventOptions,
    options: EventOptions = {}
  ): this {
    if( !this.root ) return this

    // Handle overloaded parameters
    let 
    selector: string | undefined,
    callback: EventListener
    
    if( typeof selectorOrCallback === 'function' ){
      callback = selectorOrCallback
      options = callbackOrOptions as EventOptions || {}
    }
    else {
      selector = selectorOrCallback
      callback = callbackOrOptions as EventListener
    }

    if( typeof callback !== 'function' ) return this

    // Create the event listener
    const wrappedCallback = ( e: Event ) => {
      options.stopPropagation && e.stopPropagation()
      options.preventDefault && e.preventDefault()

      if( !selector ){
        callback.bind( e.target )( e )
        return
      }

      e.target instanceof Element 
      && e.target.matches( selector )
      && callback.bind( e.target )( e )
    }

    // Store the listener for cleanup
    const key = `${_event}-${selector || ''}`
    this.listeners.set( key, wrappedCallback )
    
    // Attach the listener
    this.root.addEventListener( _event, wrappedCallback, true )

    return this
  }

  off<E extends EventType>( _event: E, selector?: string ): this {
    if( !this.root ) return this

    const
    key = `${_event}-${selector || ''}`,
    listener = this.listeners.get( key )
    
    if( listener ){
      this.root.removeEventListener( _event, listener, true )
      this.listeners.delete( key )
    }

    return this
  }
}

export default class Frame extends EventEmitter {
  public key: string
  public editor: Editor
  public $frame: Cash

  public $: Cash
  public styles: FrameStyles
  private DOM: ShadowDOMEvents

  /**
   * Initialize UI elements manager
   */
  public elements = new Elements( this )

  constructor( editor: Editor, options: FrameOption ){
    super()
    this.editor = editor

    // Generate new key for the new frame
    this.key = generateKey()
    this.$frame = $(createFrame( this.key, options.position ))

    const element = this.$frame.get(0)
    if( !element ) throw new Error('Frame node creation failed unexpectedly')
 
    const shadow = element.attachShadow({ mode: 'open' })
    if( !element.shadowRoot )
      throw new Error('Frame shadow root creation failed unexpectedly')
 
    /**
     * Initialize frame styles manager with 
     * shadow root :host stylesheet
     */
    this.styles = new FrameStyles( shadow, PATCH_CSS_SETTINGS )

    // Append initial content
    options.content && $(shadow).append( options.content )

    this.$ = $(element.shadowRoot)
    this.DOM = new ShadowDOMEvents( element.shadowRoot )

    /**
     * No explicit size is considered a default 
     * frame with the default screen resolution.
     */
    options.size ? 
            this.$frame.css( options.size )
            : this.setDeviceSize( options.device || 'default')

    // Add frame to the board
    this.editor.canvas.$?.append( this.$frame )

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

  private controls(){
    // Define initial :root css variables (Custom properties)
    this.styles.setVariables()
    // Inject editor css patch into frame content <head>
    // this.css.declare('patch', PATCH_CSS_SETTINGS )
    
    /**
     * Propagate view control over the existing content
     */
    this.$.length
    && this.editor.settings.autoPropagate
    && this.elements.propagate( this.$ )

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
    this.$frame.attr('frozen', 'true')
    this.emit('frame.changed', 'freeze')
  }
  unfreeze(){
    this.$frame.removeAttr('frozen')
    this.emit('frame.changed', 'unfreeze')
  }

  events(){
    if( !this.$?.length || !this.editor.$viewport?.length ) return
    const self = this

    /**
     * Listen to View components or any editable tag
     */
    const selectors = `:not([${CONTROL_MENU_SELECTOR}] *)`
    this.editor.settings.hoverSelect ?
              this.DOM.on('mouseover', selectors, function( this: Cash ){ self.elements.lookup.bind( self.elements )( $(this) ) })
              : this.DOM.on('click', selectors, function( this: Cash ){ self.elements.lookup.bind( self.elements )( $(this) ) })

    this.DOM
    /**
     * Show quickset options
     */
    .on('contextmenu', `[${VIEW_ACTIVE_SELECTOR}]`, function( this: Cash, e: Event ){
      e.preventDefault()

      const key = $(this).attr( VIEW_KEY_SELECTOR )
      debug('quickset event --', key )

      if( !key ) return

      // Show quickset
      const view = self.elements.get( key )
      view?.showQuickset()
    } )

    .on('input', '[contenteditable]', () => this.emit('content.change', this.getContent() ) )
    // .on('keydown', onUserAction )
    // .on('paste', onUserAction )
  }
  delete(){
    // Clear elements meta data
    this.elements?.clear()
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
    return this.$?.html() || ''
  }
  /**
   * Set frame's body content
   */
  setContent( content: string, root = false ){
    this.$?.html( content )
  }
}