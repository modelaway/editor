import $, { type Cash } from 'cash-dom'
import EventEmitter from 'events'

import I18N from '../i18n'
import Store from '../store'
import Canvas from '../canvas'
import Assets from '../assets'
import Plugins from '../plugins'
import History from '../history'
import Functions from '../functions'
import * as Controls from './controls'
import Viewport from '../factory/viewport'
import House, { HouseInput } from '../factory/house'
import Toolbar, { ToolbarInput } from '../factory/toolbar'
import Layers from '../factory/layers'
import { debug } from '../utils'
import { GLOBAL_CONTROL_OPTIONS } from '../constants'

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
    autoPropagate: false,

    /**
     * Workspace view preferences
     */
    viewToolbar: true,
    viewLayers: true,
    viewHouse: true
  }
  public settings: ModelaSettings = {}

  public $root?: Cash
  public $viewport?: Cash

  /**
   * Copy element clipboard
   */
  public clipboard: ClipBoard | null = null

  /**
   * Editor's space controls
   */
  public controls = Controls

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

  /**
   * Update global controls options by settings
   * and preferences.
   */
  private getOptions(): Record<string, ToolbarOption> {

    if( this.settings.viewLayers )
      GLOBAL_CONTROL_OPTIONS['frame-layers'].active = true

    return GLOBAL_CONTROL_OPTIONS
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
    
    /**----------------------------------------------------
     * Initialize global house
     * ----------------------------------------------------
     */
    const
    hinput: HouseInput = { 
      key: 'global',
      // options: this.getOptions(),
      settings: {
        visible: this.settings.viewHouse,
      }
    },
    house = House( hinput, { events: this.events })
    house.appendTo( this.$viewport )

    this.events.on('house.handle', ( key, option ) => {
      console.log('global house --', key, option )
    })
    
    /**----------------------------------------------------
     * Initialize global toolbar
     * ----------------------------------------------------
     */
    const 
    tinput: ToolbarInput = {
      key: 'global',
      options: this.getOptions(),
      settings: {
        visible: this.settings.viewToolbar,
      }
    },
    toolbar = Toolbar( tinput, { events: this.events })
    toolbar.appendTo( this.$viewport )

    this.events.on('toolbar.handle', ( key, option ) => {
      console.log('global toolbar --', key, option )

      switch( key ){
        case 'frame-layers': {
          if( !option.active ){
            layers.getNode().show()
            toolbar.subInput({ [`options.${key}.active`]: true })
          }
          else {
            layers.getNode().hide()
            toolbar.subInput({ [`options.${key}.active`]: false })
          }
        }
      }
    })
    
    /**----------------------------------------------------
     * Initialize frame layers control
     * ----------------------------------------------------
     */
    const
    linput = {
      key: 'global',
      settings: {
        visible: this.settings.viewLayers,
      },
      content: `
        <section class="header-block">
          <div class="container-fluid">
            <div class="row">
              <div class="col-xl-4 col-lg-4 col-md-4 logo">
                <a href="/" title="Angular, React, Sass"><img src="https://www.webrecto.com/common/images/logo.png"
                    alt="Angular, React, Sass" title="Angular, React, Sass" /></a>
              </div>
              <div class="col-xl-8 col-lg-8 col-md-8 text-right">
                <div class="header-menu">
                  <ul>
                    <li>Angular</li>
                    <li>React</li>
                    <li>NextJs</li>
                    <li>Sass</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      `
    },
    layers = Layers( linput, { events: this.events, editor: this })
    layers.appendTo( this.$viewport )

    this.events.on('layers.handle', ( key, option ) => {
      console.log('frame layers --', key, option )
    })

    /**
     * Enable canvas controls
     */
    this.canvas.enable()

    /**
     * List to history record stack Stats
     */
    // this.history.on('history.record', ({ canRedo, canUndo }) => toolbar.subInput({
    //   'options.undo.disabled': !canUndo,
    //   'options.redo.disabled': !canRedo
    // }))
  }

  disable(){
    this.$viewport?.off()
    this.$viewport?.remove()
    this.$root?.off()

    this.canvas.disable()

    this.history.removeAllListeners()
  }
}