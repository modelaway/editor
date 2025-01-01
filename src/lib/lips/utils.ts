
/**
 * Optimized deep difference checker with support for Map, Set,
 * and various JS built-in types
 */
export function isDiff( aObject: ObjectType<any>, bObject: ObjectType<any> ){
  // Early reference equality check
  if( aObject === bObject ) return false
  
  if( typeof aObject !== 'object'
      || typeof bObject !== 'object' ) return null
      
  // Early null check
  if( aObject === null || bObject === null ) return true

  // Handle Set objects with optimized comparison
  if( aObject instanceof Set ){
    if( !( bObject instanceof Set ) ) return true
    if( aObject.size !== bObject.size ) return true
    
    // Fast path for primitive-only Sets
    if( isPrimitiveSet( aObject ) && isPrimitiveSet( bObject ) ){
      for( const value of aObject ){
        if( !bObject.has( value ) ) return true
      }
      return false
    }
    
    // For Sets with objects, use a Map to cache results
    const compared = new Map()
    
    for( const aValue of aObject ){
      let found = false
      
      if( typeof aValue !== 'object' ){
        if( bObject.has( aValue ) ){
          found = true
        }
      } else {
        for( const bValue of bObject ){
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
  if( aObject instanceof Map ){
    if( !( bObject instanceof Map ) ) return true
    if( aObject.size !== bObject.size ) return true

    // Fast path for primitive-only Maps
    if( isPrimitiveMap( aObject ) && isPrimitiveMap( bObject ) ){
      for( const [key, aValue] of aObject ){
        // Get is O(1) and already checks existence
        const bValue = bObject.get( key )
        if( bValue !== aValue ) return true
      }
      return false
    }

    // For Maps with object keys/values
    const compared = new Map()

    for( const [aKey, aValue] of aObject ){
      // Handle primitive keys using direct lookup
      if( typeof aKey !== 'object' ){
        if( !bObject.has( aKey ) ) return true
        
        const bValue = bObject.get( aKey )
        
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
      for( const [bKey, bValue] of bObject ){
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
  if( Array.isArray( aObject ) ){
    if( !Array.isArray( bObject ) ) return true
    if( aObject.length !== bObject.length ) return true
    for( let i = 0; i < aObject.length; i++ ){
      const aVal = aObject[i], bVal = bObject[i]
      // Early exit on primitive comparison
      if( aVal !== bVal && ( typeof aVal !== 'object' || isDiff( aVal, bVal ) ) ) return true
    }
    return false
  }

  // Cache keys to avoid multiple calls
  const aKeys = Object.keys( aObject )
  const bKeys = Object.keys( bObject )

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
    const aVal = aObject[key]
    const bVal = bObject[key]

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
      if( aVal === aObject ){
        if( bVal !== bObject ) return true
      }
      // WARNING: Doesn't deal with circular refs other than ^^
      else if( isDiff( aVal, bVal ) ) return true
    }
    // Primitive values that weren't caught by === check must be different
    else return true
  }

  return false
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
    for( const [path, value] of Object.entries( toSet ) ){
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