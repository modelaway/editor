import $, { type Cash } from 'cash-dom'

declare global {
  interface String {
    toCapitalCase: () => string
  }
}

String.prototype.toCapitalCase = function(){
  return this.toLowerCase().replace(/(?:^|\s)\w/g, match => {
    return match.toUpperCase()
  })
}

/**
 * Debug logger
 */
export const debug = ( ...args: any[] ) => {
  console.debug('[debug]:', ...args )
}

/**
 * Generate unique view key
 */
export const generateKey = () => {
  const rmin = 101, rmax = 999
  return Date.now() + String( Math.floor( Math.random() * ( rmax - rmin + 1 )+( rmin + 1 ) ) )
}

/**
 * Generate SHA-1 hash for a given input string.
 * @returns A promise that resolves to the SHA-1 hash 
 *          as a hexadecimal string of `generateKey()`.
 */
export const hashKey = () => {
  const
  key = generateKey(),
  timestamp = Date.now(),
  random = crypto.getRandomValues(new Uint32Array(1))[0],
  base = 36,
  hash = Array.from( `${key}${timestamp}${random}` )
    .reduce(( h, c ) => 
      ( ( h * base + c.charCodeAt(0) ) ^ random ) >>> 0
    , 5381 )
    
  return hash
          .toString(16)
          .replace(/[^0-9a-f]/gi, '0')
          .padStart(7, '0')
          .substring(0, 7)
}

/**
 * Convert integrale object to a string
 * 
 * - preserve included functions
 */
export const obj2Str = ( obj: Record<string, any> ): string => {
  let str = '{'

  for( let key in obj ){
    let value = obj[ key ]

    if( typeof value === 'function' ){
      let fn = value.toString()
      if( new RegExp(`^${key}`).test( fn ) )
        fn = fn.replace( key, 'function' )

      value = fn
    }
    else if( Array.isArray( value ) ) value = JSON.stringify( value )
    else if( typeof value === 'object' ) value = obj2Str( value )
    else if( typeof value === 'string' ) value = `"${value.replace(/"/g, '\\"')}"`

    str += `\n  ${key}: ${value},`
  }
  
  return str += '\n}'
}

/**
 * Convert back a string object converted with obj2Str
 */
export const str2Obj = ( str: string ): Record<string, any> => {
  return new Function(`return ${str}`)()
}

/**
 * Auto-dismiss an element block at a 
 * time (in Seconds)
 * 
 * Default delay: 8 seconds
 */
let AUTO_DISMISS_TRACKERS: Record<string, any> = {}

export const autoDismiss = ( id: string, $this: Cash, delay?: number ) => {
  // Cancel previous auto-dismiss-delay
  clearTimeout( AUTO_DISMISS_TRACKERS[ id ] )
  AUTO_DISMISS_TRACKERS[ id ] = setTimeout( () => $this.remove(), (delay || 5) * 1000 )
}
type Container = Record<string, any> | Map<string, any>

function isContainer(value: any): value is Container {
  return (
    value !== null &&
    typeof value === 'object' &&
    (value.constructor === Object || value.constructor === Map)
  )
}

function getValue(container: Container, key: string): any {
  return container instanceof Map ? container.get(key) : container[key]
}

function setValue(container: Container, key: string, value: any): void {
  container instanceof Map ? container.set(key, value) : container[key] = value
}

function hasKey(container: Container, key: string): boolean {
  return container instanceof Map ? container.has(key) : key in container
}

function deleteKey(container: Container, key: string): void {
  container instanceof Map ? container.delete(key) : delete container[key]
}

export function deepClone( obj: any, seen = new WeakMap() ){
  // Handle primitives and functions
  if( obj === null || typeof obj !== 'object' ) return obj

  // Handle circular references
  if( seen.has( obj ) ) return seen.get( obj )

  // Handle Date objects
  if( obj instanceof Date ) return new Date( obj.getTime() )

  // Handle RegExp objects
  if( obj instanceof RegExp ) return new RegExp( obj.source, obj.flags )

  // Handle Map objects
  if( obj instanceof Map ){
    const mapClone = new Map()

    seen.set( obj, mapClone )
    obj.forEach( ( value, key ) => mapClone.set( deepClone( key, seen ), deepClone( value, seen ) ) )
    
    return mapClone
  }

  // Handle Set objects
  if( obj instanceof Set ){
    const setClone = new Set()

    seen.set( obj, setClone )
    obj.forEach( value => setClone.add( deepClone( value, seen ) ) )

    return setClone
  }

  // Handle Arrays
  if( Array.isArray( obj ) ){
    const arrClone: any[] = []
    seen.set( obj, arrClone )

    for( let i = 0; i < obj.length; i++ )
      arrClone[i] = deepClone( obj[i], seen )
    
    return arrClone
  }

  // Handle TypedArrays
  if( ArrayBuffer.isView( obj ) )
    return new (obj.constructor as any)( obj )

  // Handle plain objects
  const clone = Object.create( Object.getPrototypeOf( obj ) )
  seen.set( obj, clone )

  // Copy symbol properties
  const symbols = Object.getOwnPropertySymbols( obj )
  for( const symbol of symbols )
    clone[symbol] = deepClone( obj[symbol], seen )

  // Copy enumerable properties
  for( const key in obj )
    if( Object.prototype.hasOwnProperty.call( obj, key ) )
      clone[key] = deepClone( obj[key], seen )

  return clone
}

export function insertIntoMap<K, V>( map: Map<K, V>, key: K, value: V, index: number ): Map<K, V>{
  const entries = Array.from( map.entries() )
  entries.splice( index, 0, [ key, value ])

  return new Map( entries )
}

/**
 * Deep assign values to an object using dot notation paths
 * @param original The source object to modify
 * @param toSet Object containing path-value pairs to set
 * @param index Optional index for Map insertion at the deepest level
 * @returns A new object with the assigned values
 */
export function deepAssign<T>( original: T, toSet: Record<string, any>, index?: number ): T {
  if( !original || (typeof original !== 'object' && !(original instanceof Map)) )
    throw new TypeError('Original argument must be an object or Map')

  if( !toSet || typeof toSet !== 'object' )
    throw new TypeError('ToSet argument must be an object')
    
  if( !Object.keys( toSet ).length )
    return original instanceof Map ? new Map(original as Map<any, any>) as T : { ...original as object } as T

  function setValueAtPath( base: any, path: string, value: any ){
    const parts = path.split(/\.|\[|\]/).filter( Boolean )
    let current = base
    const parentChain: { parent: any; key: any }[] = []

    for( let i = 0; i < parts.length; i++ ){
      const 
      key = parts[i],
      isLastPart = i === parts.length - 1

      if( isLastPart ){
        if( current instanceof Map && typeof index === 'number' ){
          current = insertIntoMap( current, key, value, index )
          
          if( parentChain.length > 0 ){
            for( let j = parentChain.length - 1; j >= 0; j-- ){
              const 
              { parent, key } = parentChain[j],
              isParentMap = parent instanceof Map

              isParentMap ? parent.set( key, current ) : parent[key] = current
              current = parent
            }
          } else {
            base = current
          }
        } else {
          current instanceof Map ? current.set( key, value ) : current[key] = value
        }
        continue
      }

      parentChain.push({ parent: current, key })

      if( current instanceof Map ){
        if( !current.has( key ) ){
          current.set( key, new Map() )
        }
        current = current.get( key )
      } else {
        if( key === 'layers' ){
          if( !(key in current) || !(current[key] instanceof Map) ){
            current[key] = new Map()
          }
        } else if( !(key in current) ){
          current[key] = new Map()
        } else if( !(current[key] instanceof Map) ){
          current[key] = new Map()
        }
        current = current[key]
      }
    }

    return base
  }

  const modified = original instanceof Map ? new Map(original as Map<any, any>) : deepClone(original)

  try {
    for( const [ path, value ] of Object.entries( toSet ) ){
      if( typeof path !== 'string' )
        throw new TypeError(`Invalid path: ${path}`)

      if( !/^[a-zA-Z0-9_\-\[\].]+$/.test( path ) )
        throw new Error(`Invalid path format: ${path}`)

      const result = setValueAtPath( modified, path, value )
      if( result instanceof Map ){
        return result as T
      }
    }
  }
  catch( error: any ){
    throw new Error(`Failed to assign value: ${error.message}`)
  }

  return modified
}

export function deepValue<T = any>( obj: any, path: string ): T {
  if( !obj || (typeof obj !== 'object' && !(obj instanceof Map)) )
    throw new TypeError('Object argument must be an object or Map')

  if( typeof path !== 'string' )
    throw new TypeError('Path argument must be a string')

  if( !/^[a-zA-Z0-9_\-\[\].]+$/.test( path ) )
    throw new Error(`Invalid path format: ${path}`)

  const parts = path.split(/\.|\[|\]/).filter( Boolean )
  let current = obj
  let isMap = current instanceof Map

  try {
    for( const part of parts ){
      if( current === null || (typeof current !== 'object' && !(current instanceof Map)) )
        throw new Error(`Cannot access property '${part}' of non-object/non-Map`)

      const exists = isMap ? current.has(part) : part in current
      if( !exists )
        throw new Error(`Path segment '${part}' does not exist`)

      current = isMap ? current.get(part) : current[part]
      isMap = current instanceof Map
    }

    return current as T
  }
  catch( error: any ){
    throw new Error(`Failed to get value: ${error.message}`)
  }
}

export function deepDelete<T>( obj: T, path: string ): T {
  if( !obj || (typeof obj !== 'object' && !(obj instanceof Map)) )
    throw new TypeError('Object argument must be an object or Map')

  if( typeof path !== 'string' )
    throw new TypeError('Path argument must be a string')

  if( !/^[a-zA-Z0-9_\-\[\].]+$/.test( path ) )
    throw new Error(`Invalid path format: ${path}`)

  const 
  parts = path.split(/\.|\[|\]/).filter( Boolean ),
  lastPart = parts[ parts.length - 1 ]
  
  if( !parts.length )
    throw new Error('Path cannot be empty')

  const modified = obj instanceof Map ? 
    new Map(obj as Map<any, any>) : 
    deepClone(obj)

  let 
  current = modified,
  parentChain: { parent: any; key: string }[] = []

  try {
    // Navigate to the parent of the target to delete
    for( let i = 0; i < parts.length - 1; i++ ){
      const part = parts[i]

      if( current === null || (typeof current !== 'object' && !(current instanceof Map)) )
        throw new Error(`Cannot access property '${part}' of non-object/non-Map`)

      // Handle special case for 'layers' property in objects
      if( !(current instanceof Map) && part === 'layers' ){
        if( !(part in current) )
          throw new Error(`Path segment '${part}' does not exist`)
          
        if( !(current[part] instanceof Map) )
          throw new Error(`Expected Map at path segment '${part}' but got ${typeof current[part]}`)
      }

      const exists = current instanceof Map ? 
        current.has(part) : 
        part in current

      if( !exists )
        throw new Error(`Path segment '${part}' does not exist`)

      parentChain.push({ parent: current, key: part })
      current = current instanceof Map ? current.get(part) : current[part]
    }

    const exists = current instanceof Map ? 
      current.has(lastPart) : 
      lastPart in current

    if( !exists )
      throw new Error(`Path segment '${lastPart}' does not exist`)

    if( Array.isArray( current ) ){
      const index = parseInt( lastPart )
      if( isNaN( index ) )
        throw new Error(`Invalid array index: ${lastPart}`)
      current.splice( index, 1 )
    } else {
      current instanceof Map ? 
        current.delete(lastPart) : 
        delete current[lastPart]

      // After deletion, update the parent chain if maps are empty
      for( let i = parentChain.length - 1; i >= 0; i-- ){
        const 
        { parent, key } = parentChain[i],
        child = parent instanceof Map ? parent.get(key) : parent[key],
        isEmpty = child instanceof Map ? 
          child.size === 0 : 
          Object.keys(child).length === 0

        if( isEmpty ){
          parent instanceof Map ?
            parent.delete(key) :
            delete parent[key]
        } else {
          break // Stop if we find a non-empty parent
        }
      }
    }

    return modified
  }
  catch( error: any ){
    throw new Error(`Failed to delete value: ${error.message}`)
  }
}

type ThrottleOptions = {
  leading?: boolean   // Whether to invoke on the leading edge of the timeout
  trailing?: boolean  // Whether to invoke on the trailing edge of the timeout
}

/**
 * Creates a throttled function that only invokes `func` at most once per
 * every `wait` milliseconds.
 *
 * @param func - The function to throttle
 * @param wait - The number of milliseconds to throttle invocations to
 * @param options - The options object
 * @returns The new throttled function
 */
export function throttle<T extends (...args: any[]) => any>( func: T, wait: number, options: ThrottleOptions = {} ): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let 
  timeout: ReturnType<typeof setTimeout> | undefined,
  previous = 0, // Last time func was invoked
  result: ReturnType<T> | undefined // Store result of last invocation
  
  const 
  leading = options.leading !== false,
  trailing = options.trailing !== false
  
  /**
   * Function to be invoked after wait period
   */
  const later = ( context: any, args: Parameters<T> ) => {
    previous = leading ? Date.now() : 0
    timeout = undefined
    result = func.apply( context, args )
  }
  
  return function( this: any, ...args: Parameters<T> ): ReturnType<T> | undefined {
    const now = Date.now()
    
    // Handle first invocation
    if( !previous && !leading ) 
      previous = now
    
    // Calculate remaining time
    const remaining = wait - (now - previous)
    
    // Check if it's time to invoke
    if( remaining <= 0 || remaining > wait ){
      if( timeout ){
        clearTimeout( timeout )
        timeout = undefined
      }
      
      previous = now
      result = func.apply( this, args )
      
    }
    // Schedule trailing call
    else if( !timeout && trailing )
      timeout = setTimeout(() => later( this, args ), remaining )
    
    return result
  }
}