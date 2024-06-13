import type Modela from '../exports/modela'
import type { FrameOption } from '../types/frame'

import EventEmitter from 'events'
import CSS from './css'
import Views from './views'
import History from './history'
// import * as Event from './frame.events'
import IOF from '../lib/custom.iframe.io'
import { debug, generateKey } from './utils'
import { createFrame } from './block.factory'
import { 
  MEDIA_SCREENS,
  CONTROL_EDGE_MARGIN,
  CONTROL_PANEL_SELECTOR,
  VIEW_IDENTIFIER,
  VIEW_REF_SELECTOR,
  VIEW_KEY_SELECTOR,
  PATCH_CSS_SETTINGS,
  VIEW_ACTIVE_SELECTOR,
  VIEW_ALLEY_SELECTOR } from './constants'
import FrameWindow, { FrameWindowRemote, FrameWindowDOM, FrameQuery } from '../lib/frame.window'

export default class Frame extends EventEmitter {
  private chn?: IOF
  public key: string
  public flux: Modela
  public active = false
  private $frame: JQuery<HTMLElement>

  public remote?: FrameWindowRemote
  public $$?: FrameWindowDOM

  public $$root?: FrameQuery
  public $$head?: FrameQuery
  public $$body?: FrameQuery
  
  /**
   * Initialize history manager
   */
  public history = new History()

  /**
   * Initialize global css manager
   */
  public css = new CSS( this )

  /**
   * Initialize views manager
   */
  public views = new Views( this )

  constructor( flux: Modela, options: FrameOption ){
    super()
    this.flux = flux

    // Generate new key for the new frame
    this.key = generateKey()
    this.$frame = $(createFrame( this.key, options ))
    
    this.$frame.find('iframe').on('load', ( e: Event ) => {
      const target = e.target as HTMLIFrameElement
      if( !target )
        throw new Error('Unexpected error occured')

      this.chn = new IOF({ type: 'WINDOW' })
      this.chn.initiate( target.contentWindow as Window, new URL( options.source ).origin )

      // Remove all existings listeners when iframe get reloaded
      this.chn.removeListeners()
      // Synchronize once iof connection established
      this.chn.once('connect', this.sync.bind(this) )
    })

    // Use default frame screen resolution
    this.resize( options.device || 'default')
    // Add frame to the board
    flux.controls.$board?.append( this.$frame )
  }

  private sync(){
    if( !this.chn ) return
    /**
     * Initialize access to remote frame window & document
     * functionalities.
     */
    const { DOM, remote } = FrameWindow( this.chn )
    
    this.$$ = DOM
    this.remote = remote

    // Bind with remove client and initialize controls
    this.chn.emit('bind', { key: this.key, settings: this.flux.settings }, this.controls.bind(this) )
  }
  private async controls(){
    if( !this.$$ ) return

    // Defined main document layout
    this.$$root = await this.$$('html')
    this.$$head = await this.$$('head')
    this.$$body = await this.$$('body')

    // Define initial :root css variables (Custom properties)
    this.css.setVariables()
    // Inject modela css patch into frame content <head>
    this.css.declare('patch', PATCH_CSS_SETTINGS )

    /**
     * Propagate view control over the existing content
     */
    this.$$body
    && this.flux.settings.autoPropagate
    && await this.views.propagate( this.$$body )

    // Activate all inert add-view alleys
    this.setAlleys('active')
    
    // Process initial content
    const initialContent = await this.$$root.html()
    if( initialContent ){
      // Set initial content as first history stack
      this.history.initialize( initialContent )
    }

    // Initialize control events
    this.events()
    // Frame fully loaded
    this.emit('load')
  }

  events(){
    if( !this.$$body?.length || !this.flux.$modela?.length ) return

    /**
     * Listen to View components or any editable tag
     */
    const selectors = `${this.flux.settings.viewOnly ? VIEW_IDENTIFIER : ''}:not([${VIEW_ALLEY_SELECTOR}],[${CONTROL_PANEL_SELECTOR}] *)`
    this.flux.settings.hoverSelect ?
              this.$$body.on('mouseover', selectors, this.views.lookup.bind( this.views ) )
              : this.$$body.on('click', selectors, this.views.lookup.bind( this.views ) )

    this.$$body
    /**
     * Show extra and sub toolbar options
     */
    .on('click', `[${VIEW_ACTIVE_SELECTOR}]`, async ( $$this: FrameQuery ) => {
      if( !this.active ) return

      const key = await $$this.attr( VIEW_KEY_SELECTOR )
      debug('toolbar event --', key )

      if( !key ) return

      // Show toolbar
      const view = this.views.get( key )
      view?.showToolbar()
    } )

    /**
     * Show floating triggers on alley hover
     */
    .on('mouseover', `[${VIEW_ALLEY_SELECTOR}]`, async ( $$this: FrameQuery ) => {
      if( !this.active ) return
      
      const key = await $$this.attr( VIEW_REF_SELECTOR )
      debug('floating event --', key )

      if( !key ) return

      // Show floating
      const view = this.views.get( key )
      view?.showFloating()
    } )
  }
  resize( device: string ){
    if( device === 'default' ){
      const 
      screenWidth = $(window).width(),
      screenHeight = $(window).height()
      
      this.$frame.find('iframe').css({ width: `${screenWidth}px`, height: `${screenHeight}px` })

      this.emit('screen-mode.change', device )
      return
    }

    const mediaScrean = MEDIA_SCREENS[ device ] || Object.values( MEDIA_SCREENS ).filter( each => (each.device == device || each.type.id == device) )[0]
    if( !mediaScrean ) return

    const { width, height } = mediaScrean
    this.$frame.find('iframe').css({ width, height })

    this.emit('screen-mode.change', device )
  }
  delete(){
    // Disable add-view alleys
    this.setAlleys('inert')

    // Clear views meta data
    this.views?.clear()
    // Remove frame element from the DOM
    this.$frame.remove()

    this.emit('frame.delete')
  }
  edit(){
    this.active = true

    this.$frame.attr('active', 'true')
    this.$frame.parent().attr('active', 'true')
  }
  dismiss(){
    this.active = false

    this.$frame.removeAttr('active')
    this.$frame.parent().removeAttr('active')
    
    this.emit('frame.dismiss')
  }

  /**
   * Set general state of alleys
   * 
   * - active: Enable add-view alleys highlighting during editing
   * - inert: Disable add-view alleys
   */
  setAlleys( status = 'active' ){
    if( !this.flux.settings.enableAlleys ) return
    $(`[${VIEW_ALLEY_SELECTOR}]`).attr('status', status )
  }

  /**
   * Return an element dimension and position 
   * situation in the DOM
   */
  async getTopography( $elem: JQuery<HTMLElement> | FrameQuery ){
    if( !$elem.length || !this.$$ )
      throw new Error('Invalid method call. Expected a valid element')
    
    const
    defaultOffset = { left: CONTROL_EDGE_MARGIN, top: CONTROL_EDGE_MARGIN },
    frameOffset = this.$frame.find('iframe').offset() || defaultOffset

    /**
     * View position coordinates in the DOM base on
     * which related triggers will be positionned.
     */
    let { left, top } = await $elem.offset() || defaultOffset

    top += frameOffset.top
    left += frameOffset.left

    // Determite position of element relative to iframe window
    const $$window = await this.$$('window')
    top -= await $$window.scrollTop() || 0
    left -= await $$window.scrollLeft() || 0

    // Determite position of element relative to top window
    top -= $(window).scrollTop() || 0
    left -= $(window).scrollLeft() || 0

    return {
      x: left || CONTROL_EDGE_MARGIN,
      y: top || CONTROL_EDGE_MARGIN,
      width: await $elem.width() || 0,
      height: await $elem.height() || 0
    }
  }
}