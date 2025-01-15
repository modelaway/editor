import type Handles from '.'
import type { HandleInterface } from '.'
import type FrameStyle from '../frame/styles'
import type Stylesheet from '../../lib/stylesheet'

import $, { type Cash } from 'cash-dom'
import {
  CONTROL_SNAP_THRESHOLD
} from '../constants'

export default class SnapGuidable implements HandleInterface {
  private context: Handles
  private style: Stylesheet | FrameStyle
  
  private $vsnapguide = $('<snapguide vertical></snapguide>')
  private $hsnapguide = $('<snapguide horizontal></snapguide>')

  constructor( context: Handles ){
    this.context = context
    this.style = this.context.styles('snapguide', this.getStyleSheet() )
  }

  private getStyleSheet(){
    return `
      snapguide {
        position: absolute;
        z-index: 999;
        background-color: rgba(0, 0, 255, 0.5);
        pointer-events: none;

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

  calculate( $wrapper: Cash, newLeft: number, newTop: number, newWidth?: number, newHeight?: number ){
    if( !this.context.$canvas.length ) return

    const
    wrapperWidth = newWidth || parseFloat( $wrapper.css('width') as string ),
    wrapperHeight = newHeight || parseFloat( $wrapper.css('height') as string ),
    newRight = newLeft + wrapperWidth,
    newBottom = newTop + wrapperHeight

    let
    // Check alignment with other elements
    closestLeft = null,
    closestTop = null,
    closestRight = null,
    closestBottom = null,

    hsnapTop = 0,
    vsnapLeft = 0

    this.context.$canvas
    .find( this.context.options.element )
    .not( $wrapper.find( this.context.options.element ) )
    .each( function(){
      const
      $other = $(this),
      otherLeft = parseFloat( $other.css('left') as string ),
      otherTop = parseFloat( $other.css('top') as string ),
      otherRight = otherLeft + parseFloat( $other.css('width') as string ),
      otherBottom = otherTop + parseFloat( $other.css('height') as string ),

      otherRect = $other[0]?.getBoundingClientRect()
      if( !otherRect ) return

      // Snap to other elements' left and right edges
      if( Math.abs( newLeft - otherLeft ) < CONTROL_SNAP_THRESHOLD ){
        closestLeft = otherLeft
        vsnapLeft = otherRect.left
      }
      if( Math.abs( newLeft - otherRight ) < CONTROL_SNAP_THRESHOLD ){
        closestLeft = otherRight
        vsnapLeft = otherRect.right
      }
      if( Math.abs( newRight - otherLeft ) < CONTROL_SNAP_THRESHOLD ){
        closestRight = otherLeft
        vsnapLeft = otherRect.left
      }
      if( Math.abs( newRight - otherRight ) < CONTROL_SNAP_THRESHOLD ){
        closestRight = otherRight
        vsnapLeft = otherRect.right
      }

      // Snap to other elements' top and bottom edges
      if( Math.abs( newTop - otherTop ) < CONTROL_SNAP_THRESHOLD ){
        closestTop = otherTop
        hsnapTop = otherRect.top
      }
      if( Math.abs( newTop - otherBottom ) < CONTROL_SNAP_THRESHOLD ){
        closestTop = otherBottom
        hsnapTop = otherRect.bottom
      }
      if( Math.abs( newBottom - otherTop ) < CONTROL_SNAP_THRESHOLD ){
        closestBottom = otherTop
        hsnapTop = otherRect.top
      }
      if( Math.abs( newBottom - otherBottom ) < CONTROL_SNAP_THRESHOLD ){
        closestBottom = otherBottom
        hsnapTop = otherRect.bottom
      }
    })

    // Use closest alignment point or snap to grid
    if( closestLeft !== null ){
      newLeft = closestLeft

      this.$vsnapguide
      .css({ left: `${vsnapLeft}px`, top: 0 })
      .appendTo( this.context.$viewport )
    }
    else if( closestRight !== null ){
      newLeft = closestRight - wrapperWidth

      this.$vsnapguide
      .css({ left: `${vsnapLeft}px`, top: 0 })
      .appendTo( this.context.$viewport )
    }
    else this.$vsnapguide.remove()

    if( closestTop !== null ){
      newTop = closestTop

      this.$hsnapguide
      .css({ left: 0, top: `${hsnapTop}px` })
      .appendTo( this.context.$viewport )
    }
    else if( closestBottom !== null ){
      newTop = closestBottom - wrapperHeight

      this.$hsnapguide
      .css({ left: 0, top: `${hsnapTop}px` })
      .appendTo( this.context.$viewport )
    }
    else this.$hsnapguide.remove()

    return { newLeft, newTop }
  }
  hide(){
    this.$vsnapguide.remove()
    this.$hsnapguide.remove()
  }

  apply(){}
  discard(){
    this.hide()

    /**
     * Clear style by dom type
     */
    'removeRules' in this.style
            ? this.style.removeRules('snapguide')
            : this.style.clear()
  }
}