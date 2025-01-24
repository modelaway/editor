import type Lips from '../lips/lips'
import type { Handler } from '../lips'
import type { ViewCaption } from '../types/view'
import type { HandlerHook } from '../types/controls'

import * as Components from './components'
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

export default ( lips: Lips, input: MenuInput, hook: HandlerHook ) => {
  lips.register('inputs', Components.inputs.default() )

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

  return lips.render<MenuInput, MenuState>('menu', { default: template, state, handler, macros, stylesheet }, input )
}

const stylesheet = `
  position: absolute;
  z-index: 200;
  width: 0px;
  user-select: none;
  cursor: default;
  /* pointer-events: none; */

  > [container] {
    position: relative;
    width: 18rem;
    min-height: 10rem;
    max-height: 30rem;
    overflow: auto;
    background-color: #fff;
    border-radius: var(--me-border-radius);
    backdrop-filter: var(--me-backdrop-filter);
    box-shadow: var(--me-box-shadow);
    transition: var(--me-active-transition);

    > .header {
      position: sticky;
      z-index: 50;
      top: 0;
      background-color: #fff;

      > * {
        display: flex;
        padding: 0.55rem 0.85em;
        align-items: center;
        justify-content: start;
      }
      > mblock {
        cursor: default;
        font-size: var(--me-font-size);
        color: var(--me-primary-color-transparent);

        micon {
          font-size: var(--me-icon-size)!important;
        }
        mlabel {
          padding-left: 10px;
        }
        [dismiss] {
          position: absolute;
          right: 0;
          /* margin: 0.4rem; */
        }
      }
      [options="tabs"] {
        list-style: none;
        margin: 0;
        border-bottom: 1px solid var(--me-primary-color-fade);
      }
      [dismiss],
      [options="tabs"] > mli {
        padding: 6px;
        margin: 4px;
        display: inline-flex;
        align-items: center;
        cursor: pointer;
        color: var(--me-secondary-color);
        border-radius: var(--me-border-radius-inside);
        transition: var(--me-active-transition);
      }
      [dismiss],
      [options="tabs"] > mli micon {
        font-size: var(--me-icon-size-2)!important;
      }
      [dismiss],
      [options="tabs"] > mli.active,
      [options="tabs"] > mli:not(.label,.disabled):hover {
        background-color: var(--me-primary-color-fade);
      }
    }
    
    .body {
      min-height: 8rem;

      mblock {
        display: none;
        &.active { display: block; }
      }
    }
  }
  > [backdrop] {
    position: fixed;
    width: 100vw;
    height: 100vh;
    left: 0;top: 0;
  }

  fieldset {
    padding: 0.8rem 0.8rem 0 0.8rem;
    border: none;
  }
  fieldset > mlabel,
  .listset > mlabel {
    display: block;
    font-weight: bold;
    margin-bottom: 0.8rem;
  }

  .listset {
    > mlabel {
      margin: 0.8rem 0.9rem;
    }
    mul {
      list-style: none;
      padding: 0;
      margin: 0;

      mli {
        padding: .45rem 1rem;
        display: flex;
        align-items: center;
        font-size: var(--me-font-size);

        &:not(.disabled):hover {
          background-color: var(--me-primary-color-fade);
          cursor: pointer;
        }
        
        micon {
          font-size: var(--me-icon-size);

          &micon:first-child {
            background-color: var(--me-primary-color-fade);
            padding: 4px;
            border-radius: var(--me-border-radius-inside);
          }
        }
        minline:not(.value) {
          padding: 0 .8rem;
        }
        .sub-arrow {
          position: absolute;
          right: 0;
        }
        &.disabled,
        minline.value,
        .sub-arrow {
          color: var(--me-primary-color-transparent);
        }
      }
    }
  }
`