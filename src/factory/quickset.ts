import type { Handler } from '../lib/lips'
import type { HandlerHook } from '../types/controls'

import { Component } from '../lib/lips/lips'
import {
  CONTROL_LANG_SELECTOR,
  CONTROL_QUICKSET_SELECTOR,
  VIEW_CONTROL_OPTIONS
} from '../modules/constants'

/**
 * Process quickset options into HTML content
 */
export type QuicksetInput = {
  key: string
  options: ObjectType<QuicksetOption>
  settings?: QuicksetSettings
  position?: string | Position
}
export type QuicksetState = {
  default: ObjectType<QuicksetOption> | null
  extra: ObjectType<QuicksetOption> | null
  super: ObjectType<QuicksetOption> | null
  subOption: ObjectType<QuicksetOption> | null
  detached: ObjectType<QuicksetOption> | null
  showExtra: boolean
}

export default ( input: QuicksetInput, hook?: HandlerHook ) => {

  const state: QuicksetState = {
    default: null,
    extra: null,
    super: null,
    subOption: null,
    detached: null,

    showExtra: false
  }

  const handler: Handler<QuicksetInput, QuicksetState> = {
    onInput({ options }: QuicksetInput ){
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
        else if( option.super ){
          if( !this.state.super ) 
            this.state.super = {}

          this.state.super[ key ] = option
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
    onMount(){
      // Set to default position
      ;(!this.input.position || typeof this.input.position === 'string')
      && setTimeout( () => {
        const
        indication = typeof this.input.position === 'string' ? this.input.position : 'bottom-center',
        defPostion = hook?.editor?.controls.letPosition( this.getNode(), indication )
        if( !defPostion ) return
        
        this.input.position = defPostion
        this.getNode().css( defPostion )
      }, 5 )
    },
    onShowExtraOptions( status ){ this.state.showExtra = status },
    onShowSubOptions( key, option ){ this.state.subOption = key && { ...option, key } },
    onHandleOption( key, option ){
      if( !hook ) return

      option.meta
          ? typeof hook.metacall == 'function' && hook.metacall( key, option )
          : hook.events?.emit('quickset.handle', key, option )
    },

    getStyle(){
      let style: Record<string, string> = {
        display: this.input.settings?.visible ? 'block' : 'none'
      }

      if( typeof this.input.position === 'object' )
        style = { ...style, ...this.input.position }

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
    <mblock ${CONTROL_QUICKSET_SELECTOR}=input.key
            class="input.settings.editing ? 'editing' : '?'"
            style=self.getStyle()>
      <mblock container>
        <mul>
          <if( !state.subOption )>
            <mblock options="main">
              <for in=state.default>
                <option ...each></option>
              </for>

              <if( state.super )>
                <mblock options="super">
                  <for in=state.super>
                    <option ...each></option>
                  </for>
                </mblock>
              </if>

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

  return new Component<QuicksetInput, QuicksetState>('quickset', template, { input, state, handler, macros, stylesheet })
}

const stylesheet = `
  position: fixed;
  z-index: 200;
  width: auto;
  cursor: default;
  user-select: none;
  font-size: var(--me-font-size-2);
  
  > mblock > mul {
    list-style: none;
    margin: 0;
    padding: 3px;
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

  [options="super"] {
    border-left: 1px solid var(--me-border-color);
  }

  > mblock { padding: 6px 0; }
  > mblock > mul:not(:first-child) {
    margin: 0 6px;
  }
  mli {
    padding: 8px;
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
  mli[disabled] {
    color: var(--me-disabled-text-color);
    cursor: not-allowed;
  }
  mli[active] {
    background-color: var(--me-primary-color);
    color: #fff;
  }
  mli:not(.label,[disabled],[active]):hover {
    background-color: var(--me-primary-color-transparent);
  }
  mli.label > micon,
  mli.label > mlabel {
    cursor: default;
    text-wrap: nowrap;
    padding-left: 10px;
    font-size: var(--me-font-size-2);
    color: var(--me-disabled-text-color);
  }
  mli.label > micon { padding-left: 0; }
  mli micon {
    font-size: var(--me-icon-size-2)!important;
  }
`