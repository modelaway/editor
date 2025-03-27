import Lips, { Handler, Metavars } from '@lipsjs/lips'
import type { FrameSpecs } from '../types/frame'
import type { HandlerHook } from '../types/controls'
import type { MovableOptions } from '../modules/controls/movable'
import type { SortableOptions, ReorderedItems, Reordered } from '../modules/controls/sortable'

import $ from 'cash-dom'
import { ELEMENT_KEY_SELECTOR } from '../modules/constants'
import { deepAssign, deepDelete, deepValue } from '../modules/utils'

export type Mutation = {
  action: 'add' | 'remove' | 'reorder' | 'modify'
  element: LayerElement
}

class Traverser {
  private layerCount: number = 0
  private zIndex: number = 0

  private FLAGS  = [
    'rzh:selected',
    'scope'
  ]

  /**
   * Generate unique key for layer elements
   */
  private generateAttributes(){
    this.layerCount++

    return {
      defkey: `l${this.layerCount}`,
      defname: `Layer ${this.layerCount}`
    }
  }

  private ignoreFlag( element: Element, flag?: string ): { element: Element, flag?: string } | null {
    for( const tagname of this.FLAGS  ){
      const [ name, flag ] = tagname.split(':') || []
      if( !name ) return { element }

      if( name.toUpperCase() === element.tagName ){
        const firstchild = element.firstChild as Element
        return firstchild && flag !== '*' ? this.ignoreFlag( firstchild, flag ) : null
      }
    }
    
    return { element, flag }
  }
  /**
   * Get element type based on its structure
   */
  private getElementType( element: Element ): LayerElement['type'] {
    const tagName = (element.tagName || '').toLowerCase()

    if( tagName )
      switch( tagName ){
        case 'img': return 'image'
        case 'video': 
        case 'audio': return tagName
        default: return 'block'
      }

    else return 'text'
  }
  /**
   * Create layer element with its properties
   */
  private createElement( element: Element, parentKey?: string, flag?: string ): LayerElement {
    const 
    $element = $(element)
    if( !$element.length )
      throw new Error('Invalid element')

    const
    { defkey, defname } = this.generateAttributes(),
    type = this.getElementType( element ),
    groupAttr = $element.attr('group'),
    children = type !== 'text' ? $element.children() : null,
    layer: LayerElement = {
      key: $element.attr( ELEMENT_KEY_SELECTOR ) || defkey,
      parentKey,
      name: $element.attr( ELEMENT_KEY_SELECTOR ) || defname,
      tagname: type === 'text' ? 'text' : element.tagName.toLowerCase(),
      type,
      attribute: groupAttr || (children && children.length > 0) ? 'group' : 'element',
      position: {
        x: type !== 'text' && $element.offset()?.left || 0,
        y: type !== 'text' && $element.offset()?.top || 0,
        z: this.zIndex++
      },
      hidden: !!$element.attr('hidden'),
      locked: $element.attr('contenteditable') === 'false',
      collapsed: false,
      styles: $element.attr('style-ref')
    }

    switch( flag ){
      // case 'selected': layer.selected = true
    }

    // const componentName = $element.attr('data-component')
    // const componentRel = $element.attr('data-component-rel')
    // if( componentName && componentRel ){
    //   layer.component = {
    //     name: componentName,
    //     rel: componentRel
    //   }
    // }

    if( layer.attribute === 'group' )
      children?.each(( _, child: Element ) => {
        const result = this.ignoreFlag( child )
        if( !result || !result.element ) return

        child = result.element

        const childLayer = this.createElement( child, layer.key, result.flag )
        if( !layer.layers )
          layer.layers = new Map()

        layer.layers.set( childLayer.key, childLayer )
      })

    return layer
  }

  /**
   * Traverse DOM structure and build layer tree
   */
  public traverse( rootElement: string | Element ): Map<string, LayerElement> {
    const 
    $root = $(rootElement),
    layers: Map<string, LayerElement> = new Map()
    
    $root.each(( _, element: Element ) => {
      const result = this.ignoreFlag( element )
      if( !result || !result.element ) return

      element = result.element

      const layer = this.createElement( element, undefined, result.flag )
      layers.set( layer.key, layer )
    })

    return layers
  }

  /**
   * Find all layers belonging to specific group
   */
  public findLayersByGroup( layers: Map<string, LayerElement>, groupName: string ): LayerElement[] {
    const result: LayerElement[] = []
    
    Object
    .entries( layers )
    .forEach( ([ key, layer ]) => {
      if( layer.attribute === 'group' && layer.name === groupName )
        result.push( layer )
      
      if( layer.layers )
        result.push( ...this.findLayersByGroup( layer.layers, groupName ))
    })
    
    return result
  }
}

function cleanContent( html: string ){
  return html.trim()
            .replace(/[\n\t\r]+/g, '')
            .replace(/\s{2,}/g, '')
}

export type LayersHost = {
  key: string
  type: 'frame'
  title: string
  content?: string
}
export type LayersSettings = {
  visible?: boolean
  reduced?: boolean
}
export interface LayersInput {
  host: LayersHost
  settings?: LayersSettings
  position?: string | Position
  mutations?: Mutation[]
}

type Context = {
  frame: FrameSpecs | null
  selection: string[]
  viewLayers: boolean
}
type Static = {
  newname?: string
}
interface State {
  layers: Map<string, LayerElement>
  activeLayer: string | null
  reduced: boolean
  rename: boolean
}

/**
 * Element Layers management list
 */
export default ( lips: Lips, input: LayersInput, hook?: HandlerHook ) => {
  const state: State = {
    layers: new Map(),
    activeLayer: null,
    reduced: true,
    rename: false
  }

  const handler: Handler<Metavars<LayersInput, State, Static, Context>> = {
    // onInput({ host, settings }){
    //   if( host.content ){
    //     const tvs = new Traverser
    //     this.state.layers = tvs.traverse( cleanContent( host.content ) )
    //   }

    //   if( settings?.reduced !== undefined ) 
    //     this.state.reduced = settings.reduced
    // },
    onMount(){
      /**
       * Attach movable control to layer component
       */
      const movableOptions: MovableOptions = {
        handle: '[header] > mblock > minline',
        apex: ['right', 'bottom']
      }
      this.movable = hook?.editor?.controls.movable<Metavars<LayersInput, State, Static, Context>>( this, movableOptions )

      this.movable.on('started', ( position: Position ) => {})
      this.movable.on('moving', ( position: Position ) => {})
      this.movable.on('stopped', ( position: Position ) => {
        this.input.position = position
        hook?.events?.emit('layers.handle', 'position', position )
      })

      /**
       * Attach sortable control to layer component
       */
      const sortableOptions: SortableOptions = {
        list: 'mul',
        item: 'mli',
        handle: 'mli > .layer-bar > .move-handle',
        uid: 'layer', // Unique Item Identifier
        pathattr: 'path',
        groupattr: 'attribute',
        // ghostClass: 'ghost',
        // dragClass: 'dragging',
        // selectedClass: 'selected',
        // group: 'layers',
        // nested: true,
        // multiDrag: true
      }
      this.sortable = hook?.editor?.controls.sortable<Metavars<LayersInput, State, Static, Context>>( this, sortableOptions )
      
      this.sortable
      .on('sortable.select', ( selected: string[] ) => {
        this.setContext('selection', selected )
      })
      .on('sortable.reorder', ({ items, sourcePath, targetPath, level }: Reordered ) => {
        items.length
        && sourcePath
        && targetPath
        && this.reorderLayers( items, sourcePath, targetPath )
      })
    },
    onAttach(){
      // Set to default position
      if( this.input.position && typeof this.input.position !== 'string' ) return
    
      const
      indication = typeof this.input.position === 'string' ? this.input.position : 'bottom-right',
      defPostion = hook?.editor?.controls.letPosition( this.node, indication )
      if( !defPostion ) return
      
      this.input.position = defPostion
      this.node.css( defPostion )
    },
    onContext(){
      if( !this.context.frame ) return

      /**
       * Update the content tree with the
       * frame's content.
       */
      if( this.context.frame.content ){
        const tvs = new Traverser
        this.state.layers = tvs.traverse( cleanContent( this.context.frame.content ) )
      }
      else this.state.layers = new Map()
    },
    onDestroy(){
      this.movable.dispose()
      this.sortable.dispose()
    },

    onReduce(){
      this.state.reduced = !this.state.reduced
    },
    onRenameFrame( action: 'init' | 'focus' | 'input' | 'apply', e ){
      if( !this.context.frame ) return

      switch( action ){
        case 'init': this.state.rename = true; break
        case 'focus': {
          const 
          range = document.createRange(),
          selection = window.getSelection()

          if( !selection ) return

          range.selectNodeContents( e.target )
          
          selection.removeAllRanges()
          selection.addRange(range)
        } break
        case 'input': this.static.newname = e.target.value || e.target.innerText; break
        case 'apply': {
          this.state.rename = false

          // Update frame name
          const frame = hook?.editor?.canvas.get( this.context.frame.key )
          if( !frame ) return

          this.context.frame.title = this.static.newname as string
          frame.setOptions({ title: this.static.newname })
        } break
      }
    },
    onGroup(){
      if( !this.context.selection.length ) return
      
    },
    onDelete(){
      if( !this.context.selection.length ) return
    
    },
    onRefresh(){},

    reorderLayers( layers: ReorderedItems[], sourcePath: string, targetPath: string ){
      const PATH_PREFIX_REGEX = /#\.?/

      targetPath = targetPath.replace( PATH_PREFIX_REGEX, '')

      layers.forEach( each => {
        const
        path = each.path.replace( PATH_PREFIX_REGEX, '')
        if( !path ) return

        const
        source = `${path}.${each.key}`,
        target = `${targetPath}.${each.key}`,
        layer = deepValue( this.state.layers, source )

        this.state.layers = deepAssign( this.state.layers, { [ target ]: layer }, each.targetIndex )
        /**
         * Delete layer from source path
         * 
         * IMPORTANT: Avoid deleting layer moved between each other
         * under the same source path.
         */
        if( source !== target )
          this.state.layers = deepDelete( this.state.layers, source )
      })
    },
    getStyle(){
      let style: Record<string, string> = {
        display: this.context.viewLayers ? 'block' : 'none'
      }

      if( typeof this.input.position === 'object' )
        style = { ...style, ...this.input.position }

      return style
    }
  }

  const template = `
    <mblock style=self.getStyle()>
      <const display="{ display: !state.reduced ? 'block' : 'none' }"/>

      <mblock header>
        <mblock>
          <minline>
            <micon class="bx bx-list-minus ill-icon"/>
            <mlabel>Layers</mlabel>
          </minline>

          <micon class=('toggle-icon bx '+( !state.reduced ? 'bx-chevron-down' : 'bx-chevron-right'))
                  style="padding: 0 0 0 10px;"
                  on-click( onReduce )/>
        </mblock>

        <mblock class="host-title"
                style=display>
          <span class="host-type">{input.host.type} / </span>
          <span contenteditable=state.rename
                autofocus=state.rename
                on-blur(onRenameFrame, 'apply')
                on-focus(onRenameFrame, 'focus')
                on-input(onRenameFrame, 'input')
                on-dblclick(onRenameFrame, 'init')>{context.frame ? context.frame.title : input.host.title}</span>
        </mblock>
      </mblock>

      <mblock body style=display>
        <if( state.layers )>
          <layerlist list=state.layers
                      depth=0
                      collapsed/>
        </if>
      </mblock>

      <mblock footer style=display>
        <micon class="ill-icon bx bx-refresh"
                title="Refresh"
                on-click( onRefresh )/>

        <micon class="ill-icon bx bx-hash"
                activated=!!context.selection.length
                title="Group"
                on-click( onGroup )/>

        <micon class="ill-icon bx bx-trash"
                activated=!!context.selection.length
                title="Delete"
                on-click( onDelete )/>
      </mblock>
    </mblock>
  `

  const context = ['frame', 'selection', 'viewLayers']

  return lips.render<Metavars<LayersInput, State, Static, Context>>('layers', { default: template, state, handler, stylesheet, context }, input )
}

const stylesheet = `
  position: absolute;
  z-index: 200;
  border-radius: var(--me-border-radius);
  background-color: var(--me-inverse-color);
  box-shadow: var(--me-box-shadow);
  backdrop-filter: var(--me-backdrop-filter);
  cursor: default;
  overflow: hidden;

  [header] {
    mblock {
      user-select: none;
      padding: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    minline {
      width: 60%;
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
    }

    .ill-icon,
    .toggle.icon { 
      font-size: var(--me-icon-size-2)!important;
    }

    .host-title {
      font-size: var(--me-small-font-size);
      
      .host-type {
        color: var(--me-primary-color-transparent);
      }
    }
  }
  [footer] {
    padding: .2rem .5rem;
    text-align: center;
    box-shadow: var(--me-box-shadow);
    background-color: var(--me-inverse-color-brute);

    .ill-icon {
      padding: 0.1rem;
      margin: 0.3rem 0.1rem;
      border: 1px solid var(--me-border-color);
      border-radius: var(--me-border-radius-gentle);
      color: var(--me-primary-color);

      &:hover {
        background-color: var(--me-primary-color-fade);
      }
      &:active {
        background-color: var(--me-primary-color-transparent);
      }

      &[activated="true"] {
        background-color: var(--me-primary-color);
        color: var(--me-inverse-color);
      }
    }
  }
  [body] {
    min-width: 18rem;
    height: 45vh;
    padding-top: 1px;
    overflow: auto;
  }
  .ill-icon {
    color: rgb(180, 180, 180);
    padding-right: 10px;
  }
  .toggle-icon {
    color: rgb(180, 180, 180);
    padding: 7px 8px;
    cursor: pointer;
    font-size: var(--me-icon-size);
  }

  .sortable-ghost {
    opacity: var(--go);
    backdrop-filter: blur(2px);
    box-shadow: var(--me-box-shadow);
    background-color: var(--me-inverse-color);
    border-radius: 4px;
    pointer-events: none;
    transform-origin: 50% 50%;
    animation: ghost-appear var(--td) ease;
  }

  [contenteditable]{
    display: inline-block;
    min-width: 5rem;
    padding: 0 8px;
    outline: none;
  }

  @keyframes ghost-appear {
    from {
      opacity: 0;
      transform: scale(.95);
    }
    to {
      opacity: var(--go);
      transform: scale(1);
    }
  }

  @keyframes reorder {
    from { transform: scale(.98) }
    to { transform: scale(1) }
  }

  @keyframes level-shift {
    from {
      transform: translateX(-10px);
      opacity: .5;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`