import type Handles from '.'
import type { HandleInterface } from '.'
import {
  CONTROL_ZOOM_MIN_SCALE,
  CONTROL_ZOOM_SCALE_STEP,
  CONTROL_ZOOOM_EVEN_SCALE
} from '../constants'

export default class Zoomable implements HandleInterface {
  private context: Handles

  constructor( context: Handles ){
    this.context = context
  }

  to( scale: number, origin: Origin ){
    if( !this.context.$canvas.length || scale <= CONTROL_ZOOM_MIN_SCALE ) return
    
    const
    // Calculate offset for infinite zoom
    zoomRatio = scale / this.context.scale,
    rect = this.context.$canvas[0]?.getBoundingClientRect()
    
    if( !rect ) return

    const
    offsetX = ( origin.x - rect.left ) * ( CONTROL_ZOOOM_EVEN_SCALE - zoomRatio ),
    offsetY = ( origin.y - rect.top ) * ( CONTROL_ZOOOM_EVEN_SCALE - zoomRatio )

    this.context.scale = scale
    this.context.canvasOffset.x += offsetX
    this.context.canvasOffset.y += offsetY

    this.context.transformCanvas()
  }
  private handleZoom( e: any ){
    /**
     * Only zoom when holding Ctrl/Alt
     */
    if( !e.ctrlKey && !e.altKey ) return
    e.cancelable && e.preventDefault()

    const 
    cursorPosition: Origin = {
      x: e.pageX,
      y: e.pageY
    },
    delta = e.deltaY > 0 ? -CONTROL_ZOOM_SCALE_STEP : CONTROL_ZOOM_SCALE_STEP
    
    this.to( this.context.scale + delta, cursorPosition )
  }

  apply(){
    if( !this.context.$viewport.length ) return
    this.context.$viewport.on('wheel.zoom', e => this.handleZoom(e) )
  }
  discard(){
    this.context.$viewport.off('.zoom')
  }
}