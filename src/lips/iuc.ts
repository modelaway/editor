import Tick from './tick'

/**
 * Internal Update Clock: Single global timer 
 * that updates all components.
 */
export default class IUC {
  private subscriptions = new Map<string, () => void>()
  private tick = new Tick()
  
  /**
   * Register component update function
   */
  register( ref: string, ticker: () => void ){
    this.subscriptions.set( ref, ticker )
    this.tick.register( ref, ticker )
  }
  
  /**
   * Unregister component
   */
  unregister( ref: string ){
    this.subscriptions.delete( ref )
    this.tick.unregister( ref )
  }
  
  /**
   * Queue an immediate update for next tick
   */
  queueUpdate( ref: string ){
    this.tick.queue( ref )
  }
  
  /**
   * Create a state proxy handler to detect mutations
   */
  proxyState( componentRef: string ){
    const self = this
    
    return {
      get( target: any, prop: string | symbol ){
        const value = target[ prop ]
        
        /**
         * REVIEW: Special handling for Map objects that 
         * return a proxied Map that tracks mutations
         */
        if( value instanceof Map )
          return new Proxy( value, {
            get( map, mapProp ){
              // @ts-ignore
              const mapValue = map[ mapProp ]
              
              // Intercept Map methods
              if( typeof mapValue === 'function' )
                return function( ...args: any[] ){
                  const 
                  methodName = mapProp.toString(),
                  result = mapValue.apply( map, args )
                  
                  /**
                   * Modify the Map and queue update after mutation
                   */
                  ;['set', 'delete', 'clear'].includes( methodName )
                  && self.queueUpdate( componentRef )
                  
                  return result
                }
              
              return mapValue
            }
          })
        
        // Recursively wrap nested objects
        if( value && typeof value === 'object' && !Array.isArray( value ) )
          return new Proxy( value, this )
        
        return value
      },
      
      set( target: any, prop: string | symbol, value: any ){
        // Skip if value hasn't changed
        if( target[ prop ] === value ) return true
        
        // Handle Map assignment (replacing the entire Map)
        if( value instanceof Map && target[ prop ] instanceof Map ){
          // Clear and repopulate the existing Map to maintain references
          const existingMap = target[ prop ]

          existingMap.clear()
          value.forEach( ( v, k ) => existingMap.set( k, v ) )
          
          // Queue update
          self.queueUpdate( componentRef )
          return true
        }
        
        // Update the value (regular property)
        target[ prop ] = value
        // Queue update
        self.queueUpdate( componentRef )
        
        return true
      }
    }
  }
}