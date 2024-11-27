import type Modela from '../exports/modela'
import type { Component } from '../component/lips'

import * as Event from './events'
import WS, { WorkspaceInput } from './factory/workspace'
import Toolbar, { ToolbarInput } from './factory/toolbar'
import {
  CONTROL_EDGE_MARGIN,
  CONTROL_ZOOM_DEFAULT_SCALE,
  CONTROL_ZOOM_MIN_SCALE,
  CONTROL_ZOOM_SCALE_STEP,
  CONTROL_ZOOOM_EVEN_SCALE,
  GLOBAL_CONTROL_OPTIONS
} from './constants'

export default class Workspace {
  readonly flux: Modela

  WS?: Component<WorkspaceInput>
  Toolbar?: Component<ToolbarInput>

  $canvas?: JQuery<HTMLElement>
  $vsnapguide?: JQuery<HTMLElement>
  $hsnapguide?: JQuery<HTMLElement>

  $global?: JQuery<HTMLElement>
  $toolbar?: JQuery<HTMLElement>

  /**
   * Default zoom scale
   */
  scale = CONTROL_ZOOM_DEFAULT_SCALE
  /**
   * Initial canvas by default scale
   */
  canvasOffset = { x: 0, y: 0 }
  /**
   * Initial paning position by default scale
   */
  startPan = { x: 0, y: 0 }
  
  isZooming = false
  isPanning = false
  isDragging = false
  
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
    this.WS = WS({})
    $('body').prepend( this.WS.getEl() )

    this.flux.$modela = this.WS.getEl()
    if( !this.flux.$modela?.length )
      throw new Error('Unexpected error occured')

    this.Toolbar = Toolbar({ key: 'global', options: GLOBAL_CONTROL_OPTIONS })
    this.flux.$modela.append( this.Toolbar.getEl() )

    this.$canvas = this.WS.find('> mcanvas')
    this.$canvas.css({
      left: '50%',
      top: '50%',
      transform: `translate(-50%, -50%) scale(${this.scale})`
    })

    this.$vsnapguide = this.WS.find('> snapguide[vertical]').hide()
    this.$hsnapguide = this.WS.find('> snapguide[horizontal]').hide()

    this.$global = this.WS.find('> mglobal')

    // Initialize event listeners
    this.events()
    // Enable panning effect on canvas
    this.enablePan()
    // Initial context/frame controls on global toolbar
    this.switch()
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
    
    /**
     * Handle canvas zoom effect with scroll
     */
    .on('wheel', ( e: any ) => {
      /**
       * Only zoom when holding Ctrl
       */
      if( !e.originalEvent.ctrlKey ) return
      e.cancelable && e.preventDefault()
      
      this.zoomTo( e.originalEvent.deltaY > 0 ? -CONTROL_ZOOM_SCALE_STEP : CONTROL_ZOOM_SCALE_STEP, e )
    })
    // .on('dblclick', '[action]', handler( Event.onAction ) )
  }
  private enablePan(){
    if( !this.flux.$modela?.length ) return

    this.flux.$modela
    /**
     * Handle canvas drag-in-drop panning
     */
    .on('mousedown', ( e: any ) => {
      if( this.isDragging ) return
      
      this.isPanning = true
      this.flux.$modela?.css('cursor', 'grabbing')

      this.startPan.x = e.pageX - this.canvasOffset.x
      this.startPan.y = e.pageY - this.canvasOffset.y
    })
    .on('mouseleave', ( e: any ) => {
      if( !this.isPanning ) return

      this.isPanning = false
      this.flux.$modela?.css('cursor', 'grab')
    })

    $(document)
    .on('mouseup', () => {
      if( !this.isPanning ) return

      this.isPanning = false
      this.flux.$modela?.css('cursor', 'grab')
    })
    .on('mousemove', ( e: any ) => {
      if( !this.isPanning ) return
      e.preventDefault()

      this.canvasOffset.x = e.pageX - this.startPan.x
      this.canvasOffset.y = e.pageY - this.startPan.y

      this.$canvas?.css('transform', `translate(${this.canvasOffset.x}px, ${this.canvasOffset.y}px) scale(${this.scale})`)
    })
  }

  zoomTo( delta: number, e: any ){
    if( !this.$canvas?.length ) return

    const newScale = this.scale + delta // Next scale
    if( newScale <= CONTROL_ZOOM_MIN_SCALE ) return
    
    const
    cursorX = e.originalEvent.pageX,
    cursorY = e.originalEvent.pageY,
    
    // Calculate ffset for infinite zoom
    zoomRatio = newScale / this.scale,

    rect = this.$canvas[0].getBoundingClientRect(),
    offsetX = ( cursorX - rect.left ) * ( CONTROL_ZOOOM_EVEN_SCALE - zoomRatio ),
    offsetY = ( cursorY - rect.top ) * ( CONTROL_ZOOOM_EVEN_SCALE - zoomRatio )

    this.scale = newScale
    this.canvasOffset.x += offsetX
    this.canvasOffset.y += offsetY

    this.$canvas.css('transform', `translate(${this.canvasOffset.x}px, ${this.canvasOffset.y}px) scale(${this.scale})`)

    /**
     * Disable/enable all controls on frame by the canvas
     * scale level.
     */
    // if( this.scale < 0.8 ){
    //   this.flux.frames.each( frame => frame.disable() )
    //   // Show frame controls on global toolbar
    //   this.switch( false )
    // }
    // else {
    //   this.flux.frames.each( frame => frame.enable() )
    //   // Show frame controls on global toolbar
    //   this.switch( true )
    // }
  }

  switch( target: boolean = false ){
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
    this.flux.$modela?.off()
    this.flux.$modela?.remove()

    this.flux.$root?.off()
  }
  overview(){
    this.scale = CONTROL_ZOOM_DEFAULT_SCALE
    this.$canvas?.css('transform', `translate(-50%, -50%) scale(${this.scale})`)
    this.switch( false )
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
