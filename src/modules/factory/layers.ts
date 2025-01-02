import type { Handler } from '../../lib/lips'
import type { HandlerHook } from '../../types/controls'

import $ from 'cash-dom'
import Lips, { Component } from '../../lib/lips/lips'
import { VIEW_KEY_SELECTOR } from '../constants'

export type LayersSettings = {
  visible?: boolean
}

export type LayerElement = {
  key: string
  parentKey?: string
  name: string
  type: 'block' | 'text' | 'image' | 'video' | 'audio'
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
  collapsed: boolean
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
        <mblock class="layer-bar">
          <micon class="'toggle-icon visibility bx '+( input.hidden ? 'bx-hide' : 'bx-show')"
                  on-click( onToggleVisibility, input.key )></micon>

          <minline style="{ padding: '7px 0 7px '+(20 * input.depth)+'px' }">
            <switch( input.attribute )>
              <case is="group">
                <micon class="'toggle-icon bx '+( state.collapsed ? 'bx-chevron-down' : 'bx-chevron-right')"
                        style="padding: 0 4px"
                        on-click( onCollapse, input.key )></micon>

                <micon class="ill-icon bx bx-object-horizontal-left"></micon>
              </case>
              <case is="node">
                <micon class="'toggle-icon bx '+( state.collapsed ? 'bx-chevron-down' : 'bx-chevron-right')"
                        style="padding: 0 4px"
                        on-click( onCollapse, input.key )></micon>

                <micon class="ill-icon bx bx-git-repo-forked"></micon>
              </case>
              <default>
                <log( input.attribute, input.type )></log>
                <switch( input.type )>
                  <case is="image">
                    <micon class="ill-icon bx bx-image-alt"></micon>
                  </case>
                  <case is="video">
                    <micon class="ill-icon bx bx-play-circle"></micon>
                  </case>
                  <case is="audio">
                    <micon class="ill-icon bx bx-volume-low"></micon>
                  </case>
                  <case is="text">
                    <micon class="ill-icon bx bx-text"></micon>
                  </case>
                  <default>
                    <micon class="ill-icon bx bx-shape-square"></micon>
                  </default>
                </switch>
              </default>
            </switch>
            
            <mlabel>{input.name}</mlabel>

            <if( input.locked )>
              <micon class="toggle-icon bxs bx-lock-alt"
                      on-click( onToggleLock, input.key )></micon>
            </if>
          </minline>
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

function cleanContent( html: string ){
  return html.trim()
            .replace(/[\n\t\r]+/g, '')
            .replace(/\s{2,}/g, '')
}

/**
 * Element Layers management list
 */
export default ( input: LayersInput, hook?: HandlerHook ) => {
  
  const state: LayersState = {
    layers: {},
    activeLayer: null,
    selection: [],
    collapsed: false,
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
        this.state.layers = tvs.traverse( cleanContent( content ) )
      }

      if( mutations ){

      }
    },
    onMount(){
      hook?.editor?.controls.movable( this.getNode(), this.find('.header'), ( _, _event, position ) => {
        switch( _event ){
          case 'started':
          case 'moving': console.log('moving --', position ); break
          case 'stopped': {
            this.input.position = {
              left: `${position.left}px`,
              top: `${position.top}px`
            }
            
            hook?.events?.emit('layers.handle', 'position', position )
          } break
        }
      })

      // Set to default position
      setTimeout(  () => {
        const defPostion = hook?.editor?.controls.letPosition( this.getNode(), 'bottom-right' )
        if( !defPostion ) return
        
        this.input.position = defPostion
        this.getNode().css( defPostion )
      }, 500 )
    },
    onCollapse(){ this.state.collapsed = !this.state.collapsed },

    getStyle(){
      let style: Record<string, string> = {
        display: this.input.settings?.visible ? 'block' : 'none'
      }

      if( this.input.position ){
        style.left = this.input.position.left
        style.top = this.input.position.top
      }
      
      return style
    }
  }

  const template = `
    <mblock style=self.getStyle()>
      <mblock class="header">
        <micon class="bx bx-list-minus ill-icon"></micon>
        <mlabel>Layers</mlabel>

        <micon class="'toggle-icon bx '+( state.collapsed ? 'bx-chevron-down' : 'bx-chevron-right')"
                style="padding: 0 0 0 10px;"
                on-click( onCollapse )></micon>
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

  return new Component<LayersInput, LayersState>('layers', template, { input, state, handler, stylesheet }, { lips: dependencies() })
}

const stylesheet = `
  position: fixed;
  z-index: 200;
  min-width: 15rem;
  border-radius: var(--me-border-radius);
  background-color: var(--me-secondary-color);
  box-shadow: var(--me-box-shadow);
  backdrop-filter: var(--me-backdrop-filter);
  cursor: default;
  overflow: hidden;

  .header {
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    user-select: none;

    .ill-icon,
    .toggle.icon { 
      font-size: var(--me-icon-size-2);
    }
  }
  .body {
    width: 100%;
    max-height: 50vh;
    overflow: auto;
  }
  .ill-icon {
    color: gray;
    padding-right: 10px;
  }
  .toggle-icon {
    color: gray;
    padding: 7px 8px;
    cursor: pointer;
    font-size: var(--me-icon-size);

    &.visibility {
      border-right: 1px solid var(--me-border-color);
    }
  }

  mli {
    border-top: 1px solid var(--me-border-color);

    .layer-bar {
      display: flex;
      align-items: center;

      &:hover {
        background-color: var(--me-secondary-color-transparent);
      }

      > minline {
        width: 100%;
        display: inline-flex;
        align-items: center;

        mlabel { color: #d2d7dd; }
      }
    }
  }
`