type EventMap = HTMLElementEventMap
type BaseEventType = keyof EventMap
type NamespacedEvent = `${BaseEventType}.${string}` | `.${string}`
type EventType = BaseEventType | NamespacedEvent
type EventCallback<E extends EventType> = (e: EventMap[E extends `${infer B}.${string}` ? B extends BaseEventType ? B : never : E extends BaseEventType ? E : never]) => void
  
interface EventOptions {
  preventDefault?: boolean
  stopPropagation?: boolean
  stopImmediatePropagation?: boolean
  capture?: boolean
  selfExclude?: boolean
}

export default class ShadowEvents {
  private listeners: Map<string, EventListener> = new Map()
  private element: Element

  constructor( element: Element ){
    this.element = element
  }

  private getEventName( eventString: string ): string {
    return eventString.split('.')[0]
  }

  on<E extends EventType>(
    _event: E,
    selectorOrCallback: string | EventCallback<E>,
    callbackOrOptions?: EventCallback<E> | EventOptions,
    options: EventOptions = {}
  ): this {
    if( !this.element ) return this

    // Handle overloaded parameters
    let 
    selector: string | undefined,
    callback: EventCallback<E>
    
    if( typeof selectorOrCallback === 'function' ){
      callback = selectorOrCallback
      options = callbackOrOptions as EventOptions || {}
    }
    else {
      selector = selectorOrCallback
      callback = callbackOrOptions as EventCallback<E>
    }

    if( typeof callback !== 'function' ) return this

    // Create the event listener
    const wrappedCallback = ( e: Event ) => {
      options.preventDefault && e.preventDefault()
      options.stopPropagation && e.stopPropagation()
      options.stopImmediatePropagation && e.stopImmediatePropagation()

      type BaseE = E extends `${infer B}.${string}` ? B extends BaseEventType ? B : never : E extends BaseEventType ? E : never
      const _e = e as EventMap[BaseE]

      if( !selector ){
        callback.bind( e.target )( _e )
        return
      }

      if( !(e.target instanceof Element) 
          || !e.target.matches( selector ) ) return

      /**
       * Apply self-exclude option when handling 
       * the '*' selector.
       */
      if( options.selfExclude && e.target === this.element )
        return

      const matchingElement = e.target.closest( selector )

      matchingElement
      && this.element.contains( matchingElement )
      && callback.bind( matchingElement )( _e )
    }

    const key = `${_event}-${selector || ''}`
    this.listeners.set( key, wrappedCallback )
    
    const eventName = this.getEventName( _event )
    this.element.addEventListener( eventName, wrappedCallback, options.capture ?? true )

    return this
  }

  off<E extends EventType>( _event: E, selector?: string ): this {
    if( !this.element ) return this

    const
    key = `${_event}-${selector || ''}`,
    listener = this.listeners.get( key )
    
    if( listener ){
      this.element.removeEventListener( this.getEventName( _event ), listener, true )
      this.listeners.delete( key )
    }

    return this
  }

  hasListener<E extends EventType>( _event: E, selector?: string ): boolean {
    const key = `${_event}-${selector || ''}`
    return this.listeners.has( key )
  }

  removeAll(): this {
    this.listeners.forEach(( listener, eventKey ) => {
      const [ _event ] = eventKey.split('-')
      this.element.removeEventListener( this.getEventName( _event ), listener, true )
    })
    
    this.listeners.clear()
    return this
  }

  destroy(): void {
    this.removeAll()
    this.element = null as any
  }
}