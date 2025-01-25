import type Editor from './editor'
import type { ViewDefinition } from '../types/view'
import { debug } from './utils'
import { Cash } from 'cash-dom'

type StoreMemory = {
  views: Record<string, ViewDefinition>,
  templates: {}
}

export default class Store {
  private STORE: StoreMemory = {
    views: {},
    templates: {}
  }

  constructor({ settings }: Editor ){
    /**
     * General settings inherited from Modela
     */
    // this.settings = settings
  }

  addView( view: ViewDefinition ){
    if( !view )
      throw new Error('Undefined view definition')

    // TODO: Check all other mandatory view definition params

    if( this.STORE.views[ view.name ] )
      throw new Error(`<${view.name}> view definition already exists`)

    this.STORE.views[ view.name ] = view
    debug('view definition registered - ', view.name )
  }
  getView( name: string, $node?: Cash ): ViewDefinition | null {
    /**
     * Get view definition by name or HTML nodeName
     * 
     * Always return new instance of a view
     * to keep initial view structure immutable
     */
    if( name in this.STORE.views )
      return { ...this.STORE.views[ name ] }
    
    /**
     * Views are registered with their canonical
     * name not by nodeName. So also check registered 
     * views list by nodeName.
     */
    const
    compArray = Object.values( this.STORE.views ),
    matches = compArray.filter( each => (each.node == name) )

    if( matches.length ) return { ...matches[0] }
    
    /**
     * Some views with composed node selector wouldn't
     * much the condition above so use the JQuery node element
     * to do further selector cross-checking.
     * 
     * Useful mostly for custom view lookup
     */
    if( $node?.length ){
      const possibleMatches = compArray.filter( each => (new RegExp(`^${name}.`).test( each.node )) )
      if( possibleMatches.length )
        for( const each of possibleMatches )
          if( $node.is( each.node ) )
            return { ...each }
    }
    
    return null
  }
  fetchViews(){
    return this.STORE.views
  }
  removeView( name: string ){
    if( this.STORE.views[ name ] )
      throw new Error(`<${name}> view definition already exists`)

    delete this.STORE.views[ name ]
    debug('view definition unregistered - ', name )
  }
  searchView( query?: string ){
    const results: Record<string, Listset> = {}

    Object
    .entries( this.STORE.views )
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
        value: name
      })
    } )

    return results
  }

  drop(){
    // Reset store to initial state
    this.STORE.views = {}
    this.STORE.templates = {}
  }
}
