
import type Modela from './modela'
// import * as Sass from 'sass'
import {
  VIEW_KEY_SELECTOR,
  VIEW_NAME_SELECTOR,
  VIEW_STYLE_SELECTOR
} from './constants'

let Sass: any
const STYLES = {
  primaryColor: {
    group: 'palette',
    label: 'Primary Color',
    value: 1,
    options: [
      { value: 0, hint: 'None', shape: true, apply: ['background-color: transparent'] },
      { value: 1, hint: '#ff7028', shape: true, apply: ['background-color: #ff7028'] },
      { value: 2, hint: '#ff894e', shape: true, apply: ['background-color: #ff894e'] },
      { value: 3, hint: '#ffab82', shape: true, apply: ['background-color: #ffab82'] }
    ],
    display: 'inline',
    customizable: true
  },
  secondaryColor: {
    group: 'palette',
    label: 'Secondary Color',
    value: 1,
    options: [
      { value: 0, hint: 'None', shape: true, apply: ['background-color: transparent'] },
      { value: 1, hint: '#116b1a', shape: true, apply: ['background-color: #116b1a'] },
      { value: 2, hint: '#318e3a', shape: true, apply: ['background-color: #318e3a'] },
      { value: 3, hint: '#4ea957', shape: true, apply: ['background-color: #4ea957'] }
    ],
    display: 'inline',
    customizable: true
  },
  ambiantColor: {
    group: 'palette',
    label: 'Ambiant Color',
    value: 1,
    options: [
      { value: 0, hint: 'None', shape: true, apply: ['background-color: transparent'] },
      { value: 1, hint: '#696969', shape: true, apply: ['background-color: #696969'] },
      { value: 2, hint: '#a0a0a0', shape: true, apply: ['background-color: #a0a0a0'] },
      { value: 3, hint: '#e7e7e7', shape: true, apply: ['background-color: #e7e7e7'] }
    ],
    display: 'inline',
    customizable: true
  },

  fontFamily: {
    group: 'font',
    label: 'Font Family',
    value: 'Lexend, Lexend+Deca, Lato, Rubik, sans-serif',
    options: [
      { value: 'Lexend, Rubik, sans-serif', apply: ['font-family: Lexend'] },
      { value: 'Lexend+Deca, Lato, sans-serif', apply: ['font-family: Lexend+Deca'] },
      { value: 'Lato, Rubik, sans-serif', apply: ['font-family: Lato'] },
      { value: 'Rubik, sans-serif', apply: ['font-family: Rubik'] },
      { value: 'sans-serif', apply: ['font-family: sans-serif'] }
    ],
    applyOnly: 'body',
    display: 'dropdown',
    customizable: true
  },
  fontSize: {
    group: 'font',
    label: 'Font Size',
    values: {
      '*': 'inherit',
      'XXL': 'inherit',
      'XL': 'inherit',
      'LG': 'inherit',
      'MD': 'inherit',
      'SM': 'inherit',
      'XS': 'inherit'
    },
    options: [
      { value: 'inherit', label: 'Auto' },
      { value: 'font-lg', label: 'LG' },
      { value: 'font-md', label: 'MD' },
      { value: 'font-sm', label: 'SM' }
    ],
    applyOnly: 'body',
    display: 'inline',
    customizable: true
  },
  fontWeight: {
    group: 'font',
    label: 'Font Weight',
    value: '400',
    options: [
      { value: '100', hint: 'Thin' },
      { value: '200', hint: 'Extra Light' },
      { value: '300', hint: 'Light' },
      { value: '400', hint: 'Regular' },
      { value: '500', hint: 'Medium' },
      { value: '600', hint: 'Semi Bold' },
      { value: '700', hint: 'Bold' },
      { value: '800', hint: 'Extra Bold' },
      { value: '900', hint: 'Black' }
    ],
    featuredOptions: [ 0, 2, 3, 4, 6 ],
    applyOnly: 'body',
    display: 'inline',
    customizable: true
  },
  lineHeight: {
    group: 'font',
    label: 'Line Spacement (line-height)',
    value: 1,
    options: [
      { value: 0, hint: 'None' },
      { value: 1, hint: '1' },
      { value: 2, hint: '1.2' },
      { value: 3, hint: '1.3' },
      { value: 4, hint: '1.4' },
      { value: 5, hint: '1.5' },
    ],
    applyOnly: 'body',
    display: 'inline',
    customizable: true
  },

  padding: {
    group: 'spacement',
    label: 'Padding',
    values: {
      '*': 0,
      'XXL': 0,
      'XL': 0,
      'LG': 0,
      'MD': 0,
      'SM': 0,
      'XS': 0
    },
    options: [
      { value: 0, hint: 'None' },
      { value: 1, hint: '1rem' },
      { value: 2, hint: '1.5rem' },
      { value: 3, hint: '3rem' },
      { value: 4, hint: '3.5rem' },
      { value: 5, hint: '4rem' },
    ],
    display: 'inline',
    customizable: true
  },
  margin: {
    group: 'spacement',
    label: 'Margin',
    values: {
      '*': 0,
      'XXL': 0,
      'XL': 0,
      'LG': 0,
      'MD': 0,
      'SM': 0,
      'XS': 0
    },
    options: [
      { value: 0, hint: 'None' },
      { value: 1, hint: '1rem' },
      { value: 2, hint: '1.5rem' },
      { value: 3, hint: '3rem' },
      { value: 4, hint: '3.5rem' },
      { value: 5, hint: '4rem' },
    ],
    display: 'inline',
    customizable: true
  },

  borderColor: {
    group: 'border',
    label: 'Border Color',
    value: '#2e2e2e',
    palette: [
      { value: 'none', hint: 'None' },
      { value: '#2e2e2e', hint: '#2e2e2e' },
      { value: '#656565', hint: '#656565' },
      { value: '#a9a9a9', hint: '#a9a9a9' }
    ],
    display: 'inline',
    customizable: true
  },
  borderWidth: {
    group: 'border',
    label: 'Border Size',
    value: 0,
    options: [
      { value: 0, hint: 'None' },
      { value: 1, hint: '1px' },
      { value: 2, hint: '2px' },
      { value: 3, hint: '3px' }
    ],
    display: 'inline',
    customizable: true
  },
  borderRadius: {
    group: 'border',
    label: 'Rounded Corner (Border Radius)',
    value: 0,
    options: [
      { value: 'none', hint: 'None' },
      { value: 'circle', hint: '50%' },
      { value: 'rounded', hint: '4px' },
      { value: 'rounded-sm', hint: '2px' },
      { value: 'rounded-lg', hint: '10px' },
      { value: 'rounded-xl', hint: '15px' }
    ],
    featuredOptions: [ 0, 1, 2, 3, 4 ],
    display: 'inline',
    customizable: true
  }
}

export class Stylesheet {
  private nsp?: string
  private key?: string
  private props: StylesheetParams['props']

  constructor({ nsp, key, props }: StylesheetParams ){

    if( typeof nsp !== 'string' && typeof key !== 'string' ) 
      throw new Error('Undefined or invalid styles attachement element(s) identifier')
    
    // @ts-ignore
    !Sass && import('https://jspm.dev/sass').then( lib => Sass = lib )

    /**
     * Unique identifier of targeted views/elements
     * 
     * - mv-key (for group of views)
     * - mv-namespace (for global elements)
     */
    this.nsp = nsp

    /**
     * Unique identifier of targeted view
     * 
     * - mv-key (for single views)
     */
    this.key = key

    /**
     * Styles properties
     * 
     * - predefined
     * - custom
     */
    this.props = props
  }

  /**
   * Compile Sass style string to CSS string
   */
  compile( str: string ){
    return Sass.compileString( str )
  }

  /**
   * Compile and inject a style chunk in the DOM
   * using `<style mv-style="*">...</style>` tag
   */
  inject( id: string, str: string, custom = false ){
    if( !id || !str )
      throw new Error('Invalid injection arguments')

    const 
    selector = `${VIEW_STYLE_SELECTOR}="${id}"`,
    /**
     * Defined css by a specific view or group of views or elements
     * by wrapping in a closure using the unique view-key as root 
     * selector.
     * 
     * [mv-name="global"] {
     *    font-size: 12px;
     *    &:hover {
     *      color: #000; 
     *    }
     * }
     * 
     * [mv-key="1234567890"] {
     *    font-size: 12px;
     *    &:hover {
     *      color: #000; 
     *    }
     * }
     */
    result = this.compile(`[${custom ? VIEW_KEY_SELECTOR : VIEW_NAME_SELECTOR}="${id}"] { ${str} }`)

    if( !result || !result.css )
      throw new Error(`<view:${id}> ${custom ? 'custom' : 'predefined'} style injection failed`)

    $(`head style[${selector}]`).length ?
                    // Replace existing content
                    $(`head style[${selector}]`).html( result.css )
                    // Inject new style
                    : $('head').append(`<style ${selector}>${result.css}</style>`)
  }

  /**
   * Run the defined `styles()` method of the component
   * to get initial style properties.
   */
  load( props?: StyleSheetProps ){
    this.props = props || this.props

    if( typeof this.props !== 'object' )
      throw new Error('Undefined styles properties')
    
    /**
     * Predefined styles affect all instance of 
     * the same view in the DOM.
     */
    this.nsp 
    && this.props.predefined?.css
    && this.inject( this.nsp, this.props.predefined?.css )

    /**
     * Custom styles affect only a unique view with a unique
     * view-key in the DOM.
     */
    this.key
    && this.props.custom?.css 
    && this.inject( this.key, this.props.custom?.css, true )
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
    // Remove predefined styles by namespace
    this.nsp && $(`head style[${VIEW_STYLE_SELECTOR}="${this.nsp}"]`).remove()
    // Remove custom styles by views/elements
    this.key && $(`head style[${VIEW_STYLE_SELECTOR}="${this.key}"]`).remove()
  }
}

export default class CSS {
  private flux: Modela

  constructor( flux: Modela ){
    this.flux = flux
  }

  declare( params: StylesheetParams, autoload = false ){
    const css = new Stylesheet( params )

    // Auto load the declare style
    autoload && css.load()
    // Give control to declare style
    return css
  }
}