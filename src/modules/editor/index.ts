import type { FrameSpecs } from '../../types/frame'
import $, { type Cash } from 'cash-dom'
import EventEmitter from 'events'

import I18N from '../i18n'
import Store from '../store'
import Canvas from './canvas'
import Assets from '../assets'
import Plugins from '../plugins'
import History from '../history'
import Controls from './controls'
import Functions from '../functions'
import Lips from '../../lips/lips'
import Shell from '../../factory/shell'
import Toolbar, { ToolbarInput } from '../../factory/toolbar'
import Quickset, { QuicksetInput } from '../../factory/quickset'
import Layers, { LayersInput } from '../../factory/layers'
import { debug } from '../utils'
import { 
  EDITOR_CONTROL_OPTIONS,
  GLOBAL_TOOLAR_OPTIONS,
  TOOLS,
  VIEWS
} from '../constants'

window.mlang = {
  default: 'en-US',
  current: window.navigator.language
}

type GlobalLipsContext = {
  selection: string[]
  frame: FrameSpecs | null
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
     * Automatically lookup and apply view rules
     * across the document elements on document load
     */
    autoPropagate: false,

    /**
     * Workspace view preferences
     */
    viewControls: true,
    viewLayers: true,
    viewToolbar: true
  }
  public settings: ModelaSettings = {}

  public lips: Lips
  public $root?: Cash
  public $shell?: Cash
  public $viewport?: Cash

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

    const context: GlobalLipsContext = {
      selection: [],
      frame: null
    }

    this.lips = new Lips({ context })

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

  /**
   * Update global controls options by settings
   * and preferences.
   */
  private getOptions(): Record<string, QuicksetOption> {

    if( this.settings.viewLayers )
      EDITOR_CONTROL_OPTIONS['frame-layers'].active = true

    return EDITOR_CONTROL_OPTIONS
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
    if( !this.$root?.length ) return
    
    /**
     * Create modela viewport layer and apply translation 
     * to text contents
     */
    const shell = Shell( this.lips, {})
    this.$shell = shell.getNode()

    this.$root.prepend( this.$shell )
    this.$viewport = shell.find('viewport')

    if( !this.$viewport?.length )
      throw new Error('Unexpected error occured')
    
    /**----------------------------------------------------
     * Initialize global toolbar
     * ----------------------------------------------------
     */
    const
    tinput: ToolbarInput = {
      key: 'global',
      tools: TOOLS,
      views: VIEWS,
      globals: GLOBAL_TOOLAR_OPTIONS,
      // options: this.getOptions(),
      settings: {
        visible: this.settings.viewToolbar,
      }
    },
    toolbar = Toolbar( this.lips, tinput, { events: this.events, editor: this })
    toolbar.appendTo( this.$shell )

    this.events.on('toolbar.handle', ( key, option ) => {
      console.log('global toolbar --', key, option )
    })
    
    /**----------------------------------------------------
     * Initialize global controls
     * ----------------------------------------------------
     */
    const 
    cinput: QuicksetInput = {
      key: 'global',
      options: this.getOptions(),
      settings: {
        visible: this.settings.viewControls,
      }
    },
    controls = Quickset( this.lips, cinput, { events: this.events, editor: this })
    controls.appendTo( this.$shell )

    this.events.on('quickset.handle', ( key, option ) => {
      console.log('global controls --', key, option )

      switch( key ){
        case 'frame-layers': {
          if( !option.active ){
            layers.getNode().show()
            controls.subInput({ [`options.${key}.active`]: true })
          }
          else {
            layers.getNode().hide()
            controls.subInput({ [`options.${key}.active`]: false })
          }
        } break

        case 'frame-add': {
          if( !option.value ) return

          const frame = this.canvas.addFrame({
            device: option.value.device,
            size: {
              width: option.value.width,
              height: option.value.height
            }
          })
          
          
        } break
      }
    })
    
    /**----------------------------------------------------
     * Initialize frame layers control
     * ----------------------------------------------------
     */
    const
    linput: LayersInput = {
      host: {
        key: 'global',
        type: 'frame',
        title: 'Home',
        content: `
          <div class="alert">
            <p>Some text here</p>
          </div>
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
      settings: {
        visible: this.settings.viewLayers,
      },
    },
    layers = Layers( this.lips, linput, { events: this.events, editor: this })
    layers.appendTo( this.$shell )

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
    // this.history.on('history.record', ({ canRedo, canUndo }) => controls.subInput({
    //   'options.undo.disabled': !canUndo,
    //   'options.redo.disabled': !canRedo
    // }))
  }

  disable(){
    this.$shell?.off()
    this.$shell?.remove()
    this.$root?.off()

    this.canvas.disable()

    this.history.removeAllListeners()
  }
}