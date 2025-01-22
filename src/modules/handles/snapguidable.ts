import type Handles from '.'
import type { HandleInterface } from '.'
import type FrameStyle from '../frame/styles'
import type Stylesheet from '../../lib/stylesheet'

import $, { type Cash } from 'cash-dom'
import {
  CONTROL_SNAP_THRESHOLD
} from '../constants'

interface SnapPoint {
  position: number
  guidePosition: number
}

interface SnapPoints {
  left: SnapPoint[]
  right: SnapPoint[]
  top: SnapPoint[]
  bottom: SnapPoint[]
}

export default class SnapGuidable implements HandleInterface {
  private context: Handles
  private style: Stylesheet | FrameStyle
  
  constructor( context: Handles ){
    this.context = context
    this.style = this.context.styles('snapguide', this.getStyleSheet() )
  }

  private getStyleSheet(){
    return `
      snapguide {
        position: absolute;
        z-index: 999;
        background-color: var(--me-primary-color);
        pointer-events: none;
        pointer-events: none;
        will-change: transform;
        transform: translateZ(0);
        backface-visibility: hidden;

        &[horizontal] {
          height: 1px;
          width: 100%;
        }
        &[vertical] {
          width: 1px;
          height: 100%;
        }
      }
    `
  }
  private showGuide( axis: 'horizontal' | 'vertical', point: SnapPoint ){
    (axis === 'vertical'
          ? $(`<snapguide vertical></snapguide>`).css({ left: `${point.guidePosition}px`, top: 0 })
          : $('<snapguide horizontal></snapguide>').css({ left: 0, top: `${point.guidePosition}px` }) )
    .appendTo( this.context.$viewport )
  }

  calculate( $wrapper: Cash, newLeft: number, newTop: number, newWidth?: number, newHeight?: number ){
    if( !this.context.$canvas.length ) return

    const
    wrapperWidth = newWidth || parseFloat( $wrapper.css('width') as string ),
    wrapperHeight = newHeight || parseFloat( $wrapper.css('height') as string ),
    newRight = newLeft + wrapperWidth,
    newBottom = newTop + wrapperHeight

    let
    self = this,
    /**
     * Apply scale quo different to a shadow island 
     * viewport environment.
     */
    scaleQuo = this.context.$viewport[0] instanceof ShadowRoot ? this.context.getScaleQuo() : 1,
    /**
     * Track all snap points
     */
    snapPoints: SnapPoints = {
      left: [],
      right: [],
      top: [],
      bottom: []
    }

    // Clear existing guides first
    this.hide()

    const 
    selector = `${this.context.options.element}:not(${this.context.options.WRAPPER_TAG},${this.context.options.WRAPPER_TAG} > scope,${this.context.options.WRAPPER_TAG} > .handle)`,
    nodes = this.context.$canvas.find( selector )

    nodes?.each( function(){
      const
      $other = $(this),
      otherLeft = parseFloat( $other.css('left') as string ),
      otherTop = parseFloat( $other.css('top') as string ),
      otherRight = otherLeft + parseFloat( $other.css('width') as string ),
      otherBottom = otherTop + parseFloat( $other.css('height') as string ),

      otherRect = self.context.getRelativeRect( $other )
      if( !otherRect ) return

      // Snap to other elements' left and right edges
      if( Math.abs( newLeft - otherLeft ) < CONTROL_SNAP_THRESHOLD )
        snapPoints.left.push({
          position: otherLeft,
          guidePosition: otherRect.left * scaleQuo
        })
      
      if( Math.abs( newLeft - otherRight ) < CONTROL_SNAP_THRESHOLD )
        snapPoints.left.push({
          position: otherRight,
          guidePosition: otherRect.right * scaleQuo
        })
      
      if( Math.abs( newRight - otherLeft ) < CONTROL_SNAP_THRESHOLD )
        snapPoints.right.push({
          position: otherLeft,
          guidePosition: otherRect.left * scaleQuo
        })
      
      if( Math.abs( newRight - otherRight ) < CONTROL_SNAP_THRESHOLD )
        snapPoints.right.push({
          position: otherRight,
          guidePosition: otherRect.right * scaleQuo
        })

      // Snap to other elements' top and bottom edges
      if( Math.abs( newTop - otherTop ) < CONTROL_SNAP_THRESHOLD )
        snapPoints.top.push({
          position: otherTop,
          guidePosition: otherRect.top * scaleQuo
        })
      
      if( Math.abs( newTop - otherBottom ) < CONTROL_SNAP_THRESHOLD )
        snapPoints.top.push({
          position: otherBottom,
          guidePosition: otherRect.bottom * scaleQuo
        })
      
      if( Math.abs( newBottom - otherTop ) < CONTROL_SNAP_THRESHOLD )
        snapPoints.bottom.push({
          position: otherTop,
          guidePosition: otherRect.top * scaleQuo
        })
      
      if( Math.abs( newBottom - otherBottom ) < CONTROL_SNAP_THRESHOLD )
        snapPoints.bottom.push({
          position: otherBottom,
          guidePosition: otherRect.bottom * scaleQuo
        })
    })

    let
    finalLeft = newLeft,
    finalTop = newTop

    // Create and show guides for all snap points
    if( snapPoints.left.length > 0 ){
      finalLeft = snapPoints.left[0].position
      snapPoints.left.forEach( point => self.showGuide('vertical', point ) )
    }
    else if( snapPoints.right.length > 0 ){
      finalLeft = snapPoints.right[0].position - wrapperWidth
      snapPoints.right.forEach( point => self.showGuide('vertical', point ) )
    }

    if( snapPoints.top.length > 0 ){
      finalTop = snapPoints.top[0].position
      snapPoints.top.forEach( point => self.showGuide('horizontal', point ) )
    }
    else if( snapPoints.bottom.length > 0 ){
      finalTop = snapPoints.bottom[0].position - wrapperHeight
      snapPoints.bottom.forEach( point => self.showGuide('horizontal', point ) )
    }

    return { newLeft: finalLeft, newTop: finalTop }
  }
  hide(){
    const $guides = this.context.$viewport.find('snapguide')
    $guides.css('opacity', '0')
    
    /**
     * Remove after transition to avoid ghost effect.
     * Set to 100ms to matches the transition duration
     */
    setTimeout(() => $guides.remove(), 100 )
  }

  enable(){}
  disable(){
    this.hide()

    /**
     * Clear style by dom type
     */
    'removeRules' in this.style
            ? this.style.removeRules('snapguide')
            : this.style.clear()
  }
}