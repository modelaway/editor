import type { ViewCaption } from '../../types/view'
import type { Handler } from '../../lib/lips'
import { Component } from '../../lib/lips/lips'
import {
  CONTROL_LANG_SELECTOR,
  CONTROL_PANEL_SELECTOR,
  FORM_INPUT_SELECTOR,
  FORM_SEPERATOR_SELECTOR
} from '../constants'

export type PanelInput = {
  key: string
  caption: ViewCaption
  options: PanelSections
  position?: {
    left: string
    top: string
  }
  active?: string 
}
export type PanelState = {
  activeTab: string | null
}

export default ( input: PanelInput, hook: HandlerHook ) => {

  // input.options = {
  //   attributes: {
  //     icon: 'bx bx-edit-alt',
  //     title: 'Properties',
  //     active: true,
  //     fieldsets: [
  //       {
  //         label: 'Link',
  //         fields: [
  //           { type: 'text', name: 'title', label: 'External link or existing page', placeholder: 'http://example.com/to/page' },
  //           { type: 'text', name: 'info', label: 'Title' },
  //           { type: 'checkbox', name: 'target', label: 'Open in new tab' },
  //           { type: 'checkbox', name: 'animation', label: 'Animation', value: true, disabled: true }
  //         ]
  //       }
  //     ],
  //     listsets: [
  //       {
  //         label: 'More options',
  //         items: [
  //           {
  //             icon: 'bx bx-text',
  //             title: 'Text style',
  //             value: '14px bold',
  //             event: {
  //               type: 'show',
  //               attr: 'panel',
  //               params: 'sub',
  //               shortcut: 'alt + b'
  //             },
  //             sub: [],
  //             disabled: false
  //           },
  //           { 
  //             icon: 'bx bx-align-justify',
  //             title: 'Alignment',
  //             event: {
  //               type: 'show',
  //               attr: 'panel',
  //               params: 'sub',
  //               shortcut: 'alt + b'
  //             },
  //             value: 'Center',
  //             disabled: true
  //           }
  //         ]
  //       }
  //     ]
  //   },
  //   styles: {
  //     icon: 'bx bxs-brush',
  //     title: 'Styles',
  //     fieldsets: []
  //   },
  //   actions: {
  //     icon: 'bx bxs-zap',
  //     title: 'Actions',
  //     fieldsets: []
  //   },
  //   info: {
  //     icon: 'bx bx-info-circle',
  //     title: 'Information',
  //     fieldsets: []
  //   },
  //   more: {
  //     icon: 'bx bx-dots-horizontal-rounded',
  //     title: 'More Options',
  //     fieldsets: [],
  //     more: true
  //   }
  // }

  const state = {
    activeTab: null
  }

  const handler: Handler<PanelInput, PanelState> = {
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
          : hook.events?.emit('panel.handle', key, option )
    },
    onDismiss(){
      typeof hook.metacall == 'function' && hook.metacall('panel.dismiss')
    }
  }
  
  const template = `
    <mblock ${CONTROL_PANEL_SELECTOR}="input.key"
            style="typeof input.position == 'object' ? { left: input.position.left, top: input.position.top } : '?'">
      <mblock dismiss="panel" backdrop on-click="onDismiss"></mblock>
      <mblock container>
        <mblock class="header">
          <mblock>
            <micon class=input.caption.icon></micon>
            <mlabel ${CONTROL_LANG_SELECTOR}>{input.caption.title}</mlabel>

            <!-- Dismiss control panel -->
            <span dismiss="panel"  title="Dismiss" ${CONTROL_LANG_SELECTOR} on-click="onDismiss"><micon class="bx bx-x"></micon></span>
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
                <mblock>
                  <for in=each.fieldsets>
                    <fieldset>
                      <if( each.label )>
                        <mlabel ${CONTROL_LANG_SELECTOR}>{each.label}</mlabel>
                      </if>

                      <for in=each.fields>
                        <let id="'input-'+ each.type +'-'+ (each.label || each.name).toLowerCase().replace(/\s+/, '-')"></let>

                        <switch( each.type )>
                          <case is="['text', 'search']">
                            <mblock ${FORM_INPUT_SELECTOR}=each.type>
                              <!--<mlabel for=id>{each.label}</mlabel>-->
                              <input ${CONTROL_LANG_SELECTOR}
                                      id=id
                                      type=each.type
                                      name=each.name
                                      title=each.label
                                      value=each.value
                                      disabled=each.disabled
                                      pattern=each.pattern
                                      autofocus=each.autofocus
                                      placeholder="each.placeholder || each.label">
                            </mblock>
                          </case>

                          <case is="checkbox">
                            <mblock ${FORM_INPUT_SELECTOR}=each.type>
                              <input id=id
                                      type=each.type
                                      name=each.name
                                      disabled=each.disabled
                                      checked=each.checked>
                              <label for=id ${CONTROL_LANG_SELECTOR}>{each.label}</label>
                            </mblock>
                          </case>
                        </switch>
                      </for>
                    </fieldset>
                  
                    <if( each.separate )>
                      <mblock ${FORM_SEPERATOR_SELECTOR}></mblock>
                    </if>
                  </for>
                </mblock>
              </if>

              <if( each.listsets )>
                <mblock>
                  <for in=each.listsets>
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
              </if>
            </mblock>
          </for>
        </mblock>
      </mblock>
    </mblock>
  `

  return new Component<PanelInput, PanelState>('panel', template, { input, state, handler })
}
