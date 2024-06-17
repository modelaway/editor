import type Frame from '../modules/frame'
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

  private config: PluginConfig
  private factory: PluginFactory
  private sheets: Stylesheet[] = []

  constructor( factory: PluginFactory, config?: PluginConfig ){
    if( typeof config !== 'object' )
      throw new Error('Undefined Fonts plugin configuration')

    this.config = config
    this.factory = factory
    
    /**
     * Register google fonts
     */
    Array.isArray( this.config.googlefonts )
    && this.config.googlefonts.length
    && this.config.googlefonts.forEach( this.addGoogleFont.bind(this) )
    
    /**
     * Register custom fonts
     */
    Array.isArray( this.config.custom )
    && this.config.custom.length
    && this.config.custom.forEach( this.addCustomFont.bind(this) )

    /**
     * Apply fonts to each frame once loaded
     */
    factory.flux.frames.on('frame.load', this.apply.bind(this) )
  }

  private async apply( frame: Frame ){
    /**
     * Declare font css handler on all frames
     */
    const sheet = await frame.css.declare('fonts')
    if( !sheet ) return
    
    this.sheets.push( sheet )

    // Auto-load
    this.config.autoload && await sheet.load({
      css: Object.values( this.fonts ).join('\n'),
      meta: true
    })

    // Apply defined font css rules to global custom variables
    typeof this.config.cssrule == 'object'
    && frame.css?.setVariables( this.config.cssrule )
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