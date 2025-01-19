import type { Handler } from '../lib/lips'
import type { HandlerHook } from '../types/controls'
import type { MovableOptions } from '../modules/controls/movable'
import type { SortableOptions } from '../modules/controls/sortable'

import $, { type Cash } from 'cash-dom'
import Lips, { Component } from '../lib/lips/lips'
import { VIEW_KEY_SELECTOR } from '../modules/constants'
import LayerList from './components/layerlist'
import LayerItem from './components/layeritem'
import { deepAssign, deepClone, deepDelete, deepValue } from '../modules/utils'

export type Mutation = {
  action: 'add' | 'remove' | 'reorder' | 'modify'
  element: LayerElement
}

class Traverser {
  private layerCount: number = 0
  private zIndex: number = 0

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
  private createElement( element: Element, parentKey?: string ): LayerElement {
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
      key: $element.attr( VIEW_KEY_SELECTOR ) || defkey,
      parentKey,
      name: $element.attr( VIEW_KEY_SELECTOR ) || defname,
      tagname: type === 'text' ? 'text' : element.tagName.toLowerCase(),
      type,
      attribute: groupAttr ? 'group' : children && children.length > 0 ? 'node' : 'element',
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

    // const componentName = $element.attr('data-component')
    // const componentRel = $element.attr('data-component-rel')
    // if( componentName && componentRel ){
    //   layer.component = {
    //     name: componentName,
    //     rel: componentRel
    //   }
    // }

    if( layer.attribute === 'node' || layer.attribute === 'group' )
      children?.each(( _, child ) => {
        const childLayer = this.createElement( child, layer.key )

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
    
    $root.each(( _, element ) => {
      const layer = this.createElement( element )
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

/**
 * Registered dependency components
 */
function dependencies(){
  const lips = new Lips<Context>({
    context: {
      selection: []
    }
  })

  lips.register('layerlist', LayerList() )
  lips.register('layeritem', LayerItem() )

  return lips
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
}
export interface LayersInput {
  host: LayersHost
  settings?: LayersSettings
  position?: string | Position
  mutations?: Mutation[]
}

type Context = {
  selection: Array<string>
}
interface State {
  layers: Map<string, LayerElement>
  activeLayer: string | null
  collapsed: boolean
}

type ReorderSpec = {
  key: string
  path: string
  sourceIndex: string
  targetIndex: number
}

/**
 * Element Layers management list
 */
export default ( input: LayersInput, hook?: HandlerHook ) => {
  const state: State = {
    layers: new Map(),
    activeLayer: null,
    collapsed: false
  }

  const handler: Handler<LayersInput, State> = {
    onInput({ host, mutations }){
      if( host.content ){
        const tvs = new Traverser
        this.state.layers = tvs.traverse( cleanContent( host.content ) )
      }

      if( mutations ){

      }
    },
    onMount(){
      /**
       * Attach movable control to layer component
       */
      const movableOptions: MovableOptions = {
        handle: '.header > minline',
        apex: ['right', 'bottom']
      }
      this.movable = hook?.editor?.controls.movable<LayersInput, State>( this, movableOptions )

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
        // ghostClass: 'ghost',
        // dragClass: 'dragging',
        // selectedClass: 'selected',
        // group: 'layers',
        // nested: true,
        // multiDrag: true
      }
      this.sortable = hook?.editor?.controls.sortable<LayersInput, State>( this, sortableOptions )
      
      this.sortable
      .on('sortable.select', ( $items: Cash[] ) => {
        this.setContext('selection', $items.map( el => el.attr('layer') as string ) )
      })
      .on('sortable.reorder', ({ $items, $sourceList, $targetList, oldIndices, newIndex }: any ) => {
        const 
        layers: ReorderSpec[] = $items.map( ( $element: Cash, idx: number ) => ({
          path: $element.attr('path'),
          key: $element.attr('layer'),
          sourceIndex: oldIndices[ idx ],
          targetIndex: newIndex + idx
        })),
        sourcePath = $sourceList.attr('path'),
        targetPath = $targetList.attr('path')

        layers.length
        && sourcePath
        && targetPath
        && this.reorderLayers( layers, sourcePath, targetPath )
      })

      // Set to default position
      ;(!this.input.position || typeof this.input.position === 'string')
      && setTimeout( () => {
        const
        indication = typeof this.input.position === 'string' ? this.input.position : 'bottom-right',
        defPostion = hook?.editor?.controls.letPosition( this.getNode(), indication )
        if( !defPostion ) return
        
        this.input.position = defPostion
        this.getNode().css( defPostion )
      }, 5 )
    },
    onDestroy(){
      this.movable.dispose()
      this.sortable.dispose()
    },
    onCollapse(){ this.state.collapsed = !this.state.collapsed },

    reorderLayers( layers: ReorderSpec[], sourcePath: string, targetPath: string ){
      targetPath = targetPath.replace('#.', '')

      layers.forEach( each => {
        const
        path = each.path.replace('#.', ''),
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
      } )
    },
    getStyle(){
      let style: Record<string, string> = {
        display: this.input.settings?.visible ? 'block' : 'none'
      }

      if( typeof this.input.position === 'object' )
        style = { ...style, ...this.input.position }

      return style
    }
  }

  const template = `
    <mblock style=self.getStyle()>
      <mblock class="header">
        <mblock>
          <minline>
            <micon class="bx bx-list-minus ill-icon"></micon>
            <mlabel>Layers</mlabel>
          </minline>

          <micon class="'toggle-icon bx '+( state.collapsed ? 'bx-chevron-down' : 'bx-chevron-right')"
                  style="padding: 0 0 0 10px;"
                  on-click( onCollapse )></micon>
        </mblock>

        <mblock class="host-title"
                style="{ display: state.collapsed ? 'block' : 'none' }">
          <span class="host-type">{input.host.type} / </span>
          <span>{input.host.title}</span>
        </mblock>
      </mblock>

      <mblock class="body" style="{ display: state.collapsed ? 'block' : 'none' }">
        <if( state.layers )>
          <layerlist list=state.layers
                      depth=0
                      collapsed></layerlist>
        </if>
      </mblock>
    </mblock>
  `

  return new Component<LayersInput, State>('layers', template, { input, state, handler, stylesheet }, { lips: dependencies() })
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

  .header {
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
      font-size: var(--me-icon-size-2);
    }

    .host-title {
      font-size: var(--me-small-font-size);
      
      .host-type {
        color: var(--me-primary-color-transparent);
      }
    }
  }
  .body {
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

  mli {
    background-color: var(--me-inverse-color);
    border-top: 1px solid var(--me-border-color);
    border-bottom: 1px solid var(--me-border-color);
    margin: -1px 0;
    cursor: default;
    
    .layer-bar {
      display: flex;
      align-items: center;

      .move-handle {
        padding-right: 3px;
        visibility: hidden;
        cursor: move;
      }

      &:hover {
        background-color: var(--me-primary-color-fade);

        .move-handle { visibility: visible; }
      }

      > minline {
        width: 100%;
        display: inline-flex;
        align-items: center;

        mlabel { 
          /* color: #d2d7dd; */
          user-select: none;
          font-size: var(--me-small-font-size);
          
          &[contenteditable="true"]{
            min-width: 5rem;
            padding: 2px 8px;
            border: 1px solid var(--me-border-color);
            outline: none;
          }
        }
      }
    }

    &.dragging {
      opacity: 0.9;
    }
    
    &.ghost {
      position: fixed;
      pointer-events: none;
      z-index: 1000;
      background: black;
      width: 100%;
      height: 40px;
    }
  }

  mul[sortable] {
    --td: 150ms;
    --go: .9;
    --pb: var(--me-primary-color-transparent);
    --sb: rgba(65,145,255,.5);
    --hb: var(--me-primary-color);

    .mli[sortable] {
      transition: all var(--td) ease;
      transform-origin: 50% 50%;
      animation: reorder var(--td) ease;

      /* 
      &:hover {
        background: var(--hb);
        .nested-indicator { opacity: 1 }
      } */
      
      &[data-level] .nested-indicator {
        position: absolute;
        left: -12px;
        width: 2px;
        height: 100%;
        background: var(--sb);
        opacity: 0;
        transition: opacity var(--td) ease;
      }
    }

    .sortable-handle {
      cursor: grab;
      &:active { cursor: grabbing }
    }

    .sortable-ghost {
      opacity: var(--go);
      backdrop-filter: blur(2px);
      box-shadow: var(--me-box-shadow);
      border-radius: 4px;
      pointer-events: none;
      transform-origin: 50% 50%;
      animation: ghost-appear var(--td) ease;
    }

    .sortable-placeholder {
      background: var(--pb);
      margin: 4px 0;
      transition: all var(--td) ease;
    }

    .sortable-drag { opacity: 0; }

    .selected {
      border-left: 3px solid var(--hb);
    }

    .level-change {
      animation: level-shift var(--td) ease;
    }
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