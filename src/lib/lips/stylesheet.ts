import type { TObject, StyleSettings } from '.'
import $, { type Cash } from 'cash-dom'
import { compile, serialize, stringify, middleware } from 'stylis'

export default class Stylesheet {
  private nsp: string
  private settings: StyleSettings
  private $head: Cash

  constructor( nsp: string, settings?: StyleSettings ){
    if( typeof nsp !== 'string' ) 
      throw new Error('Undefined or invalid styles attachement element(s) namespace')
    
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
   * Process CSS string using Stylis
   */
  compile( str: string ): string {
    try { return serialize( compile( str ), middleware([ stringify ]) ) } 
    catch( error: any ){
      throw new Error(`Style compilation failed: ${error.message}`)
    }
  }

  /**
   * Wait for styles to be applied
   */
  private waitForStyles( selector: string ): Promise<void>{
    return new Promise( resolve => {
      const observer = new MutationObserver( () => {
        const element = document.querySelector( selector )
        if( element && getComputedStyle( element ).cssText ){
          observer.disconnect()
          resolve()
        }
      } )

      observer.observe( document.documentElement, {
        attributes: true,
        childList: true,
        subtree: true
      } )
    } )
  }

  /**
   * Compile and inject a style chunk in the DOM
   * using `<style mv-style="*">...</style>` tag
   */
  private async inject( str: string ): Promise<HTMLStyleElement>{
    if( !str )
      throw new Error('Invalid injection arguments')

    const selector = `rel="${this.settings.meta ? '@' : ''}${this.nsp}"`

    /**
     * Defined meta css properties or css by view 
     * elements by wrapping in a closure using the 
     * namespaces selector.
     */
    str = this.settings.meta ? str : `[rel="${this.nsp}"] { ${str} }`

    try {
      const css = this.compile( str )
      if( !css )
        throw new Error(`<component:${this.nsp}> css compilation failed`)

      // Create new style element
      const styleSheet = document.createElement('style')
      styleSheet.setAttribute('rel', `${this.settings.meta ? '@' : ''}${this.nsp}` )
      styleSheet.textContent = css

      // Remove existing style if present
      this.$head.find(`style[${selector}]`).remove()

      // Insert new style element
      this.settings.meta
              ? document.head.prepend( styleSheet )
              : document.head.appendChild( styleSheet )

      return styleSheet
    }
    catch( error: any ){
      console.log( error )
      throw new Error(`Style injection failed: ${error.message}`)
    }
  }

  /**
   * Load/inject predefined CSS to the document
   */
  async load( settings: StyleSettings ){
    this.settings = settings
    if( typeof this.settings !== 'object' )
      throw new Error('Undefined styles settings')
    
    if( this.settings.css ){
      const styleElement = await this.inject( this.settings.css )
      await this.waitForStyles(`style[rel="${this.settings.meta ? '@' : ''}${this.nsp}"]`)
    }
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
    this.$head.find(`style[rel="${this.settings.meta ? '@' : ''}${this.nsp}"]`).remove()
  }

  /**
   * Return css custom properties
   */
  async custom(): Promise<TObject<string>>{
    return {}
  }

  /**
   * Overridable function to return an element 
   * style attribute value as JSON object.
   */
  async style(): Promise<TObject<string>>{
    return {}
  }
}