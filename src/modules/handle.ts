import type Modela from '../exports/modela'
import type { Plugin, PluginConfig, PluginFactory } from '../types/plugin'

import EventEmitter from 'events'
import Stylesheet from './stylesheet'
import { CONTROL_SNAP_THRESHOLD } from './constants'

const css = `
rz-wrapper {
  display: inline-block;
  border: 1px dashed #007bff; /* Frame border */
  box-sizing: border-box;

  /* Handles (pseudo-elements) */
  .handle {
    content: '';
    position: absolute;
    width: 10px; /* Adjust handle size */
    height: 10px;
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
  z-index: 10;
  background-color: rgba(0, 0, 255, 0.5);
  z-index: 999;
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
  viewport: JQuery
  canvas: JQuery
  target: string
  target_element: string

  MIN_WIDTH: number
  MIN_HEIGHT: number
}

export default class Handle extends EventEmitter {
  private flux: Modela
  private style: Stylesheet
  private options: HandleOptions
  
  public isMoving = false
  public isCreating = false
  public isResizing = false
  
  private $handle?: JQuery
  private $wrapper?: JQuery
  private $newContent?: JQuery

  private $vsnapguide = $('<snapguide vertical></snapguide>')
  private $hsnapguide = $('<snapguide horizontal></snapguide>')

  private cursorX: number = 0
  private cursorY: number = 0
  private startTop: number = 0
  private startLeft: number = 0
  private startWidth?: number
  private startHeight?: number

  constructor( flux: Modela, options?: HandleOptions ){
    super()
    this.flux = flux

    console.log( options )

    this.options = {
      viewport: $('body'),
      canvas: $('body'),
      target: '.content',
      target_element: '<div class="content"></div>',

      MIN_WIDTH: 50,
      MIN_HEIGHT: 50,
      
      ...options
    }

    this.style = new Stylesheet('handle', $('head'), { css, meta: true })
  }

  private snapguide( $wrapper: JQuery, newLeft: number, newTop: number, newWidth?: number, newHeight?: number ){
    const
    wrapperWidth = newWidth || $wrapper.width() as number,
    wrapperHeight = newHeight || $wrapper.height() as number,
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

    this.options.canvas
    .find( this.options.target )
    .not( $wrapper.find( this.options.target ) )
    .each( function(){
      const
      $other = $(this),
      otherLeft = parseFloat( $other.css('left') ),
      otherTop = parseFloat( $other.css('top') ),
      otherRight = otherLeft + ($other?.width() as number),
      otherBottom = otherTop + ($other?.height() as number),

      otherRect = $other[0].getBoundingClientRect()

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
      .appendTo( this.options.viewport )
    }
    else if( closestRight !== null ){
      newLeft = closestRight - wrapperWidth

      this.$vsnapguide
      .css({ left: `${vsnapLeft}px`, top: 0 })
      .appendTo( this.options.viewport )
    }
    else this.$vsnapguide.remove()

    if( closestTop !== null ){
      newTop = closestTop

      this.$hsnapguide
      .css({ left: 0, top: `${hsnapTop}px` })
      .appendTo( this.options.viewport )
    }
    else if( closestBottom !== null ){
      newTop = closestBottom - wrapperHeight

      this.$hsnapguide
      .css({ left: 0, top: `${hsnapTop}px` })
      .appendTo( this.options.viewport )
    }
    else this.$hsnapguide.remove()

    return { newLeft, newTop }
  }
  private activate(){
    const $content = $(this)

    // Prevent duplicate wrapping
    if( $content.data('is-wrapped') ) return

    const
    // Extract essential styles from the content
    originalStyles = {
      position: $content.css('position'),
      zIndex: $content.css('z-index'),
      marginTop: $content.css('margin-top'),
      marginLeft: $content.css('margin-left'),
      marginBottom: $content.css('margin-bottom'),
      marginRight: $content.css('margin-right'),
      top: $content.position().top,
      left: $content.position().left
    },
    // Create a wrapper with the same essential styles
    $wrapper = $('<rz-wrapper/>').css({
      // @ts-ignore
      position: ['fixed', 'absolute'].includes( originalStyles.position ) ? originalStyles.position : 'relative',
      zIndex: originalStyles.zIndex,
      top: originalStyles.top,
      left: originalStyles.left,
      width: $content.outerWidth(),
      height: $content.outerHeight(),
      boxSizing: 'border-box'
    })

    // Temporarily overlay the content
    $content
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

    $wrapper.append( $content as any)

    // Add resizing handles
    const handles = ['fixed', 'absolute'].includes( originalStyles.position ) ?
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
        || $(e.target).closest('rz-wrapper').length ) return

    const
    self = this,
    $wrappers = this.options.canvas.find('rz-wrapper')
    
    $wrappers.each( function(){
      const
      $wrapper = $(this),
      $content = $wrapper.find( self.options.target ),

      newWidth = $wrapper.width(),
      newHeight = $wrapper.height(),
      newTop = $wrapper.css('top'),
      newLeft = $wrapper.css('left'),
      originalStyles = $content.data('original-style')

      if( !originalStyles ) return
      
      $content.css({
        width: `${newWidth}px`,
        height: `${newHeight}px`,
        position: originalStyles.position,
        top: ['fixed', 'absolute'].includes( originalStyles.position ) ? newTop : '',
        left: ['fixed', 'absolute'].includes( originalStyles.position ) ? newLeft : '',
        marginTop: originalStyles.marginTop,
        marginLeft: originalStyles.marginLeft,
        marginBottom: originalStyles.marginBottom,
        marginRight: originalStyles.marginRight
      })

      // Restore hierarchy
      $content
      .data('is-wrapped', false )
      .insertBefore( $wrapper )
      
      // Clean up wrapper and handles
      $wrapper.remove()
    })
  }
  private startResize( e: any ){
    e.preventDefault()

    this.$handle = $(this) as any
    this.$wrapper = this.$handle?.closest('rz-wrapper')

    this.isResizing = true
    this.cursorX = e.pageX
    this.cursorY = e.pageY

    this.startWidth = this.$wrapper?.width() as number
    this.startHeight = this.$wrapper?.height() as number
    
    this.startTop = parseFloat( this.$wrapper?.css('top') as string ) || 0
    this.startLeft = parseFloat( this.$wrapper?.css('left') as string ) || 0
  }
  private startCreate( e: any ){
    e.preventDefault()

    // Move resizable frame
    if( $(e.target).closest('rz-wrapper').length ){
      const $this = $(e.target).closest('rz-wrapper')

      /**
       * Relative-like content element cannot be 
       * moved by drag
       */
      if( !['fixed', 'absolute'].includes( $this.css('position') ) ) return
      
      this.$wrapper = $this

      this.isMoving = true
      this.cursorX = e.pageX
      this.cursorY = e.pageY
      
      this.startTop = parseFloat( this.$wrapper?.css('top') as string ) || 0
      this.startLeft = parseFloat( this.$wrapper?.css('left') as string ) || 0

      return
    }

    // Create new content element
    if( !$(e.target).is( this.options.target ) ){
      this.isCreating = true
      this.cursorX = e.pageX
      this.cursorY = e.pageY
      
      // Create a new content element
      this.$newContent = $(this.options.target_element).css({
        top: this.cursorY,
        left: this.cursorX,
        width: 0,
        height: 0,
        boxSizing: 'border-box'
      })

      // Append content to the body
      this.options.canvas.append( this.$newContent )
    }
  }
  private handling( e: any ){
    if( this.isCreating && this.$newContent?.length ){
      /**
       * Calculate new dimensions and adjust top/left 
       * if dragging upward/leftward
       */
      this.$newContent.css({
        width: Math.abs( e.pageX - this.cursorX ),
        height: Math.abs( e.pageY - this.cursorY ),
        left: e.pageX < this.cursorX ? e.pageX : this.cursorX,
        top: e.pageY < this.cursorY ? e.pageY : this.cursorY
      })

      return
    }

    if( !this.isCreating && this.isResizing ){
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

      newTop = guide.newTop
      newLeft = guide.newLeft

      // Update frame styles
      this.$wrapper.css({
        width: `${Math.max( newWidth, this.options.MIN_WIDTH )}px`,
        height: `${Math.max( newHeight, this.options.MIN_HEIGHT )}px`,
        top: `${newTop}px`,
        left: `${newLeft}px`
      })

      return
    }
    
    if( !this.isCreating && !this.isResizing && this.isMoving && this.$wrapper?.length ){
      const
      scaleQuo = 1 /  this.flux.workspace.scale ,

      deltaX = ( e.pageX - this.cursorX ) * scaleQuo,
      deltaY = ( e.pageY - this.cursorY ) * scaleQuo

      if( Number.isNaN( deltaX ) || Number.isNaN( deltaY ) ) return

      let
      newTop = this.startTop + deltaY,
      newLeft = this.startLeft + deltaX

      const guide = this.snapguide( this.$wrapper, newLeft, newTop )

      newTop = guide.newTop
      newLeft = guide.newLeft
      
      // Move frame to new position
      this.$wrapper.css({ top: `${newTop}px`, left: `${newLeft}px` })

      return
    }
  }
  private stopAll( e: any ){
    if( this.isCreating ){
      this.isCreating = false

      // Remove tiny elements
      this.$newContent?.length
      && ( (this.$newContent.width() as number) < this.options.MIN_WIDTH 
            || (this.$newContent.height() as number) < this.options.MIN_HEIGHT) 
      && this.$newContent.remove()
    }

    if( this.isResizing ) this.isResizing = false
    if( this.isMoving ) this.isMoving = false

    // Hide snap guides
    this.options.canvas.find('.snapguide').remove()
    
    this.$handle = undefined
    this.$wrapper = undefined
  }

  apply(){
    console.log('--', this.options.canvas )
    this.options.canvas
    .on('click', this.options.target, this.activate.bind(this) )

    /**
     * Handle resizing logic
     */
    .on('mousedown', '.handle', this.startResize.bind(this) )

    /**
     * Mouse down on body to start creating a 
     * new content element
     */
    $(document)
    .on('mousedown', this.startCreate.bind(this) )
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
    this.options.canvas.off()
    // $(document).off('mousedown mousemove mouseup click')

    /**
     * Do something before to get discarded
     */
    this.style.clear()
  }
}
