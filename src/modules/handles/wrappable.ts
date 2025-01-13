import type Handles from '.'
import type { HandleInterface } from '.'

import Stylesheet from '../stylesheet'
import $, { type Cash } from 'cash-dom'

export default class Wrappable implements HandleInterface {
  private context: Handles
  private style: Stylesheet

  constructor( context: Handles ){
    this.context = context
    this.style = new Stylesheet('wrapper', { sheet: this.getStyleSheet(), meta: true })
  }

  private createWrapper(){
    return $(`<${this.context.options.WRAPPER_TAG}><scope></scope></${this.context.options.WRAPPER_TAG}>`)
  }
  activate( $target: Cash ){
    // Prevent duplicate wrapping
    if( !this.context.options.WRAPPER_TAG
        || $target.data('is-wrapped') ) return

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
    $wrapper = this.createWrapper().css({
      position: originalStyles.position && ['fixed', 'absolute'].includes( originalStyles.position ) ? originalStyles.position : 'relative',
      zIndex: originalStyles.zIndex,
      top: originalStyles.top,
      left: originalStyles.left,
      width: $target.outerWidth(),
      height: $target.outerHeight(),
      boxSizing: 'border-box',
      userSelect: 'none'
    })

    $target
    .data('is-wrapped', true)
    .data('original-style', originalStyles)
    .css({
      margin: 0,
      width: '100%',
      height: '100%',
      position: 'static' // Reset to prevent interference during wrapping
    })
    .before( $wrapper )

    $wrapper.find(':scope > scope').append( $target as any )

    // Add resizing handles
    const handles = originalStyles.position
                    && ['fixed', 'absolute'].includes( originalStyles.position )
                          /**
                            * Resize from every side and angle 
                            * of the element
                            */
                          ? ['tl', 'tr', 'bl', 'br', 'tc', 'bc', 'lc', 'rc']
                          /**
                            * Relative-like position element can only be resized
                            * from the `right` and `bottom` sides and the `right-bottom`
                            * angle of the element to maintain the `left-top` position 
                            * relative to its parent element.
                            */
                          : ['br', 'bc', 'rc']
    
    handles.forEach( htype => $wrapper.append(`<div class="handle ${htype}"></div>`) )
  }
  private deactivate( $target: Cash ){
    if( !this.context.options.WRAPPER_TAG
        || $target.is( this.context.options.element )
        || $target.closest( this.context.options.WRAPPER_TAG ).length ) return

    const $wrappers = this.context.$canvas.find( this.context.options.WRAPPER_TAG )
    
    $wrappers?.each( function(){
      const 
      $wrapper = $(this),
      $target = $wrapper.find( '.content' ),
      originalStyles = $target.data('original-style')
      
      if( !originalStyles ) return

      // @ts-ignore
      $target.css({
        width: $wrapper.css('width'),
        height: $wrapper.css('height'),
        position: originalStyles.position,
        top: ['fixed', 'absolute'].includes( originalStyles.position ) ? $wrapper.css('top') : '',
        left: ['fixed', 'absolute'].includes( originalStyles.position ) ? $wrapper.css('left') : '',
        marginTop: originalStyles.marginTop,
        marginLeft: originalStyles.marginLeft,
        marginBottom: originalStyles.marginBottom,
        marginRight: originalStyles.marginRight
      })

      // Restore hierarchy
      $target
      .data('is-wrapped', false)
      .insertBefore( $wrapper )
      
      // Clean up wrapper and handles
      $wrapper.remove()
    })
  }
  private getStyleSheet(){
    return `
      ${this.context.options.WRAPPER_TAG} {
        display: inline-block;
        border: ${this.context.options.WRAPPER_BORDER_WIDTH}px solid #007bff; /* Frame border */
        box-sizing: border-box;

        > scope {
          display: block;
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        /* Handles (pseudo-elements) */
        > .handle {
          content: '';
          position: absolute;
          width: ${this.context.options.WRAPPER_SIZE}px; /* Adjust handle size */
          height: ${this.context.options.WRAPPER_SIZE}px;
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
      }`
  }

  apply(){
    if( !this.context.$canvas.length ) return

    this.context.$canvas.on('click.wrapper', this.context.options.element, e => {
      e.altKey && this.activate( $(e.target) )
    })
    this.context.$viewport.on('click.wrapper', e => this.deactivate( $(e.target) ))
  }
  discard(){
    this.context.$canvas.off('.wrapper')
    $(document).off('.wrapper')

    this.style.clear()
  }
}
