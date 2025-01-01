import type { Handler } from '../../lib/lips'

import $ from 'cash-dom'
import { Component } from '../../lib/lips/lips'
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
  expanded: Array<string>
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
 * Element Layers management list
 */
export default ( input: LayersInput, hook?: HandlerHook ) => {

  const state: LayersState = {
    layers: {},
    activeLayer: null,
    selection: [],
    expanded: [],
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
    },

    onToggleLayer( key ){
      console.time('toggle')
      
      !this.state.expanded.includes( key )
                  ? this.state.expanded.push( key )
                  : this.state.expanded = this.state.expanded.filter( each => each !== key )
      
      console.timeEnd('toggle')
    }
  }

  const macros = {
    layers: `
      <mul class="layers-list" style="{'margin-left': '15px', display: macro.collapsed ? 'block' : 'none'}">
        <for in=macro.list>
          <layer ...each></layer>
        </for>
      </mul>
    `,
    layer: `
      <mli layer=macro.key>
        <micon class="'bx bx-show toggle'+( macro.hidden ? 'bx-hide' : '' )"
                on-click( onToggleVisibility, macro.key )></micon>
        
        <micon class="'bx bx-lock-open-alt toggle'+( macro.locked ? ' bx-lock-alt' : '')"
                on-click( onToggleLock, macro.key )></micon>

        <let key=macro.key></let>
        <mblock on-click( onToggleLayer, key )>
          <if( macro.attribute === 'group' )>
            <micon class="bx bx-folder"></micon>
          </if>
          <else-if( macro.attribute === 'node' )>
            <micon class="bx bx-git-repo-forked"></micon>
          </else-if>
          <else>
            <micon class="bx bx-rectangle"></micon>
          </else>

          <mlabel>{macro.name}</mlabel>
        </mblock>

        <if( macro.layers && (macro.attribute === 'node' || macro.attribute === 'group') )>
          <layers list=macro.layers
                  collapsed="state.expanded.includes( key )"></layers>
        </if>
      </mli>
    `
  }

  const template = `
    <mblock style="typeof input.position == 'object' && { left: input.position.left, top: input.position.top }">
      <mblock class="layers-header">
        <micon class="bx bx-layers"></micon>
        <mlabel>Layers</mlabel>
      </mblock>

      <if( state.layers )>
        <layers list=state.layers collapsed></layers>
      </if>
    </mblock>
  `

  return new Component<LayersInput, LayersState>('layers', template, { input, state, handler, macros, stylesheet })
}

const stylesheet = ``