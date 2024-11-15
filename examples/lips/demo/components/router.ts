import type { Handler, Template } from '../../../../src/exports/component'

type TObject<T> = { [index: string]: any }
type RouteDef = {
  path: string
  template: Template
  default?: boolean
}
export type Input = {
  global?: boolean
  routes: RouteDef[]
}

type Route = RouteDef & {
  pathVars: string[]
  pathRegex: RegExp
}
type Static = {
  global: boolean
  routes: Route[]
  currentPath: string
  currentRoute: Route | null
  params: TObject<any>
  query: TObject<any>
}

export const _static: Static = {
  global: false,
  routes: [],
  currentPath: '/',
  currentRoute: null,
  params: {},
  query: {}
}

function parseQuery( str: string ){
  const
  obj: any = {},
  array = str.split('&')

  array.map( each => {
    const [ key, value ] = each.split('=')
    obj[ key ] = value
  })

  return obj
}

declare global {
  interface Window {
    navigate: ( path: string, back?: boolean ) => void
  }
}

export const handler: Handler<Input, undefined, Static> = {
  onInput(){
    if( !this.input.routes )
      return

    if( this.input.global )
      this.static.global = this.input.global

    let defaultPath
    this.static.routes = this.input.routes.map( ({ path, template, default: _default }) => {
      if( _default )
        defaultPath = path

      const
      // Retrieve pathname variables
      pathVars = path.match(/:[^\/]*(\/|$)/gi) || [],
      // Convert path to wildcard matching regex path
      pathRegex = path.replaceAll('/', '\\/')
                      .replaceAll(/:[^\/]*(\/|$)/gi, '([^\\\/]+)(?:\\\/|$)')
      
      return {
        path,
        template,
        default: _default, 
        pathVars,
        pathRegex: new RegExp(`${pathRegex}$`, 'i')
      }
    } )

    if( this.input.global ){
      const cpathname = window.location.pathname
      defaultPath = defaultPath
                    && cpathname == '/' 
                    && cpathname !== defaultPath ?
                            // Default path different root path `/`
                            defaultPath
                            // Use first route as default
                            : cpathname ? cpathname + window.location.search : this.static.routes[0].path
    }

    this.navigate( defaultPath )
  },
  onMount(){
    if( this.input.global ){
      window.navigate = this.navigate.bind(this)
      // window.refresh = () => {
        
      // }
    
      window.addEventListener('popstate', e => e.state && this.navigate( e.state.path, true ) )
    }
  },

  navigate( path: string, back?: boolean ){
    // Record new navigation history
    !back
    && this.static.global
    && history.pushState({ path }, '', path )

    const parts = path.split('?')
    path = parts[0]
    
    // Parse search query
    const query = parts[1] ? parseQuery( parts[1] ) : {}

    // Routing state prior to where to nativate to
    let fromState: any = null 
    if( this.static.currentRoute ){
      fromState = {
        path: this.static.currentRoute.path,
        params: this.static.params
      }

      // Before match and render page event
      this.emit('before', { fromState, toState: { path, query } })
    }
    
    // Match path with define routes
    const result = this.match( path )
    // Page not found
    if( !result ){
      this.static.currentRoute = null
      this.static.params = {}
      this.static.query = {}

      this.emit('not-found', path )
      return
    }

    // After match and render page event
    const { route, params } = result
    this.emit('after', {
      fromState,
      toState: {
        path: route.path,
        params,
        query
      }
    })
    
    this.static.currentPath = path
    this.static.currentRoute = route
    this.static.params = params
    this.static.query = query

    // Input passed routing arguments
    route.template.input = { params, query }

    const 
    page = this.lips?.render( path, route.template )
    if( !page ){
      this.emit('not-found', path )
      return
    }

    this.getEl().empty().append( page.getEl() )
  },
  match( path ){
    const params: any = {}
    let matchRoute: Route | boolean = false

    for( const route of this.static.routes ){
      const
      { pathVars, pathRegex } = route,
      matches = path.match( pathRegex )

      // Find matching path
      if( matches !== null && matches.index === 0 ){
        // Extract pathname params values
        for( let x = 0; x + 1 < matches.length && x < pathVars.length; x++ )
          params[ pathVars[x].replaceAll(/[\/:]/g, '') ] = matches[ x + 1 ]

        matchRoute = route
        break
      }
    }

    return matchRoute ? { route: matchRoute, params } : false
  }
}

export default `<wrapper></wrapper>`