import type { TObject, StyleSettings } from '.'

import $, { type Cash } from 'cash-dom'
// import * as Sass from 'sass'
import { CompileResult } from 'sass'

let Sass: any

export default class Stylesheet {
  private nsp: string
  private settings: StyleSettings
  private $head: Cash

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
     * Head element of the DOM from where CSS
     * operation will be done.
     */
    this.$head = $('head')

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
  private async inject( str: string ){
    if( !str )
      throw new Error('Invalid injection arguments')

    const selector = `rel="${this.settings.meta ? '@' : ''}${this.nsp}"`
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
     * [rel="<namespace>"] {
     *    font-size: 12px;
     *    &:hover {
     *      color: #000; 
     *    }
     * }
     */
    str = this.settings.meta ? str : `[rel="${this.nsp}"] { ${str} }`

    const result = await this.compile( str )
    if( !result?.css )
      throw new Error(`<component:${this.nsp}> css injection failed`)
    
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
    
    this.settings.css && await this.inject( this.settings.css )
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
    (await this.$head.find(`style[rel="${this.settings.meta ? '@' : ''}${this.nsp}"]`)).remove()
  }

  /**
   * Return css custom properties
   */
  async custom(): Promise<TObject<string>> {
    return {}
  }

  /**
   * Overridable function to return an element 
   * style attribute value as JSON object.
   */
  async style(): Promise<TObject<string>> {
    return {}
  }
}
