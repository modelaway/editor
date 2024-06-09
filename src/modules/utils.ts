import type { FrameQuery } from '../lib/frame.window'
import { CONTROL_EDGE_MARGIN } from './constants'

declare global {
  interface Window {
    $: typeof jQuery
  }
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
 * Return an element dimension and position 
 * situation in the DOM
 */
export const getTopography = async ( $elem: JQuery<HTMLElement> | FrameQuery, strict = false ) => {
  if( !$elem.length )
    throw new Error('Invalid method call. Expected a valid element')
  
  /**
   * View position coordinates in the DOM base on
   * which related triggers will be positionned.
   */
  let { left, top } = await $elem.offset() || { left: CONTROL_EDGE_MARGIN, top: CONTROL_EDGE_MARGIN }

  // Determite position of element relative to window only
  if( strict ){
    top -= $(window).scrollTop() || 0
    left -= $(window).scrollLeft() || 0
  }

  return { 
    x: left,
    y: top,
    width: await $elem.width() || 0,
    height: await $elem.height() || 0
  }
}

/**
 * Convert integrale object to a string
 * 
 * - preserve included functions
 */
export const obj2Str = ( obj: ObjectType<any> ): string => {
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
export const str2Obj = ( str: string ): ObjectType<any> => {
  return new Function(`return ${str}`)()
}