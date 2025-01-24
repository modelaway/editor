import type Handles from '.'
import type { HandleInterface } from '.'
import type FrameStyle from '../frame/styles'
import type Stylesheet from '../stylesheet'

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
  centerX: SnapPoint[]
  centerY: SnapPoint[]
  centerToEdgeX: SnapPoint[]
  centerToEdgeY: SnapPoint[]
  edgeToCenterX: SnapPoint[]
  edgeToCenterY: SnapPoint[]
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
    borderTop = parseFloat( $wrapper.css('border-top-width') || '0' ),
    borderLeft = parseFloat( $wrapper.css('border-left-width') || '0' ),
    borderRight = parseFloat( $wrapper.css('border-right-width') || '0' ),
    borderBottom = parseFloat( $wrapper.css('border-bottom-width') || '0' )
    
    const
    wrapperWidth = newWidth || parseFloat( $wrapper.css('width') as string ),
    wrapperHeight = newHeight || parseFloat( $wrapper.css('height') as string ),
    newRight = newLeft + wrapperWidth,
    newBottom = newTop + wrapperHeight,
    newCenterX = newLeft + (wrapperWidth / 2),
    newCenterY = newTop + (wrapperHeight / 2)

    let
    self = this,
    /**
     * Apply scale quo different to a shadow island 
     * viewport environment.
     */
    scaleQuo = this.context.$viewport[0] instanceof ShadowRoot ? this.context.getScaleQuo() : 1,
    snapPoints: SnapPoints = {
      left: [],
      right: [],
      top: [],
      bottom: [],
      centerX: [],
      centerY: [],
      centerToEdgeX: [],
      centerToEdgeY: [],
      edgeToCenterX: [],
      edgeToCenterY: []
    }

    this.hide()

    const 
    selector = `${this.context.options.element}:not(${this.context.options.WRAPPER_TAG},${this.context.options.WRAPPER_TAG} > scope,${this.context.options.WRAPPER_TAG} > .handle)`,
    nodes = this.context.$canvas.find( selector )

    nodes?.each( function(){
      const
      $other = $(this),
      otherLeft = parseFloat( $other.css('left') as string ),
      otherTop = parseFloat( $other.css('top') as string ),
      otherWidth = parseFloat( $other.css('width') as string ),
      otherHeight = parseFloat( $other.css('height') as string ),
      otherRight = otherLeft + otherWidth,
      otherBottom = otherTop + otherHeight,
      otherCenterX = otherLeft + (otherWidth / 2),
      otherCenterY = otherTop + (otherHeight / 2),
      otherRect = self.context.getRelativeRect( $other )
      
      if( !otherRect ) return

      // Edge snapping (existing code)
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

      // Center-to-center snapping
      if( Math.abs( newCenterX - otherCenterX ) < CONTROL_SNAP_THRESHOLD )
        snapPoints.centerX.push({
          position: otherCenterX,
          guidePosition: (otherRect.left + otherRect.right) / 2 * scaleQuo
        })

      if( Math.abs( newCenterY - otherCenterY ) < CONTROL_SNAP_THRESHOLD )
        snapPoints.centerY.push({
          position: otherCenterY,
          guidePosition: (otherRect.top + otherRect.bottom) / 2 * scaleQuo
        })

      // Moving element's center to target's edges
      if( Math.abs( newCenterX - otherLeft ) < CONTROL_SNAP_THRESHOLD )
        snapPoints.centerToEdgeX.push({
          position: otherLeft,
          guidePosition: otherRect.left * scaleQuo
        })
      
      if( Math.abs( newCenterX - otherRight ) < CONTROL_SNAP_THRESHOLD )
        snapPoints.centerToEdgeX.push({
          position: otherRight,
          guidePosition: otherRect.right * scaleQuo
        })

      if( Math.abs( newCenterY - otherTop ) < CONTROL_SNAP_THRESHOLD )
        snapPoints.centerToEdgeY.push({
          position: otherTop,
          guidePosition: otherRect.top * scaleQuo
        })
      
      if( Math.abs( newCenterY - otherBottom ) < CONTROL_SNAP_THRESHOLD )
        snapPoints.centerToEdgeY.push({
          position: otherBottom,
          guidePosition: otherRect.bottom * scaleQuo
        })

      // Moving element's edges to target's center
      if( Math.abs( newLeft - otherCenterX ) < CONTROL_SNAP_THRESHOLD )
        snapPoints.edgeToCenterX.push({
          position: otherCenterX,
          guidePosition: (otherRect.left + otherRect.right) / 2 * scaleQuo
        })
      
      if( Math.abs( newRight - otherCenterX ) < CONTROL_SNAP_THRESHOLD )
        snapPoints.edgeToCenterX.push({
          position: otherCenterX,
          guidePosition: (otherRect.left + otherRect.right) / 2 * scaleQuo
        })

      if( Math.abs( newTop - otherCenterY ) < CONTROL_SNAP_THRESHOLD )
        snapPoints.edgeToCenterY.push({
          position: otherCenterY,
          guidePosition: (otherRect.top + otherRect.bottom) / 2 * scaleQuo
        })
      
      if( Math.abs( newBottom - otherCenterY ) < CONTROL_SNAP_THRESHOLD )
        snapPoints.edgeToCenterY.push({
          position: otherCenterY,
          guidePosition: (otherRect.top + otherRect.bottom) / 2 * scaleQuo
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

    // Center-to-center snapping
    if( snapPoints.centerX.length > 0 ){
      finalLeft = snapPoints.centerX[0].position - (wrapperWidth / 2)
      snapPoints.centerX.forEach( point => self.showGuide('vertical', point ) )
    }
    
    if( snapPoints.centerY.length > 0 ){
      finalTop = snapPoints.centerY[0].position - (wrapperHeight / 2)
      snapPoints.centerY.forEach( point => self.showGuide('horizontal', point ) )
    }

    // Moving element's center to target's edges
    if( snapPoints.centerToEdgeX.length > 0 ){
      finalLeft = snapPoints.centerToEdgeX[0].position - (wrapperWidth / 2)
      snapPoints.centerToEdgeX.forEach( point => self.showGuide('vertical', point ) )
    }
    
    if( snapPoints.centerToEdgeY.length > 0 ){
      finalTop = snapPoints.centerToEdgeY[0].position - (wrapperHeight / 2)
      snapPoints.centerToEdgeY.forEach( point => self.showGuide('horizontal', point ) )
    }

    // Moving element's edges to target's center
    if( snapPoints.edgeToCenterX.length > 0 ){
      const leftDistance = Math.abs(newLeft - snapPoints.edgeToCenterX[0].position)
      const rightDistance = Math.abs(newRight - snapPoints.edgeToCenterX[0].position)
      
      if( leftDistance < CONTROL_SNAP_THRESHOLD && leftDistance < rightDistance ){
        finalLeft = snapPoints.edgeToCenterX[0].position
      } else if( rightDistance < CONTROL_SNAP_THRESHOLD ){
        finalLeft = snapPoints.edgeToCenterX[0].position - wrapperWidth
      }
      snapPoints.edgeToCenterX.forEach( point => self.showGuide('vertical', point ) )
    }
    
    if( snapPoints.edgeToCenterY.length > 0 ){
      const topDistance = Math.abs(newTop - snapPoints.edgeToCenterY[0].position)
      const bottomDistance = Math.abs(newBottom - snapPoints.edgeToCenterY[0].position)
      
      if( topDistance < CONTROL_SNAP_THRESHOLD && topDistance < bottomDistance ){
        finalTop = snapPoints.edgeToCenterY[0].position
      } else if( bottomDistance < CONTROL_SNAP_THRESHOLD ){
        finalTop = snapPoints.edgeToCenterY[0].position - wrapperHeight
      }
      snapPoints.edgeToCenterY.forEach( point => self.showGuide('horizontal', point ) )
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