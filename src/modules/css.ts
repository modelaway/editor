import type Frame from './frame'
import Stylesheet from './stylesheet'
import {
  CSS_CUSTOM_VARIABLES
} from './constants'

export default class CSS {
  /**
   * Access to frame's instance and 
   * relative functional classes.
   */
  private readonly frame: Frame

  private variables?: Stylesheet

  constructor( frame: Frame ){
    this.frame = frame
  }

  declare( nsp: string, settings?: StyleSettings ){
    if( !this.frame.$$head?.length ) return
    return new Stylesheet( nsp, this.frame.$$head, settings )
  }

  setVariables( updates?: ObjectType<string | ObjectType<string>> ){
    if( !this.frame.$$head?.length ) return

    /**
     * Apply properties updates to the variables
     */
    typeof updates == 'object' 
    && Object.keys( updates ).length
    && Object.entries( updates )
              .map( ([ prop, value ]) => {
                if( !CSS_CUSTOM_VARIABLES[ prop ] ) return
                CSS_CUSTOM_VARIABLES[ prop ].value = value
              })

    /**
     * Generate CSS rule string
     */
    let varStr = ''
    Object
    .values( CSS_CUSTOM_VARIABLES )
    .forEach( ({ name, value }) => {
      value = typeof value == 'object' ? value['*'] : value
      varStr += `\t${name}: ${value};\n`
    } )

    if( !varStr ) return

    const settings = { 
      css: `:root { ${varStr} }`,
      meta: true
    }

    this.variables ?
            this.variables.load( settings )
            : this.variables = new Stylesheet('variables', this.frame.$$head, settings )

    return this.variables
  }
  getVariables(){
    return this.variables?.custom()
  }
  clearVariables(){
    this.variables?.clear()
  }

  rules(){
    const selectors: ObjectType<ObjectType<string>> = {}

    Array
    .from( document.styleSheets )
    /**
     * Allow only same-domain stylesheet to be read
     * to avoid cross-origin content policy error
     */
    .filter( sheet => (!sheet.href || sheet.href.indexOf( window.location.origin ) === 0))
    .forEach( sheet => {
      // Only style rules
      const rules = Array.from( sheet.cssRules || sheet.rules )
                          .filter( ( rule ) => rule.type === 1 ) as CSSStyleRule[]
      
      rules.forEach( ({ style, selectorText }) => {
        selectorText = selectorText.trim()
        if( /[:,#>\[ ]/.test( selectorText )
            || ['html', 'body'].includes( selectorText ) ) 
          return

        const record: ObjectType<string> = {}

        Array
        .from( style )
        .map( prop => record[ prop.trim() ] = style.getPropertyValue( prop ).trim() )

        // Bounce empty rules
        if( !Object.keys( record ).length ) return

        /**
         * Contain properties defined under a css rule
         * 
         * Allow to collect even selector defined
         * multiple times with different properties.
         */
        selectors[ selectorText ] = { ...selectors[ selectorText ], ...record }
      } )
    } )
    
    return selectors
  }
}