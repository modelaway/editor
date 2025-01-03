import type { Handler } from '../../lib/lips'
import type { HandlerHook } from '../../types/controls'

import { Component } from '../../lib/lips/lips'
import {
  CONTROL_LANG_SELECTOR,
  CONTROL_TOOLBAR_SELECTOR,
  VIEW_CONTROL_OPTIONS
} from '../constants'

/**
 * Process toolbar options into HTML content
 */
export type ToolbarInput = {
  key: string
  options: ObjectType<ToolbarOption>
  settings?: ToolbarSettings
  position?: {
    left: string
    top: string
  }
}
export type ToolbarState = {
  default: ObjectType<ToolbarOption> | null
  extra: ObjectType<ToolbarOption> | null
  subOption: ObjectType<ToolbarOption> | null
  detached: ObjectType<ToolbarOption> | null
  showExtra: boolean
}

export default ( input: ToolbarInput, hook?: HandlerHook ) => {

  const state: ToolbarState = {
    default: null,
    extra: null,
    subOption: null,
    detached: null,

    showExtra: false
  }

  const handler: Handler<ToolbarInput, ToolbarState> = {
    onInput({ options }: ToolbarInput ){
      if( !options ) return

      Object
      .entries( options )
      .filter( ([key, { hidden }]) => (!hidden) )
      .forEach( ([ key, option ]) => {
        if( option.extra ){
          if( !this.state.extra ) 
            this.state.extra = {}
          
          this.state.extra[ key ] = option
        }
        else if( option.detached ){
          if( !this.state.detached ) 
            this.state.detached = {}

          this.state.detached[ key ] = option
        }
        else {
          if( !this.state.default ) 
            this.state.default = {}

          this.state.default[ key ] = option
        }
      } )
    },
    onShowExtraOptions( status ){ this.state.showExtra = status },
    onShowSubOptions( key, option ){ this.state.subOption = key && { ...option, key } },
    onHandleOption( key, option ){
      if( !hook ) return

      option.meta
          ? typeof hook.metacall == 'function' && hook.metacall( key, option )
          : hook.events?.emit('toolbar.handle', key, option )
    },

    getStyle(){
      const style: Record<string, string> = {
        display: this.input.settings?.visible ? 'block' : 'none'
      }

      if( this.input.position ){
        style.left = this.input.position.left
        style.top = this.input.position.top
      }

      return style
    }
  }

  const macros = {
    option: `
      <mli active=macro.active
            class="macro.label ? 'label' : false"
            title=macro.title
            disabled=macro.disabled
            ${CONTROL_LANG_SELECTOR}
            on-click( macro.sub ? 'onShowSubOptions' : 'onHandleOption', key, macro )>
        <micon class=macro.icon></micon>

        <if( macro.label )>
          <mlabel ${CONTROL_LANG_SELECTOR} text=macro.label></mlabel>
        </if>
      </mli>
    `
  }

  const template = `
    <mblock ${CONTROL_TOOLBAR_SELECTOR}=input.key
            class="input.settings.editing ? 'editing' : '?'"
            style=self.getStyle()>
      <mblock container>
        <mul>
          <if( !state.subOption )>
            <mblock options="main">
              <for in=state.default>
                <option ...each></option>
              </for>

              <if( state.extra && !state.showExtra )>
                <mli title="Extra options" ${CONTROL_LANG_SELECTOR} on-click( onShowExtraOptions, true )><micon class="bx bx-dots-horizontal-rounded"></micon></mli>
              </if>
            </mblock>

            <if( state.showExtra )>
              <mblock options="extra">
                <for in=state.extra>
                  <option ...each></option>
                </for>

                <mli title="Back" ${CONTROL_LANG_SELECTOR} on-click( onShowExtraOptions, false )><micon class="bx bx-chevron-left"></micon></mli>
              </mblock>
            </if>
          </if>

          <if( state.subOption )>
            <mblock options="sub">
              <mli title="Back" ${CONTROL_LANG_SELECTOR} on-click( onShowSubOptions, false )>
                <micon class="bx bx-chevron-left"></micon>
              </mli>

              <mli class="label">
                <micon class=state.subOption.icon></micon>
                <mlabel ${CONTROL_LANG_SELECTOR} text="state.subOption.label || state.subOption.title"></mlabel>
              </mli>
              
              <for in=state.subOption.sub>
                <mli active=each.active
                      disable=each.disabled
                      title=each.title
                    ${CONTROL_LANG_SELECTOR}
                    on-click( onHandleOption, state.subOption.key +'.sub.'+ key, each )>
                  <micon class=each.icon></micon>
                </mli>
              </for>
            </mblock>
          </if>
        </mul>

        <if( state.detached )>
          <mul>
            <mblock options="detached">
              <for in=state.detached>
                <option ...each></option>
              </for>
            </mblock>
          </mul>
        </if>
      </mblock>
    </mblock>
  `

  return new Component<ToolbarInput, ToolbarState>('toolbar', template, { input, state, handler, macros, stylesheet })
}

const stylesheet = `
  position: fixed;
  z-index: 200;
  width: 0px;
  cursor: default;
  user-select: none;
  font-size: var(--me-font-size);
  
  &[mv-toolbar="global"] {
    left: var(--me-edge-padding);
    bottom: var(--me-edge-padding);
  }
  > mblock > mul {
    list-style: none;
    margin: 0;
    padding: 5px;
    border-radius: var(--me-border-radius);
    background-color: #fff;
    box-shadow: var(--me-box-shadow);
    backdrop-filter: var(--me-backdrop-filter);
    transition: var(--me-active-transition);
  }
  
  > mblock,
  > mblock > mul,
  > mblock > mul > mblock {
    display: flex;
    align-items: center;
    justify-content: space-around;
  }

  > mblock { padding: 6px 0; }
  > mblock > mul:not(:first-child) {
    margin: 0 6px;
  }
  mli {
    padding: 6px;
    margin: 2px;
    display: inline-flex;
    align-items: center;
    /* color: var(--me-trigger-text-color); */
    border-radius: var(--me-border-radius-inside);
    transition: var(--me-active-transition);
  }
  mli:not(.label) {
    cursor: pointer;
  }
  mli[active] {
    color: var(--me-active-text-color);
  }
  mli[disabled] {
    color: var(--me-disabled-text-color);
    cursor: not-allowed;
  }
  [meta],
  [dismiss],
  mli:not(.label,[disabled]):hover {
    background-color: var(--me-secondary-color-transparent);
  }
  mli.label > micon,
  mli.label > mlabel {
    cursor: default;
    text-wrap: nowrap;
    padding-left: 10px;
    font-size: var(--me-font-size);
    color: var(--me-disabled-text-color);
  }
  mli.label > micon { padding-left: 0; }
  mli micon {
    font-size: var(--me-icon-size)!important;
  }
`