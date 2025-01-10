import type { Handler } from '../lib/lips'
import type { ViewCaption } from '../types/view'
import type { HandlerHook } from '../types/controls'

import Lips, { Component } from '../lib/lips/lips'
import * as Helpers from './helpers'
import {
  CONTROL_LANG_SELECTOR,
  CONTROL_MENU_SELECTOR,
  FORM_SEPERATOR_SELECTOR
} from '../modules/constants'

export type MenuInput = {
  key: string
  caption: ViewCaption
  options: MenuSections
  position?: {
    left: string
    top: string
  }
  active?: string 
}
export type MenuState = {
  activeTab: string | null
}

export default ( input: MenuInput, hook: HandlerHook ) => {
  const lips = new Lips()
  lips.register('inputs', Helpers.Inputs() )

  const state = {
    activeTab: null
  }

  const handler: Handler<MenuInput, MenuState> = {
    onInput({ options }){
      if( !options ) return

      // First options section is active by default
      this.state.activeTab = Object.keys( options )[0]
    },
    onSwitchTab( key ){ console.log( key ); this.state.activeTab = key },
    onHandleOption( key, option ){
      if( !hook ) return

      option.meta
          ? typeof hook.metacall == 'function' && hook.metacall( key, option )
          : hook.events?.emit('menu.handle', key, option )
    },
    onDismiss(){
      typeof hook.metacall == 'function' && hook.metacall('menu.dismiss')
    }
  }

  const macros = {
    mfset: `
      <mblock>
        <for in=macro.fieldsets>
          <fieldset>
            <if( each.label )>
              <mlabel ${CONTROL_LANG_SELECTOR}>{each.label}</mlabel>
            </if>

            <for in=each.fields>
              <inputs ...each></inputs>
            </for>
          </fieldset>
        
          <if( each.separate )>
            <mblock ${FORM_SEPERATOR_SELECTOR}></mblock>
          </if>
        </for>
      </mblock>
    `,
    mlset: `
       <mblock>
        <for in=macro.listsets>
          <mblock class="listset">
            <if( each.label )>
              <mlabel ${CONTROL_LANG_SELECTOR}>{each.label}</mlabel>
            </if>

            <mul>
              <for in=each.items>
                <mli class="each.disabled ? 'disabled' : false">
                  <micon class=each.icon></micon>
                  <minline ${CONTROL_LANG_SELECTOR}>{each.title}</minline>

                  <if( each.value )>
                    <minline class="value" ${CONTROL_LANG_SELECTOR}>{each.value}</minline>
                  </if>

                  <if( each.sub )>
                    <minline class="sub-arrow"><micon class="bx bx-chevron-right"></micon></minline>
                  </if>
                </mli>
              </for>
            </mul>
          
            <if( each.separate )>
              <mblock ${FORM_SEPERATOR_SELECTOR}></mblock>
            </if>
          </mblock>
        </for>
      </mblock>
    `
  }
  
  const template = `
    <mblock ${CONTROL_MENU_SELECTOR}="input.key"
            style="typeof input.position == 'object' ? { left: input.position.left, top: input.position.top } : '?'">
      <mblock dismiss="menu" backdrop on-click="onDismiss"></mblock>
      <mblock container>
        <mblock class="header">
          <mblock>
            <micon class=input.caption.icon></micon>
            <mlabel ${CONTROL_LANG_SELECTOR}>{input.caption.title}</mlabel>

            <!-- Dismiss control menu -->
            <span dismiss="menu"  title="Dismiss" ${CONTROL_LANG_SELECTOR} on-click="onDismiss">
              <micon class="bx bx-x"></micon>
            </span>
          </mblock>

          <mul options="tabs">
            <for in=input.options>
              <mli tab=key
                    class="state.activeTab === key && 'active'" 
                    title=each.title
                    ${CONTROL_LANG_SELECTOR}
                    on-click="onSwitchTab, key">
                <micon class=each.icon></micon>
              </mli>
            </for>
          </mul>
        </mblock>

        <mblock class="body">
          <for in=input.options>
            <mblock section="attributes" class="state.activeTab === key && 'active'">
              <if( each.fieldsets )>
                <mfset fieldsets=each.fieldsets></mfset>
              </if>

              <if( each.listsets )>
                <mlset listsets=each.listsets></mlset>
              </if>
            </mblock>
          </for>
        </mblock>
      </mblock>
    </mblock>
  `

  return new Component<MenuInput, MenuState>('menu', template, { input, state, handler, macros }, { lips })
}
