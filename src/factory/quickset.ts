import type Lips from '../lib/lips/lips'
import type { Handler } from '../lib/lips'
import type { HandlerHook } from '../types/controls'

import MediaScreens from './components/mediascreens'
import {
  CONTROL_LANG_SELECTOR,
  CONTROL_QUICKSET_SELECTOR
} from '../modules/constants'

type Suggestions = {
  key: string
  option: QuicksetOption
  position?: 'top' | 'bottom',
}
export type QuicksetInput = {
  key: string
  options: Record<string, QuicksetOption>
  settings?: QuicksetSettings
  position?: string | Position
}
export type QuicksetState = {
  default: Record<string, QuicksetOption> | null
  extra: Record<string, QuicksetOption> | null
  super: Record<string, QuicksetOption> | null
  subOption: QuicksetOption | null
  detached: Record<string, QuicksetOption> | null
  showExtra: boolean
  suggestions: Suggestions | null
}

export default ( lips: Lips, input: QuicksetInput, hook?: HandlerHook ) => {

  // TODO: Rely on the all preregistered helpers instead
  lips.register('mediascreens', MediaScreens() )

  const state: QuicksetState = {
    default: null,
    extra: null,
    super: null,
    subOption: null,
    detached: null,

    showExtra: false,
    suggestions: null
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

    onShowExtraOptions( status: boolean ){
      this.state.showExtra = status 
    },
    onShowSubOptions( key: string, option: QuicksetOption ){
      if( option.disabled ) return
      this.state.subOption = key ? { ...option, key } : null
    },
    onShowSuggestions( key: string, option: QuicksetOption ){
      const position = 'top'

      /**
       * TODO: Determine the adequate position base on the 
       * quickset location on the screen
       */
      
      this.state.suggestions = { position, key, option }

      /**
       * Auto-close suggestions on external click
       */
      hook?.editor?.$viewport?.on('click.quickset-suggestions', () => {
        this.state.suggestions = null

        hook?.editor?.$viewport?.off('.quickset-suggestions')
      })
    },
    onHandleOption( key: string, option: QuicksetOption, arg?: any ){
      if( option.disabled || !hook ) return

      // Close opened suggestions
      this.state.suggestions = null

      switch( option.type ){
        case 'input': option.value = arg.target.value; break
        case 'suggestion': option.value = arg; break
      }

      option.meta
          ? typeof hook.metacall == 'function' && hook.metacall( key, option )
          : hook.events?.emit('quickset.handle', key, option )
    },
    onSmartHandle( key: string, option: QuicksetOption, arg?: any ){
      // Close opened suggestions
      this.state.suggestions = null
      
      if( option.sub ){
        this.onShowSubOptions( key, option )
        return
      }

      if( option.type === 'suggestion' ){
        this.onShowSuggestions( key, option )
        return
      }
      
      this.onHandleOption( key, option, arg )
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
      <switch( macro.type )>
        <case is="'input'">
          <mli active=macro.active
                class="'form-input'+( macro.icon && ' addon' )"
                ${CONTROL_LANG_SELECTOR}>
            <if( macro.icon )><micon class=macro.icon></micon></if>

            <input type="text"
                    disabled=macro.disabled
                    placeholder="macro.label || macro.title"
                    value=macro.value
                    on-change( onSmartHandle, key, macro )>
          </mli>
        </case>

        <default>
          <mli active=macro.active
                class="macro.label ? 'label' : false"
                title=macro.title
                disabled=macro.disabled
                ${CONTROL_LANG_SELECTOR}
                on-click( onSmartHandle, key, macro )>
            <micon class=macro.icon></micon>

            <if( macro.label )>
              <mlabel ${CONTROL_LANG_SELECTOR} text=macro.label></mlabel>
            </if>
          </mli>
        </default>
      </switch>
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
                    on-click( onSmartHandle, state.subOption.key +'.sub.'+ key, each )>
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

      <if( state.suggestions )>
        <const ...state.suggestions></const>

        <mblock suggestions style="position == 'top' ? 'bottom: 4.2rem' : 'margin-top: .5rem'">
          <mblock>
            <if( option.helper )>
              <{option.helper} ...option on-change( onHandleOption, key, option )/>
            </if>
          </mblock>
        </mblock>
      </if>
    </mblock>
  `

  return lips.render<QuicksetInput, QuicksetState>('quickset', { default: template, state, handler, macros, stylesheet }, input )
}

const stylesheet = `
  position: absolute;
  z-index: 200;
  width: auto;
  cursor: default;
  user-select: none;
  font-size: var(--me-font-size-2);
  
  > mblock {  }
  > mblock > mul:not(:first-child) {
    margin: 0 6px;
  }

  [suggestions],
  [container] > mul {
    list-style: none;
    margin: 0;
    border-radius: var(--me-border-radius);
    background-color: var(--me-inverse-color);
    backdrop-filter: var(--me-backdrop-filter);
    transition: var(--me-active-transition);
  }
  
  [container],
  [container] > mul,
  [container] > mul > mblock {
    display: flex;
    align-items: center;
    justify-content: space-around;
  }

  [container] {
    padding: 6px 0;

    > mul { 
      padding: 3px;
      box-shadow: var(--me-box-shadow);
    }

    mli {
      position: relative;
      margin: 2px;
      display: inline-flex;
      align-items: center;
      /* color: var(--me-trigger-text-color); */
      border-radius: var(--me-border-radius-inside);
      transition: var(--me-active-transition);

      :not(.form-input){
        padding: 8px;
      }

      &.form-input {
        display: flex;
        font-size: var(--me-font-size);

        &.addon > input {
          padding-left: 2.3rem!important;
        }
        micon {
          position: absolute;
        }
        input {
          display: block;
          padding: .6rem .9rem;
          width: 100%;
          font-size: var(--me-font-size);
          border: 1px solid var(--me-border-color);
          border-radius: var(--me-border-radius-inside);
          background-clip: padding-box;
          background-color: var(--me-input-color);
          backdrop-filter: var(--me-backdrop-filter);
          transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;

          &:focus {
            outline: none;
          }
        }
      }

      &[disabled] {
        color: var(--me-disabled-text-color);
        cursor: not-allowed;
      }
      &[active] {
        background-color: var(--me-primary-color);
        color: #fff;
      }
      &:not(.label) {
        cursor: pointer;
      }
      &:not(.label,.form-input,[disabled],[active]):hover {
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
  [suggestions] {
    position: absolute;
    width: 100%;
    box-shadow: var(--me-box-shadow-inverse);
    transition: var(--me-active-transition);

    > mblock { 
      padding: 6px;
    }
  }
  [options="super"] {
    border-left: 1px solid var(--me-border-color);
  }
`