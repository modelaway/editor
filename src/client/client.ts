
import jQuery from 'jquery'
import Views from './views'
import History from './history'
import Functions from '../functions'
import IOF from '../lib/custom.iframe.io'
import { debug } from '../utils'
import { ViewComponent } from '../types/view'
import { CONTROL_PANEL_SELECTOR, VIEW_IDENTIFIER, VIEW_PLACEHOLDER_SELECTOR } from '../constants'

window.$ = jQuery

type BindingConfig = {
  key: string
  settings: ModelaSettings
}

export default class Client {
  public chn: IOF
  public settings: ModelaSettings = {}

  public $root = $('body')

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

  constructor( settings: ModelaSettings, channel: IOF ){
    if( !this.$root.length )
      throw new Error(`Undefined <html> element`)

    this.chn = channel
    this.settings = settings

    /**
     * Initialize history manager
     */
    this.history = new History()

    /**
     * Initialize utility functions
     */
    this.fn = new Functions( this )
    
    /**
     * Initialize views manager
     */
    this.views = new Views( this )

    // Activate all inert add-view placeholders
    this.setPlaceholders('active')
    // Initlize event listeners
    this.events()

    // Process initial content
    const initialContent = this.$root.html()
    if( initialContent ){
      // Set initial content as first history stack
      this.history.initialize( initialContent )
    }
  }

  private call( _event: string, payload: ObjectType<any> ): Promise<any> {
    return new Promise( ( resolve, reject ) => {
      let timeout: any

      this.chn.emit( _event, payload || null, ( error, component ) => {
        clearTimeout( timeout )
        if( error ) return reject( error )

        resolve( component )
      })

      // Set 8 second timeout
      timeout = setTimeout( () => reject('Timeout'), 8000 )
    } )
  }

  events(){
    if( !this.views ) return

    /**
     * Listen to View components or any editable tag
     */
    const selectors = `${this.settings.viewOnly ? VIEW_IDENTIFIER : ''}:not([${VIEW_PLACEHOLDER_SELECTOR}],[${CONTROL_PANEL_SELECTOR}] *)`
    this.settings.hoverSelect ?
              this.$root.on('mouseover', selectors, this.views.lookup.bind( this.views ) )
              : this.$root.on('click', selectors, this.views.lookup.bind( this.views ) )

    const self = this
    function handler( fn: Function ){
      return function( this: Event ){
        typeof fn === 'function' && fn( $(this), self )
      }
    }

    async function onUserAction( e: any ){
      if( e.defaultPrevented ) return

      switch( e.type || e.key ){
        // case 'ArrowDown': break
        // case 'ArrowUp': break
        // case 'ArrowLeft': break
        // case 'ArrowRight': break
        // case 'Escape': break

        case 'Enter': await self.history.record( $(e).html() ); break
        case 'Tab': await self.history.record( $(e).html() ); break
        case ' ': await self.history.record( $(e).html() ); break

        // case 'Backspace': break
        // case 'Clear': break
        // case 'Copy': break
        // case 'CrSel': break
        // case 'Cut': break
        // case 'Delete': break
        // case 'EraseEof': break
        // case 'ExSel': break
        // case 'Insert': break
        // case 'Paste': await self.flux.history.record( $(e).html() ); break
        // case 'Redo': break
        // case 'Undo': break

        // More key event values
        // https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values

        // case 'paste': await self.flux.history.record( $(e).html() ); break

        // Key event can't be handled
        default: return
      }

      e.preventDefault()
    }

    // this.$root
    // /**
    //  * Tab event trigger
    //  */
    // .on('click', '[tab]', handler( Event.onTab ) )
    // /**
    //  * Show event trigger
    //  */
    // .on('click', '[show]', handler( Event.onShow ) )
    // /**
    //  * Apply event trigger
    //  */
    // .on('click', '[apply]', handler( Event.onApply ) )
    // /**
    //  * Action event trigger
    //  */
    // .on('click', '[action]', handler( Event.onAction ) )
    // /**
    //  * Dismiss event trigger
    //  */
    // .on('click', '[dismiss]', handler( Event.onDismiss ) )
    // /**
    //  * Custom `on-*` event trigger
    //  */
    // .on('click', '[on]', handler( Event.onCustomListener ) )
  }

  async getComponent( name: string, $node?: JQuery<HTMLElement> ): Promise<ViewComponent | null> {
    return await this.call('store.component', { name })
  }

  /**
   * Set general state of placeholders
   * 
   * - active: Enable add-view placeholders highlighting during editing
   * - inert: Disable add-view placeholders
   */
  setPlaceholders( status = 'active' ){
    if( !this.settings.enablePlaceholders ) return
    $(`[${VIEW_PLACEHOLDER_SELECTOR}]`).attr('status', status )
  }

  dismiss(){
    // Clear views meta data
    this.views?.clear()
    // Disable add-view placeholders
    this.setPlaceholders('inert')
    
    this.$root.off()
  }
}

export const connect = async (): Promise<void> => {
  return new Promise( ( resolve, reject ) => {
    const chn = new IOF({ type: 'IFRAME' })
    let
    timeout: any,
    client: Client

    chn
    .listen()
    .once('bind', ({ key, settings }: BindingConfig, callback ) => {
      clearTimeout( timeout )
      if( !key || !settings ){
        const errmess = 'Invalid binding settings'

        typeof callback == 'function' && callback( true, errmess )
        return resolve()
      }

      client = new Client( settings, chn )
      resolve()
    } )
    .once('dismiss', () => client?.dismiss() )

    // Set 8 second connection timeout
    timeout = setTimeout( () => reject('Connection timeout'), 8000 )
  } )
}