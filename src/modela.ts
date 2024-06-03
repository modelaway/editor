
import jQuery from 'jquery'
import CSS from './css'
import Views from './views'
import Store from './store'
import Assets from './assets'
import History from './history'
import Plugins from './plugins'
import Controls from './controls'
import Functions from './functions'
import { debug } from './utils'
import I18N from './i18n'

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
     * Allow placeholder to indicate where to add
     * new views.
     */
    enablePlaceholders: true
  }
  public settings: ModelaSettings = {}

  public $root: JQuery<HTMLElement> | null = null
  public $modela: JQuery<HTMLElement> | null = null

  /**
   * Initialize internationalization handler
   */
  public i18n: I18N

  /**
   * Initialize global css
   */
  public css: CSS

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
   * Manage supported views
   */
  public views: Views

  /**
   * Editor history stack manager
   */
  public history: History

  /**
   * Initialize modela controls
   */
  private controls: Controls

  constructor( settings = {} ){

    this.settings = { ...this.defaultSettings, ...settings }

    // Set default language as current language
    if( !this.settings.lang )
      this.settings.lang = this.lang.default

    /**
     * Initialize history manager
     */
    this.history = new History()

    /**
     * Manage store manager
     * 
     * - view components
     * - templates
     * - etc
     */
    this.store = new Store( this )

    /**
     * Initialize global css manager
     */
    this.css = new CSS()

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
     * Initialize plugins support
     */
    this.plugins = new Plugins( this )

    /**
     * Initialize views manager
     */
    this.views = new Views( this )

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
    
    // Define initial :root css variables (Custom properties)
    this.css.setVariables()
    // Enable modela controls
    this.controls.enable()

    // Process initial content
    const initialContent = this.$root.html()
    if( initialContent ){
      // Set initial content as first history stack
      this.history.initialize( initialContent )
    }
  }

  dismiss(){
    if( !this.enabled ){
      debug('Modela functions disabled')
      return
    }

    // Clear views meta data
    this.views?.clear()
    // Remove controls
    this.controls?.destroy()
    // Drop store functions
    this.store?.drop()

    /**
     * Return global definitions and variables
     * to their initial states
     */
    // const initials = initialState()

    // STORE = initials.STORE
    // STYLES = initials.STYLES
    // ASSETS = initials.ASSETS

    /**
     * Prevent any other functions still available
     * via API to respond to calls.
     */
    this.enabled = false
  }
}