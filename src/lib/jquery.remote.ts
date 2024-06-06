import { generateKey } from '../utils'
import type IOF from './custom.iframe.io'
import $ from 'jquery'

type Packet = {
  selector?: string
  fn: string
  arg?: any[]
  canreturn?: boolean
}
type Response = {
  index: string
  value?: any
}
export type RJQuery = ( selector: string ) => Static

const State: { [index: string]: JQuery<HTMLElement> } = {}

class Static {
  channel: IOF
  selector: string
  /**
   * Store remote state index to be 
   * use as selector when element is
   * remotely mount as JQuery object.
   */
  index?: string

  constructor( channel: IOF, selector: string ){
    this.channel = channel
    this.selector = selector
  }

  private call( packet: Packet ){
    return new Promise( ( resolve, reject ) => {
      packet.selector = this.index || this.selector

      this.channel.emit('packet', packet, ( error: string | boolean, { index, value }: Response ) => {
        // Record remote state index
        this.index = index
        
        error ? reject( error ) : resolve( value )
      } )
    } )
  }
  
  /**
   * Adds the specified class(es) to each element in 
   * the set of matched elements.
   */
  async addClass( arg: string ){
    await this.call({ fn: 'addClass', arg: [ arg ] })
    return this
  }

  /**
   * Determine whether any of the matched elements 
   * are assigned the given selector.
   */
  async is( arg: string ){
    return await this.call({ fn: 'is', arg: [ arg ], canreturn: true })
  }

  /**
   * Determine whether any of the matched elements are 
   * assigned the given class.
   */
  async hasClass( arg: string ){
    return await this.call({ fn: 'hasClass', arg: [ arg ], canreturn: true })
  }

  /**
   * Remove a single class, multiple classes, or all 
   * classes from each element in the set of matched 
   * elements.
   */
  async removeClass( arg: string ){
    await this.call({ fn: 'removeClass', arg: [ arg ] })
    return this
  }

  /**
   * Add or remove one or more classes from each element 
   * in the set of matched elements, depending on either 
   * the class’s presence or the value of the state argument.
   */
  async toggleClass( arg: string ){
    await this.call({ fn: 'toggleClass', arg: [ arg ] })
    return this
  }
  
  /**
   * Insert content, specified by the parameter, to the 
   * end of each element in the set of matched elements.
   */
  async append( arg: Static | string ){
    await this.call({ fn: 'append', arg: [ typeof arg == 'object' ? arg.selector : arg ] })
    return this
  }

  /**
   * Insert every element in the set of matched elements to 
   * the end of the target.
   */
  async appendTo( arg: Static | string ){
    await this.call({ fn: 'appendTo', arg: [ typeof arg == 'object' ? arg.selector : arg ] })
    return this
  }

  /**
   * Insert content, specified by the parameter, to the 
   * beginning of each element in the set of matched elements.
   */
  async prepend( arg: Static | string ){
    await this.call({ fn: 'prepend', arg: [ typeof arg == 'object' ? arg.selector : arg ] })
    return this
  }

  /**
   * Insert every element in the set of matched elements to 
   * the beginning of the target.
   */
  async prependTo( arg: Static | string ){
    await this.call({ fn: 'prependTo', arg: [ typeof arg == 'object' ? arg.selector : arg ] })
    return this
  }

  /**
   * Insert content, specified by the parameter, after each 
   * element in the set of matched elements.
   */
  async after( arg: Static | string ){
    await this.call({ fn: 'after', arg: [ typeof arg == 'object' ? arg.selector : arg ] })
    return this
  }

  /**
   * Insert content, specified by the parameter, before each 
   * element in the set of matched elements.
   */
  async before( arg: Static | string ){
    await this.call({ fn: 'before', arg: [ typeof arg == 'object' ? arg.selector : arg ] })
    return this
  }

  /**
   * Insert every element in the set of matched elements 
   * after the target.
   */
  async insertAfter( arg: Static | string ){
    await this.call({ fn: 'insertAfter', arg: [ typeof arg == 'object' ? arg.selector : arg ] })
    return this
  }

  /**
   * Insert every element in the set of matched elements 
   * before the target.
   */
  async insertBefore( arg: Static | string ){
    await this.call({ fn: 'insertBefore', arg: [ typeof arg == 'object' ? arg.selector : arg ] })
    return this
  }

  /**
   * Replace each target element with the set of matched 
   * elements.
   */
  async replaceAll( arg: Static | string ){
    await this.call({ fn: 'replaceAll', arg: [ typeof arg == 'object' ? arg.selector : arg ] })
    return this
  }

  /**
   * Replace each element in the set of matched elements with 
   * the provided new content and return the set of elements 
   * that was removed.
   */
  async replaceWith( arg: Static | string ){
    await this.call({ fn: 'replaceWith', arg: [ typeof arg == 'object' ? arg.selector : arg ] })
    return this
  }

  /**
   * Wrap an HTML structure around each element in the set 
   * of matched elements.
   */
  async wrap( arg: Static | string ){
    await this.call({ fn: 'wrap', arg: [ typeof arg == 'object' ? arg.selector : arg ] })
    return this
  }

  /**
   * Wrap an HTML structure around all elements in the set 
   * of matched elements.
   */
  async wrapAll( arg: Static | string ){
    await this.call({ fn: 'wrapAll', arg: [ typeof arg == 'object' ? arg.selector : arg ] })
    return this
  }

  /**
   * Wrap an HTML structure around the content of each element 
   * in the set of matched elements.
   */
  async wrapInner( arg: Static | string ){
    await this.call({ fn: 'wrapInner', arg: [ typeof arg == 'object' ? arg.selector : arg ] })
    return this
  }

  /**
   * Remove the parents of the set of matched elements from the 
   * DOM, leaving the matched elements in their place.
   */
  async unwrap( arg: Static | string ){
    await this.call({ fn: 'unwrap', arg: [ typeof arg == 'object' ? arg.selector : arg ] })
    return this
  }

  /**
   * Remove the set of matched elements from the DOM.
   */
  async detach( arg: string ){
    await this.call({ fn: 'detach', arg: [ arg ] })
    return this
  }

  /**
   * Remove the set of matched elements from the DOM.
   */
  async remove(){
    await this.call({ fn: 'remove' })
  }

  /**
   * Create a deep copy of the set of matched elements.
   */
  async clone(){
    const cloneIndex = await this.call({ fn: 'clone', canreturn: true }) as string
    if( !cloneIndex )
      throw new Error('Unexpected error occured')
    
    // console.log( typeof html, html )
    return new Static( this.channel, cloneIndex )
  }

  /**
   * Get the value of a property for the first element in 
   * the set of matched elements or set one or more 
   * properties for every matched element.
   */
  async prop( arg: string | ObjectType<string>, value?: string ){
    const 
    params = value !== undefined && typeof arg == 'string' ? [ arg, value ] : [ arg ],
    canreturn = value === undefined && typeof arg == 'string'

    return await this.call({ fn: 'prop', arg: params, canreturn })
  }

  /**
   * Get the value of an attribute for the first element in the 
   * set of matched elements or set one or more attributes for 
   * every matched element.
   */
  async attr( arg: string | ObjectType<string>, value?: string ){
    const
    params = value !== undefined && typeof arg == 'string' ? [ arg, value ] : [ arg ],
    canreturn = value === undefined && typeof arg == 'string'

    return await this.call({ fn: 'attr', arg: params, canreturn })
  }
  
  /**
   * Remove an attribute from each element in the set 
   * of matched elements.
   */
  async removeAttr( arg: string ){
    await this.call({ fn: 'removeAttr', arg: [ arg ] })
    return this
  }

  /**
   * Get the value of a computed style property for the first 
   * element in the set of matched elements or set one or more 
   * CSS properties for every matched element.
   */
  async css( arg: string | ObjectType<string>, value?: string ){
    const 
    params = value !== undefined && typeof arg == 'string' ? [ arg, value ] : [ arg ],
    canreturn = value === undefined && typeof arg == 'string'

    return await this.call({ fn: 'css', arg: params, canreturn })
  }

  /**
   * Remove all child nodes of the set of matched elements from the DOM.
   */
  async empty( arg: string ){
    await this.call({ fn: 'empty', arg: [ arg ] })
    return this
  }

  /**
   * Get the HTML contents of the first element in the set 
   * of matched elements or set the HTML contents of every 
   * matched element.
   */
  async html( arg?: string ){
    const
    params = arg !== undefined ? [ arg ] : [],
    canreturn = arg === undefined

    return await this.call({ fn: 'html', arg: params, canreturn })
  }

  /**
   * Get the combined text contents of each element in the set 
   * of matched elements, including their descendants, or set 
   * the text contents of the matched elements.
   */
  async text( arg?: string ){
    const
    params = arg !== undefined ? [ arg ] : [],
    canreturn = arg === undefined

    return await this.call({ fn: 'text', arg: params, canreturn })
  }
  
  /**
   * Get the current value of the first element in the set of 
   * matched elements or set the value of every matched element.
   */
  async val( arg?: string ){
    const
    params = arg !== undefined ? [ arg ] : [],
    canreturn = arg === undefined

    return await this.call({ fn: 'val', arg: params, canreturn })
  }

  /**
   * Remove a property for the set of matched elements.
   */
  async removeProp( arg: string ){
    await this.call({ fn: 'removeProp', arg: [ arg ] })
    return this
  }

  /**
   * Get the current computed width for the first element in 
   * the set of matched elements or set the width of every 
   * matched element.
   */
  async width( arg?: string ){
    const
    params = arg !== undefined ? [ arg ] : [],
    canreturn = arg === undefined

    return await this.call({ fn: 'width', arg: params, canreturn })
  }

  /**
   * Get the current computed height for the first element in the 
   * set of matched elements or set the height of every matched element.
   */
  async height( arg?: string ){
    const
    params = arg !== undefined ? [ arg ] : [],
    canreturn = arg === undefined

    return await this.call({ fn: 'height', arg: params, canreturn })
  }

  /**
   * Get the current computed inner width (including padding but not border) 
   * for the first element in the set of matched elements or set the 
   * inner width of every matched element.
   */
  async innerWidth( arg?: string ){
    const
    params = arg !== undefined ? [ arg ] : [],
    canreturn = arg === undefined

    return await this.call({ fn: 'innerWidth', arg: params, canreturn })
  }

  /**
   * Get the current computed inner height (including padding but not border) 
   * for the first element in the set of matched elements or set the 
   * inner height of every matched element.
   */
  async innerHeight( arg?: string ){
    const
    params = arg !== undefined ? [ arg ] : [],
    canreturn = arg === undefined

    return await this.call({ fn: 'innerHeight', arg: params, canreturn })
  }

  /**
   * Get the current computed outer width (including padding, border, and 
   * optionally margin) for the first element in the set of matched 
   * elements or set the outer width of every matched element.
   */
  async outerWidth( arg?: string ){
    const
    params = arg !== undefined ? [ arg ] : [],
    canreturn = arg === undefined

    return await this.call({ fn: 'outerWidth', arg: params, canreturn })
  }

  /**
   * Get the current computed outer height (including padding, border, and 
   * optionally margin) for the first element in the set of matched elements 
   * or set the outer height of every matched element.
   */
  async outerHeight( arg?: string ){
    const
    params = arg !== undefined ? [ arg ] : [],
    canreturn = arg === undefined

    return await this.call({ fn: 'outerHeight', arg: params, canreturn })
  }

  /**
   * Get the current coordinates of the first element, or set the coordinates 
   * of every element, in the set of matched elements, relative to the document.
   */
  async offset(){
    return await this.call({ fn: 'offset', canreturn: true })
  }

  /**
   * Get the current coordinates of the first element in the set of 
   * matched elements, relative to the offset parent.
   */
  async position(){
    return await this.call({ fn: 'position', canreturn: true })
  }

  /**
   * Get the current horizontal position of the scroll bar for the first 
   * element in the set of matched elements or set the horizontal 
   * position of the scroll bar for every matched element.
   */
  async scrollLeft( arg?: string ){
    const
    params = arg !== undefined ? [ arg ] : [],
    canreturn = arg === undefined

    return await this.call({ fn: 'scrollLeft', arg: params, canreturn })
  }

  /**
   * Get the current vertical position of the scroll bar for the first element 
   * in the set of matched elements or set the vertical position of the 
   * scroll bar for every matched element.
   */
  async scrollTop( arg?: string ){
    const
    params = arg !== undefined ? [ arg ] : [],
    canreturn = arg === undefined

    return await this.call({ fn: 'scrollTop', arg: params, canreturn })
  }
}

/**
 * Remote JQuery operation event listener
 */
function receive({ selector, fn, arg, canreturn }: Packet, callback?: ( error: string | boolean, response?: any ) => void ){
  try {
    if( !selector )
      throw new Error('Undefined selector')
    
    /**
     * Use a state element or create new jquery element
     * 
     * - state element are usually for cloned elements, ...
     */
    let 
    index = selector,
    $element = State[ index ] as any

    if( !$element ){
      /**
       * Generate an index to hold the element in
       * state for further operation.
       */
      index = `--${generateKey()}--`
      State[ index ] = $element = $(selector) as any
    }

    if( !$element.length )
      throw new Error(`Undefined ${selector} element`)
    
    // Invoke JQuery static method ont selected element
    let value = $element[ fn as any ]( ...(arg || []) )

    // Clone jQuery element procedure
    if( ['clone'].includes( fn ) ){
      const cloneIndex = `--${generateKey()}--`
      State[ cloneIndex ] = value

      value = cloneIndex
    }

    typeof callback === 'function'
    && callback( false, { index, value: canreturn ? value : undefined })
  }
  catch( error: any ){ typeof callback == 'function' && callback( error.message ) }
}

export default function RemoteJQuery( channel: IOF ): RJQuery {
  // Listen to remote calls
  channel.on('packet', receive )
  // Initialize remove jquery element object
  return ( selector: string ) => (new Static( channel, selector ))
}