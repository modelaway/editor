import type Modela from './modela'
import type { ViewComponent } from './types/view'
import { debug } from './utils'

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
    debug('view component registered - ', component.name )
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
  fetchComponents(){
    return this.STORE.components
  }
  removeComponent( name: string ){
    if( this.STORE.components[ name ] )
      throw new Error(`<${name}> view component already exists`)

    delete this.STORE.components[ name ]
    debug('view component unregistered - ', name )
  }
  searchComponent( query?: string ){
    const results: ObjectType<Listset> = {}

    Object
    .entries( this.STORE.components )
    .map( ([name, { node, category, caption }]) => {
      if( !category ) return

      if( query ){
        const regex = new RegExp( query )

        // Filter by query
        if( !regex.test( category )
            && !regex.test( name )
            && !regex.test( node )
            && !regex.test( caption.title )
            && !regex.test( caption.description ) ) return
      }

      if( !results[ category ] )
        results[ category ] = {
          label: category,
          seperate: true,
          items: []
        }

      results[ category ].items.push({
        icon: caption.icon as string,
        title: caption.title,
        value: name,
        event: {
          type: 'action',
          attr: 'add-view',
          params: name
        }
      })
    } )

    return results
  }

  drop(){
    // Reset store to initial state
    this.STORE.components = {}
    this.STORE.templates = {}
  }
}
