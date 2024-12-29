import type { Handler } from '../../lib/lips'

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
            style="typeof input.position == 'object' ? { left: input.position.left, top: input.position.top } : '?'">
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

  return new Component<ToolbarInput, ToolbarState>('toolbar', template, { input, state, handler, macros })
}
