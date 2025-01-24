import type Handles from '.'
import type { HandleInterface } from '.'
import type SnapGuidable from './snapguidable'

import $, { type Cash } from 'cash-dom'

type ResizeActionType = 'start' | 'handle' | 'stop'

type ElementState = {
  $element: Cash
  originalWidth: number
  originalHeight: number
  originalTop: number
  originalLeft: number
  originalPositionType: string
}

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
  private elementStates: ElementState[] = []

  constructor( context: Handles, snapguide?: SnapGuidable ){
    this.context = context
    this.snapguide = snapguide
  }

  private captureElementStates( $wrapper: Cash ){
    this.elementStates = []
    const $elements = $wrapper.find(`:scope > scope > ${this.context.options.element}`)
    
    $elements.each( ( _, element ) => {
      const $element = $(element)
      this.elementStates.push({
        $element,
        originalWidth: $element.outerWidth() || 0,
        originalHeight: $element.outerHeight() || 0,
        originalTop: parseFloat( $element.css('top') as string ) || 0,
        originalLeft: parseFloat( $element.css('left') as string ) || 0,
        originalPositionType: $element.css('position') as string
      })
    })
  }

  private updateElementsRelatively( scaleX: number, scaleY: number, deltaX: number, deltaY: number ){
    this.elementStates.forEach( state => {
      // Calculate new dimensions
      const
      newWidth = Math.max( state.originalWidth * scaleX, 10 ),
      newHeight = Math.max( state.originalHeight * scaleY, 10 )

      // For left/top resizing, adjust position based on the change in dimensions
      const
      widthDiff = newWidth - state.originalWidth,
      heightDiff = newHeight - state.originalHeight,
      newTop = state.originalTop + (deltaY ? (state.originalTop / this.startHeight!) * deltaY : 0),
      newLeft = state.originalLeft + (deltaX ? (state.originalLeft / this.startWidth!) * deltaX : 0)

      state.$element.css({
        width: `${newWidth}px`,
        height: `${newHeight}px`,
        top: `${newTop}px`,
        left: `${newLeft}px`
      })
    })
  }

  private start( e: any, $handle: Cash ){
    this.$handle = $handle
    this.$wrapper = this.$handle?.closest( this.context.options.WRAPPER_TAG )

    if( !this.$wrapper?.length ) return

    this.context.isResizing = true

    this.cursorX = e.pageX
    this.cursorY = e.pageY

    this.startWidth = parseFloat( this.$wrapper.css('width') as string )
    this.startHeight = parseFloat( this.$wrapper.css('height') as string )
    this.startTop = parseFloat( this.$wrapper.css('top') as string ) || 0
    this.startLeft = parseFloat( this.$wrapper.css('left') as string ) || 0

    this.captureElementStates( this.$wrapper )
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
    newLeft = this.startLeft,
    deltaX = 0,
    deltaY = 0

    // Left side resizing
    if( this.$handle?.hasClass('tl')
        || this.$handle?.hasClass('le')
        || this.$handle?.hasClass('bl') ){
      const widthChange = ( e.pageX - this.cursorX ) * scaleQuo

      if( this.startWidth - widthChange > this.context.options.MIN_WIDTH ){
        deltaX = -widthChange
        newWidth = this.startWidth - widthChange
        newLeft = this.startLeft + widthChange
      }
    }

    // Top side resizing
    if( this.$handle?.hasClass('tl')
        || this.$handle?.hasClass('te')
        || this.$handle?.hasClass('tr') ){
      const heightChange = ( e.pageY - this.cursorY ) * scaleQuo

      if( this.startHeight - heightChange > this.context.options.MIN_HEIGHT ){
        deltaY = -heightChange
        newHeight = this.startHeight - heightChange
        newTop = this.startTop + heightChange
      }
    }

    // Right side resizing
    if( this.$handle?.hasClass('tr')
        || this.$handle?.hasClass('re')
        || this.$handle?.hasClass('br') ){
      const widthChange = ( e.pageX - this.cursorX ) * scaleQuo
      newWidth = Math.max( this.startWidth + widthChange, this.context.options.MIN_WIDTH )
      deltaX = newWidth - this.startWidth
    }

    // Bottom side resizing
    if( this.$handle?.hasClass('bl')
        || this.$handle?.hasClass('be')
        || this.$handle?.hasClass('br') ){
      const heightChange = ( e.pageY - this.cursorY ) * scaleQuo
      newHeight = Math.max( this.startHeight + heightChange, this.context.options.MIN_HEIGHT )
      deltaY = newHeight - this.startHeight
    }

    if( this.snapguide ){
      const snapped = this.snapguide.calculate( this.$wrapper, newLeft, newTop, newWidth, newHeight )

      if( snapped ){
        newLeft = snapped.newLeft
        newTop = snapped.newTop
      }
    }

    // Update wrapper dimensions
    this.$wrapper.css({
      width: `${newWidth}px`,
      height: `${newHeight}px`,
      top: `${newTop}px`,
      left: `${newLeft}px`
    })

    // Calculate scale factors
    const
    scaleX = newWidth / this.startWidth,
    scaleY = newHeight / this.startHeight

    // Update all elements with new scale factors and position changes
    this.elementStates.length > 1
    && this.updateElementsRelatively( scaleX, scaleY, deltaX, deltaY )
  }

  private stop(){
    if( !this.context.isResizing ) return

    this.context.isResizing = false
    this.$handle = undefined
    this.$wrapper = undefined
    this.elementStates = []
    
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
    .on('mousemove.resize', e => {
      !this.context.constraints<ResizeActionType>('resize', 'handle', e )
      && this.handle(e)
    })
    .on('mouseup.resize', e => {
      !this.context.constraints<ResizeActionType>('resize', 'stop', e )
      && this.stop()
    })
  }

  disable(){
    this.context.events( this.context.$canvas ).off('.resize')
    this.context.events( this.context.$viewport ).off('.resize')
  }
}