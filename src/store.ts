import Modela from './modela'
import { log } from './utils'

export default class Store {
  private STORE: ModelaStore = {
    components: {},
    templates: {}
  }

  constructor({ settings }: Modela ){
    /**
     * General settings inherited from Modela
     */
    // this.settings = settings
  }

  addComponent( component: ViewComponent ){
    if( !component )
      throw new Error('Undefined view component')

    // TODO: Check all other mandatory view component params

    if( this.STORE.components[ component.name ] )
      throw new Error(`<${component.name}> view component already exists`)

    this.STORE.components[ component.name ] = component
    log('view component registered - ', component.name )
  }
  getComponent( name: string ): ViewComponent | null {
    /**
     * Get components component by name or HTML nodeName
     * 
     * NOTE: Components are registered with their canonical
     * name not by nodeName
     * 
     * Always return new instance of a component
     * to keep initial component structure immutable
     */
    const component = this.STORE.components[ name ] 
                      || Object.values( this.STORE.components ).filter( each => (each.node == name) )[0]
    return component ? { ...component } : null
  }
  removeComponent( name: string ){
    if( this.STORE.components[ name ] )
      throw new Error(`<${name}> view component already exists`)

    delete this.STORE.components[ name ]
    log('view component unregistered - ', name )
  }

  drop(){
    // Reset store to initial state
    this.STORE.components = {}
    this.STORE.templates = {}
  }
}
