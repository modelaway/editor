import type Modela from '../exports/modela'
import type { FrameOption } from '../types/frame'

import CSS from './css'
import Views from './views'
import History from './history'
import IOF from '../lib/custom.iframe.io'
import { generateKey } from './utils'
import { createFrame } from './block.factory'
import { CONTROL_PANEL_SELECTOR, MEDIA_SCREENS, VIEW_IDENTIFIER, VIEW_PLACEHOLDER_SELECTOR } from './constants'
import FrameWindow, { FrameWindowRemote, FrameWindowDOM, FrameQuery } from '../lib/frame.window'

export default class Frame {
  private chn?: IOF
  public key: string
  public flux: Modela
  private $frame: JQuery<HTMLElement>

  public remote?: FrameWindowRemote
  public $$?: FrameWindowDOM

  public $$root?: FrameQuery
  public $$head?: FrameQuery
  public $$body?: FrameQuery

  /**
   * Editor history stack manager
   */
  public history: History

  /**
   * Initialize global css
   */
  public css: CSS

  /**
   * Manage supported views
   */
  public views: Views

  constructor( flux: Modela, options: FrameOption ){
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

    /**
     * Initialize history manager
     */
    this.history = new History()

    /**
     * Initialize global css manager
     */
    this.css = new CSS( this )

    /**
     * Initialize views manager
     */
    this.views = new Views( this )
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

    /**
     * Propagate view control over the existing content
     */
    this.$$body
    && this.flux.settings.autoPropagate
    && await this.views.propagate( this.$$body )

    // Activate all inert add-view placeholders
    this.setPlaceholders('active')
    
    // Process initial content
    const initialContent = await this.$$root.html()
    if( initialContent ){
      // Set initial content as first history stack
      this.history.initialize( initialContent )
    }

    this.events()
  }

  events(){
    if( !this.chn || !this.$$body ) return

    /**
     * Listen to View components or any editable tag
     */
    const selectors = `${this.flux.settings.viewOnly ? VIEW_IDENTIFIER : ''}:not([${VIEW_PLACEHOLDER_SELECTOR}],[${CONTROL_PANEL_SELECTOR}] *)`
    this.flux.settings.hoverSelect ?
              this.$$body.on('mouseover', selectors, this.views.lookup.bind( this.views ) )
              : this.$$body.on('click', selectors, this.views.lookup.bind( this.views ) )
  }

  resize( device: string ){
    if( device === 'default' ){
      const 
      screenWidth = $(window).width(),
      screenHeight = $(window).height()
      
      this.$frame.find('iframe').css({ width: `${screenWidth}px`, height: `${screenHeight}px` })
      return
    }

    const mediaScrean = MEDIA_SCREENS[ device ] || Object.values( MEDIA_SCREENS ).filter( each => (each.type == device) )[0]
    if( !mediaScrean ) return 

    const { width, height } = mediaScrean
    this.$frame.find('iframe').css({ width, height })
  }
  delete(){
    // Disable add-view placeholders
    this.setPlaceholders('inert')

    // Clear views meta data
    this.views?.clear()
    // Remove frame element from the DOM
    this.$frame.remove()
  }
  edit(){
    this.$frame.attr('active', 'true')
    this.$frame.parent().attr('active', 'true')
  }
  dismiss(){
    this.$frame.removeAttr('active')
    this.$frame.parent().removeAttr('active')
  }

  /**
   * Set general state of placeholders
   * 
   * - active: Enable add-view placeholders highlighting during editing
   * - inert: Disable add-view placeholders
   */
  setPlaceholders( status = 'active' ){
    if( !this.flux.settings.enablePlaceholders ) return
    $(`[${VIEW_PLACEHOLDER_SELECTOR}]`).attr('status', status )
  }
}