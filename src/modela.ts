
import jQuery from 'jquery'
import CSS from './css'
import Views from './views'
import Store from './store'
import Assets from './assets'
import History from './history'
import Controls from './controls'
import { log } from './utils'
import {
  createStoreControlBlock,
  createGlobalControlBlock
} from './block.factory'

declare global {
  interface Window {
    $: typeof jQuery
  }
}

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
   * Default language
   */
  private lang = 'en'

  /**
   * Default editor settings: Crucial in case user
   * want to reset settings to default.
   */
  private defaultSettings: ModelaSettings = {
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
  public controls: Controls

  constructor( settings = {} ){

    this.settings = { ...this.defaultSettings, ...settings }

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
     * Manage global assets manager
     */
    this.assets = new Assets( this )

    /**
     * Initialize global css manager
     */
    this.css = new CSS( this )

    /**
     * Manage views manager
     */
    this.views = new Views( this )

    /**
     * Initialize modela controls
     */
    this.controls = new Controls( this )
  }

  render(){
    if( !this.enabled ){
      log('Modela functions disabled')
      return ''
    }

    return `<div id="modela">
      ${createStoreControlBlock()}
      ${createGlobalControlBlock()}
    </div>`
  }

  mount( selector: string ){
    if( !this.enabled ){
      log('Modela functions disabled')
      return
    }

    this.$root = $(selector)
    if( !this.$root.length )
      throw new Error(`Root <${selector}> element not found`)
    
    // Process initial content
    const initialContent = this.$root.html()
    if( initialContent ){
      this.history.initialize( initialContent )


    }
    
    // Add editor controls to root container in the DOM
    $('body').prepend( this.render() )
    // Declare & apply global styles to the DOM
    this.css.declare({ nsp: 'global', props: {} }, true )
    // Enable modela controls
    this.controls.enable()
  }

  propagateUpdate( type: string, updates: any, applyOnly = false ){
    if( !this.enabled ){
      log('Modela functions disabled')
      return
    }

    /**
     * CSS top level styles application
     * 
     * NOTE: No need to apply this to views
     * directly. The expected effect should be handle 
     * the stylesheet way.
     */
    if( applyOnly ){
      this.$root?.css({})
      return
    }

    // Apply to all active views
    Object
    .values( this.views.list )
    .map( view => view.update( type, updates ) )
  }

  dismiss(){
    if( !this.enabled ){
      log('Modela functions disabled')
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