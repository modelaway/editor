import type Handles from '.'
import type { HandleInterface } from '.'
import type FrameStyle from '../frame/styles'
import type Stylesheet from '../stylesheet'
import $, { type Cash } from 'cash-dom'

type WrappableActionType = 'activate' | 'deactivate' | 'multiwrap' | 'handle'
type WrappableHandleType = 'tl' | 'tr' | 'bl' | 'br' | 'te' | 'be' | 'le' | 're'

export default class Wrappable implements HandleInterface {
  private context: Handles
  private style: Stylesheet | FrameStyle
  private $targets?: Cash

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
          border: ${this.context.options.WRAPPER_BORDER_WIDTH}px solid var(--me-primary-color);
          /* border-radius: ${hbr}px; */
          background: var(--me-inverse-color);
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
          &.te,
          &.be {
            opacity: ${this.context.options.WRAPPER_HANDLE_VISIBLE_EDGES ? '1' : '0'};
            width: ${this.context.options.WRAPPER_HANDLE_VISIBLE_EDGES ? shw +'px' : '85%'};
            left: 50%; 
            transform: translateX(-50%);
            cursor: ns-resize;
          }
          &.te { top: -${hcp}px; }
          &.be { bottom: -${hcp}px; }

          &.le,
          &.re {
            opacity: ${this.context.options.WRAPPER_HANDLE_VISIBLE_EDGES ? '1' : '0'};
            height: ${this.context.options.WRAPPER_HANDLE_VISIBLE_EDGES ? shw +'px' : '85%'};
            top: 50%;
            transform: translateY(-50%);
            cursor: ew-resize;
          }
          &.le { left: -${hcp}px; }
          &.re { right: -${hcp}px; }

          /* Make edge handles slightly more prominent on hover */
          &.te:hover,
          &.be:hover,
          &.le:hover,
          &.re:hover {
            transform: scale(1.1) translateX(-45%);
          }
          &.le:hover, &.re:hover {
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
  private getBoundingBox( $elements: Cash ){
    const
    self = this,
    scaleQuo = this.context.getScaleQuo()

    let 
    minTop = Infinity,
    minLeft = Infinity,
    maxRight = -Infinity,
    maxBottom = -Infinity

    $elements.each( function(){
      const 
      $el = $(this),
      position = self.context.getRelativeRect( $el ),
      width = position.width * scaleQuo,
      height = position.height * scaleQuo,
      top = parseInt( $el.css('top') as string ),
      left = parseInt( $el.css('left') as string )
      
      // console.log(
      //   '\nElement --', $el[0],
      //   '\nwidth: ', $el.width(),
      //   '\nheight: ', $el.height(),
      //   '\nrect width: ', position.width,
      //   '\nrect height: ', position.height,
      //   '\ncss width: ', $el.css('width'),
      //   '\ncss height: ', $el.css('height'),
      //   '\nscale width: ', position.width * scaleQuo,
      //   '\nscale height: ', position.height * scaleQuo,

      //   '\n\ntop: ', $el.position()?.top,
      //   '\nleft: ', $el.position()?.left,
      //   '\nrect top: ', position.top,
      //   '\nrect left: ', position.left,
      //   '\ncss top: ', $el.css('top'),
      //   '\ncss left: ', $el.css('left'),
      //   '\nscale top: ', position.top * scaleQuo,
      //   '\nscale left: ', position.left * scaleQuo,
      // )

      if( !position ) return

      minTop = Math.min( minTop, top )
      minLeft = Math.min( minLeft, left )
      maxRight = Math.max( maxRight, left + width )
      maxBottom = Math.max( maxBottom, top + height )
    })

    return {
      top: minTop,
      left: minLeft,
      width: maxRight - minLeft,
      height: maxBottom - minTop
    }
  }

  private createWrapper(){
    const 
    tag = this.context.options.WRAPPER_TAG || 'div',
    $wrapper = $(`<${tag}><scope></scope></${tag}>`)

    // Default wrapper style properties
    $wrapper.css({
      // Adaptive border-width by the canvas' scale
      borderWidth: `${(this.context.options.WRAPPER_BORDER_WIDTH || 6) / this.context.options.getScale()}px`,
      boxSizing: 'border-box',
      userSelect: 'none'
    })

    return $wrapper
  }
  private createHandle( htype: WrappableHandleType ){
    this.context.options.WRAPPER_HANDLE_SIZE = this.context.options.WRAPPER_HANDLE_SIZE || 6
    this.context.options.WRAPPER_BORDER_WIDTH = this.context.options.WRAPPER_BORDER_WIDTH || 1

    const
    $handle = $(`<div class="handle ${htype}"></div>`),
    size = `${this.context.options.WRAPPER_HANDLE_SIZE / this.context.options.getScale()}px`,
    borderWidth = `${this.context.options.WRAPPER_BORDER_WIDTH / this.context.options.getScale()}px`,

    hcp = `-${( (this.context.options.WRAPPER_HANDLE_SIZE / 2) 
                + this.context.options.WRAPPER_BORDER_WIDTH
                + (this.context.options.WRAPPER_BORDER_WIDTH / 2) )
                / this.context.options.getScale()}px`

    // Adapt the handles' sizes by scale
    const adaptiveStyle: any = { borderWidth }
    
    // Adapt top & bottom edges
    if( ['te', 'be'].includes( htype ) ){
      adaptiveStyle.height = size

      htype == 'te'
          ? adaptiveStyle.top = hcp
          : adaptiveStyle.bottom = hcp
    }

    // `left` & `right` edges
    else if( ['le', 're'].includes( htype ) ){
      adaptiveStyle.width = size

      htype == 'le'
          ? adaptiveStyle.left = hcp
          : adaptiveStyle.right = hcp
    }

    // All corners
    else {
      adaptiveStyle.width = size
      adaptiveStyle.height = size

      switch( htype ){
        case 'tl': {
          adaptiveStyle.top = hcp
          adaptiveStyle.left = hcp
        } break

        case 'tr': {
          adaptiveStyle.top = hcp
          adaptiveStyle.right = hcp
        } break

        case 'bl': {
          adaptiveStyle.bottom = hcp
          adaptiveStyle.left = hcp
        } break

        case 'br': {
          adaptiveStyle.bottom = hcp
          adaptiveStyle.right = hcp
        } break
      }
    }

    $handle.css( adaptiveStyle )

    return $handle
  }

  private wrap( $target: Cash ){
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
      top: parseInt( $target.css('top') as string ),
      left: parseInt( $target.css('left') as string )
    }

    // Create wrapper with the same essential styles
    const $wrapper = this.createWrapper()
    $wrapper.css({
      position: styles.position && ['fixed', 'absolute'].includes( styles.position ) ? styles.position : 'relative',
      zIndex: Number( styles.zIndex ),
      display: styles.display || 'static',
      top: styles.top || 0,
      left: styles.left || 0,
      width: $target.outerWidth(),
      height: $target.outerHeight()
    })

    // Store original styles and adjust target
    $target
    .data('is-wrapped', true )
    .data('original-style', styles )
    .css({
      margin: 0,
      width: '100%',
      height: '100%',
      position: 'static'
    })
    .before( $wrapper )

    $wrapper.find(':scope > scope').append( $target )

    /**
     * Automatically add default handles 
     * to the wrap
     */
    this.context.options.WRAPPER_HANDLE_AUTO && this.handle( $target )
  }
  private unwrap( $wrapper: Cash, $elements: Cash, selective: boolean = false ){
    const isSingle = $elements.length === 1

    // Handle single element unwrapping
    if( isSingle ){
      const
      $target = $elements.first(),
      originalStyles = $target.data('original-style')

      if( !originalStyles ) return

      $target.css({
        width: $wrapper.css('width') as string,
        height: $wrapper.css('height') as string,
        display: originalStyles.display,
        position: originalStyles.position,
        top: (['fixed', 'absolute'].includes( originalStyles.position ) ? $wrapper.css('top') : '') as string,
        left: (['fixed', 'absolute'].includes( originalStyles.position ) ? $wrapper.css('left') : '') as string,
        marginTop: originalStyles.marginTop,
        marginLeft: originalStyles.marginLeft,
        marginBottom: originalStyles.marginBottom,
        marginRight: originalStyles.marginRight
      })

      // Restore hierarchy
      $target
      .removeAttr('data-original-style')
      .removeAttr('data-is-wrapped')
      .insertBefore( $wrapper )

      // Remove wrapper if no other elements remain
      $wrapper.remove()
    }
    
    // Handle multiple elements unwrapping
    else {
      $elements.each( function(){
        const
        $target = $(this),
        originalStyles = $target.data('original-style')

        if( !originalStyles ) return

        $target.css({
          position: originalStyles.position,
          zIndex: originalStyles.zIndex,
          display: originalStyles.display,
          marginTop: originalStyles.marginTop,
          marginLeft: originalStyles.marginLeft,
          marginBottom: originalStyles.marginBottom,
          marginRight: originalStyles.marginRight,
          width: $target.css('width') as string,
          height: $target.css('height') as string,
          top: parseFloat( $wrapper.css('top') as string ) + originalStyles.top,
          left: parseFloat( $wrapper.css('left') as string ) + originalStyles.left
        })

        // Restore hierarchy
        $target
        .removeAttr('data-original-style')
        .removeAttr('data-is-wrapped')
        .insertBefore( $wrapper )
      })

      // Only remove wrapper if this isn't a selective unwrap
      !selective && $wrapper.remove()
    }
  }
  private clusterwrap( $targets: Cash ){
    if( !this.context.options.WRAPPER_TAG
        || !$targets.length 
        || $targets.filter('[data-is-wrapped]').length ) return

    const
    self = this,
    boundingBox = this.getBoundingBox( $targets ),
    $first = $targets.first(),
    baseStyles = {
      position: $first.css('position'),
      zIndex: $first.css('z-index'),
      display: $first.css('display')
    }

    // Store original styles and positions for each element
    $targets.each( function(){
      const 
      $target = $(this),
      position = self.context.getRelativeRect( $target )

      if( !position ) return

      $target.data('original-style', {
        position: $target.css('position'),
        zIndex: $target.css('z-index'),
        display: $target.css('display'),
        marginTop: $target.css('margin-top'),
        marginLeft: $target.css('margin-left'),
        marginBottom: $target.css('margin-bottom'),
        marginRight: $target.css('margin-right'),
        top: parseFloat( $target.css('top') as string ) - boundingBox.top,
        left: parseFloat( $target.css('left') as string ) - boundingBox.left
      })
    })

    // Create wrapper with bounding box dimensions
    const $wrapper = this.createWrapper()
    $wrapper.css({
      position: baseStyles.position && ['fixed', 'absolute'].includes( baseStyles.position ) ? baseStyles.position  : 'relative',
      zIndex: Number( baseStyles.zIndex ),
      display: baseStyles.display || 'static',
      top: boundingBox.top,
      left: boundingBox.left,
      width: boundingBox.width,
      height: boundingBox.height
    })

    // Position elements relative to wrapper
    $targets.each( function(){
      const 
      $target = $(this),
      originalStyle = $target.data('original-style')

      if( !originalStyle ) return

      $target
      .data('is-wrapped', true)
      .css({
        position: 'absolute',
        margin: 0,
        width: $target.outerWidth(),
        height: $target.outerHeight(),
        top: originalStyle.top,
        left: originalStyle.left
      })
    })

    $first.before( $wrapper )
    $wrapper.find(':scope > scope').append( $targets )

    /**
     * Automatically add default handles 
     * to the wrap
     */
    this.context.options.WRAPPER_HANDLE_AUTO && this.handle( $targets )
  }

  activate( $targets: Cash, e?: MouseEvent | KeyboardEvent ){
    $targets.length > 1
            ? this.clusterwrap( $targets )
            : this.wrap( $targets )

    /**
     * Cluster wrap multiple selected elements during
     * single target activation but in progression wrap
     * trigger by `mousedown` or `click`
     *
     * Mostly works base on constraints like:
     * - e.shiftKey
     * - e.metaKey
     * - etc
     */
    if( $targets.length === 1 && $targets.closest( this.context.options.WRAPPER_TAG ).length ){
      // Find already wrapped elements
      const $wrapped = this.context.$canvas.find('[data-is-wrapped="true"]')

      // Check constraints and put all found element into cluster wrap.
      if( $wrapped.length > 1 && !this.context.constraints<WrappableActionType>('wrap', 'multiwrap', e as KeyboardEvent ) ){
        this.deactivate()
        this.clusterwrap( $wrapped )

        this.$targets = $wrapped
      }
    }
    else this.$targets = $targets
  }
  deactivate( $targets?: Cash ){
    if( !this.context.options.WRAPPER_TAG ) return

    const 
    self = this,
    $wrappers = this.context.$canvas.find( this.context.options.WRAPPER_TAG )
    
    if( !$wrappers?.length ) return

    // If specific targets are provided, only unwrap those elements
    $targets?.length
          ? $wrappers.each( function(){
            const
            $wrapper = $(this),
            $wrappedElements = $wrapper.find(`:scope > scope > ${self.context.options.element}`),
            $elementsToUnwrap = $wrappedElements.filter( function(){
              return $targets.filter( ( _, target ) => target === this ).length > 0
            })

            if( !$elementsToUnwrap.length ) return

            $wrappedElements.length === $elementsToUnwrap.length
                                // If all wrapped elements need to be unwrapped, unwrap the entire wrapper
                                ? self.unwrap( $wrapper, $wrappedElements )
                                // Otherwise, only unwrap specific elements
                                : self.unwrap( $wrapper, $elementsToUnwrap, true )
          })
          // If no specific targets, unwrap all wrappers
          : $wrappers.each( function(){
            const
            $wrapper = $(this),
            $wrappedElements = $wrapper.find(`:scope > scope > ${self.context.options.element}`)

            self.unwrap( $wrapper, $wrappedElements )
          })
  }
  
  handle( $targets: Cash, handles?: WrappableHandleType[] ){
    /**
     * Auto-activate targets if not.
     */
    !$targets.closest( this.context.options.WRAPPER_TAG ).length
    && this.activate( $targets )

    const $wrapper = $targets.closest( this.context.options.WRAPPER_TAG )
    if( !$wrapper.length ) return

    const
    stylePosition = $wrapper.css('position'),
    display = $wrapper.find( this.context.options.element ).attr('handle') || $wrapper.css('display')

    /**
     * Define default handles based on element's 
     * display or position.
     */
    if( !handles ){
      if( display === 'inline' ) handles = ['re']
      else handles = stylePosition 
                      && ['fixed', 'absolute'].includes( stylePosition )
                                    ? ['tl', 'tr', 'bl', 'br', 'te', 'be', 'le', 're']
                                    : ['br', 'be', 're']
    }

    handles.forEach( htype => this.createHandle( htype ).appendTo( $wrapper ) )
  }
  unhandle( $targets?: Cash ){
    const
    self = this,
    $wrapper = $targets?.length
                    ? $targets.closest( this.context.options.WRAPPER_TAG )
                    : this.context.$canvas.find( this.context.options.WRAPPER_TAG as string )

    $wrapper?.length
    && $wrapper.each( function(){
      $(this).find(`${self.context.options.WRAPPER_TAG} > .handle`).remove()
    })
  }

  enable(){
    if( !this.context.$canvas.length ) return

    const
    wtag = this.context.options.WRAPPER_TAG,
    selector = `${this.context.options.element}:not(${wtag},${wtag} > scope,${wtag} > .handle)`

    /**
     * Single element wrapping on click
     */
    this.context
    .events( this.context.$canvas )
    .on('mousedown.wrapper', selector, ( e: any ) => {
      !this.context.constraints<WrappableActionType>('wrap', 'activate', e )
      && this.activate( $(e.target), e )
    }, { selfExclude: true })

    /**
     * Wrappable element deactivation by constraints
     */
    this.context
    .events( this.context.options.$viewport )
    .on('mousedown.wrapper', e => {
      !$(e.target).is(`${wtag} > .handle`)
      && !this.context.constraints<WrappableActionType>('wrap', 'deactivate', e )
      && this.deactivate()
    })
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