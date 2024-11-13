
export const _static = {
  global: false,
  parseQuery: ( str: string ) => {
    const
    obj: any = {},
    array = str.split('&')

    array.map( each => {
      const [ key, value ] = each.split('=')
      obj[ key ] = value
    })

    return obj
  },
  routes: []
}

export const state = {
  currentPage: null,
  currentRoute: null,
  params: {},
  query: {},
  refreshing: false,
}

export const handler = {
  onInput(){
    // if( !this.input.routes )
    //   return
    
    console.log( this.input )

    // this.static.routes = routes.map( route => {
    //   // Mount default page
    //   route = this.loadComponent( route )

    //   if( route.path === defaultPath 
    //       || route.name === defaultRoute
    //       || route.default )
    //     defaultPath = defaultPath || route.path

    //   const
    //   // Retrieve pathname variables
    //   pathVars = route.path.match(/:[^\/]*(\/|$)/gi),
    //   // Convert path to wildcard matching regex path
    //   pathRegex = route.path.replaceAll('/', '\\/')
    //                         .replaceAll(/:[^\/]*(\/|$)/gi, '([^\\\/]+)(?:\\\/|$)')
      
    //   return {
    //     ...route, 
    //     pathVars,
    //     pathRegex: new RegExp(`${pathRegex}$`, 'i')
    //   }
    // } )

    // const cpathname = window.location.pathname
    // defaultPath = defaultPath
    //               && cpathname == '/' 
    //               && cpathname !== defaultPath ?
    //                       // Default path different root path `/`
    //                       defaultPath
    //                       // Use first route as default
    //                       : cpathname ? cpathname + window.location.search : this.static.routes[0].path

    // this.navigate( defaultPath )
  },
  onMount(){ 
    // if( this.input.global ){
    //   window.navigate = this.navigate.bind(this)
    //   window.refresh = () => {
    //     this.state.refreshing = true
    //     setTimeout( () => this.state.refreshing = false, 10 )
    //   }
    
    //   window.addEventListener('popstate', e => e.state && this.navigate( e.state.path, true ) )
    // }
  },

  loadComponent( route ){
    if( !route.component )
      route.component = require( route.page )

    return route
  },
  navigate( path, back ){
    // Record new navigation history
    !back && history.pushState({ path }, '', path )

    const parts = path.split('?')
    path = parts[0]
    
    // Parse search query
    const query = parts[1] ? this.static.parseQuery( parts[1] ) : {}

    // Routing state prior to where to nativate to
    let fromState: any = null 
    if( this.state.currentRoute ){
      fromState = {
        name: this.state.currentRoute.name,
        path: this.state.currentRoute.path,
        params: this.state.params
      }

      // Before match and render page event
      this.emit('before', { fromState, toState: { path, query } })
    }
    
    // Match path with define routes
    const result = this.match( path )
    // Page not found
    if( !result ){
      this.state.currentPage ?
                    this.once('update', () => this.emit('not-found', path ) )
                    : setTimeout( () => this.emit('not-found', path ), 200 )
                    
      return this.setState({ currentPage: null, params: {}, query: {} })
    }

    const { route, params } = result

    // After match and render page event
    this.once('update', () => this.emit('after', {
      fromState,
      toState: {
        name: route.name,
        path: route.path,
        params,
        query
      }
    }) )
    
    this.setState({
      currentPath: path,
      currentPage: this.loadComponent( route ).component,
      currentRoute: route,
      params,
      query
    })
  },
  match( path ){
    const params: any = {}
    let matchRoute = false

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

export default `<div>Router</div>`

// <if by=this.state.refreshing></if>
// <else>
//   <${state.currentPage} key=(this.state.currentRoute && this.state.currentRoute.name) params=this.state.params query=this.state.query/>
// </else>
