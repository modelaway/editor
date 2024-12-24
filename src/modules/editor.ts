import $, { type Cash } from 'cash-dom'
import EventEmitter from 'events'

import I18N from './i18n'
import Store from './store'
import Canvas from './canvas'
import Assets from './assets'
import Plugins from './plugins'
import History from './history'
import Functions from './functions'
import { debug } from './utils'
import Viewport from './factory/viewport'
import Toolbar from './factory/toolbar'
import { GLOBAL_CONTROL_OPTIONS } from './constants'

window.mlang = {
  default: 'en-US',
  current: window.navigator.language
}

export default class Editor {
  private events = new EventEmitter()

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
    hoverSelect: true,

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

  public $root?: Cash
  public $global?: Cash
  public $viewport?: Cash

  /**
   * Copy element clipboard
   */
  public clipboard: ClipBoard | null = null

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

    /**
     * Manage history stack of all actions
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

  /**
   * Enable control actions' event listeners
   */
  enable(){
    /**
     * Create modela viewport layer and apply translation 
     * to text contents
     */
    const viewport = Viewport({})
    $('body').prepend( viewport.getNode() )

    this.$viewport = viewport.getNode()
    if( !this.$viewport?.length )
      throw new Error('Unexpected error occured')
    
    /**
     * Initialize global toolbar
     */
    const 
    toolbar = Toolbar({ key: 'global', options: GLOBAL_CONTROL_OPTIONS }, { events: this.events })
    toolbar.appendTo( this.$viewport )

    this.events.on('toolbar.handle', ( key, option ) => {
      console.log('global toolbar --', key, option )
    })

    /**
     * 
     */
    this.$global = viewport.find(':scope > mglobal')

    /**
     * Enable canvas controls
     */
    this.canvas.enable()

    /**
     * List to history record stack Stats
     */
    this.history.on('history.record', ({ canRedo, canUndo }) => toolbar.subInput({
      'options.undo.disabled': !canUndo,
      'options.redo.disabled': !canRedo
    }))
  }

  disable(){
    this.$viewport?.off()
    this.$viewport?.remove()
    this.$root?.off()

    this.canvas.disable()

    this.history.removeAllListeners()
  }
}