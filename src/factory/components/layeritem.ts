import type { Cash } from 'cash-dom'
import type { Handler, Metavars } from '@lipsjs/lips'

type LayerItemInput = LayerElement & {
  path: string
  depth: number
}
type LayerItemState = {
  collapsed: boolean
  rename: boolean
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
    rename: false
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
  
  const handler: Handler<Metavars<LayerItemInput, LayerItemState, LayerItemStatic>> = {
    onCollapse( key: string ){
      this.state.collapsed = !this.state.collapsed
      
      // TODO: Track key for memoizing purpose
    },
    onRenameLayer( key: string, action: 'init' | 'focus' | 'input' | 'apply', e ){
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

          // TODO: Emit event to update layer name to parent state
          // console.log('rename to --', key, this.static.newname )
        } break
      }
    },

    onToggleVisibility( key: string, status: boolean ){

    }
  }
  
  const template = `
    <mli sortable
          layer=input.key
          path=input.path
          level=input.depth
          attribute=input.attribute
          class=(context.selection.includes( input.key ) && 'selected')>
      <mblock class="nested-indicator"/>

      <mblock class="layer-bar">
        <micon class="toggle-icon visibility bx {input.hidden ? 'bx-hide' : 'bx-show'}"
                on-click( onToggleVisibility, input.key, !input.hidden )/>

        <micon class="ill-icon move-handle bx bx-grid-vertical"/>

        <minline style="padding: 7px 0 7px {20 * input.depth}px">
          <switch( input.attribute )>
            <case is="group">
              <micon class="toggle-icon bx {state.collapsed ? 'bx-chevron-down' : 'bx-chevron-right'}"
                      style="padding: 0 4px 0 0"
                      on-click( onCollapse, input.key )/>
            </case>
            <default>
              <switch( input.type )>
                <case is="image">
                  <micon class="ill-icon bx bx-image-alt"/>
                </case>
                <case is="video">
                  <micon class="ill-icon bx bx-play-circle"/>
                </case>
                <case is="audio">
                  <micon class="ill-icon bx bx-volume-low"/>
                </case>
                <case is="text">
                  <micon class="ill-icon bx bx-text"/>
                </case>
                <default>
                  <micon class="ill-icon bx bx-shape-square"/>
                </default>
              </switch>
            </default>
          </switch>
          
          <mlabel contenteditable=state.rename
                  autofocus=state.rename
                  on-blur(onRenameLayer, input.key, 'apply')
                  on-focus(onRenameLayer, input.key, 'focus')
                  on-input(onRenameLayer, input.key, 'input')
                  on-dblclick(onRenameLayer, input.key, 'init')>{input.name}</mlabel>

          <if( input.locked )>
            <micon class="toggle-icon bxs bx-lock-alt"
                    on-click( onToggleLock, input.key )/>
          </if>
        </minline>
      </mblock>

      <if( input.layers && input.attribute === 'group' )>
        <layerlist list=input.layers
                    layer=input.key
                    path="{input.path}.{input.key}"
                    depth=(input.depth + 1)
                    collapsed=state.collapsed/>
      </if>
    </mli>
  `

  const stylesheet = `
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
  `

  return { context: ['selection'], state, _static, handler, default: template, stylesheet }
}

export default LayerItem