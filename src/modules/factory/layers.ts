import type { Handler } from '../../lib/lips'

import $ from 'cash-dom'
import Lips, { Component } from '../../lib/lips/lips'
import { VIEW_KEY_SELECTOR } from '../constants'

export type LayersSettings = {

}

export type LayerElement = {
  key: string
  parentKey?: string
  name: string
  type: 'block' | 'text' | 'asset'
  attribute: 'element' | 'node' | 'group'
  position: {
    x: number
    y: number
    z: number
  }
  hidden?: boolean
  locked?: boolean
  collapsed?: boolean
  layers?: Record<string, LayerElement>
  styles?: string | null
  component?: {
    name: string
    rel: string
  }
}

export type Mutation = {
  action: 'add' | 'remove' | 'reorder' | 'modify'
  element: LayerElement
}

export class Traverser {
  private layerCount: number = 0
  private zIndex: number = 0

  /**
   * Generate unique key for layer elements
   */
  private generateKey(){
    this.layerCount++
    return `layer ${this.layerCount}`
  }

  /**
   * Get element type based on its structure
   */
  private getElementType( element: Element ): 'block' | 'text' | 'asset' {
    const tagName = (element.tagName || '').toLowerCase()
    if( tagName === 'img' || tagName === 'video' || tagName === 'audio' )
      return 'asset'
    
    if( !tagName ) return 'text'
    
    return 'block'
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
    type = this.getElementType( element ),
    groupAttr = $element.attr('group'),
    children = type !== 'text' ? $element.children() : null,
    layer: LayerElement = {
      key: $element.attr( VIEW_KEY_SELECTOR ) || this.generateKey(),
      parentKey,
      name: type === 'text' ? 'text' : element.tagName.toLowerCase(),
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

    if( layer.attribute === 'node' || layer.attribute === 'group' ){
      children?.each(( _, child ) => {
        const childLayer = this.createElement( child, layer.key )

        if( !layer.layers ) 
          layer.layers = {}

        layer.layers[ childLayer.key ] = childLayer
      })
    }

    return layer
  }

  /**
   * Traverse DOM structure and build layer tree
   */
  public traverse( rootElement: string | Element ): Record<string, LayerElement> {
    const 
    $root = $(rootElement),
    layers: Record<string, LayerElement> = {}
    
    $root.each(( _, element ) => {
      const layer = this.createElement( element )
      layers[ layer.key ] = layer
    })

    return layers
  }

  /**
   * Find all layers belonging to specific group
   */
  public findLayersByGroup( layers: Record<string, LayerElement>, groupName: string ): LayerElement[] {
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

export interface LayersInput {
  key: string
  settings?: LayersSettings
  position?: {
    left: string
    top: string
  }
  content?: string
  mutations?: Mutation[]
}

export interface LayersState {
  layers: Record<string, LayerElement>
  activeLayer: string | null
  selection: Array<string>
  dragState: {
    active: boolean
    sourceKey: string | null
    targetKey: string | null
    position: {
      x: number
      y: number
    } | null
  }
}

/**
 * Registered dependency components
 */
function dependencies(){
  const LayerListTemplate = {
    default: `
      <mul style="{ display: input.collapsed ? 'block' : 'none' }">
        <for in=input.list>
          <layeritem ...each depth=input.depth></layeritem>
        </for>
      </mul>
    `
  }

  type LayerItemState = {
    collapsed: boolean
  }
  type LayerLITemplateType = {
    state: LayerItemState
    handler: Handler<LayerElement, LayerItemState>
    default: string
  }
  const LayerItemTemplate: LayerLITemplateType = {
    state: {
      collapsed: false
    },
    handler: {
      onCollapse( key ){
        this.state.collapsed = !this.state.collapsed
        
        // TODO: Track key for memoizing purpose
      }
    },
    default: `
      <mli layer=input.key>
        <mblock>
          <micon class="'bx bx-show toggle'+( input.hidden ? 'bx-hide' : '' )"
                  on-click( onToggleVisibility, input.key )></micon>

          <mblock style="{ padding: '6px 0 6px '+(15 * input.depth)+'px' }"
                  on-click( onCollapse, input.key )>
            <if( input.attribute === 'group' )>
              <micon class="bx bx-folder"></micon>
            </if>
            <else-if( input.attribute === 'node' )>
              <micon class="bx bx-git-repo-forked"></micon>
            </else-if>
            <else>
              <micon class="bx bx-rectangle"></micon>
            </else>

            <mlabel>{input.name}</mlabel>
          
            <micon class="'bx bx-lock-open-alt toggle'+( input.locked ? ' bx-lock-alt' : '')"
                    on-click( onToggleLock, input.key )></micon>
          </mblock>
        </mblock>

        <if( input.layers && (input.attribute === 'node' || input.attribute === 'group') )>
          <layerlist list=input.layers
                      depth="input.depth + 1"
                      collapsed=state.collapsed></layerlist>
        </if>
      </mli>
    `
  }

  const lips = new Lips()

  lips.register('layerlist', LayerListTemplate )
  lips.register('layeritem', LayerItemTemplate )

  return lips
}

/**
 * Element Layers management list
 */
export default ( input: LayersInput, hook?: HandlerHook ) => {
  
  const state: LayersState = {
    layers: {},
    activeLayer: null,
    selection: [],
    dragState: {
      active: false,
      sourceKey: null,
      targetKey: null,
      position: null
    }
  }

  const handler: Handler<LayersInput, LayersState> = {
    onInput({ content, mutations }){
      if( content ){
        const tvs = new Traverser
        this.state.layers = tvs.traverse( content )
      }

      if( mutations ){

      }
    }
  }

  const template = `
    <mblock style="typeof input.position == 'object' && { left: input.position.left, top: input.position.top }">
      <mblock class="layers-header">
        <micon class="bx bx-layers"></micon>
        <mlabel>Layers</mlabel>
      </mblock>

      <if( state.layers )>
        <layerlist list=state.layers
                    depth=1
                    collapsed></layerlist>
      </if>
    </mblock>
  `

  return new Component<LayersInput, LayersState>('layers', template, { input, state, handler, stylesheet }, { lips: dependencies() })
}

const stylesheet = `
  position: absolute;
  min-width: 15rem;
  max-height: 50vh;
  overflow: auto;
  border: 1px solid var(--me-border-color);
  border-radius: var(--me-border-radius);

  mli {
    border-top: 1px solid var(--me-border-color);
  }
`