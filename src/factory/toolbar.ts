import type Lips from '../lips/lips'
import type { Handler } from '../lips'
import type { HandlerHook } from '../types/controls'

import { CONTROL_LANG_SELECTOR } from '../modules/constants'

type ContentType = 'tool' | 'view' | 'global'
type Content = {
  type: ContentType
  key?: string
  body?: ToolbarOption
}

export type ToolbarInput = {
  key: string
  tools?: Record<string, ToolbarOption>
  views?: Record<string, ToolbarOption>
  globals?: Record<string, ToolbarOption>
  settings: {
    visible?: boolean
  }
  position?: string | Position
}
export type ToolbarState = {
  tools: Record<string, ToolbarOption>
  views: Record<string, ToolbarOption>
  globals: Record<string, ToolbarOption>
  expanded: boolean
  content: Content | null
  showPalette: boolean
}

export default ( lips: Lips, input: ToolbarInput, hook?: HandlerHook ) => {
  
  const state: ToolbarState = {
    tools: {},
    views: {},
    globals: {},
    expanded: false,
    content: null,

    showPalette: false
  }

  const handler: Handler<ToolbarInput, ToolbarState> = {
    onInput({ tools, views, globals }){
      this.state.tools = tools || {}
      this.state.views = views || {}
      this.state.globals = globals || {}
    },
    onAttach(){
      // Set to default position
      if( this.input.position && typeof this.input.position !== 'string') return
      
      const
      indication = typeof this.input.position === 'string' ? this.input.position : 'left-center',
      defPostion = hook?.editor?.controls.letPosition( this.getNode(), indication )

      if( !defPostion ) return
      
      this.input.position = defPostion
      this.getNode().css( defPostion )
    },

    getStyle(){
      let style: Record<string, string> = {
        display: this.input.settings?.visible ? 'block' : 'none'
      }

      if( typeof this.input.position === 'object' )
        style = { ...style, ...this.input.position }

      return style
    },
    viewBodyContent({ type, key, body }){
      if( !body ) return
      const isExpanded = this.state.expanded

      this.state.expanded = true
      this.state.showPalette = false
      this.state.content = { type, key, body }

      /**
       * Auto-close expanded container on external click
       * 
       * TODO: Scope the click to anywhere but the toolbar block
       */
      !isExpanded && hook?.editor?.$viewport?.on('click.toolbar-expand', () => {
        this.state.expanded = false
        this.state.content = null

        hook?.editor?.$viewport?.off('.toolbar-expand')
      })
    },
    viewOptionCaptions( type, key, option ){
      let body = option
      if( option.parent )
        switch( type ){
          case 'tool': if( this.input.tools ) body = this.input.tools[ option.parent ]; break
          case 'view': if( this.input.views ) body = this.input.views[ option.parent ]; break
        }
        
      this.viewBodyContent({ type, key, body })
    },

    selectTool( key ){
      for( const k in this.state.tools ){
        this.state.tools[ k ].active = ( k === key )
      }
    },
    selectView( key ){
      for( const k in this.state.views ){
        // View with variants
        if( this.state.views[ k ].variants )
          for( const vk in this.state.views[ k ].variants ){
            // View to activate
            if( k === key && vk === this.state.views[ k ].selected ){
              // Activate view's related tool
              this.state.views[ k ].variants[ vk ].tool
              && this.selectTool( this.state.views[ k ].variants[ vk ].tool )
            }
          }

        // View to activate
        if( k === key ){
          this.state.views[ k ].active = true

          // Activate view's related tool
          this.state.views[ k ].tool
          && this.selectTool( this.state.views[ k ].tool )
        }
        // Diactivate if activated
        else this.state.views[ k ].active = false
      }
    },

    onHandleOption( type: ContentType, key: string, option: ToolbarOption ){
      if( option.disabled ) return

      // console.log(`Option [${key}] -- `, option )
      switch( type ){
        case 'tool': {
          this.selectTool( key )
          // Show option details when block is already expanded
          this.state.expanded && this.viewOptionCaptions( type, key, option )
        } break

        case 'view': {
          this.selectView( key )
          // Show option details when block is already expanded
          this.state.expanded && this.viewOptionCaptions( type, key, option )
        } break

        case 'global': this.viewBodyContent({ type, key, body: option }); break
      }
    },
    onShowOptionCaptions( type: ContentType, key: string, option: ToolbarOption, e: Event ){
      e.preventDefault()
      if( type === 'global' || option.disabled ) return

      // console.log(`Option [${key}] -- `, option )
      this.viewOptionCaptions( type, key, option )
    },

    onHandleSelect( type: string, key: string, selected: string ){
      // console.log('selected --', key, selected )
      switch( type ){
        case 'tool': if( this.state.tools[ key ] ) this.state.tools[ key ].selected = selected; break
        case 'view': if( this.state.views[ key ] ) this.state.views[ key ].selected = selected; break
      }
    }
  }

  const macros = {
    option: `
      <mli active=macro.active
            class="macro.label ? 'label' : false"
            title=macro.title
            disabled=macro.disabled
            ${CONTROL_LANG_SELECTOR}
            on-click( onHandleOption, macro.type, key, macro )
            on-contextmenu( onShowOptionCaptions, macro.type, key, macro )>
        <micon class=macro.icon></micon>

        <if( macro.label )>
          <mlabel ${CONTROL_LANG_SELECTOR} text=macro.label></mlabel>
        </if>
      </mli>
    `
  }

  const template = `
    <mblock style=self.getStyle() backdrop>
      <mblock>
        <mblock toolbar>
          <if( state.tools )>
            <mul options="tools">
              <for in=state.tools>
                <if( !each.hidden )>
                  <if( each.variants )>
                    <const selected="each.variants[ each.selected || '*' ]"></const>
                    <option type="tool" ...selected active=each.active></option>
                  </if>
                  <else>
                    <option type="tool" ...each></option>
                  </else>
                </if>
              </for>
            </mul>
          </if>

          <if( state.views )>
            <div divider></div>
            <mul options="views">
              <for in=state.views>
                <if( !each.hidden )>
                  <if( each.variants )>
                    <const selected="each.variants[ each.selected || '*' ]"></const>
                    <option type="view" ...selected active=each.active></option>
                  </if>
                  <else>
                    <option type="view" ...each></option>
                  </else>
                </if>
              </for>
            </mul>
          </if>

          <if( state.globals )>
            <mul options="globals">
              <for in=state.globals>
                <if( !each.hidden )>
                  <option type="global" ...each></option>
                </if>
              </for>
            </mul>
          </if>
        </mblock>

        <mblock container class="state.expanded && 'expanded'">
          <if( state.content )>
            <switch( state.content.type )>
              <case is="['tool', 'view']">
                <tecaptions ...state.content.body
                            on-select( onHandleSelect, state.content.type, state.content.key )></tecaptions>
              </case>
              <case is="global">
                <switch( state.content.key )>
                  <case is="styles">
                    <styles ...state.content.body></styles>
                  </case>
                  <case is="assets">
                    <assets ...state.content.body></assets>
                  </case>
                  <case is="plugins">
                    <plugins ...state.content.body></plugins>
                  </case>
                  <case is="settings">
                    <settings ...state.content.body></settings>
                  </case>
                </switch>
              </case>
            </switch>
          </if>
        </mblock>

        <mblock palette class="state.showPalette && 'expanded'">
          <palette></palette>
        </mblock>
      </mblock>
    </mblock>
  `

  return lips.render<ToolbarInput, ToolbarState>('toolbar', { default: template, state, handler, macros, stylesheet }, input )
}

const stylesheet = `
  position: absolute;
  z-index: 200;
  height: 96%;
  cursor: default;
  user-select: none;
  
  > mblock {
    position: relative;
    height: 100%;

    [toolbar],
    [palette],
    [container] {
      height: 100%;
      border-radius: var(--me-border-radius);
      background-color: var(--me-inverse-color);
      box-shadow: var(--me-box-shadow);
      backdrop-filter: var(--me-backdrop-filter);
    }

    [divider] { 
      margin: 1rem 0;
      border-top: 1px solid var(--me-border-color);
    }

    [toolbar] {
      position: relative;
      margin: 0;
      padding: 0 8px;

      mul {
        padding: 8px 0;

        &[options="globals"] {
          position: absolute;
          bottom: 0;
          padding-top: 1rem;
          border-top: 1px solid var(--me-border-color);
        }

        mli {
          padding: 8px;
          display: flex;
          align-items: center;
          /* color: var(--me-trigger-text-color); */
          border-radius: var(--me-border-radius-inside);
          transition: var(--me-active-transition);

          &:not(:first-child,:last-child) { 
            margin: 6px 0;
          }
          &:first-child { 
            margin-bottom: 6px;
          }
          &:last-child { 
            margin-top: 6px;
          }
          &:not(.label) {
            cursor: pointer;
          }
          &[disabled] {
            color: var(--me-disabled-text-color);
            cursor: not-allowed;
          }
          &[active] {
            background-color: var(--me-primary-color);
            color: #fff;
          }
          &:not(.label,[disabled],[active]):hover {
            background-color: var(--me-primary-color-transparent);
          }
          &.label > micon,
          &.label > mlabel {
            cursor: default;
            text-wrap: nowrap;
            padding-left: 10px;
            font-size: var(--me-font-size-2);
            color: var(--me-disabled-text-color);
          }
          &.label > micon { padding-left: 0; }
          
          micon {
            font-size: var(--me-icon-size-2)!important;
          }
        }
      }
    }

    [palette],
    [container] {
      position: absolute;
      top: 0;
      left: 100%;
      margin: 0 8px;
      height: 100%;
      transform: translateX(-24rem);
      transition: ease var(--me-slide-transition);

      &.expanded {
        transform: translateX(0%);
      }
    }
    [container]{
      width: 18rem;
    }
    [palette] {
      width: 3.5rem;
    }
  }
`