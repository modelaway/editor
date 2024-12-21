import $, { type Cash } from 'cash-dom'
import type Modela from '../exports/modela'
import type { Component } from '../lib/lips/lips'

import * as Event from './events'
import Viewport, { ViewportInput } from './factory/viewport'
import Toolbar, { ToolbarInput } from './factory/toolbar'
import {
  CONTROL_EDGE_MARGIN,
  GLOBAL_CONTROL_OPTIONS
} from './constants'

export default class Editor {
  readonly flux: Modela

  Viewport?: Component<ViewportInput>
  Toolbar?: Component<ToolbarInput>

  // $vsnapguide?: Cash
  // $hsnapguide?: Cash

  $global?: Cash
  $toolbar?: Cash

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
     * Create modela viewport layer and apply translation 
     * to text contents
     */
    this.Viewport = Viewport({})
    $('body').prepend( this.Viewport.getNode() )

    this.flux.$viewport = this.Viewport.getNode()
    if( !this.flux.$viewport?.length )
      throw new Error('Unexpected error occured')

    this.Toolbar = Toolbar({ key: 'global', options: GLOBAL_CONTROL_OPTIONS })
    this.Toolbar.appendTo( this.flux.$viewport )

    // this.$vsnapguide = this.Viewport.find(':scope > snapguide[vertical]')?.hide()
    // this.$hsnapguide = this.Viewport.find(':scope > snapguide[horizontal]')?.hide()

    this.$global = this.Viewport.find(':scope > mglobal')

    // Initialize event listeners
    this.events()
    // Enable canvas controls
    this.flux.canvas.enable()
    this.watch()
  }

  events(){
    if( !this.flux.$viewport?.length ) return

    const self = this
    function handler( fn: Function ){
      return function( this: Cash ){
        typeof fn === 'function' && fn( $(this), self )
      }
    }
    
    this.flux.$viewport
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

  watch( target: boolean = false ){
    const updates = {
      'options.undo.hidden': !target,
      'options.redo.hidden': !target,
      'options.overview.hidden': !target,
      'options.add-frame.hidden': target,
      'options.styles.extra': target,
      'options.assets.extra': target
    }
    
    this.Toolbar?.subInput( updates )
  }
  destroy(){
    this.flux.$viewport?.off()
    this.flux.$viewport?.remove()

    this.flux.$root?.off()

    this.flux.canvas.disable()
  }

  /**
   * Return an element dimension and position 
   * situation in the DOM
   */
  getTopography( $elem: Cash ){
    if( !$elem.length )
      throw new Error('Invalid method call. Expected a valid element')
    
    /**
     * View position coordinates in the DOM base on
     * which related triggers will be positionned.
     */
    let { left, top } = $elem.offset() || { left: CONTROL_EDGE_MARGIN, top: CONTROL_EDGE_MARGIN }

    // Determite position of element relative to window only
    // top -= $(window).scrollTop() || 0
    // left -= $(window).scrollLeft() || 0
      
    return { 
      x: left,
      y: top,
      width: $elem.width() || 0,
      height: $elem.height() || 0
    }
  }
}
