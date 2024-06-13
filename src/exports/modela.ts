
import jQuery from 'jquery'
import CSS from '../modules/css'
import Store from '../modules/store'
import Frames from '../modules/frames'
import Assets from '../modules/assets'
import Plugins from '../modules/plugins'
import Controls from '../modules/controls'
import Functions from '../modules/functions'
import { debug } from '../modules/utils'
import I18N from '../modules/i18n'

window.$ = jQuery

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
   * Use browser language as default
   */
  public lang: ModelaLanguage = {
    internal: 'en-US',
    default: window.navigator.language
  }

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

  public $root: JQuery<HTMLElement> | null = null
  public $modela: JQuery<HTMLElement> | null = null

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
   * Manage frames
   */
  public frames: Frames

  /**
   * Initialize modela controls
   */
  public controls: Controls

  constructor( settings = {} ){

    this.settings = { ...this.defaultSettings, ...settings }

    // Set default language as current language
    if( !this.settings.lang )
      this.settings.lang = this.lang.default

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
    this.i18n = new I18N( this )

    /**
     * Initialize utility functions
     */
    this.fn = new Functions( this )

    /**
     * Initialize views manager
     */
    this.frames = new Frames( this )

    /**
     * Initialize plugins support
     */
    this.plugins = new Plugins( this )

    /**
     * Initialize modela controls
     */
    this.controls = new Controls( this )
  }

  mount( selector: string ){
    if( !this.enabled ){
      debug('Modela functions disabled')
      return
    }

    this.$root = $(selector)
    if( !this.$root.length )
      throw new Error(`Root <${selector}> element not found`)
    
    // Enable modela controls
    this.controls.enable()
  }

  dismiss(){
    if( !this.enabled ){
      debug('Modela functions disabled')
      return
    }

    // Remove controls
    this.controls?.destroy()
    // Drop store functions
    this.store?.drop()
    
    /**
     * Prevent any other functions still available
     * via API to respond to calls.
     */
    this.enabled = false
  }
}