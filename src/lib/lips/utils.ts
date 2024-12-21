
export function isEquals( aObject: ObjectType<any>, bObject: ObjectType<any> ){
  if( typeof aObject !== 'object'
      || typeof bObject !== 'object' ) return null

  const
  aKeys = Object.keys( aObject ).sort(),
  bKeys = Object.keys( bObject ).sort()

  if( aKeys.length !== bKeys.length ) return false // Not the same nr of keys
  if( aKeys.join('') !== bKeys.join('') ) return false // Different keys

  for( let x = 0; x < aKeys.length; ++x ){
    // Array object
    if( aObject[ aKeys[x] ] instanceof Array ){
      if( !( bObject[ aKeys[x] ] instanceof Array ) ) return false
      if( !isEquals( aObject[ aKeys[x] ], bObject[ aKeys[x] ] ) ) return false
    }

    // Date object
    else if( aObject[ aKeys[x] ] instanceof Date ){
      if( !( bObject[ aKeys[x] ] instanceof Date ) ) return false
      if( String( aObject[ aKeys[x] ] ) !== String( bObject[ aKeys[x] ] ) ) return false
    }

    // Object containing functions
    else if( aObject[ aKeys[x] ] instanceof Function ){
      if( !( bObject[ aKeys[x] ] instanceof Function ) ) return false
      
      // Ignore functions, or check them regardless?
    }

    // Object instance
    else if( aObject[ aKeys[x] ] instanceof Object ){
      if( !( bObject[ aKeys[x] ] instanceof Object ) ) return false

      // Self reference?
      if( aObject[ aKeys[x] ] === aObject ){
        if( bObject[ aKeys[x] ] !== bObject ) return false
      }
      // WARNING: Doesn't deal with circular refs other than ^^
      else if( !isEquals( aObject[ aKeys[x] ], bObject[ aKeys[x] ] ) ) return false
    }
    // Change !== to != for loose comparison: not the same value
    else if( aObject[ aKeys[x] ] !== bObject[ aKeys[x] ] ) return false
  }

  return true
}

export function uniqueObject( obj: any ){
  if( typeof obj !== 'object' )
    return obj

  return JSON.parse( JSON.stringify( obj ) )
}

/**
 * Operate a deep assign on a object.
 * 
 * NOTE: Create object or subset of that object
 * if doesn't exist in the original object
 * 
 * return modified object
 */
export const deepAssign = ( original: ObjectType<any>, toSet: ObjectType<any> ) => {
  if( typeof original !== 'object'
      || typeof toSet !== 'object'
      || !Object.keys( toSet ).length )
    throw new Error('Invalid deep assign arguments')

  function doset( obj: ObjectType<any>, sequence: string, value: any ){
    const
    keys = sequence.split('.'),
    key = keys.shift()

    if( !key ) return

    if( !(key in obj) && keys.length )
      obj[ key ] = {}

    if( typeof obj === 'object' && keys.length ){
      obj = obj[ key ]
      return doset( obj, keys.join('.'), value )
    }

    obj[ key ] = value
  }

  const modified = JSON.parse( JSON.stringify( original ) )
  for( const each in toSet )
    doset( modified, each, toSet[ each ] )

  return modified
}