import Modela from './modela'
import { log } from './utils'

export default class Assets {
  private ASSETS: any = {}

  constructor({ settings }: Modela ){
    /**
     * General settings inherited from Modela
     */
    // this.settings = settings
  }

  add( assets: ViewComponent ){
    if( !assets )
      throw new Error('Undefined assets')
    
    if( this.ASSETS[ assets.name ] )
      throw new Error(`<${assets.name}> assets already exists`)

    this.ASSETS[ assets.name ] = assets
    log('assets added - ', assets.name )
  }
  get( name: string ){
    return this.ASSETS[ name ]
  }
  remove( name: string ){
    if( this.ASSETS[ name ] )
      throw new Error(`<${name}> assets already exists`)

    delete this.ASSETS[ name ]
    log('assets removed - ', name )
  }

  drop(){
    // Reset store to initial state
    this.ASSETS = {}
    this.ASSETS.templates = {}
  }
}
