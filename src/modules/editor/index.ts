import $, { type Cash } from 'cash-dom'
import EventEmitter from 'events'

import I18N from '../i18n'
import Store from '../store'
import Canvas from '../canvas'
import Assets from '../assets'
import Plugins from '../plugins'
import History from '../history'
import Controls from '../controls'
import Functions from '../functions'
import Shell from '../../factory/shell'
import Components from '../../factory/components'
import Lips from '../../lips/lips'
import { debug } from '../utils'

window.mlang = {
  default: 'en-US',
  current: window.navigator.language
}

export default class Editor {
  /**
   * State set to enable external methods to 
   * respond to API calls or not.
   * 
   * 1. Manually set Modela interface calls off
   * 2. Help avoid unnecessary crashing of Modela 
   *    when it got dismissed but its instance methods
   *    still get called.
   */
  private enabled = true

  /**
   * Defined modela UI display language
   */
  public lang: ModelaLanguage = window.mlang

  /**
   * Default editor settings: Crucial in case user
   * want to reset settings to default.
   */
  private defaultSettings: ModelaSettings = {
    /**
     * Current display language
     */
    lang: undefined,

    /**
     * Enable selection of view when overed by a cursor
     * 
     * Default: false
     */
    hoverSelect: true,

    /**
     * Automatically lookup and apply view rules
     * across the document elements on document load
     */
    autoPropagate: false,

    /**
     * Workspace view preferences
     */
    viewQuickSet: true,
    viewLayers: false,
    viewToolbar: true
  }
  public settings: ModelaSettings = {}

  public lips: Lips<ModelaLipsContext>
  public $root?: Cash
  public $shell?: Cash
  public $viewport?: Cash

  /**
   * Editor's event interface
   */
  public events = new EventEmitter()

  /**
   * Copy element clipboard
   */
  public clipboard: ClipBoard | null = null

  /**
   * Editor's space controls
   */
  public controls: Controls

  /**
   * Manage history stack throughout every 
   * editor's components.
   * 
   * - canvas
   * - frames
   * - views
   * - store
   * - etc
   */
  public history: History

  /**
   * Initialize internationalization handler
   */
  public i18n: I18N

  /**
   * Manage store elements
   * 
   * - view components
   * - templates
   * - etc
   */
  public store: Store

  /**
   * Manage store elements
   * 
   * - view components
   * - templates
   * - etc
   */
  public assets: Assets

  /**
   * Manage plugins
   */
  public plugins: Plugins

  /**
   * Utility functions
   */
  public fn: Functions

  /**
   * Manage canvas
   */
  public canvas: Canvas

  constructor( settings = {} ){
    this.settings = { ...this.defaultSettings, ...settings }

    // Set default language as current language
    if( this.settings.lang )
      window.mlang.current = this.settings.lang

    const context: ModelaLipsContext = {
      selection: [], // Selected layers/element in the canvas
      frame: null, // Active frame metadata

      // View and Tool of interest
      toi: undefined,
      voi: undefined,

      // UI Preferences
      viewLayers: this.settings.viewLayers,
      viewToolbar: this.settings.viewToolbar,
      viewQuickSet: this.settings.viewQuickSet
    }

    /**
     * Use Lips for partial COO rendering on 
     * some part of the UI.
     */
    this.lips = new Lips({ context })
    // Register all partial components
    Components( this.lips )

    /**
     * Manage history stack of all actions
     */
    this.history = new History()

    /**
     * Give controls to editor control views
     */
    this.controls = new Controls( this )

    /**
     * Manage store manager
     * 
     * - view components
     * - templates
     * - etc
     */
    this.store = new Store( this )

    /**
     * Manage global assets manager
     */
    this.assets = new Assets()

    /**
     * Initialize history manager
     */
    this.i18n = new I18N()

    /**
     * Initialize utility functions
     */
    this.fn = new Functions( this )

    /**
     * Initialize views manager
     */
    this.canvas = new Canvas( this )

    /**
     * Initialize plugins support
     */
    this.plugins = new Plugins( this )
  }

  mount( selector: string ){
    if( !this.enabled ){
      debug('Modela functions disabled')
      return
    }

    this.$root = $(selector)
    if( !this.$root.length )
      throw new Error(`Root <${selector}> element not found`)
    
    // Enable modela editor
    this.enable()
  }
  unmount(){
    if( !this.enabled ){
      debug('Modela functions disabled')
      return
    }

    // Disable editor
    this.disable()
    // Drop store functions
    this.store?.drop()
    
    /**
     * Prevent any other functions still available
     * via API to respond to calls.
     */
    this.enabled = false
  }

  enable(){
    if( !this.$root?.length ) return
    
    /**
     * Create modela viewport layer and apply translation 
     * to text contents
     */
    const shell = Shell( this.lips, {})
    this.$shell = shell.node

    this.$root.prepend( this.$shell )
    this.$viewport = shell.find('viewport')

    if( !this.$viewport?.length )
      throw new Error('Unexpected error occured')
    
    /**
     * Enable canvas controls
     */
    this.canvas.enable()

    /**
     * Enable user interface controls 
     */
    this.controls.enable()
  }
  disable(){
    this.$shell?.off()
    this.$shell?.remove()
    this.$root?.off()

    this.canvas.disable()
    this.controls.disable()
  }
}