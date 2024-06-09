import type Stylesheet from '../modules/stylesheet'
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
  private sheets: Stylesheet[] = []

  constructor( factory: PluginFactory, config?: PluginConfig ){
    /**
     * Declare font css handler on all frames
     */
    factory.flux.frames.each( frame => {
      const sheet = frame.css.declare('fonts')
      if( !sheet ) return

      this.sheets.push( sheet )
    } )

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

    // Apply defined font css rules to global custom variables
    typeof config.cssrule == 'object'
    && factory.flux.frames.each( frame => frame.css?.setVariables( config.cssrule ))
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
  async load(){
    await Promise.all( this.sheets.map( async each => {
      const settings = {
        css: Object.values( this.fonts ).join('\n'),
        meta: true
      }

      await each.load( settings )
    } ) )
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