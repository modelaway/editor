import type Modela from '../exports/modela'
import type { ViewComponent } from '../types/view'
import type { FrameQuery } from '../lib/frame.window'
import { debug } from './utils'

type StoreMemory = {
  views: ObjectType<ViewComponent>,
  templates: {}
}

export default class Store {
  private STORE: StoreMemory = {
    views: {},
    templates: {}
  }

  constructor({ settings }: Modela ){
    /**
     * General settings inherited from Modela
     */
    // this.settings = settings
  }

  addView( view: ViewComponent ){
    if( !view )
      throw new Error('Undefined view component')

    // TODO: Check all other mandatory view component params

    if( this.STORE.views[ view.name ] )
      throw new Error(`<${view.name}> view component already exists`)

    this.STORE.views[ view.name ] = view
    debug('view component registered - ', view.name )
  }
  async getView( name: string, $$node?: FrameQuery ): Promise<ViewComponent | null> {
    /**
     * Get view component by name or HTML nodeName
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
    if( $$node?.length ){
      const possibleMatches = compArray.filter( each => (new RegExp(`^${name}.`).test( each.node )) )
      if( possibleMatches.length )
        for( const each of possibleMatches )
          if( await $$node.is( each.node ) )
            return { ...each }
    }
    
    return null
  }
  fetchViews(){
    return this.STORE.views
  }
  removeView( name: string ){
    if( this.STORE.views[ name ] )
      throw new Error(`<${name}> view component already exists`)

    delete this.STORE.views[ name ]
    debug('view component unregistered - ', name )
  }
  searchView( query?: string ){
    const results: ObjectType<Listset> = {}

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
    this.STORE.views = {}
    this.STORE.templates = {}
  }
}
