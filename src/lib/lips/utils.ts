
export function isDiff( aObject: ObjectType<any>, bObject: ObjectType<any> ){
  // Early reference equality check
  if( aObject === bObject ) return false
  
  if( typeof aObject !== 'object'
      || typeof bObject !== 'object' ) return null
      
  // Early null check
  if( aObject === null || bObject === null ) return true

  // Handle Map objects
  if( aObject instanceof Map ){
    if( !( bObject instanceof Map ) ) return true
    if( aObject.size !== bObject.size ) return true
    
    // Use entries iterator for better performance with large Maps
    const aEntries = Array.from( aObject.entries() )
    for( let i = 0; i < aEntries.length; i++ ){
      const [key, value] = aEntries[i]
      if( !bObject.has( key ) ) return true
      const bValue = bObject.get( key )
      // Early exit on primitive comparison
      if( value !== bValue && ( typeof value !== 'object' || isDiff( value, bValue ) ) ) return true
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

    if( aVal instanceof Map ){
      if( !( bVal instanceof Map ) || isDiff( aVal, bVal ) ) return true
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