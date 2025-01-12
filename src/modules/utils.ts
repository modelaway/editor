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

/**
 * Operate a deep assign on a object.
 * 
 * NOTE: Create object or subset of that object
 * if doesn't exist in the original object
 * 
 * return modified object
 */
export const deepAssign = ( original: Record<string, any>, toSet: Record<string, any> ) => {
  if( typeof original !== 'object'
      || typeof toSet !== 'object'
      || !Object.keys( toSet ).length )
    throw new Error('Invalid deep assign arguments')

  function doset( obj: Record<string, any>, sequence: string, value: any ){
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