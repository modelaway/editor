import type Editor from './editor'
import type { ViewDefinition } from '../types/view'
import { debug } from './utils'
import { Cash } from 'cash-dom'

class ToolStore {
  private list: Record<string, ViewDefinition> = {}

  constructor({ settings }: Editor ){
    /**
     * General settings inherited from Modela
     */
    // this.settings = settings
  }

  getOptions(): Record<string, ToolbarOption> {
    const options = {
      POINTER: {
        icon: 'bx bx-pointer',
        title: 'Pointer',
        active: true
      },
      PICKER: {
        icon: 'bx bxs-eyedropper',
        title: 'Picker'
      },
      PENCIL: {
        title: 'Pencil',
        selected: 'pen',
        variants: {
          '*': {
            icon: 'bx bx-pencil',
            title: 'Pencil',
            parent: 'PENCIL'
          },
          'pen': {
            icon: 'bx bx-pen',
            title: 'Pen',
            parent: 'PENCIL'
          }
        }
      },
      TRANSFORM: {
        icon: 'bx bx-rotate-left',
        title: 'Transform',
        instructions: 'Apply super transformation like skew, rotate, scale, translate, ... to an element'
      },
      VECTOR: {
        icon: 'bx bx-vector',
        title: 'Vector'
      },
      FLOW: {
        icon: 'bx bx-git-merge',
        title: 'Flow',
        disabled: true
      }
    }

    return options
  }

  clear(){
    this.list = {}
  }
}

class ViewStore {
  private list: Record<string, ViewDefinition> = {}

  constructor({ settings }: Editor ){
    /**
     * General settings inherited from Modela
     */
    // this.settings = settings
  }

  add( view: ViewDefinition ){
    if( !view )
      throw new Error('Undefined view definition')

    // TODO: Check all other mandatory view definition params

    if( this.list[ view.type ] )
      throw new Error(`<${view.type}> view definition already exists`)

    this.list[ view.type ] = view
    debug('view definition registered - ', view.type )
  }
  get( type: string, $node?: Cash ): ViewDefinition | null {
    /**
     * Get view definition by type or HTML nodeName
     * 
     * Always return new instance of a view
     * to keep initial view structure immutable
     */
    if( type in this.list )
      return { ...this.list[ type ] }
    
    /**
     * Views are registered with their canonical
     * type not by nodeName. So also check registered 
     * views list by nodeName.
     */
    const
    compArray = Object.values( this.list ),
    matches = compArray.filter( each => (each.node == type) )

    if( matches.length ) return { ...matches[0] }
    
    /**
     * Some views with composed node selector wouldn't
     * much the condition above so use the JQuery node element
     * to do further selector cross-checking.
     * 
     * Useful mostly for custom view lookup
     */
    if( $node?.length ){
      const possibleMatches = compArray.filter( each => (new RegExp(`^${type}.`).test( each.node )) )
      if( possibleMatches.length )
        for( const each of possibleMatches )
          if( $node.is( each.node ) )
            return { ...each }
    }
    
    return null
  }
  getOptions(){
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
      }
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
    .map( ([type, { node, category, caption }]) => {
      if( !category ) return

      if( query ){
        const regex = new RegExp( query )

        // Filter by query
        if( !regex.test( category )
            && !regex.test( type )
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
        value: type
      })
    } )

    return results
  }
  remove( type: string ){
    if( this.list[ type ] )
      throw new Error(`<${type}> view definition already exists`)

    delete this.list[ type ]
    debug('view definition unregistered - ', type )
  }

  clear(){
    this.list = {}
  }
}

export default class Store {
  public tools: ToolStore
  public views: ViewStore

  constructor( editor: Editor ){
    /**
     * General settings inherited from Modela
     */

    this.tools = new ToolStore( editor )

    this.views = new ViewStore( editor )
  }

  /**
   * Reset store to initial state
   */
  drop(){
    this.views.clear()
  }
}
