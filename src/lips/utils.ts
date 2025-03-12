import $ from 'cash-dom'

// TypeScript type for TypedArrays
type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array

$.fn.extend({
  attrs: function(){
    const 
    obj: any = {},
    elem = this[0]

    elem
    && elem.nodeType !== Node.TEXT_NODE
    && $.each( elem.attributes, function( this: any ){ obj[ this.name ] = this.value })

    return obj
  }
})

export const ROOT_PATH = '#0'
export const SYNCTAX_VAR_FLAG = 'SYNTAX:'
export const SPREAD_VAR_PATTERN = /^\.\.\./
export const ARGUMENT_VAR_PATTERN = /^\[(.*?)\]$/

/**
 * Deep difference checker with support for Map, Set,
 * and various JS built-in types
 */
export function isDiff( a: any, b: any ){
  // Early reference equality check
  if( a === b ) return false
  
  if( typeof a !== 'object'
      || typeof b !== 'object' ) return false
      
  // Early null check
  if( a === null || b === null ) return true

  // Handle Set objects with optimized comparison
  if( a instanceof Set ){
    if( !( b instanceof Set ) ) return true
    if( a.size !== b.size ) return true
    
    // Fast path for primitive-only Sets
    if( isPrimitiveSet( a ) && isPrimitiveSet( b ) ){
      for( const value of a ){
        if( !b.has( value ) ) return true
      }
      return false
    }
    
    // For Sets with objects, use a Map to cache results
    const compared = new Map()
    
    for( const aValue of a ){
      let found = false
      
      if( typeof aValue !== 'object' ){
        if( b.has( aValue ) ){
          found = true
        }
      } else {
        for( const bValue of b ){
          // Skip if value types don't match
          if( typeof bValue !== 'object' ) continue
          
          // Check cache first
          const cacheKey = aValue + ':' + bValue
          if( compared.has( cacheKey ) ){
            found = compared.get( cacheKey )
            if( found ) break
            continue
          }
          
          // Compare objects
          const result = !isDiff( aValue, bValue )
          compared.set( cacheKey, result )
          
          if( result ){
            found = true
            break
          }
        }
      }
      
      if( !found ) return true
    }
    
    return false
  }

  // Handle Map objects with optimized comparison
  if( a instanceof Map ){
    if( !( b instanceof Map ) ) return true
    if( a.size !== b.size ) return true

    // Fast path for primitive-only Maps
    if( isPrimitiveMap( a ) && isPrimitiveMap( b ) ){
      for( const [key, aValue] of a ){
        // Get is O(1) and already checks existence
        const bValue = b.get( key )
        if( bValue !== aValue ) return true
      }
      return false
    }

    // For Maps with object keys/values
    const compared = new Map()

    for( const [aKey, aValue] of a ){
      // Handle primitive keys using direct lookup
      if( typeof aKey !== 'object' ){
        if( !b.has( aKey ) ) return true
        
        const bValue = b.get( aKey )
        
        // Quick check for primitive values
        if( typeof aValue !== 'object' ){
          if( aValue !== bValue ) return true
          continue
        }

        // Deep compare object values
        if( typeof bValue !== 'object' || isDiff( aValue, bValue ) ) return true
        continue
      }

      // Handle object keys
      let keyFound = false
      let valueMatched = false

      // Compare each key deeply since keys are objects
      for( const [bKey, bValue] of b ){
        if( typeof bKey !== 'object' ) continue

        // Check key comparison cache
        const cacheKey = `${aKey}:${bKey}`
        if( compared.has( cacheKey ) ){
          const [keyMatch, valueMatch] = compared.get( cacheKey )
          if( keyMatch ){
            keyFound = true
            valueMatched = valueMatch
            break
          }
          continue
        }

        // Compare keys
        if( !isDiff( aKey, bKey ) ){
          keyFound = true
          
          // Compare values only if keys match
          valueMatched = typeof aValue === 'object' && typeof bValue === 'object' ?
                        !isDiff( aValue, bValue ) :
                        aValue === bValue

          // Cache both key and value comparison results
          compared.set( cacheKey, [true, valueMatched] )
          
          if( valueMatched ) break
        } else {
          compared.set( cacheKey, [false, false] )
        }
      }

      if( !keyFound || !valueMatched ) return true
    }

    return false
  }

  // Fast path for arrays
  if( Array.isArray( a ) ){
    if( !Array.isArray( b ) ) return true
    if( a.length !== b.length ) return true
    for( let i = 0; i < a.length; i++ ){
      const aVal = a[i], bVal = b[i]
      // Early exit on primitive comparison
      if( aVal !== bVal && ( typeof aVal !== 'object' || isDiff( aVal, bVal ) ) ) return true
    }
    return false
  }

  // Cache keys to avoid multiple calls
  const aKeys = Object.keys( a )
  const bKeys = Object.keys( b )

  // Quick length comparison before sorting
  if( aKeys.length !== bKeys.length ) return true

  // Sort keys only if necessary (when lengths are equal)
  aKeys.sort()
  bKeys.sort()

  // Use cached length
  const length = aKeys.length

  // Compare sorted keys first
  for( let i = 0; i < length; i++ ){
    if( aKeys[i] !== bKeys[i] ) return true
  }

  // Now we know keys match, compare values
  for( let i = 0; i < length; i++ ){
    const key = aKeys[i]
    const aVal = a[key]
    const bVal = b[key]

    // Early exit for primitive equality
    if( aVal === bVal ) continue

    // Type checks
    if( aVal instanceof Date ){
      if( !( bVal instanceof Date ) || String( aVal ) !== String( bVal ) ) return true
      continue
    }

    if( aVal instanceof RegExp ){
      if( !( bVal instanceof RegExp ) 
          || aVal.source !== bVal.source 
          || aVal.flags !== bVal.flags ) return true
      continue
    }

    if( aVal instanceof Map ){
      if( !( bVal instanceof Map ) || isDiff( aVal, bVal ) ) return true
      continue
    }

    if( aVal instanceof Set ){
      if( !( bVal instanceof Set ) || isDiff( aVal, bVal ) ) return true
      continue
    }

    if( aVal instanceof Function ){
      if( !( bVal instanceof Function ) ) return true
      continue
    }

    if( typeof aVal === 'object' ){
      if( typeof bVal !== 'object' ) return true

      // Self reference check
      if( aVal === a ){
        if( bVal !== b ) return true
      }
      // WARNING: Doesn't deal with circular refs other than ^^
      else if( isDiff( aVal, bVal ) ) return true
    }
    // Primitive values that weren't caught by === check must be different
    else return true
  }

  return false
}

export function isEqual(a: any, b: any): boolean {
  // Handle identical references and primitive equality
  if (a === b) return true
  
  // Handle null/undefined cases
  if (a == null || b == null) return a === b
  
  // Get the type of both values
  const typeA = typeof a
  const typeB = typeof b
  
  // If types don't match, they're not equal
  if (typeA !== typeB) return false
  
  // Handle primitives that weren't caught by ===
  if (typeA !== 'object') {
    // Special case for NaN
    if (typeA === 'number' && isNaN(a) && isNaN(b)) return true
    return false // Other primitives would have been caught by ===
  }
  
  // Handle special object types
  if (a instanceof Date) {
    return b instanceof Date && a.getTime() === b.getTime()
  }
  
  if (a instanceof RegExp) {
    return b instanceof RegExp && a.source === b.source && a.flags === b.flags
  }
  
  if (a instanceof Error) {
    return b instanceof Error && 
           a.name === b.name && 
           a.message === b.message &&
           (a.stack === b.stack || (!a.stack && !b.stack))
  }
  
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(a)) {
    // Handle TypedArrays and DataView
    if (!ArrayBuffer.isView(b)) return false
    if (a.byteLength !== b.byteLength) return false
    // Convert to Uint8Array for byte-by-byte comparison
    const viewA = new Uint8Array(a.buffer, a.byteOffset, a.byteLength)
    const viewB = new Uint8Array(b.buffer, b.byteOffset, b.byteLength)
    for (let i = 0; i < viewA.length; i++) {
      if (viewA[i] !== viewB[i]) return false
    }
    return true
  }
  
  if (a instanceof Promise || a instanceof WeakMap || a instanceof WeakSet) {
    // These types can't be meaningfully compared
    return a === b
  }
  
  // For functions, compare their string representation
  if (typeof a === 'function') {
    if (typeof b !== 'function') return false
    return a.toString() === b.toString() && a.name === b.name
  }
  
  // Use isDiff for objects, arrays, Maps, and Sets, but invert its result
  // We also ensure both values are the same type of object
  if (a.constructor !== b.constructor) return false
  
  if (a instanceof Map || a instanceof Set || Array.isArray(a) || 
      Object.getPrototypeOf(a) === Object.prototype) {
    return !isDiff(a, b)
  }
  
  // For other object types (custom classes), compare properties
  const prototypeA = Object.getPrototypeOf(a)
  if (prototypeA !== Object.getPrototypeOf(b)) return false
  
  // Get all properties including non-enumerable ones
  const propsA = Object.getOwnPropertyNames(a)
  const propsB = Object.getOwnPropertyNames(b)
  
  if (propsA.length !== propsB.length) return false
  
  for (const prop of propsA) {
    if (!Object.prototype.hasOwnProperty.call(b, prop)) return false
    if (!isEqual(a[prop], b[prop])) return false
  }
  
  // If the prototype is not Object.prototype or null, compare up the chain
  if (prototypeA !== null && prototypeA !== Object.prototype) {
    const protoPropsA = Object.getOwnPropertyNames(prototypeA)
    const protoPropsB = Object.getOwnPropertyNames(Object.getPrototypeOf(b))
    
    if (protoPropsA.length !== protoPropsB.length) return false
    
    for (const prop of protoPropsA) {
      // Skip constructor
      if (prop === 'constructor') continue
      if (!isEqual(prototypeA[prop], Object.getPrototypeOf(b)[prop])) return false
    }
  }
  
  return true
}

// Helper type guard for primitive checks (from your isDiff implementation)
function isPrimitive(value: any): boolean {
  return value === null || (typeof value !== 'object' && typeof value !== 'function')
}

/**
 * Helper function to check if Set contains only primitives
 */
function isPrimitiveValue( value: unknown ): value is string | number | boolean | symbol | null | undefined {
  return value === null 
          || ( typeof value !== 'object' && typeof value !== 'function' )
}

// Helper to check if Set contains only primitives
function isPrimitiveSet( set: Set<any> ): boolean {
  for( const item of set )
    if( typeof item === 'object' && item !== null ) 
      return false
  
  return true
}

// Helper to check if Map contains only primitives for both keys and values
function isPrimitiveMap( map: Map<any, any> ): boolean {
  for( const [key, value] of map )
    if( (typeof key === 'object' && key !== null) 
        || (typeof value === 'object' && value !== null) ) 
      return false

  return true
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

/**
 * Deep assign values to an object using dot notation paths
 * @param original The source object to modify
 * @param toSet Object containing path-value pairs to set
 * @returns A new object with the assigned values
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export function deepAssign<T>( original: T, toSet: Record<string, any> ): T {
  if( !original || typeof original !== 'object' )
    throw new TypeError('Original argument must be an object')

  if( !toSet || typeof toSet !== 'object' )
    throw new TypeError('ToSet argument must be an object')
    
  if( !Object.keys( toSet ).length )
    return { ...original }

  function setValueAtPath( obj: Record<string, any>, path: string, value: any ){
    const parts = path.split(/\.|\[|\]/).filter( Boolean )
    let current = obj

    for( let i = 0; i < parts.length; i++ ){
      const 
      key = parts[i],
      isArrayIndex = !isNaN( Number( key ) ),
      isLastPart = i === parts.length - 1,
      nextIsArrayIndex = !isNaN( Number( parts[ i + 1 ] ) )

      if( isLastPart ){
        current[ key ] = value
        continue
      }

      if( !( key in current ) )
        current[ key ] = nextIsArrayIndex ? [] : {}
      
      else if( nextIsArrayIndex && !Array.isArray( current[ key ] ) )
        current[ key ] = []
      
      else if( !nextIsArrayIndex && Array.isArray( current[ key ] ) )
        current[ key ] = {}

      current = current[ key ]
    }
  }

  const modified = deepClone( original )
  try {
    for( const [ path, value ] of Object.entries( toSet ) ){
      if( typeof path !== 'string' )
        throw new TypeError(`Invalid path: ${path}`)

      if( !/^[a-zA-Z0-9_\-\[\].]+$/.test( path ) )
        throw new Error(`Invalid path format: ${path}`)

      setValueAtPath( modified, path, value )
    }
  }
  catch( error: any ){
    throw new Error(`Failed to assign value: ${error.message}`)
  }

  return modified
}

export function preprocessor( str: string ): string {
  const matchEventHandlers = ( input: string ) => {
    const pattern = /on-([a-zA-Z-]+)\s*\(/g
    let
    result = input,
    match
    
    while( ( match = pattern.exec( input ) ) !== null ){
      const event = match[1]
      const startIndex = match.index + match[0].length
      let 
        parenthesesCount = 1,
        position = startIndex
      
      while( position < input.length && parenthesesCount > 0 ){
        if( input[position] === '(' ) parenthesesCount++
        if( input[position] === ')' ) parenthesesCount--
        position++
      }
      
      if( parenthesesCount === 0 ){
        const 
        expression = input.slice( startIndex, position - 1 ).trim(),
        prefix = input.slice( 0, match.index ),
        replacement = `on-${event}="${expression}"`,
        suffix = input.slice( position )
        
        result = prefix + replacement + suffix
        input = result  // Update input for next iteration
        pattern.lastIndex = prefix.length + replacement.length
      }
    }
    
    return result
  }
  
  let result = (str || '').trim()
                          .replace(/>\s*</g, '><')
                          .replace(/\s{2,}/g, ' ')
                          .replace(/[\r\n\t]/g, '')
                          .replace(/<(\w+)([^>]*?)\s*\/>/g, '<$1$2></$1>')
                          // .replace(/<(\w+)(\([^)]*\))?((\s+[^>]*)?)\/>/g, '<$1$2$3></$1>')
                          .replace(/<\{([^}]+)\}\s*(.*?)\/>/g, '<lips dtag="$1" $2></lips>')
                          .replace(/(<>)([\s\S]*?)(<\/>)/g, '<lips fragment="true">$2</lips>')
                          .replace(/<if\(\s*(.*?)\s*\)>/g, '<if by="$1">')
                          .replace(/<else-if\(\s*(.*?)\s*\)>/g, '<else-if by="$1">')
                          .replace(/<switch\(\s*(.*?)\s*\)>/g, '<switch by="$1">')
                          .replace(/<log\(\s*(.*?)\s*\)>/g, '<log args="$1">')
                          .replace(/\[(.*?)\]/g, match => match.replace(/\s+/g, '') )

  return matchEventHandlers( result )
}

// Example usage:
/*
const obj = {
  user: {
    profile: {
      name: 'John',
      settings: {
        theme: 'dark'
      }
    },
    posts: [
      { id: 1, title: 'Post 1' }
    ]
  }
}

const updates = {
  'user.profile.name': 'Jane',
  'user.settings.notifications': true,
  'user.posts[0].title': 'Updated Post',
  'user.posts[1]': { id: 2, title: 'New Post' }
}

const result = deepAssign(obj, updates)
*/