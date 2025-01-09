import type { Handler } from '../lib/lips'
import type { HandlerHook } from '../types/controls'
import type { MovableOptions } from '../modules/controls/movable'
import type { SortableOptions } from '../modules/controls/sortable'

import $, { type Cash } from 'cash-dom'
import Lips, { Component } from '../lib/lips/lips'
import { VIEW_KEY_SELECTOR } from '../modules/constants'

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
export interface LayersInput {
  key: string
  settings?: LayersSettings
  position?: Position
  content?: string
  mutations?: Mutation[]
}
export interface LayersState {
  layers: Record<string, LayerElement>
  activeLayer: string | null
  selection: Array<string>
  collapsed: boolean
}
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

/**
 * Registered dependency components
 */
function dependencies(){
  const LayerListTemplate = {
    default: `
      <mul style="{ display: input.collapsed ? 'block' : 'none' }"
            class="sortable-list">
        <for in=input.list>
          <layeritem ...each depth=input.depth></layeritem>
        </for>
      </mul>
    `
  }

  type LayerItemState = {
    collapsed: boolean
    editable: boolean
    newname?: string
  }
  type LayerItemStatic = {
    newname: string
    dragState: {
      active: boolean
      sourceKey: string | null
      targetKey?: string | null
      $ghost?: Cash
      position: {
        x: number
        y: number
      } | null
    }
  }
  type LayerLITemplateType = {
    state: LayerItemState
    _static: LayerItemStatic,
    handler: Handler<LayerElement, LayerItemState, LayerItemStatic>
    default: string
  }
  const LayerItemTemplate: LayerLITemplateType = {
    state: {
      collapsed: true,
      editable: false
    },
    _static: {
      newname: '',
      dragState: {
        active: false,
        sourceKey: null,
        targetKey: null,
        position: null
      }
    },
    handler: {
      onCollapse( key: string ){
        this.state.collapsed = !this.state.collapsed
        
        // TODO: Track key for memoizing purpose
      },
      onRenameLayer( key: string, action: 'init' | 'input' | 'apply', e ){
        switch( action ){
          case 'init': this.state.editable = true; break
          case 'input': this.static.newname = e.target.value || e.target.innerText; break
          case 'apply': {
            this.state.editable = false

            // TODO: Emit event to update layer name to parent state
            console.log('rename to --', key, this.static.newname )
          } break
        }
      }
    },
    default: `
      <mli layer=input.key
            class="sortable-item"
            data-level=input.depth>
        <mblock class="nested-indicator"></mblock>

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
            
            <mlabel contenteditable=state.editable
                    on-blur(onRenameLayer, input.key, 'apply')
                    on-input(onRenameLayer, input.key, 'input')
                    on-dblclick(onRenameLayer, input.key, 'init')>{input.name}</mlabel>

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
    collapsed: false
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
      /**
       * Attach movable control to layer component
       */
      const movableOptions: MovableOptions = {
        handle: '.header > minline',
        apex: ['right', 'bottom']
      }
      this.movable = hook?.editor?.controls.movable<LayersInput, LayersState>( this, movableOptions )

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
        handle: 'mli minline > mlabel',
        // ghostClass: 'ghost',
        // dragClass: 'dragging',
        // selectedClass: 'selected',
        // group: 'layers',
        // nested: true,
        // multiDrag: true
      }
      this.sortable = hook?.editor?.controls.sortable<LayersInput, LayersState>( this, sortableOptions )
      
      // this.sortable
      // .on('select', ({items}) => {
      //   this.setState({ selectedLayers: items.map(el => $(el).attr('layer')) })
      // })
      // .on('reorder', ({items, sourceList, targetList, level}) => {
      //   this.emit('layer.move', {
      //     items: items.map(i => ({
      //       key: $(i.element).attr('layer'),
      //       sourceIndex: i.sourceIndex,
      //       targetIndex: i.targetIndex
      //     })),
      //     sourceParent: $(sourceList).closest('mli').attr('layer'),
      //     targetParent: $(targetList).closest('mli').attr('layer'),
      //     level
      //   })
      // })
      // .on('nested', ({ items, sourceParent, targetParent, oldLevel, newLevel}) => {
      //   this.emit('layer.nest', {
      //     items: items.map(el => $(el).attr('layer')),
      //     sourceParent: sourceParent && $(sourceParent).closest('mli').attr('layer'),
      //     targetParent: $(targetParent).closest('mli').attr('layer'),
      //     oldLevel,
      //     newLevel
      //   })
      // })

      // Set to default position
      !this.input.position && setTimeout( () => {
        const defPostion = hook?.editor?.controls.letPosition( this.getNode(), 'bottom-right')
        if( !defPostion ) return
        
        this.input.position = defPostion
        this.getNode().css( defPostion )
      }, 5 )

    },
    onRender(){
    },
    onDestroy(){
      this.movable.dispose()
      this.sortable.dispose()
    },
    onCollapse(){ this.state.collapsed = !this.state.collapsed },

    getStyle(){
      let style: Record<string, string> = {
        display: this.input.settings?.visible ? 'block' : 'none'
      }

      if( this.input.position )
        style = { ...style, ...this.input.position }

      return style
    }
  }

  const template = `
    <mblock style=self.getStyle()>
      <mblock class="header">
        <minline>
          <micon class="bx bx-list-minus ill-icon"></micon>
          <mlabel>Layers</mlabel>
        </minline>

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
  }
  .body {
    min-width: 15rem;
    height: 45vh;
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
    background-color: var(--me-secondary-color);
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

        mlabel { 
          color: #d2d7dd;
          user-select: none'
          
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

  .sortable-list {
    --td: 150ms;
    --go: .9;
    --pb: rgba(45,45,45,.3);
    --sb: rgba(65,145,255,.5);
    --hb: rgba(255,255,255,.05);

    .sortable-item {
      /* 
      transition: all var(--td) ease;
      transform-origin: 50% 50%;
      animation: reorder var(--td) ease;

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

    .sortable-drag { opacity: 0 }

    .selected {
      background: var(--hb);
      border-left: 2px solid var(--sb);
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