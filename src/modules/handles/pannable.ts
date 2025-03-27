import type Handles from '.'
import type { HandleInterface } from '.'
import type CanvasBounds from '../canvas/bounds'

import $ from 'cash-dom'

type PanActionType = 'start' | 'handle' | 'stop'

export default class Pannable implements HandleInterface {
  private context: Handles
  private startX = 0
  private startY = 0

  constructor( context: Handles ){
    this.context = context
  }

  private start( e: any ){
    /**
     * Do not initialize panning on: 
     * - resize `.handle`
     * - target element
     * - holder element
     */
    if( !this.context.$viewport.is( e.target ) ) return

    this.context.isPanning = true
    this.context.$viewport.css('cursor', 'grabbing')
    
    this.startX = e.pageX - this.context.canvasOffset.x
    this.startY = e.pageY - this.context.canvasOffset.y
  }
  private handle( e: any ){
    if( !this.context.isPanning ) return
    
    this.context.canvasOffset.x = e.pageX - this.startX
    this.context.canvasOffset.y = e.pageY - this.startY

    this.context.transformCanvas()
  }
  private stop(){
    if( !this.context.isPanning ) return

    this.context.isPanning = false
    this.context.$viewport.css('cursor', 'default')
  }

  panTo({ x, y }: Point ){
    const
    viewportWidth = this.context.$viewport.width(),
    viewportHeight = this.context.$viewport.height(),
    scale = this.context.options.getScale()
    
    /**
     * Calculate the offset needed to center the 
     * element.
     * 
     * IMPORTANT: The negative sign is needed to move
     *            the canvas in the opposite direction
     */
    this.context.canvasOffset.x = (viewportWidth / 2) - (x * scale)
    this.context.canvasOffset.y = (viewportHeight / 2) - (y * scale)

    this.context.transformCanvas()
  }
  center( bounds?: CanvasBounds ){
    const
    viewportWidth = this.context.$viewport.width(),
    viewportHeight = this.context.$viewport.height(),
    scale = this.context.options.getScale()

    /**
     * Center the virtual canvas in the viewport center
     */
    if( bounds ){
      this.context.canvasOffset.x = (viewportWidth / 2) - (bounds.centerX * scale)
      this.context.canvasOffset.y = (viewportHeight / 2) - (bounds.centerY * scale)
    }
    // Position anything at viewport center
    else {
      this.context.canvasOffset.x = viewportWidth / 2
      this.context.canvasOffset.y = viewportHeight / 2
    }

    this.context.transformCanvas()
  }

  enable(){
    if( !this.context.$viewport.length ) return
    
    this.context
    .events( this.context.$viewport )
    .on('mousedown.pan', e => {
      !this.context.constraints<PanActionType>('pan', 'start', e )
      && this.start(e)
    })

    // TEST: Pan to
    // .on('click', e => {
    //   this.panTo( 0, 3000 )
    // })
    // .on('click', () => {
    //   this.center()
    // })
    
    this.context
    .events( document )
    .on('mousemove.pan', e => {
      !this.context.constraints<PanActionType>('pan', 'handle', e )
      && this.handle(e)
    })
    .on('mouseup.pan', e => {
      !this.context.constraints<PanActionType>('pan', 'stop', e )
      && this.stop()
    })
  }
  disable(){
    this.context.events( this.context.$viewport ).off('.pan')
    this.context.events( document ).off('.pan')
  }
}