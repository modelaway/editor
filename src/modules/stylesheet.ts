import { type Cash } from 'cash-dom'
import { CompileResult } from 'sass'
import {
  VIEW_NAME_SELECTOR,
  VIEW_STYLE_SELECTOR
} from './constants'

export default class Stylesheet {
  private nsp: string
  private settings: StyleSettings
  private $head: Cash

  constructor( nsp: string, $head: Cash, settings?: StyleSettings ){
    if( typeof nsp !== 'string' ) 
      throw new Error('Undefined or invalid styles attachement element(s) namespace')
    
    // @ts-ignore
    !window.msass && import('https://jspm.dev/sass').then( lib => window.msass = lib )

    /**
     * Unique namespace identifier of targeted 
     * views/elements
     */
    this.nsp = nsp

    /**
     * Head element of the DOM from where CSS
     * operation will be done.
     * 
     * - Remote Frame DOM
     * - Modela Control DOM
     */
    this.$head = $head

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
      if( !window.msass ){
        let 
        waiter: any,
        max = 1
        
        const exec = () => {
          /**
           * TEMP: Wait 8 seconds for Sass libary to load
           */
          if( !window.msass ){
            if( max == 8 ){
              clearInterval( waiter )
              reject('Undefined Sass compiler')
            }
            else max++
            
            return
          }

          clearInterval( waiter )
          resolve( window.msass.compileString( str ) )
        }

        waiter = setInterval( exec, 1000 )
      }
      else resolve( window.msass.compileString( str ) )
    } )
  }

  /**
   * Compile and inject a style chunk in the DOM
   * using `<style mv-style="*">...</style>` tag
   */
  private async inject( id: string, str: string ){
    if( !id || !str )
      throw new Error('Invalid injection arguments')

    const selector = `${VIEW_STYLE_SELECTOR}="${this.settings.meta ? '@' : ''}${id}"`
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
    
    const $existStyle = await this.$head.find(`style[${selector}]`)
    $existStyle.length ?
          // Replace existing content
          await $existStyle.html( result.css )
          // Inject new style
          : await (this.$head as any)[ this.settings.meta ? 'prepend' : 'append' ](`<style ${selector}>${result.css}</style>`)
  }

  /**
   * Load/inject predefined CSS to the document
   */
  async load( settings: StyleSettings ){
    this.settings = settings
    if( typeof this.settings !== 'object' )
      throw new Error('Undefined styles settings')
    
    this.settings.css && await this.inject( this.nsp, this.settings.css )
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
  async clear(){
    (await this.$head.find(`style[${VIEW_STYLE_SELECTOR}="${this.settings.meta ? '@' : ''}${this.nsp}"]`)).remove()
  }

  /**
   * Return css custom properties
   */
  async custom(): Promise<ObjectType<string>> {
    return {}
  }

  /**
   * Overridable function to return an element 
   * style attribute value as JSON object.
   */
  async style(): Promise<ObjectType<string>> {
    return {}
  }
}