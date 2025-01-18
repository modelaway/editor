import type { Cash } from 'cash-dom'
import type { Handler } from '../../lib/lips'

type LayerItemInput = LayerElement & {
  path: string
  depth: number
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

const LayerItem = () => {
  const state: LayerItemState = {
    collapsed: true,
    editable: false
  }

  const _static: LayerItemStatic = {
    newname: '',
    dragState: {
      active: false,
      sourceKey: null,
      targetKey: null,
      position: null
    }
  }
  
  const handler: Handler<LayerItemInput, LayerItemState, LayerItemStatic> = {
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
          // console.log('rename to --', key, this.static.newname )
        } break
      }
    }
  }
  
  const template = `
    <mli sortable
          layer=input.key
          path=input.path
          data-level=input.depth
          class="context.selection.includes( input.key ) && 'selected'">
      <mblock class="nested-indicator"></mblock>
      
      <mblock class="layer-bar">
        <micon class="'toggle-icon visibility bx '+( input.hidden ? 'bx-hide' : 'bx-show')"
                on-click( onToggleVisibility, input.key )></micon>

        <micon class="ill-icon move-handle bx bx-grid-vertical"></micon>

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

              <micon class="ill-icon bx bx-hash"></micon>
            </case>
            <default>
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
                    layer=input.key
                    path="input.path +'.'+ input.key"
                    depth="input.depth + 1"
                    collapsed=state.collapsed></layerlist>
      </if>
    </mli>
  `

  return { context: ['selection'], state, _static, handler, default: template }
}

export default LayerItem