import type Handles from '.'
import type { HandleInterface } from '.'
import { enableHardwareAcceleration } from '../utils'
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
  private $holder?: Cash
  private cursorX = 0
  private cursorY = 0
  private startTop = 0
  private startLeft = 0
  private startWidth?: number
  private startHeight?: number
  private snapguide?: SnapGuidable
  private elementStates: ElementState[] = []
  private pendingUpdates: Map<Cash, CSSProperties>
  private animationFrame?: number

  constructor( context: Handles, snapguide?: SnapGuidable ){
    this.context = context
    this.snapguide = snapguide

    this.pendingUpdates = new Map()
  }

  private captureElementStates( $holder: Cash ){
    this.elementStates = []
    const $elements = $holder.find(`:scope > scope > [${this.context.options.attribute}]`)
    
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

  private batchDOMUpdate( $element: Cash, styles: CSSProperties ){
    this.pendingUpdates.set( $element, styles )
    
    if( !this.animationFrame )
      this.animationFrame = requestAnimationFrame( () => {
        this.pendingUpdates.forEach( ( styles, $element ) => $element.css( styles as any ) )
        this.pendingUpdates.clear()

        this.animationFrame = undefined
      })
  }

  private updateElementsRelatively( scaleX: number, scaleY: number, deltaX: number, deltaY: number ){
    const updates = this.elementStates.map( state => {
      // Calculate new dimensions
      const
      newWidth = Math.max( state.originalWidth * scaleX, 10 ),
      newHeight = Math.max( state.originalHeight * scaleY, 10 ),

      // For left/top resizing, adjust position based on the change in dimensions
      // widthDiff = newWidth - state.originalWidth,
      // heightDiff = newHeight - state.originalHeight,
      newTop = state.originalTop + (deltaY ? (state.originalTop / this.startHeight!) * deltaY : 0),
      newLeft = state.originalLeft + (deltaX ? (state.originalLeft / this.startWidth!) * deltaX : 0)

      return {
        $element: state.$element,
        styles: {
          width: `${newWidth}px`,
          height: `${newHeight}px`,
          top: `${newTop}px`,
          left: `${newLeft}px`
        }
      }
    })

    updates.forEach( ({ $element, styles }) => this.batchDOMUpdate( $element, styles ) )
  }

  private start( e: any, $handle: Cash ){
    this.$handle = $handle
    this.$holder = this.$handle?.closest( this.context.options.HOLDER_TAG )

    const NO_RESIZE_ALLOWED_ATTR = `[${this.context.options.attribute}][noresize]`
    if( !this.$holder?.length
        || this.$holder?.find( NO_RESIZE_ALLOWED_ATTR ).length ) return

    this.context.isResizing = true

    this.cursorX = e.pageX
    this.cursorY = e.pageY

    this.startWidth = parseFloat( this.$holder.css('width') as string )
    this.startHeight = parseFloat( this.$holder.css('height') as string )
    this.startTop = parseFloat( this.$holder.css('top') as string ) || 0
    this.startLeft = parseFloat( this.$holder.css('left') as string ) || 0

    enableHardwareAcceleration( this.$holder )
    this.captureElementStates( this.$holder )

    this.elementStates.forEach( state => enableHardwareAcceleration( state.$element ) )
  }
  private handle( e: any ){
    if( !this.context.isResizing
        || !this.$holder?.length
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
      const snapped = this.snapguide.calculate( this.$holder, newLeft, newTop, newWidth, newHeight )

      if( snapped ){
        newLeft = snapped.newLeft
        newTop = snapped.newTop
      }
    }

    // Update holder dimensions
    this.batchDOMUpdate( this.$holder, {
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
    this.$holder = undefined
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