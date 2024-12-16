import type { FloatingInput } from '../modules/factory/floating'
import $, { type Cash } from 'cash-dom'

import I18N from '../modules/i18n'
import Store from '../modules/store'
import Editor from '../modules/editor'
import Canvas from '../modules/canvas'
import Assets from '../modules/assets'
import Plugins from '../modules/plugins'
import Functions from '../modules/functions'
import { debug } from '../modules/utils'
import { Component } from '../component/lips'

window.mlang = {
  default: 'en-US',
  current: window.navigator.language
}

export default class Modela {
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
     * Listen to click event on only element that
     * has `.view` class name.
     * 
     * `.view` class name identify view components
     * 
     * Default: Any `html` tag/element editable by modela
     */
    viewOnly: false,

    /**
     * Enable selection of view when overed by a cursor
     * 
     * Default: false
     */
    hoverSelect: false,

    /**
     * Allow alley to indicate where to add
     * new views.
     */
    enableAlleys: true,

    /**
     * Automatically lookup and apply view rules
     * across the document elements on document load
     */
    autoPropagate: false
  }
  public settings: ModelaSettings = {}

  public $root: Cash | null = null
  public $viewport: Cash | null = null

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

  /**
   * Initialize modela editor
   */
  public editor: Editor
  /**
   * Floating block component
   */
  public Floating?: Component<FloatingInput>

  constructor( settings = {} ){

    this.settings = { ...this.defaultSettings, ...settings }

    // Set default language as current language
    if( this.settings.lang )
      window.mlang.current = this.settings.lang

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

    /**
     * Initialize modela editor
     */
    this.editor = new Editor( this )
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
    this.editor.enable()
  }

  dismiss(){
    if( !this.enabled ){
      debug('Modela functions disabled')
      return
    }

    // Remove editor
    this.editor?.destroy()
    // Drop store functions
    this.store?.drop()
    
    /**
     * Prevent any other functions still available
     * via API to respond to calls.
     */
    this.enabled = false
  }
}