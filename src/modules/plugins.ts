import type Editor from './editor'
import type { Plugin, PluginFactory, PluginInstance } from '../types/plugin'

import EventEmitter from 'events'
import * as constants from './constants'

export default class Plugins extends EventEmitter {
  private factory: PluginFactory
  private list: Record<string, Record<string, Plugin>> = {}

  constructor( editor: Editor ){
    super()

    this.factory = {
      constants,
      editor
    }

    /**
     * Auto register in-build plugins specified in 
     * modela settings.
     */
    Array.isArray( editor.settings.plugins )
    && editor.settings.plugins.length
    && Promise.all( editor.settings.plugins.map( this.load.bind(this) ) )
              .then( () => this.emit('load') )
              .catch( ( error: unknown ) => this.emit('error', error ) )
  }
  
  /**
   * Return relative path to in-build plugins files
   */
  private getInbuildPath( name: string ){
    return `./${name.toLowerCase()}.plugin.min.js`
  }

  /**
   * Load in-build plugin by name and/or configuration
   */
  async load( option: string | ModelaPluginOption ){
    if( typeof option === 'object' ){
      const { name, config } = option
      if( !name ) throw new Error('Invalid plugin')

      try {
        const plugin = (await import( this.getInbuildPath( name ) )).default as PluginInstance
        this.register( plugin, config )
      }
      catch( error ){ throw new Error(`<${name}> plugin not found`) }
    }

    // By string definition
    else try {
      const plugin = (await import( this.getInbuildPath( option ) )).default as PluginInstance
      this.register( plugin )
    }
    catch( error ){ throw new Error(`<${option}> plugin not found`)}
  }

  /**
   * Check for a registed plugin
   */
  has( name: string, version?: string ){
    return version ? 
                name in this.list && version in this.list[ name ]
                : name in this.list
  }

  /**
   * Return registered plugin
   */
  get( name: string, version?: string ){
    if( !this.has( name, version ) )
      throw new Error(`<${name +(version ? `~${version}` : '')}> plugin not found`)

    return this.list[ name ]
  }

  /**
   * Register new plugin
   */
  register( plug: PluginInstance, config?: Record<string, any> ){
    // Instanciate plugin
    const plugin = new plug( this.factory, config )

    if( !plugin.name )
      throw new Error('Undefined Plugin\'s name')

    if( !plugin.version )
      throw new Error('Undefined Plugin\'s version')

    if( this.has( plugin.name, plugin.version ) )
      throw new Error(`<${plugin.name}~${plugin.version}> plugin exists`)
    
    !this.list[ plugin.name ] ?
          /**
           * Record new plugin
           */
          this.list[ plugin.name ] = { [ plugin.version ]: plugin }
          /**
           * Record new version of an existing plugin
           * 
           * For instance, version 1.0.1 exists but
           * version 2.0.6 is needed by another service 
           * or plugin, etc.
           */
          : this.list[ plugin.name ][ plugin.version ] = plugin
  }

  /**
   * Unregister plugin
   */
  unregister( name: string, version?: string ){
    if( !this.has( name, version ) )
      throw new Error(`<${name +(version ? `~${version}` : '')}> plugin not found`)

    if( !version ){
      /**
       * Remove the whole set if there's only one
       * or no version of the plugin registered.
       */
      const registered = Object.keys( this.list[ name ] )
      if( registered.length <= 1 ){
        // Discard the plugin
        this.list[ name ][ registered[0] ].discard()
        delete this.list[ name ]
        
        return
      }

      /**
       * Plugin version must be specified when multiple
       * versions of it are registered.
       */
      throw new Error(`Undefined ${name} plugin's version`)
    }
    // Remove plugin by version
    else {
      this.list[ name ][ version ].discard()
      delete this.list[ name ][ version ]
    }
  }
}