import type Handles from '.'
import type { HandleInterface } from '.'
import type Holdable from './holdable'

import $ from 'cash-dom'

export default class Creator implements HandleInterface {
  private context: Handles
  private holdable?: Holdable
  
  constructor( context: Handles, holdable?: Holdable ){
    this.context = context
    this.holdable = holdable
  }

  private handle( e: any ){
    if( !this.context.$canvas.length ) return

    /**
     * Ignore dblclick trigger on:
     * - target element
     * - holder element
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
    if( typeof this.context.options.createElement === 'function' ){
      const $element = this.context.options.createElement({ x: cursorX, y: cursorY })

      // Auto-wrap created element
      this.holdable
      && $element.length
      && this.holdable.grab( $element )
    }
  }

  enable(){
    if( !this.context.$viewport.length ) return

    this.context
    .events( this.context.$viewport )
    .on('dblclick.create', e => {
      !this.context.constraints('create', null, e )
      && this.handle(e)
    })
  }
  disable(){
    this.context.events( this.context.$viewport ).off('.create')
  }
}