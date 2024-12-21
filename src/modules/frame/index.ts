import type Modela from '../../exports/modela'
import type { FrameOption } from '../../types/frame'

import $, { type Cash } from 'cash-dom'
import EventEmitter from 'events'
import Views from '../views'
import History from '../history'
import { debug, generateKey } from '../utils'
import {
  MEDIA_SCREENS,
  CONTROL_EDGE_MARGIN,
  CONTROL_PANEL_SELECTOR,
  VIEW_IDENTIFIER,
  VIEW_REF_SELECTOR,
  VIEW_KEY_SELECTOR,
  VIEW_ACTIVE_SELECTOR,
  VIEW_ALLEY_SELECTOR,
  CONTROL_FRAME_SELECTOR
} from '../constants'
import FrameStyle from './style'

const createFrame = ( key: string, position?: FrameOption['position'] ) => {
  return `<div ${CONTROL_FRAME_SELECTOR}="${key}" style="top:${position?.top || '0px'};left:${position?.left || '0px'}"></div>`
}

export default class Frame extends EventEmitter {
  public key: string
  public flux: Modela
  public $frame: Cash

  public $: Cash
  public styles: FrameStyle

  /**
   * Initialize history manager
   */
  public history = new History()

  /**
   * Initialize views manager
   */
  public views = new Views( this )

  constructor( flux: Modela, options: FrameOption ){
    super()
    this.flux = flux

    // Generate new key for the new frame
    this.key = generateKey()
    this.$frame = $(createFrame( this.key, options.position ))

    const element = this.$frame.get(0)
    if( !element ) throw new Error('Frame node creation failed unexpectedly')
 
    const shadow = element.attachShadow({ mode: 'open' })
    
    /**
     * Initialize frame styles manager with 
     * shadow root :host stylesheet
     */
    this.styles = new FrameStyle( shadow, `:host { width: 100%; height: 100%; }`)

    // Append initial content
    options.content && $(shadow).append( options.content )
 
    this.$ = $(element.shadowRoot)

    /**
     * No explicit size is considered a default 
     * frame with the default screen resolution.
     */
    options.size ? 
            this.$frame.css( options.size )
            : this.setDeviceSize( options.device || 'default')

    // Add frame to the board
    this.flux.canvas.$?.append( this.$frame )

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
    // Inject modela css patch into frame content <head>
    // this.css.declare('patch', PATCH_CSS_SETTINGS )
    
    /**
     * Propagate view control over the existing content
     */
    this.$.length
    && this.flux.settings.autoPropagate
    && this.views.propagate( this.$ )

    // Activate all inert add-view alleys
    this.enableAlleys('active')
    
    // Set initial content as first history stack
    const initialContent = this.$.html()
    initialContent && this.history.initialize( initialContent )

    // Initialize control events
    this.events()
    // Frame fully loaded
    this.emit('load')
  }

  // freeze(){
  //   // this.$frame.find(':scope > moverlap').attr('on', 'true')
  // }
  // unfreeze(){
  //   // this.$frame.find(':scope > moverlap').removeAttr('on')
  // }

  events(){
    if( !this.$?.length || !this.flux.$viewport?.length ) return
    const self = this

    /**
     * Listen to View components or any editable tag
     */
    const selectors = `${this.flux.settings.viewOnly ? VIEW_IDENTIFIER : ''}:not([${VIEW_ALLEY_SELECTOR}],[${CONTROL_PANEL_SELECTOR}] *)`
    this.flux.settings.hoverSelect ?
              this.$.on('mouseover', selectors, this.views.lookup.bind( this.views ) )
              : this.$.on('click', selectors, this.views.lookup.bind( this.views ) )

    this.$.on('click', '*', ( e ) => console.log('-- click', e.target ) )
    console.log('-- selectors', selectors )

    this.$
    /**
     * Show toolbar options
     */
    .on('click', `[${VIEW_ACTIVE_SELECTOR}]`, function( this: Cash ){
      console.log('hello')
      const key = $(this).attr( VIEW_KEY_SELECTOR )
      debug('toolbar event --', key )

      if( !key ) return

      // Show toolbar
      const view = self.views.get( key )
      view?.showToolbar()
    } )

    /**
     * Show floating triggers on alley hover
     */
    .on('mouseover', `[${VIEW_ALLEY_SELECTOR}]`, function( this: Cash ){
      const key = $(this).attr( VIEW_REF_SELECTOR )
      debug('floating event --', key )

      if( !key ) return

      // Show floating
      const view = self.views.get( key )
      view?.showFloating()
    } )

    .on('input', '[contenteditable]', () => this.pushHistoryStack( true ) )
    // .on('keydown', onUserAction )
    // .on('paste', onUserAction )
  }
  delete(){
    // Disable add-view alleys
    this.enableAlleys('inert')

    // Clear views meta data
    this.views?.clear()
    // Remove frame element from the DOM
    this.$frame.remove()

    this.emit('frame.delete')
  }

  /**
   * Set general state of alleys
   * 
   * - active: Enable add-view alleys highlighting during editing
   * - inert: Disable add-view alleys
   */
  enableAlleys( status = 'active' ){
    if( !this.flux.settings.enableAlleys ) return
    $(`[${VIEW_ALLEY_SELECTOR}]`).attr('status', status )
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
  getTopography( $elem: Cash ){
    if( !$elem.length )
      throw new Error('Invalid method call. Expected a valid element')
    
    const
    defaultOffset = { left: CONTROL_EDGE_MARGIN, top: CONTROL_EDGE_MARGIN },
    frameOffset = this.$?.offset() || defaultOffset

    /**
     * View position coordinates in the DOM base on
     * which related triggers will be positionned.
     */
    let { left, top } = $elem.offset() || defaultOffset

    top += frameOffset.top
    left += frameOffset.left

    // Determite position of element relative to top window
    // top -= $(window).scrollTop() || 0
    // left -= $(window).scrollLeft() || 0

    return {
      x: left || CONTROL_EDGE_MARGIN,
      y: top || CONTROL_EDGE_MARGIN,
      width: $elem.width() || 0,
      height: $elem.height() || 0
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

  /**
   * Record/push current frame window content as
   * latest history stack.
   */
  pushHistoryStack( TDR = false ){
    const currentContent = this.getContent()
    if( currentContent === undefined ) return 
    
    TDR ? 
      // Throttling & Deboucing Recording
      this.history.lateRecord( currentContent )
      // No delay recording
      : this.history.record( currentContent )
  }
}