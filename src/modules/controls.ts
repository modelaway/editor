import type Modela from '../exports/modela'
import * as Event from './events'
import { CONTROL_TOOLBAR_SELECTOR } from './constants'
import { createModela } from './block.factory'

export default class Controls {
  readonly flux: Modela

  $board?: JQuery<HTMLElement>
  $global?: JQuery<HTMLElement>
  $toolbar?: JQuery<HTMLElement>
  
  /**
   * Copy element clipboard
   */
  clipboard: ClipBoard | null = null

  constructor( flux: Modela ){
    this.flux = flux
  }
  
  /**
   * Enable control actions' event listeners
   */
  enable(){
    /**
     * Create modela control layer and apply translation 
     * to text contents
     */
    this.flux.$modela = $(createModela())

    this.flux.$modela = this.flux.i18n.propagate( this.flux.$modela, 'mlang' )
    $('body').prepend( this.flux.$modela )

    this.$board = this.flux.$modela.find('> mboard')
    this.$global = this.flux.$modela.find('> mglobal')
    this.$toolbar = this.flux.$modela.find(`[${CONTROL_TOOLBAR_SELECTOR}="global"]`)

    // Initialize event listeners
    this.events()
  }

  events(){
    if( !this.flux.$modela?.length ) return

    const self = this
    function handler( fn: Function ){
      return function( this: Event ){
        typeof fn === 'function' && fn( $(this), self )
      }
    }
    
    this.flux.$modela
    /**
     * Tab event trigger
     */
    .on('click', '[tab]', handler( Event.onTab ) )
    /**
     * Show event trigger
     */
    .on('click', '[show]', handler( Event.onShow ) )
    /**
     * Apply event trigger
     */
    .on('click', '[apply]', handler( Event.onApply ) )
    /**
     * Action event trigger
     */
    .on('click', '[action]', handler( Event.onAction ) )
    /**
     * Dismiss event trigger
     */
    .on('click', '[dismiss]', handler( Event.onDismiss ) )
    /**
     * Custom `on-*` event trigger
     */
    .on('click', '[on]', handler( Event.onCustomListener ) )

    // .on('input', '[contenteditable]', handler( Event.onContentChange ) )
    // .on('keydown', onUserAction )
    // .on('paste', onUserAction )
  }

  destroy(){
    this.flux.$modela?.off()
    this.flux.$modela?.remove()

    this.flux.$root?.off()
  }
}
