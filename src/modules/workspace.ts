import type Modela from '../exports/modela'
import type Component from './block.component'

import * as Event from './events'
import {
  Toolbar,
  ToolbarInput,
  WorkspaceLayer,
  WorkspaceLayerInput
} from './block.factory'
import { GLOBAL_CONTROL_OPTIONS } from './constants'

export default class Workspace {
  readonly flux: Modela

  WS?: Component<WorkspaceLayerInput>
  Toolbar?: Component<ToolbarInput>

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
     * Create modela workspace layer and apply translation 
     * to text contents
     */
    this.WS = WorkspaceLayer({})
    this.flux.$modela = this.WS.render('prepend', $('body') )
    if( !this.flux.$modela?.length )
      throw new Error('Unexpected error occured')

    this.Toolbar = Toolbar({ key: 'global', options: GLOBAL_CONTROL_OPTIONS })
    this.Toolbar.render('append', this.flux.$modela )

    this.$board = this.WS.find('> mboard')
    this.$global = this.WS.find('> mglobal')

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
