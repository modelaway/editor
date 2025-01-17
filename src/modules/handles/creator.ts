import type Handles from '.'
import type { HandleInterface } from '.'
import type Wrappable from './wrappable'

import $ from 'cash-dom'

export default class Creator implements HandleInterface {
  private context: Handles
  
  constructor( context: Handles, wrappable?: Wrappable ){
    this.context = context
    
  }

  private handle( e: any ){
    if( !this.context.$canvas.length ) return

    /**
     * Ignore dblclick trigger on:
     * - target element
     * - wrapper element
     */
    if( !$(e.target).is( this.context.$viewport ) ) return

    const rect = this.context.$canvas.get(0)?.getBoundingClientRect()
    if( !rect ) return

    const
    cursorX = ( e.pageX - rect.left ) / this.context.options.getScale(),
    cursorY = ( e.pageY - rect.top ) / this.context.options.getScale()

    /**
     * Handle creation process via external
     * controls.
     */
    typeof this.context.options.createElement === 'function'
    && this.context.options.createElement({ x: cursorX, y: cursorY })
  }

  enable(){
    if( !this.context.$viewport.length ) return

    this.context
    .events( this.context.$viewport )
    .on('dblclick.create', e => this.handle(e))
  }
  disable(){
    this.context.events( this.context.$viewport ).off('.create')
  }
}