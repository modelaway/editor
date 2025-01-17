import type Handles from '.'
import type { HandleInterface } from '.'
import type FrameStyle from '../frame/styles'
import type Stylesheet from '../../lib/stylesheet'
import $, { type Cash } from 'cash-dom'

type WrappableActionType = 'activate' | 'deactivate'

export default class Wrappable implements HandleInterface {
  private context: Handles
  private style: Stylesheet | FrameStyle

  constructor( context: Handles ){
    this.context = context
    this.style = this.context.styles('wrapper', this.getStyleSheet() )
  }

  private getStyleSheet(){
    if( !this.context.options.WRAPPER_BORDER_WIDTH )
      this.context.options.WRAPPER_BORDER_WIDTH = 1

    if( !this.context.options.WRAPPER_HANDLE_SIZE )
      this.context.options.WRAPPER_HANDLE_SIZE = 6
    
    const
    // Side Handle Width
    shw = this.context.options.WRAPPER_HANDLE_SIZE * 2.5,
    // Handle Centered Position
    hcp = ( this.context.options.WRAPPER_HANDLE_SIZE / 2 ) + this.context.options.WRAPPER_BORDER_WIDTH + (this.context.options.WRAPPER_BORDER_WIDTH / 2),
    // Handle Border Radius
    hbr = ( this.context.options.WRAPPER_HANDLE_SIZE / 2 ) + this.context.options.WRAPPER_BORDER_WIDTH

    return `
      ${this.context.options.WRAPPER_TAG} {
        display: inline-block;
        border: ${this.context.options.WRAPPER_BORDER_WIDTH}px solid var(--me-primary-color-transparent);
        box-sizing: border-box;
        box-shadow: 0 0 0 1px rgba(13, 110, 253, 0.1);
        transition: border-color 0.2s ease;
        
        &:hover {
          border-color: var(--me-primary-color);
        }
        
        > scope {
          display: block;
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        /* Handle container for better organization */
        > .handle {
          position: absolute;
          width: ${this.context.options.WRAPPER_HANDLE_SIZE}px;
          height: ${this.context.options.WRAPPER_HANDLE_SIZE}px;
          background: var(--me-inverse-color);
          border: ${this.context.options.WRAPPER_BORDER_WIDTH}px solid var(--me-primary-color);
          border-radius: ${hbr}px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
          z-index: 100;

          &:hover {
            background: var(--me-primary-color);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
          }
          
          /* Corner handles */
          &.tl { 
            top: -${hcp}px; 
            left: -${hcp}px; 
            cursor: nwse-resize; 
          }
          &.tr { 
            top: -${hcp}px; 
            right: -${hcp}px; 
            cursor: nesw-resize; 
          }
          &.bl { 
            bottom: -${hcp}px; 
            left: -${hcp}px; 
            cursor: nesw-resize; 
          }
          &.br { 
            bottom: -${hcp}px; 
            right: -${hcp}px; 
            cursor: nwse-resize; 
          }

          /* Edge handles */
          &.tc,
          &.bc { 
            width: ${shw}px;
            left: 50%; 
            transform: translateX(-50%);
            cursor: ns-resize;
          }
          &.tc { top: -${hcp}px; }
          &.bc { bottom: -${hcp}px; }

          &.lc,
          &.rc { 
            height: ${shw}px;
            top: 50%;
            transform: translateY(-50%);
            cursor: ew-resize;
          }
          &.lc { left: -${hcp}px; }
          &.rc { right: -${hcp}px; }

          /* Make edge handles slightly more prominent on hover */
          &.tc:hover,
          &.bc:hover,
          &.lc:hover,
          &.rc:hover {
            transform: scale(1.1) translateX(-45%);
          }
          &.lc:hover, &.rc:hover {
            transform: scale(1.1) translateY(-45%);
          }
        }

        /* Optional: Add a subtle highlight when the wrapper is being dragged */
        &[data-dragging="true"] {
          border-color: rgba(13, 110, 253, 0.9);
          box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.1);
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
    const handles = (styles.display || $target.attr('handle')) === 'inline'
                          // Unidirection handle for inline elements
                          ? ['rc']
                          // Multidirectional handles for non-inline elements
                          : styles.position 
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
        || $target.closest( this.context.options.WRAPPER_TAG ).length ) return

    const 
    self = this,
    $wrappers = this.context.$canvas.find( this.context.options.WRAPPER_TAG )

    $wrappers?.length && $wrappers.each( function(){
      const
      $wrapper = $(this),
      $target = $wrapper.find(`:scope > scope > ${self.context.options.element}`),
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

  enable(){
    if( !this.context.$canvas.length ) return

    const selector = `${this.context.options.element}:not(${this.context.options.WRAPPER_TAG},${this.context.options.WRAPPER_TAG} > scope,${this.context.options.WRAPPER_TAG} > .handle)`

    /**
     * Wrappable element activation by constraints
     */
    this.context
    .events( this.context.$canvas )
    .on('mousedown.wrapper', selector, ( e: any ) => {
      this.context.constraints<WrappableActionType>('wrap', 'activate', e )
      && this.activate( $(e.target) )
    }, { selfExclude: true })

    /**
     * Wrappable element deactivation by constraints
     */
    this.context
    .events( this.context.options.$viewport )
    .on('mousedown.wrapper', e =>  {
      this.context.constraints<WrappableActionType>('wrap', 'deactivate', e )
      && this.deactivate( $(e.target) )
    } )
  }
  disable(){
    this.context.events( this.context.$canvas ).off('.wrapper')
    this.context.events( this.context.$viewport ).off('.wrapper')

    /**
     * Clear style by dom type
     */
    'removeRules' in this.style
            ? this.style.removeRules('wrapper')
            : this.style.clear()
  }
}
