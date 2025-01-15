import type Handles from '.'
import type { HandleInterface } from '.'

import $ from 'cash-dom'

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
     * - wrapper element
     */
    if( !$(e.target).is( this.context.$viewport ) ) return

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
    this.context.isPanning = false
    this.context.$viewport.css('cursor', 'grab')
  }

  apply(){
    if( !this.context.$viewport.length ) return

    this.context
    .events( this.context.$viewport )
    .on('mousedown.pan', e => this.start(e))
    
    this.context
    .events( document )
    .on('mousemove.pan', e => this.handle(e))
    .on('mouseup.pan', () => this.stop())
  }
  discard(){
    this.context.events( this.context.$viewport ).off('.pan')
    this.context.events( document ).off('.pan')
  }
}