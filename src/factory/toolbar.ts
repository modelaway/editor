import type { HandlerHook } from '../types/controls'

import { Handler } from '../lib/lips'
import { Component } from '../lib/lips/lips'
import { CONTROL_LANG_SELECTOR } from '../modules/constants'

export type ToolbarOption = {
  icon: string
  title: string
  event: {
    type: string
    params: true
    shortcut: string
  },
  disabled?: boolean
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
export default ( input: ToolbarInput, hook?: HandlerHook ) => {

  input.tools = {
    cursor: {
      icon: 'bx bx-pointer',
      title: 'Pointer',
      event: {
        type: 'action',
        params: true,
        shortcut: 'command + z'
      }
    },
    picker: {
      icon: 'bx bx-color-fill',
      title: 'Picker',
      event: {
        type: 'action',
        params: true,
        shortcut: 'command + y'
      }
    },
    palette: {
      icon: 'bx bx-palette',
      title: 'Palette',
      event: {
        type: 'action',
        params: true,
        shortcut: 'command + y'
      }
    }
  }

  const handler: Handler<ToolbarInput> = {
    onMount(){
      // Set to default position
      ;(!this.input.position || typeof this.input.position === 'string')
      && setTimeout( () => {
        const
        indication = typeof this.input.position === 'string' ? this.input.position : 'top-left',
        defPostion = hook?.editor?.controls.letPosition( this.getNode(), indication )
        if( !defPostion ) return
        
        this.input.position = defPostion
        this.getNode().css( defPostion )
      }, 5 )
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
    <mblock style=self.getStyle() backdrop>
      <mblock>
        <if( input.tools )>
          <mul options="tools">
            <for in=input.tools>
              <option ...each></option>
            </for>
          </mul>
        </if>


      </mblock>

      <mblock container></mblock>
    </mblock>
  `

  return new Component<ToolbarInput>('toolbar', template, { input, handler, macros, stylesheet } )
}

const stylesheet = `
  position: fixed;
  z-index: 200;
  height: 100%;
  cursor: default;
  user-select: none;
  margin: auto 0;

  > mblock { height: 100%; }
  > mblock > mul {
    height: 100%;
    margin: 0;
    padding: 3px;
    border-radius: var(--me-border-radius);
    background-color: #fff;
    box-shadow: var(--me-box-shadow);
    backdrop-filter: var(--me-backdrop-filter);
    transition: var(--me-active-transition);
  }
  mli {
    padding: 8px;
    margin: 2px;
    display: flex;
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