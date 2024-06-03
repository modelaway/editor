import type { Stylesheet } from '../css'
import type { Plugin, PluginConfig, PluginFactory } from '../types/plugin'

type Font = {
  name: string
  url?: string
  face?: string
  weights?: number[]
}

export default class Fonts implements Plugin {
  public readonly name = 'Fonts'
  public readonly version = '1.0.0'

  private readonly defaultWeights = [ 100, 200, 300, 400, 500, 600, 700, 800, 900 ]
  private readonly fonts: ObjectType<string> = {}
  private sheet: Stylesheet

  constructor( factory: PluginFactory, config?: PluginConfig ){
    this.sheet = factory.flux.css.declare('fonts')

    if( typeof config !== 'object' ) return

    /**
     * Register google fonts
     */
    Array.isArray( config.googlefonts )
    && config.googlefonts.length
    && config.googlefonts.forEach( this.addGoogleFont.bind(this) )
    
    /**
     * Register custom fonts
     */
    Array.isArray( config.custom )
    && config.custom.length
    && config.custom.forEach( this.addCustomFont.bind(this) )

    // Auto-load
    config.autoload && this.load()

    // Set font-family as to global custom variables
    config.fontFamily && factory.flux.css?.setVariables({ fontFamily: config.fontFamily })
  }

  /**
   * Create import link of 
   */
  addGoogleFont({ name, weights }: Font ){
    if( !name )
      throw new Error('Undefined font name')

    weights = Array.isArray( weights ) && weights.length ? weights : this.defaultWeights
    this.fonts[ name ] = `@import url('https://fonts.googleapis.com/css2?family=${name}:wght@${weights.join(';')}&display=swap');`

    return this
  }
  addCustomFont({ name, url, face }: Font ){
    if( !name )
      throw new Error('Undefined font name')

    if( !url && !face )
      throw new Error('Undefined font `face` or `url`')

    this.fonts[ name ] = face ? `@font-face { ${face} }` : `@import url('${url}');`

    return this
  }

  /**
   * Load fonts into the DOM
   */
  load(){
    this.sheet.load({ css: Object.values( this.fonts ).join('\n'), meta: true })
  }
  list(){
    return Object.keys( this.fonts )
  }
  has( name: string ){
    return name in this.fonts
  }
  remove( name: string ){
    if( !this.has( name ) )
      throw new Error(`<${name}> font not found`)

    delete this.fonts[ name ]

    // Refresh imported fonts in the DOM
    this.load()
  }

  discard(){
    /**
     * Do something before to get discarded
     */
  }
}