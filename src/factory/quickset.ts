import type Lips from '../lips/lips'
import type { Handler } from '../lips'
import type { HandlerHook } from '../types/controls'

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
    onAttach(){
      // Set to default position
      if( this.input.position && typeof this.input.position !== 'string' ) return
    
      const
      indication = typeof this.input.position === 'string' ? this.input.position : 'bottom-center',
      defPostion = hook?.editor?.controls.letPosition( this.getNode(), indication )
      if( !defPostion ) return
      
      this.input.position = defPostion
      this.getNode().css( defPostion )
    },

    onShowExtraOptions( status: boolean ){
      this.state.showExtra = status 
    },
    onShowSubOptions( key: string, option: QuicksetOption ){
      if( option.disabled ) return
      this.state.subOption = key ? { ...option, key } : null
    },
    onShowSuggestions( key: string, option: QuicksetOption, arg?: any ){
      const position = 'top'

      /**
       * TODO: Determine the adequate position base on the 
       * quickset location on the screen
       */


      switch( option.type ){
        case 'search': option.value = this.input.options[ key ].value = arg.target.value; break
        case 'suggestion': option.value = arg; break
      }

      console.log( this.input.options )
      
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

      if( option.type && ['search', 'suggestion'].includes( option.type ) ){
        this.onShowSuggestions( key, option, arg )
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

  const macros = `
    <macro [key, type, title, label, active, icon, disabled, value, __] name="option">
      <switch( type )>
        <case is="['input', 'search']">
          <mli active=active
                class="'form-input'+( icon && ' addon' )"
                ${CONTROL_LANG_SELECTOR}>
            <if( icon )><micon class=icon></micon></if>

            <input type="text"
                    disabled=disabled
                    placeholder="label || title"
                    value=value
                    on-change( onSmartHandle, key, __ )
                    on-input( type === 'search' ? 'onSmartHandle' : null, key, __ )>
          </mli>
        </case>

        <default>
          <mli active=active
                class="label ? 'label' : false"
                title=title
                disabled=disabled
                ${CONTROL_LANG_SELECTOR}
                on-click( onSmartHandle, key, __ )>
            <micon class=icon></micon>

            <if( label )>
              <mlabel ${CONTROL_LANG_SELECTOR} text=label></mlabel>
            </if>
          </mli>
        </default>
      </switch>
    </macro>
  `

  const template = `
    <mblock ${CONTROL_QUICKSET_SELECTOR}=input.key
            class="input.settings.editing ? 'editing' : '?'"
            style=self.getStyle()>
      <mblock container>
        <mul>
          <if( !state.subOption )>
            <mblock options="main">
              <for [key, each] in=state.default>
                <option key=key ...each/>
              </for>

              <if( state.super )>
                <mblock options="super">
                  <for [key, each] in=state.super>
                    <option key=key ...each/>
                  </for>
                </mblock>
              </if>

              <if( state.extra && !state.showExtra )>
                <mli title="Extra options" ${CONTROL_LANG_SELECTOR} on-click( onShowExtraOptions, true )><micon class="bx bx-dots-horizontal-rounded"></micon></mli>
              </if>
            </mblock>

            <if( state.showExtra )>
              <mblock options="extra">
                <for [key, each] in=state.extra>
                  <option key=key ...each/>
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
              
              <for [key, each] in=state.subOption.sub>
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
              <for [key, each] in=state.detached>
                <option key=key ...each/>
              </for>
            </mblock>
          </mul>
        </if>
      </mblock>

      <if( state.suggestions )>
        <const ...state.suggestions/>

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