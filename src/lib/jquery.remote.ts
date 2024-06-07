import type IOF from './custom.iframe.io'
import $ from 'jquery'
import { generateKey } from '../modules/utils'

export type RJQuery = ( selector: string ) => Promise<Static>

type Packet = {
  index?: string
  fn: string
  arg?: any[]
  instance?: boolean
  canreturn?: boolean
}
type InitialProperties = {
  index?: string
  length: number
}
type Response = {
  length: number
  value?: any
}
type EventListener = ( e: Static ) => void

const State: { [index: string]: JQuery<HTMLElement | Event> } = {}

class Static {
  private readonly selector: string | null
  private channel: IOF

  /**
   * Store remote state index to be 
   * use as selector when element is
   * remotely mount as JQuery object.
   */
  private index?: string

  /**
   * The number of elements in the jQuery object.
   */
  public length = 0

  constructor( channel: IOF, selector: string | null, index?: string ){
    this.channel = channel
    this.selector = selector

    /**
     * Can be specified by instance objects
     * that don't have selector or cannot rely on
     * a selector at their operation state.
     * 
     * Eg. clone(), find(), first(), ...
     */
    if( index ) this.index = index
  }

  public initialize(): Promise<Static> {
    return new Promise( ( resolve, reject ) => {
      this.channel.emit('init', this.selector, ( error: string | boolean, { index, length }: InitialProperties ) => {
        if( error ) return reject( error )

        // Record remote state index
        this.index = index
        this.length = length
        
        resolve( this )
      } )
    } )
  }

  private call( packet: Packet ){
    return new Promise( ( resolve, reject ) => {
      if( !this.index )
        return reject('Uninitialized element object')

      packet.index = this.index

      this.channel.emit('packet', packet, ( error: string | boolean, { length, value }: Response ) => {
        // Keep update of the element's length property
        this.length = length
        
        error ? reject( error ) : resolve( value )
      } )
    } )
  }
  
  /**
   * Determine whether any of the matched elements 
   * are assigned the given selector.
   */
  async is( arg: string ){
    return await this.call({ fn: 'is', arg: [ arg ], canreturn: true })
  }

  /**
   * Remove elements from the set of matched elements.
   */
  async not( arg: string ){
    return await this.call({ fn: 'not', arg: [ arg ], canreturn: true })
  }

  /**
   * Retrieve the DOM elements matched by the jQuery object.
   */
  // async get( arg: string ){
  //   return await this.call({ fn: 'get', arg: [ arg ], canreturn: true })
  // }

  /**
   * Reduce the set of matched elements to those that have 
   * a descendant that matches the selector or DOM element.
   */
  async has( arg: string ){
    return await this.call({ fn: 'has', arg: [ arg ], canreturn: true })
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
   * Insert content, specified by the parameter, before each 
   * element in the set of matched elements.
   */
  async before( arg: Static | string ){
    await this.call({ fn: 'before', arg: [ typeof arg == 'object' ? arg.selector : arg ] })
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
   * Get the immediately preceding sibling of each element in 
   * the set of matched elements. If a selector is provided, it 
   * retrieves the previous sibling only if it matches that selector.
   */
  async prev( arg: string ){
    const index = await this.call({ fn: 'prev', arg: [ arg ], canreturn: true, instance: true }) as string
    if( !index )
      throw new Error('Unexpected error occured')
    
    return new Static( this.channel, null, index )
  }

  /**
   * Get the immediately following sibling of each element in the 
   * set of matched elements. If a selector is provided, it 
   * retrieves the next sibling only if it matches that selector.
   */
  async next( arg: string ){
    const index = await this.call({ fn: 'next', arg: [ arg ], canreturn: true, instance: true }) as string
    if( !index )
      throw new Error('Unexpected error occured')
    
    return new Static( this.channel, null, index )
  }

  /**
   * Get all following siblings of each element in the set 
   * of matched elements, optionally filtered by a selector.
   */
  async nextAll( arg: string ){
    const index = await this.call({ fn: 'nextAll', arg: [ arg ], canreturn: true, instance: true }) as string
    if( !index )
      throw new Error('Unexpected error occured')
    
    return new Static( this.channel, null, index )
  }

  /**
   * Get all following siblings of each element up to but 
   * not including the element matched by the selector, 
   * DOM node, or jQuery object passed.
   */
  async nextUntil( arg: string ){
    const index = await this.call({ fn: 'nextUntil', arg: [ arg ], canreturn: true, instance: true }) as string
    if( !index )
      throw new Error('Unexpected error occured')
    
    return new Static( this.channel, null, index )
  }

  /**
   * Get the parent of each element in the current set of 
   * matched elements, optionally filtered by a selector.
   */
  async parent( arg?: string ){
    const index = await this.call({ fn: 'parent', arg: [ arg ], canreturn: true, instance: true }) as string
    if( !index )
      throw new Error('Unexpected error occured')
    
    return new Static( this.channel, null, index )
  }

  /**
   * Get the ancestors of each element in the current 
   * set of matched elements, optionally filtered by a selector.
   */
  async parents( arg?: string ){
    const index = await this.call({ fn: 'parents', arg: [ arg ], canreturn: true, instance: true }) as string
    if( !index )
      throw new Error('Unexpected error occured')
    
    return new Static( this.channel, null, index )
  }

  /**
   * Get the children of each element in the set of matched 
   * elements, optionally filtered by a selector.
   */
  async children( arg?: string ){
    const index = await this.call({ fn: 'children', arg: [ arg ], canreturn: true, instance: true }) as string
    if( !index )
      throw new Error('Unexpected error occured')
    
    return new Static( this.channel, null, index )
  }

  /**
   * For each element in the set, get the first element that matches 
   * the selector by testing the element itself and traversing up 
   * through its ancestors in the DOM tree.
   */
  async closest( arg: string ){
    const index = await this.call({ fn: 'closest', arg: [ arg ], canreturn: true, instance: true }) as string
    if( !index )
      throw new Error('Unexpected error occured')
    
    return new Static( this.channel, null, index )
  }

  /**
   * Iterate over a jQuery object, executing a function for 
   * each matched element.
   */
  async each( fn: EventListener ){
    if( typeof fn !== 'function' )
      throw new Error('Undefined event listener function')
    
    // Listen to each matched elements
    this.channel.on(`@each-${this.index}`, ( targetIndex: string ) => {
      fn( new Static( this.channel, null, targetIndex ) )
    } )

    // Loop through
    this.call({ fn: 'each' })
    
    return this
  }

  /**
   * Reduce the set of matched elements to the one at the specified index.
   */
  async eq( arg: number ){
    const index = await this.call({ fn: 'eq', arg: [ arg ], canreturn: true, instance: true }) as string
    if( !index )
      throw new Error('Unexpected error occured')
    
    return new Static( this.channel, null, index )
  }

  /**
   * Get the descendants of each element in the current set 
   * of matched elements, filtered by a selector, jQuery 
   * object, or element.
   */
  async find( arg: string ){
    const index = await this.call({ fn: 'find', arg: [ arg ], canreturn: true, instance: true }) as string
    if( !index )
      throw new Error('Unexpected error occured')
    
    return new Static( this.channel, null, index )
  }

  /**
   * Reduce the set of matched elements to the first in the set.
   */
  async first(){
    const index = await this.call({ fn: 'first', canreturn: true, instance: true }) as string
    if( !index )
      throw new Error('Unexpected error occured')

    return new Static( this.channel, null, index )
  }

  /**
   * Reduce the set of matched elements to the final one in the set.
   */
  async last(){
    const index = await this.call({ fn: 'last', canreturn: true, instance: true }) as string
    if( !index )
      throw new Error('Unexpected error occured')
    
    return new Static( this.channel, null, index )
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
    const index = await this.call({ fn: 'clone', canreturn: true, instance: true }) as string
    if( !index )
      throw new Error('Unexpected error occured')
    
    return new Static( this.channel, null, index )
  }

  /**
   * Store arbitrary data associated with the matched elements or 
   * return the value at the named data store for the first element 
   * in the set of matched elements.
   */
  async data( arg: string | ObjectType<string>, value?: string ){
    const
    params = value !== undefined && typeof arg == 'string' ? [ arg, value ] : [ arg ],
    canreturn = value === undefined && typeof arg == 'string'

    return await this.call({ fn: 'data', arg: params, canreturn })
  }

  /**
   * Remove a previously-stored piece of data.
   */
  async removeData( arg: string ){
    await this.call({ fn: 'removeData', arg: [ arg ] })
    return this
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

  /**
   * Hide the matched elements.
   */
  async hide( ...arg: any[] ){
    await this.call({ fn: 'hide', arg })
    return this
  }

  /**
   * Display the matched elements.
   */
  async show( ...arg: any[] ){
    await this.call({ fn: 'show', arg })
    return this
  }

  /**
   * Attach an event handler function for one or more 
   * events to the selected elements.
   */
  on( _event: string, _selector?: string | EventListener, fn?: EventListener ){
    if( typeof _selector == 'function' ){
      fn = _selector
      _selector = undefined
    }

    if( typeof fn !== 'function' )
      throw new Error('Undefined event listener function')
    
    this.call({ fn: 'on', arg: [ _event, _selector ] })
        .then( () => {
          this.channel.on(`@${_event}-${_selector || this.index}`, ( targetIndex: string ) => {
            fn( new Static( this.channel, null, targetIndex ) )
          } )
        } )
    
    return this
  }

  /**
   * Attach a handler to an event for the elements. The handler 
   * is executed at most once per element per event type.
   */
  one( _event: string, _selector?: string | EventListener, fn?: EventListener ){
    if( typeof _selector == 'function' ){
      fn = _selector
      _selector = undefined
    }

    if( typeof fn !== 'function' )
      throw new Error('Undefined event listener function')
    
    this.call({ fn: 'one', arg: [ _event, _selector ] })
        .then( () => {
          this.channel.on(`@${_event}-${_selector || this.index}`, ( targetIndex: string ) => {
            fn( new Static( this.channel, null, targetIndex ) )
          } )
        } )
    
    return this
  }

  /**
   * Execute all handlers and behaviors attached to the matched 
   * elements for the given event type.
   */
  async trigger( arg: string ){
    await this.call({ fn: 'trigger', arg: [ arg ] })
    return this
  }

  /**
   * Remove an event handler.
   */
  async off( _event: string, _selector?: string ){
    await this.call({ fn: 'off', arg: [ _event ] })
    this.channel.off(`@${_event}-${_selector || this.index}`)

    return this
  }
}

export default function RemoteJQuery( channel: IOF ): RJQuery {
  /**
   * Remote JQuery element initialization event listener
   */
  function onInit( selector: string, callback?: ( error: string | boolean, props?: InitialProperties ) => void ){
    try {
      if( !selector )
        throw new Error('Undefined selector')
      
      let index
      const $element = $(selector) as any
      if( $element.length ){
        /**
         * Hold initialized JQuery element in momery
         * for any upcoming operations.
         * 
         * - Helps provide initial properties to remote
         * - Facilitate virtual operation on the matched 
         *   JQuery element (even before to add to the DOM)
         */
        index = `--${generateKey()}--`
        State[ index ] = $element
      }

      const props: InitialProperties = {
        index,
        length: $element.length,
      }
      typeof callback === 'function' && callback( false, props )
    }
    catch( error: any ){ typeof callback == 'function' && callback( error.message ) }
  }

  /**
   * Remote call operation event listener
   */
  function onCall({ index, fn, arg, canreturn, instance }: Packet, callback?: ( error: string | boolean, response?: Response ) => void ){
    try {
      if( !index )
        throw new Error('Undefined selector index')
      
      /**
       * Use a state element or create new jquery element
       * 
       * - state element are usually for cloned elements, ...
       */
      let $element = State[ index ] as any
      if( !$element?.length )
        throw new Error(`Undefined index element`)
      
      // Default arg to empty array
      arg = arg || []
      let value

      /**
       * Declare remove event listener
       */
      if( ['on', 'one'].includes( fn ) ){
        const [ _event, _selector ] = arg
        _selector ?
            // Event listener with scope selector
            $element[ fn ]( _event, _selector, function( this: Event ){
              const targetIndex = `--${generateKey()}--`
              State[ targetIndex ] = $(this)

              channel.emit(`@${_event}-${_selector}`, targetIndex )
            })
            // Event listener without scope selector
            : $element[ fn ]( _event, function( this: Event ){
                const targetIndex = `--${generateKey()}--`
                State[ targetIndex ] = $(this)

                channel.emit(`@${_event}-${index}`, targetIndex )
              })
      }
      /**
       * Loop through matched elements
       */
      else if( ['each', 'filter'].includes( fn ) )
        $element[ fn ]( function( this: Event ){
          const targetIndex = `--${generateKey()}--`
          State[ targetIndex ] = $(this)

          console.log('each --', index, targetIndex )

          channel.emit(`@${fn}-${index}`, targetIndex )
        })
      
      // Invoke JQuery static method on selected element
      else value = $element[ fn ]( ...arg )
      
      // Create new jQuery element instance
      if( instance ){
        const instanceIndex = `--${generateKey()}--`
        State[ instanceIndex ] = value

        value = instanceIndex
      }

      const response: Response = {
        length: $element.length,
        value: canreturn ? value : undefined,
      }
      typeof callback === 'function' && callback( false, response )
    }
    catch( error: any ){ typeof callback == 'function' && callback( error.message ) }
  }

  // Listen to remote calls
  channel
  .on('init', onInit )
  .on('packet', onCall )

  // Initialize remove jquery element object
  return async ( selector: string ) => {
    const rjobject = new Static( channel, selector )
    return await rjobject.initialize()
  }
}