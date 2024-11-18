
export function isEquals( aObject: ObjectType<any>, bObject: ObjectType<any> ){
  const
  aKeys = Object.keys( aObject ).sort(),
  bKeys = Object.keys( bObject ).sort()

  if( aKeys.length !== bKeys.length ) return false //not the same nr of keys
  if( aKeys.join('') !== bKeys.join('') ) return false //different keys

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