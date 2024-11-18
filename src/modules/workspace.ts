import type Modela from '../exports/modela'
import type { Component } from '../component/lips'

import * as Event from './events'
import {
  Toolbar,
  ToolbarInput,
  WorkspaceLayer,
  WorkspaceLayerInput
} from './factory'
import {
  CONTROL_EDGE_MARGIN,
  CONTROL_ZOOM_DEFAULT_SCALE,
  CONTROL_ZOOM_MAX_SCALE,
  CONTROL_ZOOM_MIN_SCALE,
  CONTROL_ZOOM_SCALE_STEP,
  GLOBAL_CONTROL_OPTIONS
} from './constants'

export default class Workspace {
  readonly flux: Modela

  WS?: Component<WorkspaceLayerInput>
  Toolbar?: Component<ToolbarInput>

  $canvas?: JQuery<HTMLElement>
  $global?: JQuery<HTMLElement>
  $toolbar?: JQuery<HTMLElement>

  /**
   * Default zoom scale
   */
  scale = CONTROL_ZOOM_DEFAULT_SCALE
  
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
    $('body').prepend( this.WS.getEl() )

    this.flux.$modela = this.WS.getEl()
    if( !this.flux.$modela?.length )
      throw new Error('Unexpected error occured')

    this.Toolbar = Toolbar({ key: 'global', options: GLOBAL_CONTROL_OPTIONS })
    this.flux.$modela.append( this.Toolbar.getEl() )

    this.$canvas = this.WS.find('> mcanvas')
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

    let
    startX: number,
    startY: number,
    scrollLeft: number,
    scrollTop: number,
    isPanning = false
    
    this.flux.$modela
    /**
     * Handle canvas zoom effect with scroll
     */
    .on('wheel', ( e: any ) => {
      /**
       * Only zoom when holding Ctrl
       */
      if( !e.originalEvent.ctrlKey ) return
      e.cancelable && e.preventDefault()

      const delta = e.originalEvent.deltaY
      if( delta > 0 && this.scale < CONTROL_ZOOM_MAX_SCALE ) this.scale += CONTROL_ZOOM_SCALE_STEP
      else if( delta < 0 && this.scale > CONTROL_ZOOM_MIN_SCALE ) this.scale -= CONTROL_ZOOM_SCALE_STEP
      
      this.scale = Math.max( CONTROL_ZOOM_MIN_SCALE, Math.min( CONTROL_ZOOM_MAX_SCALE, this.scale ) )

      // Apply scale transformation
      this.$canvas?.css('transform', `translate(-50%, -50%) scale(${this.scale})`)
    })
    // .on('keypress', ( e: any ) => {
    //   /**
    //    * Only zoom when holding Ctrl
    //    */
    //   if( !e.originalEvent.ctrlKey ) return
    //   e.preventDefault()

    //   console.log( e.keyCode )
    // })

    /**
     * Handle canvas drag-in-drop panning
     */
    .on('mousedown', ( e: any ) => {
      isPanning = true
      
      this.flux.$modela?.css('cursor', 'grabbing')

      startX = e.pageX
      startY = e.pageY
      scrollLeft = this.flux.$modela?.scrollLeft() as number
      scrollTop = this.flux.$modela?.scrollTop() as number
    })
    .on('mouseleave', ( e: any ) => {
      if( isPanning ){
        isPanning = false
        this.flux.$modela?.css('cursor', 'grab')
      }
    })

    $(document)
    .on('mouseup', () => {
      if( isPanning ){
        isPanning = false
        this.flux.$modela?.css('cursor', 'grab')
      }
    })
    .on('mousemove', ( e: any ) => {
      if( !isPanning ) return
      e.preventDefault()

      const 
      x = e.pageX,
      y = e.pageY,
      walkX = ( x - startX ) * 2, // Adjust speed
      walkY = ( y - startY ) * 2

      this.flux.$modela?.scrollLeft( scrollLeft - walkX )
      this.flux.$modela?.scrollTop( scrollTop - walkY )
    })
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
