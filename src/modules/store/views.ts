import type { ViewDefinition } from '../../types/view'
import { debug } from '../utils'
import { Cash } from 'cash-dom'

export default class ViewStore {
  private list: Record<string, ViewDefinition> = {}
  
  add( view: ViewDefinition ){
    if( !view )
      throw new Error('Undefined view definition')

    // TODO: Check all other mandatory view definition params

    if( this.list[ view.name ] )
      throw new Error(`<${view.name}> view definition already exists`)

    this.list[ view.name ] = view
    debug('view definition registered - ', view.name )
  }
  get( name: string, $node?: Cash ): ViewDefinition | null {
    /**
     * Get view definition by name or HTML nodeName
     * 
     * Always return new instance of a view
     * to keep initial view structure immutable
     */
    if( name in this.list )
      return { ...this.list[ name ] }
    
    /**
     * Views are registered with their canonical
     * name not by nodeName. So also check registered 
     * views list by nodeName.
     */
    const
    compArray = Object.values( this.list ),
    matches = compArray.filter( each => (each.tagname == name) )

    if( matches.length ) return { ...matches[0] }
    
    /**
     * Some views with composed node selector wouldn't
     * much the condition above so use the JQuery node element
     * to do further selector cross-checking.
     * 
     * Useful mostly for custom view lookup
     */
    if( $node?.length ){
      const possibleMatches = compArray.filter( each => (new RegExp(`^${name}.`).test( each.tagname )) )
      if( possibleMatches.length )
        for( const each of possibleMatches )
          if( $node.is( each.tagname ) )
            return { ...each }
    }
    
    return null
  }
  getOptions(){
    // HACK: Serve all available view options object directly from here for now.
    const options = {
      text: {
        title: 'Text',
        selected: '*',
        variants: {
          '*': {
            icon: 'bx bx-text',
            title: 'Inline text',
            shortcut: 'command + y',
            tool: 'TEXT',
            parent: 'text'
          },
          'circle': {
            icon: 'bx bx-paragraph',
            title: 'Paragraph text',
            shortcut: 'command + y',
            tool: 'TEXT',
            parent: 'text'
          },
          'blockquote': {
            icon: 'bx bxs-quote-alt-left',
            title: 'Blockquote',
            shortcut: 'command + y',
            tool: 'TEXT',
            parent: 'text'
          }
        }
      },
      shape: {
        title: 'Shape',
        selected: '*',
        variants: {
          '*': {
            icon: 'bx bx-shape-square',
            title: 'Rectangle Shape',
            shortcut: 'command + y',
            tool: 'POINTER',
            parent: 'shape',
            instructions: 'Create a rectangle-like or square-like shape, resizable and adjustable at any position'
          },
          'circle': {
            icon: 'bx bx-shape-circle',
            title: 'Circle shape',
            shortcut: 'command + y',
            tool: 'POINTER',
            parent: 'shape',
            instructions: 'Create a circle shape, resizable and adjustable at any position'
          },
          'dynamic': {
            icon: 'bx bx-shape-polygon',
            title: 'Dynamic shape',
            shortcut: 'command + y',
            tool: 'POINTER',
            parent: 'shape',
            instructions: 'Create a free form shape using svg, with curves, resizable and adjustable at any position'
          }
        }
      },
      image: {
        title: 'Image',
        selected: '*',
        variants: {
          '*': {
            icon: 'bx bx-image-alt',
            title: 'Image',
            shortcut: 'command + y',
            tool: 'POINTER',
            parent: 'image'
          },
          'icon': {
            icon: 'bx bx-home-smile',
            title: 'Font icons',
            shortcut: 'command + y',
            tool: 'POINTER',
            parent: 'image'
          }
        }
      },
      video: {
        icon: 'bx bx-movie-play',
        title: 'Video',
        shortcut: 'command + y',
        tool: 'POINTER'
      },
      audio: {
        icon: 'bx bx-equalizer',
        title: 'Audio',
        tool: 'POINTER'
      },
      board: {
        icon: 'bx bx-clipboard',
        title: 'Board',
        tool: 'PENCIL'
      },
      custom: {
        title: 'Text',
        icon: 'bx bx-dots-horizontal-rounded',
        custom: true,
        variants: {
          'link': {
            icon: 'bx bx-link',
            title: 'Link text',
            shortcut: 'command + y',
            tool: 'TEXT',
            parent: 'text'
          }
        }
      },
    }

    // this.list

    return options
  }
  fetch(){
    return this.list
  }
  search( query?: string ){
    const results: Record<string, Listset> = {}

    Object
    .entries( this.list )
    .map( ([name, { type, tagname, caption }]) => {
      if( !type ) return

      if( query ){
        const regex = new RegExp( query )

        // Filter by query
        if( !regex.test( type )
            && !regex.test( name )
            && !regex.test( tagname )
            && !regex.test( caption.title )
            && !regex.test( caption.description ) ) return
      }

      if( !results[ type ] )
        results[ type ] = {
          label: type,
          seperate: true,
          items: []
        }

      results[ type ].items.push({
        icon: caption.icon as string,
        title: caption.title,
        value: name
      })
    } )

    return results
  }
  remove( name: string ){
    if( this.list[ name ] )
      throw new Error(`<${name}> view definition already exists`)

    delete this.list[ name ]
    debug('view definition unregistered - ', name )
  }

  clear(){
    this.list = {}
  }
}
