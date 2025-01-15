import type Handles from '.'
import type { HandleInterface } from '.'
import type FrameStyle from '../frame/styles'
import type Stylesheet from '../../lib/stylesheet'
import $, { type Cash } from 'cash-dom'

export default class Wrappable implements HandleInterface {
  private context: Handles
  private style: Stylesheet | FrameStyle

  constructor( context: Handles ){
    this.context = context
    this.style = this.context.styles('wrapper', this.getStyleSheet() )
  }

  private getStyleSheet(){
    return `
      ${this.context.options.WRAPPER_TAG} {
        display: inline-block;
        border: ${this.context.options.WRAPPER_BORDER_WIDTH}px solid #007bff; /* Frame border */
        box-sizing: border-box;
        
        background: red;
        padding: 15px;

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
      }
    `
  }
  private createWrapper(){
    const tag = this.context.options.WRAPPER_TAG || 'div'
    return $(`<${tag}><scope></scope></${tag}>`)
  }

  activate( $target: Cash ){
    // Prevent duplicate wrapping
    if( !this.context.options.WRAPPER_TAG
        || $target.data('is-wrapped') ) return

    const
    // Extract essential styles from the content
    styles = {
      position: $target.css('position'),
      zIndex: $target.css('z-index'),
      display: $target.css('display'),
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
      position: styles.position && ['fixed', 'absolute'].includes( styles.position ) ? styles.position : 'relative',
      zIndex: styles.zIndex,
      display: styles.display,
      top: styles.top,
      left: styles.left,
      width: $target.outerWidth(),
      height: $target.outerHeight(),
      boxSizing: 'border-box',
      userSelect: 'none'
    })

    $target
    .data('is-wrapped', true )
    .data('original-style', styles )
    .css({
      margin: 0,
      width: '100%',
      height: '100%',
      position: 'static' // Reset to prevent interference during wrapping
    })
    .before( $wrapper )

    $wrapper.find(':scope > scope').append( $target as any )

    // Add resizing handles
    const handles = styles.position
                    && ['fixed', 'absolute'].includes( styles.position )
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
  deactivate( $target: Cash ){
    if( !this.context.options.WRAPPER_TAG
        || $target.is( this.context.options.element )
        || $target.closest( this.context.options.WRAPPER_TAG ).length ) return

    const 
    self = this,
    $wrappers = this.context.$canvas.find( this.context.options.WRAPPER_TAG )
    
    $wrappers?.each( function(){
      const 
      $wrapper = $(this),
      $target = $wrapper.find( self.context.options.element ),
      originalStyles = $target.data('original-style')
      
      if( !originalStyles ) return

      // @ts-ignore
      $target.css({
        width: $wrapper.css('width'),
        height: $wrapper.css('height'),
        display: originalStyles.display,
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

  apply(){
    if( !this.context.$canvas.length ) return

    this.context
    .events( this.context.$canvas )
    .on('click.wrapper', this.context.options.element, (e: any) => {
      e.altKey && this.activate( $(e.target) )
    })

    this.context
    .events( document )
    .on('click.wrapper', e => this.deactivate( $(e.target) ))
  }
  discard(){
    this.context.events( this.context.$canvas ).off('.wrapper')
    this.context.events( document ).off('.wrapper')

    /**
     * Clear style by dom type
     */
    'removeRules' in this.style
            ? this.style.removeRules('wrapper')
            : this.style.clear()
  }
}
