import type Handles from '.'
import type { HandleInterface } from '.'
import type SnapGuidable from './snapguidable'

import $, { type Cash } from 'cash-dom'

type ResizeActionType = 'start' | 'handle' | 'stop'

export default class Resizable implements HandleInterface {
  private context: Handles
  private $handle?: Cash
  private $wrapper?: Cash
  private cursorX = 0
  private cursorY = 0
  private startTop = 0
  private startLeft = 0
  private startWidth?: number
  private startHeight?: number
  private snapguide?: SnapGuidable

  constructor( context: Handles, snapguide?: SnapGuidable ){
    this.context = context
    this.snapguide = snapguide
  }

  private start( e: any, $handle: Cash ){
    this.$handle = $handle
    this.$wrapper = this.$handle?.closest( this.context.options.WRAPPER_TAG )

    this.context.isResizing = true

    this.cursorX = e.pageX
    this.cursorY = e.pageY

    this.startWidth = parseFloat( this.$wrapper?.css('width') as string )
    this.startHeight = parseFloat( this.$wrapper?.css('height') as string )
    this.startTop = parseFloat( this.$wrapper?.css('top') as string ) || 0
    this.startLeft = parseFloat( this.$wrapper?.css('left') as string ) || 0
  }
  private handle( e: any ){
    if( !this.context.isResizing
        || !this.$wrapper?.length
        || this.startWidth === undefined
        || this.startHeight === undefined ) return

    let
    scaleQuo = this.context.getScaleQuo(),
    newWidth = this.startWidth,
    newHeight = this.startHeight,
    newTop = this.startTop,
    newLeft = this.startLeft

    // Calculate new dimensions and positions
    if( this.$handle?.hasClass('tl')
        || this.$handle?.hasClass('lc')
        || this.$handle?.hasClass('bl') ){
      const widthChange = ( e.pageX - this.cursorX ) * scaleQuo

      if( this.startWidth - widthChange > this.context.options.MIN_WIDTH ){
        newWidth = this.startWidth - widthChange
        newLeft = this.startLeft + widthChange
      }
      else {
        newWidth = this.context.options.MIN_WIDTH 
        newLeft = this.startLeft + ( this.startWidth - this.context.options.MIN_WIDTH )
      }
    }

    if( this.$handle?.hasClass('tl')
        || this.$handle?.hasClass('tc')
        || this.$handle?.hasClass('tr') ){
      const heightChange = ( e.pageY - this.cursorY ) * scaleQuo

      if( this.startHeight - heightChange > this.context.options.MIN_HEIGHT ){
        newHeight = this.startHeight - heightChange
        newTop = this.startTop + heightChange
      }
      else {
        newHeight = this.context.options.MIN_HEIGHT
        newTop = this.startTop + ( this.startHeight - this.context.options.MIN_HEIGHT )
      }
    }

    if( this.$handle?.hasClass('tr')
        || this.$handle?.hasClass('rc')
        || this.$handle?.hasClass('br') )
      newWidth = this.startWidth + ( ( e.pageX - this.cursorX ) * scaleQuo )

    if( this.$handle?.hasClass('bl')
        || this.$handle?.hasClass('bc')
        || this.$handle?.hasClass('br') )
      newHeight = this.startHeight + ( ( e.pageY - this.cursorY ) * scaleQuo )

    if( this.snapguide ){
      const snapped = this.snapguide.calculate( this.$wrapper, newLeft, newTop, newWidth, newHeight )

      if( snapped ){
        newLeft = snapped.newLeft
        newTop = snapped.newTop
      }
    }

    this.$wrapper.css({
      width: `${Math.max( newWidth, this.context.options.MIN_WIDTH )}px`,
      height: `${Math.max( newHeight, this.context.options.MIN_HEIGHT )}px`,
      top: `${newTop}px`,
      left: `${newLeft}px`
    })
  }
  private stop(){
    if( !this.context.isResizing ) return

    this.context.isResizing = false
    this.$handle = undefined
    this.$wrapper = undefined

    this.snapguide?.hide()
  }

  enable(){
    if( !this.context.$canvas.length ) return

    this.context
    .events( this.context.$canvas )
    .on('mousedown.resize', '.handle', e => {
      !this.context.constraints<ResizeActionType>('resize', 'start', e )
      && this.start( e, $(e.target) )
    })
    
    this.context
    .events( this.context.$viewport )
    .on('mousemove.resize', e => this.handle(e))
    .on('mouseup.resize', () => this.stop())
  }
  disable(){
    this.context.events( this.context.$canvas ).off('.resize')
    this.context.events( this.context.$viewport ).off('.resize')
  }
}