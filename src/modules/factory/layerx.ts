import type { Handler } from '../../lib/lips'
import { Component } from '../../lib/lips/lips'

/**
 * LayerX Types Definition
 */
export type LayerXInput = {
  key: string
  position?: {
    left: string
    top: string
  }
  mutations?: DOMChange[]
}

export type DOMChange = {
  type: 'add' | 'remove' | 'modify' | 'reorder'
  target: string  // DOM element reference path
  parentTarget?: string
  position?: {
    x: number
    y: number
    z: number
  }
  attributes?: {
    style?: string
    class?: string
    [key: string]: string | undefined
  }
  componentRef?: string
  styleRef?: string
}

export type LayerElement = {
  id: string
  name: string
  type: 'element' | 'group'
  isComponent?: boolean
  domRef: string
  styleRef?: string
  componentRef?: string
  position: {
    x: number
    y: number
    z: number
  }
  visible: boolean
  locked: boolean
  collapsed?: boolean
  parent: string | null
  children: string[]
}

export type LayerXState = {
  layers: Map<string, LayerElement>
  activeLayer: string | null
  expandedGroups: Set<string>
  selection: Set<string>
  dragState: {
    active: boolean
    sourceId: string | null
    targetId: string | null
    position: {
      x: number
      y: number
    } | null
  }
}

/**
 * Process layer elements into LayerX management list
 */
export default (input: LayerXInput, hook?: HandlerHook) => {
  const state: LayerXState = {
    layers: new Map(),
    activeLayer: null,
    expandedGroups: new Set(),
    selection: new Set(),
    dragState: {
      active: false,
      sourceId: null,
      targetId: null,
      position: null
    }
  }

  /**
   * Helper functions for layer management
   */
  const helpers = {
    generateLayerId: () => `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    
    getLayerPath: (domRef: string): string[] => {
      return domRef.split('/').filter(Boolean)
    },

    findLayerByDomRef: (layers: Map<string, LayerElement>, domRef: string): LayerElement | undefined => {
      for (const layer of layers.values()) {
        if (layer.domRef === domRef) return layer
      }
      return undefined
    },

    sortLayers: (layers: LayerElement[]): LayerElement[] => {
      return [...layers].sort((a, b) => b.position.z - a.position.z)
    },

    updateLayerZIndices: (layers: Map<string, LayerElement>, parent: string | null = null): void => {
      const siblings = Array.from(layers.values())
        .filter(layer => layer.parent === parent)
        .sort((a, b) => b.position.z - a.position.z)

      siblings.forEach((layer, index) => {
        layer.position.z = siblings.length - index - 1
        if (layer.type === 'group') {
          helpers.updateLayerZIndices(layers, layer.id)
        }
      })
    }
  }

  const handler: Handler<LayerXInput, LayerXState> = {
    /**
     * DOM Sync Methods
     */
    onInput({ mutations }: LayerXInput) {
      if (!mutations?.length) return

      console.log( mutations )

      mutations.forEach(change => {
        switch (change.type) {
          case 'add':
            this.onSyncLayerAdd(change)
            break
          case 'remove':
            this.onSyncLayerRemove(change)
            break
          case 'modify':
            this.onSyncLayerModify(change)
            break
          case 'reorder':
            this.onSyncLayerReorder(change)
            break
        }
      })
    },

    onSyncLayerAdd(change: DOMChange) {
      const existingLayer = helpers.findLayerByDomRef(this.state.layers, change.target)
      if (existingLayer) return

      const parentLayer = change.parentTarget ? 
        helpers.findLayerByDomRef(this.state.layers, change.parentTarget) : null

      this.onCreateLayer({
        domRef: change.target,
        parent: parentLayer?.id || null,
        position: change.position || { x: 0, y: 0, z: this.state.layers.size },
        componentRef: change.componentRef,
        styleRef: change.styleRef
      })
    },

    onSyncLayerRemove(change: DOMChange) {
      const layer = helpers.findLayerByDomRef(this.state.layers, change.target)
      if (layer) {
        this.onDeleteLayer(layer.id)
      }
    },

    onSyncLayerModify(change: DOMChange) {
      const layer = helpers.findLayerByDomRef(this.state.layers, change.target)
      if (!layer) return

      const updates: Partial<LayerElement> = {
        ...change.position && { position: change.position },
        ...change.componentRef && { componentRef: change.componentRef },
        ...change.styleRef && { styleRef: change.styleRef }
      }

      this.onUpdateLayer(layer.id, updates)
    },

    onSyncLayerReorder(change: DOMChange) {
      const layer = helpers.findLayerByDomRef(this.state.layers, change.target)
      if (!layer || !change.position) return

      const oldZ = layer.position.z
      const newZ = change.position.z

      // Update z-indices of affected layers
      Array.from(this.state.layers.values())
        .filter(l => l.parent === layer.parent)
        .forEach(l => {
          if (l.id === layer.id) {
            l.position.z = newZ
          } else if (oldZ < newZ && l.position.z <= newZ && l.position.z > oldZ) {
            l.position.z--
          } else if (oldZ > newZ && l.position.z >= newZ && l.position.z < oldZ) {
            l.position.z++
          }
        })

      helpers.updateLayerZIndices(this.state.layers)
    },

    /**
     * Layer Management Methods
     */
    onCreateLayer(element: Partial<LayerElement>) {
      const id = `layer-${Date.now()}`
      const newLayer: LayerElement = {
        id,
        name: element.name || 'New Layer',
        type: element.type || 'element',
        domRef: element.domRef || '',
        position: element.position || { x: 0, y: 0, z: this.state.layers.size },
        visible: true,
        locked: false,
        parent: element.parent || null,
        children: element.children || [],
        ...element.isComponent && { isComponent: true },
        ...element.styleRef && { styleRef: element.styleRef },
        ...element.componentRef && { componentRef: element.componentRef }
      }

      console.log( id, newLayer )
      this.state.layers.set(id, newLayer)

      if (newLayer.type === 'group') {
        this.state.expandedGroups.add(id)
      }

      if (hook?.events) {
        hook.events.emit('layer.created', newLayer)
        this.emit('layer-created', newLayer )
      }
    },

    onUpdateLayer(id: string, updates: Partial<LayerElement>) {
      const layer = this.state.layers.get(id)
      if (!layer) return

      const updatedLayer = {
        ...layer,
        ...updates,
        position: {
          ...layer.position,
          ...updates.position
        }
      }

      this.state.layers.set(id, updatedLayer)

      if (hook?.events) {
        hook.events.emit('layer.updated', updatedLayer)
        this.emit('layer-updated', updatedLayer )
      }
    },

    onDeleteLayer(id: string) {
      const layer = this.state.layers.get(id)
      if (!layer) return

      // Recursively delete children if it's a group
      if (layer.type === 'group') {
        layer.children.forEach(childId => this.onDeleteLayer(childId))
      }

      this.state.layers.delete(id)
      this.state.expandedGroups.delete(id)
      this.state.selection.delete(id)

      if (this.state.activeLayer === id) {
        this.state.activeLayer = null
      }

      if (hook?.events) {
        hook.events.emit('layer.deleted', layer)
        this.emit('layer-deleted', layer )
      }
    },

    /**
     * Selection Methods
     */
    onSelectLayer(id: string, multiSelect?: boolean) {
      if (!multiSelect) {
        this.state.selection.clear()
      }
      this.state.selection.add(id)
      this.state.activeLayer = id

      if (hook?.events) {
        const selection = Array.from(this.state.selection)

        hook.events.emit('layer.selected', selection)
        this.emit('layer-selected', selection )
      }
    },

    /**
     * Group Management Methods
     */
    onToggleGroup(id: string) {
      const layer = this.state.layers.get(id)
      if (!layer || layer.type !== 'group') return

      this.state.expandedGroups.has(id) 
        ? this.state.expandedGroups.delete(id)
        : this.state.expandedGroups.add(id)

      this.onUpdateLayer(id, { collapsed: !this.state.expandedGroups.has(id) })
    },

    onCreateGroup() {
      if (this.state.selection.size < 2) return

      const groupId = `group-${Date.now()}`
      const selectedLayers = Array.from(this.state.selection)
      const highestZ = Math.max(...selectedLayers.map(id => {
        const layer = this.state.layers.get(id)
        return layer ? layer.position.z : 0
      }))

      this.onCreateLayer({
        id: groupId,
        name: 'New Group',
        type: 'group',
        position: { x: 0, y: 0, z: highestZ },
        children: selectedLayers
      })

      // Update parent references
      selectedLayers.forEach(id => {
        const layer = this.state.layers.get(id)
        if (layer) {
          this.onUpdateLayer(id, { parent: groupId })
        }
      })

      this.state.selection.clear()
      this.onSelectLayer(groupId)
    },

    /**
     * Drag and Drop Methods
     */
    onDragStart(id: string, x: number, y: number) {
      this.state.dragState = {
        active: true,
        sourceId: id,
        targetId: null,
        position: { x, y }
      }
    },

    onDragOver(id: string) {
      if (!this.state.dragState.active) return
      this.state.dragState.targetId = id
    },

    onDragEnd() {
      const { sourceId, targetId } = this.state.dragState
      if (!sourceId || !targetId || sourceId === targetId) {
        this.state.dragState = {
          active: false,
          sourceId: null,
          targetId: null,
          position: null
        }
        return
      }

      const sourceLayer = this.state.layers.get(sourceId)
      const targetLayer = this.state.layers.get(targetId)
      
      if (!sourceLayer || !targetLayer) return

      // Handle reparenting
      if (targetLayer.type === 'group') {
        this.onUpdateLayer(sourceId, { 
          parent: targetId,
          position: {
            ...sourceLayer.position,
            z: targetLayer.children.length
          }
        })
        
        const updatedChildren = [...targetLayer.children, sourceId]
        this.onUpdateLayer(targetId, { children: updatedChildren })
      }
      // Handle reordering
      else {
        const sourceZ = sourceLayer.position.z
        const targetZ = targetLayer.position.z

        this.onUpdateLayer(sourceId, { 
          position: { ...sourceLayer.position, z: targetZ }
        })
        this.onUpdateLayer(targetId, { 
          position: { ...targetLayer.position, z: sourceZ }
        })
      }

      // Reset drag state
      this.state.dragState = {
        active: false,
        sourceId: null,
        targetId: null,
        position: null
      }
    },

    /**
     * Visibility and Lock Methods
     */
    onToggleVisibility(id: string) {
      const layer = this.state.layers.get(id)
      if (!layer) return

      this.onUpdateLayer(id, { visible: !layer.visible })
    },

    onToggleLock(id: string) {
      const layer = this.state.layers.get(id)
      if (!layer) return

      this.onUpdateLayer(id, { locked: !layer.locked })
    }
  }

  const template = `
    <mblock class="layerx-container" 
            style="typeof input.position == 'object' ? { left: input.position.left, top: input.position.top } : '?'">
      <mblock class="layerx-header">
        <micon class="bx bx-layers"></micon>
        <mlabel>Layers</mlabel>
      </mblock>

      <mul class="layerx-list">
        <for in=Array.from(state.layers.values()).sort((a, b) => b.position.z - a.position.z)>
          <if(each.parent === null)>
            <mli layer=each.id
                class={
                  active: state.activeLayer === each.id,
                  group: each.type === 'group',
                  component: each.isComponent,
                  collapsed: each.collapsed,
                  dragging: state.dragState.sourceId === each.id,
                  'drag-over': state.dragState.targetId === each.id
                }
                draggable="true"
                on-dragstart="onDragStart, each.id, event.clientX, event.clientY"
                on-dragover="onDragOver, each.id"
                on-dragend="onDragEnd"
                on-click="onSelectLayer, each.id, event.shiftKey">
              
              <if(each.type === 'group')>
                <micon class="bx bx-folder" 
                        on-click="onToggleGroup, each.id"></micon>
              </if>
              <else>
                <micon class="bx bx-rectangle"></micon>
              </else>

              <micon class="bx bx-show toggle"
                      class="!each.visible && 'bx-hide'"
                      on-click="onToggleVisibility, each.id"></micon>
              
              <micon class="bx bx-lock-open-alt toggle"
                      class="each.locked && 'bx-lock-alt'"
                      on-click="onToggleLock, each.id"></micon>

              <mlabel text=each.name></mlabel>

              <if(each.type === 'group' && state.expandedGroups.has(each.id))>
                <mul class="nested-list">
                  <for in=each.children>
                    <mli layer=each
                        class="state.activeLayer === each && 'active'"
                        on-click="onSelectLayer, each, event.shiftKey">
                      <!-- Recursive child layer rendering -->
                    </mli>
                  </for>
                </mul>
              </if>
            </mli>
          </if>
        </for>
      </mul>
    </mblock>
  `

  return new Component<LayerXInput, LayerXState>('layerx', template, { input, state, handler })
}

const stylesheet = `
  .layerx-container {
    width: 280px;
    background: #2a2a2a;
    border-radius: 4px;
    color: #e0e0e0;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    user-select: none;
  }

  .layerx-header {
    display: flex;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid #3a3a3a;
  }

  .layerx-header micon {
    font-size: 18px;
    margin-right: 8px;
  }

  .layerx-header mlabel {
    font-size: 14px;
    font-weight: 500;
  }

  .layerx-list {
    max-height: 500px;
    overflow-y: auto;
  }

  .layerx-list::-webkit-scrollbar {
    width: 8px;
  }

  .layerx-list::-webkit-scrollbar-track {
    background: #2a2a2a;
  }

  .layerx-list::-webkit-scrollbar-thumb {
    background: #4a4a4a;
    border-radius: 4px;
  }

  .layerx-list mli {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .layerx-list mli:hover {
    background: #3a3a3a;
  }

  .layerx-list mli.active {
    background: #454545;
  }

  .layerx-list mli.dragging {
    opacity: 0.5;
  }

  .layerx-list mli.drag-over {
    border-top: 2px solid #6a6aff;
  }

  .layerx-list mli micon {
    font-size: 16px;
    margin-right: 8px;
    color: #888;
  }

  .layerx-list mli micon.toggle {
    margin-left: auto;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .layerx-list mli:hover micon.toggle {
    opacity: 1;
  }

  .layerx-list mli.group {
    font-weight: 500;
  }

  .layerx-list mli.group > micon {
    color: #ffd700;
  }

  .layerx-list mli.component > micon {
    color: #6a6aff;
  }

  .layerx-list mli.collapsed + .nested-list {
    display: none;
  }

  .nested-list {
    margin-left: 24px;
    border-left: 1px solid #3a3a3a;
  }

  .nested-list mli {
    padding-left: 24px;
  }

  /* Visibility States */
  .layerx-list mli micon.bx-hide {
    color: #666;
  }

  /* Lock States */
  .layerx-list mli micon.bx-lock-alt {
    color: #ff6b6b;
  }
`