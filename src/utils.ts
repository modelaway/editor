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
export const log = ( ...args: any[] ) => {
  console.debug('[debug]:', ...args )
}

/**
 * Internationalization support function
 */
export const i18n = ( text: string ): string => {

  return text
}

/**
 * Define view block props as HTML comment.
 */
export const defineProperties = ( props: ViewBlockProperties ) => {
  if( typeof props !== 'object'
      || !Object.keys( props ).length )
    throw new Error('Invalid props. Non-empty object expected')

  return `<!--${JSON.stringify( props )}-->`
}
/**
 * Extract defined view block props from HTML comment
 * format to object.
 */
export const extractProperties = ( element: string ): ViewBlockProperties[] => {
  const extracted = element.match(/<!--{(.+)}-->/g)
  if( !extracted?.length ) return []

  return extracted.map( each => {
    try { return JSON.parse( each.replace(/^<!--/, '').replace(/-->$/, '') ) }
    catch( error ){ return null }
  } )
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
export const getTopography = ( $elem: JQuery<HTMLElement>, strict = false ) => {
  if( !$elem.length )
    throw new Error('Invalid method call. Expected a valid element')
  
  /**
   * View position coordinates in the DOM base on
   * which related triggers will be positionned.
   */
  let { left, top } = $elem.offset() || { left: CONTROL_EDGE_MARGIN, top: CONTROL_EDGE_MARGIN }

  // Determite position of element relative to window only
  if( strict ){
    top -= $(window).scrollTop() || 0
    left -= $(window).scrollLeft() || 0
  }

  return { 
    x: left,
    y: top,
    width: $elem.width() || 0,
    height: $elem.height() || 0
  }
}