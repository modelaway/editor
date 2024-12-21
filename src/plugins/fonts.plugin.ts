import type Frame from '../modules/frame'
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
     * Apply fonts to each existing frames after
     * all plugins get loaded.
     * 
     * NOTE: This is necessary to apply fonts with 
     *       certainty to all frames created in canvas 
     *       before all built-in and external plugins
     *       are loaded into the editor.
     */
    factory.editor.plugins.on('load', () => this.factory.editor.canvas.each( this.apply.bind(this) ) )
    /**
     * Make fonts available in every new frames 
     * as soon as added to the canvas.
     */
    factory.editor.canvas.on('frame.add', this.apply.bind(this) )
  }
  discard(){
    this.factory.editor.canvas.each( frame => frame.styles.removeRules('fonts') )
  }

  private async apply( frame: Frame ){
    /**
     * Auto-load fonts css on all frames
     */
    this.config.autoload
    && await frame.styles.addRules( Object.values( this.fonts ).join('\n'), { key: 'fonts' })

    // Apply defined font css rules to global custom variables
    typeof this.config.cssrule == 'object'
    && frame.styles.setVariables( this.config.cssrule )
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

    // Refresh imported fonts in every frame's DOM
    this.factory.editor.canvas.each( frame => {
      frame.styles.removeRules('fonts')
      frame.styles.addRules( Object.values( this.fonts ).join('\n'), { key: 'fonts' })
    } )
  }
}