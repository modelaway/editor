import type Modela from '../exports/modela'
import type Component from './component'

import * as Event from './events'
import {
  Toolbar,
  ToolbarInput,
  WorkspaceLayer,
  WorkspaceLayerInput
} from './factory'
import { CONTROL_EDGE_MARGIN, GLOBAL_CONTROL_OPTIONS } from './constants'

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
    this.flux.$modela = $('body').prepend( this.WS.$ )
    if( !this.flux.$modela?.length )
      throw new Error('Unexpected error occured')

    this.Toolbar = Toolbar({ key: 'global', options: GLOBAL_CONTROL_OPTIONS })
    this.flux.$modela.append( this.Toolbar.$ )

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
  }

  switch( target: boolean = false ){
    const updates = {
      'options.undo.hidden': !target,
      'options.redo.hidden': !target,
      'options.board.hidden': !target,
      'options.add-frame.hidden': target,
      'options.styles.extra': target,
      'options.assets.extra': target
    }
    
    this.Toolbar?.subInput( updates )
  }

  destroy(){
    this.flux.$modela?.off()
    this.flux.$modela?.remove()

    this.flux.$root?.off()
  }

  /**
   * Return an element dimension and position 
   * situation in the DOM
   */
  getTopography( $elem: JQuery<HTMLElement> ){
    if( !$elem.length )
      throw new Error('Invalid method call. Expected a valid element')
    
    /**
     * View position coordinates in the DOM base on
     * which related triggers will be positionned.
     */
    let { left, top } = $elem.offset() || { left: CONTROL_EDGE_MARGIN, top: CONTROL_EDGE_MARGIN }

    // Determite position of element relative to window only
    top -= $(window).scrollTop() || 0
    left -= $(window).scrollLeft() || 0
      
    return { 
      x: left,
      y: top,
      width: $elem.width() || 0,
      height: $elem.height() || 0
    }
  }
}
