// import * as Sass from 'sass'
import { CompileResult } from 'sass'
import {
  VIEW_NAME_SELECTOR,
  VIEW_STYLE_SELECTOR,
  CSS_CUSTOM_VARIABLES
} from './constants'

let Sass: any

export class Stylesheet {
  private nsp: string
  private settings: StyleSettings

  constructor( nsp: string, settings?: StyleSettings ){
    if( typeof nsp !== 'string' ) 
      throw new Error('Undefined or invalid styles attachement element(s) namespace')
    
    // @ts-ignore
    !Sass && import('https://jspm.dev/sass').then( lib => Sass = lib )

    /**
     * Unique namespace identifier of targeted 
     * views/elements
     */
    this.nsp = nsp

    /**
     * Styles settings
     * 
     * - css
     * - custom
     */
    this.settings = settings || {}

    // Auto-load defined css rules
    this.settings && this.load( this.settings )
  }

  /**
   * Compile Sass style string to CSS string
   */
  compile( str: string ): Promise<CompileResult>{
    return new Promise( ( resolve, reject ) => {
      if( !Sass ){
        let 
        waiter: any,
        max = 1
        
        const exec = () => {
          /**
           * TEMP: Wait 8 seconds for Sass libary to load
           */
          if( !Sass ){
            if( max == 8 ){
              clearInterval( waiter )
              reject('Undefined Sass compiler')
            }
            else max++
            
            return
          }

          clearInterval( waiter )
          resolve( Sass.compileString( str ) )
        }

        waiter = setInterval( exec, 1000 )
      }
      else resolve( Sass.compileString( str ) )
    } )
  }

  /**
   * Compile and inject a style chunk in the DOM
   * using `<style mv-style="*">...</style>` tag
   */
  private async inject( id: string, str: string ){
    if( !id || !str )
      throw new Error('Invalid injection arguments')

    const selector = `${VIEW_STYLE_SELECTOR}="${id}"`
    /**
     * Defined meta css properties or css by view 
     * elements by wrapping in a closure using the 
     * namespaces selector.
     * 
     * :root {
     *    --font-size: 12px;
     *    line-height: 1.5;
     * }
     * 
     * [mv-name="123456780"] {
     *    font-size: 12px;
     *    &:hover {
     *      color: #000; 
     *    }
     * }
     */
    str = this.settings.meta ? str : `[${VIEW_NAME_SELECTOR}="${id}"] { ${str} }`

    const result = await this.compile( str )

    if( !result?.css )
      throw new Error(`<view:${id}> css injection failed`)

    $(`head style[${selector}]`).length ?
                    // Replace existing content
                    $(`head style[${selector}]`).html( result.css )
                    // Inject new style
                    : $('head').append(`<style ${selector}>${result.css}</style>`)
  }

  /**
   * Load/inject predefined CSS to the document
   */
  load( settings: StyleSettings ){
    this.settings = settings
    if( typeof this.settings !== 'object' )
      throw new Error('Undefined styles settings')
    
    this.settings.css && this.inject( this.nsp, this.settings.css )
  }

  /**
   * Retreive this view's main node styles including natively 
   * defined ones.
   */
  get(){
    
  }

  /**
   * Remove all injected styles from the DOM
   */
  clear(){
    $(`head style[${VIEW_STYLE_SELECTOR}="${this.nsp}"]`).remove()
  }

  /**
   * Return css custom properties
   */
  custom(){
    const props: ObjectType<string> = {}

    Array
    .from( document.styleSheets )
    .forEach( sheet => {
      // Only style rules
      const rules = Array.from( sheet.cssRules || sheet.rules ).filter( ( rule ) => rule.type === 1 ) as CSSStyleRule[]

      rules.forEach( rule => {
        Array
        .from( rule.style )
        .filter( prop => (/^--/.test( prop )) )
        // Ignore modela UI custom CSS properties
        .filter( prop => (!/^--me-/.test( prop )) )
        .map( prop => props[ prop.trim() ] = rule.style.getPropertyValue( prop ).trim() )
      } )
    } )
    
    return props
  }

  /**
   * Overridable function to return an element 
   * style attribute value as JSON object.
   */
  style(){
    return {}
  }
}

export default class CSS {
  private variables?: Stylesheet

  declare( nsp: string, settings?: StyleSettings ){
    return new Stylesheet( nsp, settings )
  }

  setVariables( updates?: ObjectType<string | ObjectType<string>> ){
    /**
     * Apply properties updates to the variables
     */
    typeof updates == 'object' 
    && Object.keys( updates ).length
    && Object.entries( updates )
              .map( ([ prop, value ]) => {
                if( !CSS_CUSTOM_VARIABLES[ prop ] ) return
                CSS_CUSTOM_VARIABLES[ prop ].value = value
              } )

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
            : this.variables = new Stylesheet('variables', settings )

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
    .forEach( sheet => {
      // Only style rules
      const rules = Array.from( sheet.cssRules || sheet.rules )
                          .filter( ( rule ) => rule.type === 1 ) as CSSStyleRule[]
      
      rules.forEach( ({ style, selectorText }) => {
        selectorText = selectorText.trim()
        if( /[:,#>\[ ]/.test( selectorText )
            || ['html', 'body'].includes( selectorText ) ) 
          return

        /**
         * Contain properties defined under a css rule
         * 
         * Allow to collect even selector defined
         * multiple times with different properties.
         */
        if( !selectors[ selectorText ] )
          selectors[ selectorText ] = {}

        Array
        .from( style )
        .filter( prop => (!/^--/.test( prop )) )
        .map( prop => selectors[ selectorText ][ prop.trim() ] = style.getPropertyValue( prop ).trim() )
      } )
    } )
    
    return selectors
  }
}