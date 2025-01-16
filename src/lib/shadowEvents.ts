
// type EventType = keyof HTMLElementEventMap
type EventType = string

interface EventOptions {
  preventDefault?: boolean;
  stopPropagation?: boolean;
  stopImmediatePropagation?: boolean;
}

export default class ShadowEvents {
  private listeners: Map<string, EventListener> = new Map()
  private root: ShadowRoot

  constructor( shadowRoot: ShadowRoot ){
    this.root = shadowRoot;
  }

  on<E extends EventType>(
    _event: E,
    selectorOrCallback: string | EventListener,
    callbackOrOptions?: EventListener | EventOptions,
    options: EventOptions = {}
  ): this {
    if( !this.root ) return this

    // Handle overloaded parameters
    let 
    selector: string | undefined,
    callback: EventListener
    
    if( typeof selectorOrCallback === 'function' ){
      callback = selectorOrCallback
      options = callbackOrOptions as EventOptions || {}
    }
    else {
      selector = selectorOrCallback
      callback = callbackOrOptions as EventListener
    }

    if( typeof callback !== 'function' ) return this

    // Create the event listener
    const wrappedCallback = ( e: Event ) => {
      // e.composed && e.stopPropagation()

      options.preventDefault && e.preventDefault()
      options.stopPropagation && e.stopPropagation()
      options.stopImmediatePropagation && e.stopImmediatePropagation()

      if( !selector ){
        callback.bind( e.target )( e )
        return
      }

      e.target instanceof Element 
      && e.target.matches( selector )
      && callback.bind( e.target )( e )
    }

    // Store the listener for cleanup
    const
    key = `${_event}-${selector || ''}`
    this.listeners.set( key, wrappedCallback )
    
    /**
     * Attach the listener
     * 
     * REVIEW: Better way to handle namespaced events
     */
    const [ evt, nsp ] = _event.split('.')
    this.root.addEventListener( evt, wrappedCallback, true )

    return this
  }

  off<E extends EventType>( _event: E, selector?: string ): this {
    if( !this.root ) return this

    const
    key = `${_event}-${selector || ''}`,
    listener = this.listeners.get( key )
    
    if( listener ){
      this.root.removeEventListener( _event, listener, true )
      this.listeners.delete( key )
    }

    return this
  }
}