
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