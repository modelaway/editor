import $, { type Cash } from 'cash-dom'
import type Editor from '../editor'

import EventEmitter from 'events'
import Stylesheet from '../stylesheet'
import {
  CONTROL_SNAP_THRESHOLD,
  CONTROL_ZOOM_MIN_SCALE,
  CONTROL_ZOOM_SCALE_STEP,
  CONTROL_ZOOOM_EVEN_SCALE,
  CONTROL_ZOOM_DEFAULT_SCALE
} from '../constants'

const
WRAPPER_TAG = 'rzwrapper',
WRAPPER_SIZE = 10,
WRAPPER_BORDER_WIDTH = 1,

sheet = `
${WRAPPER_TAG} {
  display: inline-block;
  border: ${WRAPPER_BORDER_WIDTH}px solid #007bff; /* Frame border */
  box-sizing: border-box;

  /* Handles (pseudo-elements) */
  .handle {
    content: '';
    position: absolute;
    width: ${WRAPPER_SIZE}px; /* Adjust handle size */
    height: ${WRAPPER_SIZE}px;
    background: #007bff;
    cursor: pointer;

    &.tl { top: -5px; left: -5px; cursor: nwse-resize; } /* Top-left */
    &.tr { top: -5px; right: -5px; cursor: nesw-resize; } /* Top-right */
    &.bl { bottom: -5px; left: -5px; cursor: nesw-resize; } /* Bottom-left */
    &.br { bottom: -5px; right: -5px; cursor: nwse-resize; } /* Bottom-right */
    &.tc { top: -5px; left: 50%; transform: translateX(-50%); cursor: ns-resize; } /* Top-center */
    &.bc { bottom: -5px; left: 50%; transform: translateX(-50%); cursor: ns-resize; } /* Bottom-center */
    &.lc { left: -5px; top: 50%; transform: translateY(-50%); cursor: ew-resize; } /* Left-center */
    &.rc { right: -5px; top: 50%; transform: translateY(-50%); cursor: ew-resize; } /* Right-center */
  }
}

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

export type HandleOptions = {
  target: string
  MIN_WIDTH: number
  MIN_HEIGHT: number
}

export default class Handle extends EventEmitter {
  private editor: Editor
  private style: Stylesheet
  private options: HandleOptions
  
  public isMoving = false
  public isPanning = false
  public isResizing = false
  
  private $handle?: Cash
  private $wrapper?: Cash

  private $vsnapguide = $('<snapguide vertical></snapguide>')
  private $hsnapguide = $('<snapguide horizontal></snapguide>')

  private cursorX: number = 0
  private cursorY: number = 0
  private startTop: number = 0
  private startLeft: number = 0
  private startWidth?: number
  private startHeight?: number

  /**
   * Default zoom scale
   */
  public scale = CONTROL_ZOOM_DEFAULT_SCALE
  /**
   * Initial canvas by default scale
   */
  private canvasOffset = { x: 0, y: 0 }
  /**
   * Initial paning position by default scale
   */
  private startPan = { x: 0, y: 0 }

  constructor( editor: Editor, options?: HandleOptions ){
    super()
    this.editor = editor

    this.options = {
      target: '.content',
      MIN_WIDTH: 50,
      MIN_HEIGHT: 50,
      
      ...options
    }

    this.style = new Stylesheet('handle', { sheet, meta: true })
    this.zoomTo( 0, { x: 0, y: 0 })
  }

  private snapguide( $wrapper: Cash, newLeft: number, newTop: number, newWidth?: number, newHeight?: number ){
    if( !this.editor.canvas.$?.length ) return

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

    this.editor.canvas.$
    .find( this.options.target )
    .not( $wrapper.find( this.options.target ) )
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
      .appendTo( this.editor.$viewport )
    }
    else if( closestRight !== null ){
      newLeft = closestRight - wrapperWidth

      this.$vsnapguide
      .css({ left: `${vsnapLeft}px`, top: 0 })
      .appendTo( this.editor.$viewport )
    }
    else this.$vsnapguide.remove()

    if( closestTop !== null ){
      newTop = closestTop

      this.$hsnapguide
      .css({ left: 0, top: `${hsnapTop}px` })
      .appendTo( this.editor.$viewport )
    }
    else if( closestBottom !== null ){
      newTop = closestBottom - wrapperHeight

      this.$hsnapguide
      .css({ left: 0, top: `${hsnapTop}px` })
      .appendTo( this.editor.$viewport )
    }
    else this.$hsnapguide.remove()

    return { newLeft, newTop }
  }
  private create( e: any ){
    if( !this.editor.canvas.$?.length ) return

    /**
     * Ignore dblclick trigger on:
     * - target element
     * - wrapper element
     */
    if( !$(e.target).is( this.editor.$viewport ) ) return

    const rect = this.editor.canvas.$.get(0)?.getBoundingClientRect()
    if( !rect ) return
      
    this.cursorX = ( e.pageX - rect.left ) / this.scale
    this.cursorY = ( e.pageY - rect.top ) / this.scale
    
    this.editor.canvas.addFrame({
      position: {
        top: `${this.cursorY}px`,
        left: `${this.cursorX}px`
      },
      size: {
        width: `${this.options.MIN_WIDTH}px`,
        height: `${this.options.MIN_HEIGHT}px`
      }
    })
  }
  private activate( e: any, $target: Cash ){
    // Prevent duplicate wrapping
    if( !e.altKey || $target.data('is-wrapped') ) return

    const
    // Extract essential styles from the content
    originalStyles = {
      position: $target.css('position'),
      zIndex: $target.css('z-index'),
      marginTop: $target.css('margin-top'),
      marginLeft: $target.css('margin-left'),
      marginBottom: $target.css('margin-bottom'),
      marginRight: $target.css('margin-right'),
      top: parseFloat( $target.css('top') as string ) || $target.position()?.top,
      left: parseFloat( $target.css('left') as string ) || $target.position()?.left
    },
    // Create a wrapper with the same essential styles
    // @ts-ignore
    $wrapper = $(`<${WRAPPER_TAG}></${WRAPPER_TAG}>`).css({
      position: originalStyles.position 
                && ['fixed', 'absolute'].includes( originalStyles.position ) ? 
                    originalStyles.position
                    : 'relative',
      zIndex: originalStyles.zIndex,
      top: originalStyles.top,
      left: originalStyles.left,
      width: $target.outerWidth(),
      height: $target.outerHeight(),
      boxSizing: 'border-box',
      // borderWidth: `${WRAPPER_BORDER_WIDTH * scaleQuo}px`
    })
    // .find('.handle').css({ width: `${WRAPPER_SIZE * scaleQuo}px`, height: `${WRAPPER_SIZE * scaleQuo}px` })

    // Temporarily overlay the content
    $target
    .data('is-wrapped', true )
    .data('original-style', originalStyles )
    .css({
      margin: 0,
      width: '100%',
      height: '100%',
      position: 'static' // Reset to prevent interference during wrapping
    })
    // Add the wrapper at the same level
    .before( $wrapper )

    $wrapper.append( $target as any)

    // Add resizing handles
    const handles = originalStyles.position && ['fixed', 'absolute'].includes( originalStyles.position ) ?
                /**
                 * Resize from every side and angle 
                 * of the element
                 */
                ['tl', 'tr', 'bl', 'br', 'tc', 'bc', 'lc', 'rc']
                /**
                 * Relative-like position element can only be resized
                 * from the `right` and `bottom` sides and the `right-bottom`
                 * angle of the element to maintain the `left-top` position 
                 * relative to its parent element.
                 */
                : ['br', 'bc', 'rc']
    handles.forEach( ( htype ) => $wrapper.append(`<div class="handle ${htype}"></div>`) )
  }
  private deactivate( e: any ){
    if( $(e.target).is( this.options.target )
        || $(e.target).closest( WRAPPER_TAG ).length ) return

    const
    self = this,
    $wrappers = this.editor.canvas.$?.find( WRAPPER_TAG )
    
    $wrappers?.each( function(){
      const
      $wrapper = $(this),
      $target = $wrapper.find( self.options.target ),
      
      newWidth = $wrapper.css('width'),
      newHeight = $wrapper.css('height'),
      newTop = $wrapper.css('top'),
      newLeft = $wrapper.css('left'),
      originalStyles = $target.data('original-style')

      if( !originalStyles ) return
      
      // @ts-ignore
      $target.css({
        width: newWidth,
        height: newHeight,
        position: originalStyles.position,
        top: ['fixed', 'absolute'].includes( originalStyles.position ) ? newTop : '',
        left: ['fixed', 'absolute'].includes( originalStyles.position ) ? newLeft : '',
        marginTop: originalStyles.marginTop,
        marginLeft: originalStyles.marginLeft,
        marginBottom: originalStyles.marginBottom,
        marginRight: originalStyles.marginRight
      })

      // Restore hierarchy
      $target
      .data('is-wrapped', false )
      .insertBefore( $wrapper )
      
      // Clean up wrapper and handles
      $wrapper.remove()
    })
  }
  private startResizing( e: any, $handle: Cash ){
    this.$handle = $handle
    this.$wrapper = this.$handle?.closest( WRAPPER_TAG )

    this.isResizing = true
    this.cursorX = e.pageX
    this.cursorY = e.pageY

    this.startWidth = parseFloat( this.$wrapper?.css('width') as string )
    this.startHeight = parseFloat( this.$wrapper?.css('height') as string )
    
    this.startTop = parseFloat( this.$wrapper?.css('top') as string ) || 0
    this.startLeft = parseFloat( this.$wrapper?.css('left') as string ) || 0
  }
  private startPanning( e: any ){
    /**
     * Do not initialize panning on: 
     * - resize `.handle`
     * - target element
     * - wrapper element
     */
    if( !$(e.target).is( this.editor.$viewport ) ) return
    
    this.isPanning = true
    this.editor.$viewport?.css('cursor', 'grabbing')

    this.startPan.x = e.pageX - this.canvasOffset.x
    this.startPan.y = e.pageY - this.canvasOffset.y
  }
  private startDragging( e: any ){
    // Move resizable frame
    if( $(e.target).closest( WRAPPER_TAG ).length ){
      const $this = $(e.target).closest( WRAPPER_TAG )

      /**
       * Relative-like content element cannot be 
       * moved by drag
       */
      const position = $this.css('position')
      if( !position || !['fixed', 'absolute'].includes( position ) ) return
      
      this.$wrapper = $this

      this.isMoving = true
      this.cursorX = e.pageX
      this.cursorY = e.pageY
      
      this.startTop = parseFloat( this.$wrapper?.css('top') as string ) || 0
      this.startLeft = parseFloat( this.$wrapper?.css('left') as string ) || 0

      return
    }
  }
  private handling( e: any ){
    // Panning canvas
    if( this.isPanning ){
      this.canvasOffset.x = e.pageX - this.startPan.x
      this.canvasOffset.y = e.pageY - this.startPan.y

      this.editor.canvas.$?.css('transform', `translate(${this.canvasOffset.x}px, ${this.canvasOffset.y}px) scale(${this.scale})`)

      return
    }

    // Resizing target
    if( !this.isPanning && this.isResizing ){
      if( !this.$wrapper?.length 
          || this.startWidth === undefined 
          || this.startHeight === undefined ) return

      let
      newWidth = this.startWidth,
      newHeight = this.startHeight,
      newTop = this.startTop,
      newLeft = this.startLeft

      // Calculate new dimensions and positions
      if( this.$handle?.hasClass('tl')
          || this.$handle?.hasClass('lc')
          || this.$handle?.hasClass('bl') ){
        const widthChange = e.pageX - this.cursorX

        if( this.startWidth - widthChange > this.options.MIN_WIDTH ){
          newWidth = this.startWidth - widthChange
          newLeft = this.startLeft + widthChange
        }
        else {
          newWidth = this.options.MIN_WIDTH 
          newLeft = this.startLeft + ( this.startWidth - this.options.MIN_WIDTH )
        }
      }

      if( this.$handle?.hasClass('tl')
          || this.$handle?.hasClass('tc')
          || this.$handle?.hasClass('tr') ){
        const heightChange = e.pageY - this.cursorY

        if( this.startHeight - heightChange > this.options.MIN_HEIGHT ){
          newHeight = this.startHeight - heightChange
          newTop = this.startTop + heightChange
        }
        else {
          newHeight = this.options.MIN_HEIGHT
          newTop = this.startTop + ( this.startHeight - this.options.MIN_HEIGHT )
        }
      }

      if( this.$handle?.hasClass('tr')
          || this.$handle?.hasClass('rc')
          || this.$handle?.hasClass('br') )
        newWidth = this.startWidth +( e.pageX - this.cursorX )

      if( this.$handle?.hasClass('bl')
          || this.$handle?.hasClass('bc')
          || this.$handle?.hasClass('br') )
        newHeight = this.startHeight +( e.pageY - this.cursorY )

      const guide = this.snapguide( this.$wrapper, newLeft, newTop, newWidth, newHeight )
      if( guide ){
        newTop = guide.newTop
        newLeft = guide.newLeft
      }

      // Update frame styles
      this.$wrapper.css({
        width: `${Math.max( newWidth, this.options.MIN_WIDTH )}px`,
        height: `${Math.max( newHeight, this.options.MIN_HEIGHT )}px`,
        top: `${newTop}px`,
        left: `${newLeft}px`
      })

      return
    }
    
    // Moving target
    if( !this.isPanning && !this.isResizing && this.isMoving && this.$wrapper?.length ){
      const
      scaleQuo = 1 / this.scale,

      deltaX = ( e.pageX - this.cursorX ) * scaleQuo,
      deltaY = ( e.pageY - this.cursorY ) * scaleQuo

      if( Number.isNaN( deltaX ) || Number.isNaN( deltaY ) ) return

      let
      newTop = this.startTop + deltaY,
      newLeft = this.startLeft + deltaX

      const guide = this.snapguide( this.$wrapper, newLeft, newTop )
      if( guide ){
        newTop = guide.newTop
        newLeft = guide.newLeft
      }
      
      // Move frame to new position
      this.$wrapper.css({ top: `${newTop}px`, left: `${newLeft}px` })

      return
    }
  }
  private zooming( e: any ){
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
    
    // Next scale
    this.zoomTo( this.scale + delta, cursorPosition )
  }
  private stopAll( e: any ){
    if( this.isResizing ) this.isResizing = false
    if( this.isPanning ) this.isPanning = false
    if( this.isMoving ) this.isMoving = false

    this.editor.$viewport?.css('cursor', 'grab')

    // Hide snap guides
    this.editor.$viewport?.find('snapguide').remove()
    
    this.$handle = undefined
    this.$wrapper = undefined
  }

  zoomTo( scale: number, origin: Origin ){
    if( !this.editor.canvas.$?.length
        || scale <= CONTROL_ZOOM_MIN_SCALE ) return
    
    const
    // Calculate ffset for infinite zoom
    zoomRatio = scale / this.scale,

    rect = this.editor.canvas.$[0]?.getBoundingClientRect()
    if( !rect ) return

    const
    offsetX = ( origin.x - rect.left ) * ( CONTROL_ZOOOM_EVEN_SCALE - zoomRatio ),
    offsetY = ( origin.y - rect.top ) * ( CONTROL_ZOOOM_EVEN_SCALE - zoomRatio )

    this.scale = scale
    this.canvasOffset.x += offsetX
    this.canvasOffset.y += offsetY

    this.editor.canvas.$.css('transform', `translate(${this.canvasOffset.x}px, ${this.canvasOffset.y}px) scale(${this.scale})`)
  }
  apply(){
    if( !this.editor.$viewport?.length || !this.editor.canvas.$?.length )
      return

    const self = this

    /**
     * Initial canvas state
     */
    this.editor.canvas.$.css({
      left: '50%',
      top: '50%',
      transform: `translate(-50%, -50%) scale(${this.scale})`
    })

    /**
     * Canvas related control events
     */
    this.editor.canvas.$
    .on('click', this.options.target, function( this: Cash, e: Cash ){ self.activate( e, $(this) ) } )

    /**
     * Handle resizing logic
     */
    .on('mousedown', '.handle', function( this: Cash, e: Cash ){ self.startResizing( e, $(this) ) } )

    this.editor.$viewport
    /**
     * Create new target element in the canvas
     */
    .on('dblclick', this.create.bind(this) )
    /**
     * Handle canvas drag-in-drop panning
     */
    .on('mousedown', function( e: Cash ){ self.startPanning( e ) } )
    /**
     * Handle canvas zoom effect with scroll
     */
    .on('wheel', this.zooming.bind(this) )

    $(document)
    .on('mousedown', this.startDragging.bind(this) )
    .on('mousemove', this.handling.bind(this) )
    .on('mouseup', this.stopAll.bind(this) )
    /**
     * 
     */
    .on('click', this.deactivate.bind(this) )
  }
  discard(){
    /**
     * Remove event listeners
     */
    this.editor.canvas.$?.off()
    $(document).off('mousedown mousemove mouseup click')

    /**
     * Do something before to get discarded
     */
    this.style.clear()
  }
}
