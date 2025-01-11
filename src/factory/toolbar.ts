import type { HandlerHook } from '../types/controls'

import $ from 'cash-dom'
import { Handler } from '../lib/lips'
import Lips, { Component } from '../lib/lips/lips'
import { CONTROL_LANG_SELECTOR } from '../modules/constants'

export type ToolbarGlobalOption = {
  icon: string
  title: string
  parent?: string
  shortcut?: string
  disabled?: boolean
}
export type ToolbarSingleOption = {
  icon: string
  title: string
  tool?: string
  parent?: string
  shortcut?: string
  active?: boolean
  hidden?: boolean
  selected?: string
  disabled?: boolean
  instructions?: string
}
export type ToolbarVariantsOption = {
  title: string
  variants: Record<string, ToolbarSingleOption>
  parent?: string
  hidden?: boolean
  disabled?: boolean
  selected?: string
}
export type ToolbarOption = ToolbarSingleOption | ToolbarVariantsOption

export type ToolbarInput = {
  key: string
  tools?: Record<string, ToolbarOption>
  views?: Record<string, ToolbarOption>
  globals?: Record<string, ToolbarGlobalOption>
  settings: {
    visible?: boolean
  }
  position?: string | Position
}

/**
 * Registered dependency components
 */
function dependencies(){

  type CaptionsState = {
    selected: string | null
    instructions?: string
    items: Record<string, ToolbarSingleOption>
  }
  interface CaptionsTemplate {
    state: CaptionsState
    handler: Handler<ToolbarOption, CaptionsState>
    default: string
    stylesheet: string
  }
  const Captions: CaptionsTemplate = {
    state: {
      items: {},
      selected: null,
      instructions: undefined
    },
    handler: {
      onInput(){
        const option = this.input as any
        if( option.variants ){
          this.state.items = option.variants
          this.state.selected = option.selected
        }
        else {
          this.state.items = { '*': option }
          this.state.selected = '*'
        }

        this.state.instructions = this.state.selected ? this.state.items[ this.state.selected ].instructions : undefined
      },
      onHandleSelect( key: string ){
        this.state.selected = key
        this.state.instructions = this.state.items[ key ].instructions

        this.emit('select', this.state.selected )
      }
    },

    default: `
      <mblock>
        <mul>
          <for in=state.items>
            <mli class="state.selected == key && 'selected'"
                  on-click( onHandleSelect, key )>
              <micon class=each.icon></micon>
              <mlabel>{each.title}</mlabel>
            </mli>
          </for>
        </mul>

        <if( state.instructions )>
          <mblock instructions>
            <mblock>
              <minline>Instructions</minline>

              <p>{state.instructions}</p>
            </mblock>
          </mblock>
        </if>
      </mblock>
    `,

    stylesheet: `
      mul {
        padding: 1.2rem;

        mli {
          padding: 5px 0;
          margin: 3px;
          display: flex;
          align-items: center;
          font-size: var(--me-font-size);
          border-radius: var(--me-border-radius-inside);

          micon {
            padding: 0 8px;
            font-size: var(--me-icon-size-2);
            color: gray;
          }

          &:hover,
          &.selected {
            background-color: var(--me-primary-color-transparent);
          }
        }
      }

      [instructions] {
        position: absolute;
        bottom: 0;

        mblock {
          margin: .8rem;
          padding: 1.2rem;
          line-height: 1.2;
          border: 1px solid var(--me-border-color);
          border-radius: var(--me-border-radius);

          minline { color: gray; }
          p { margin: .8rem 0 0 0; }
        }
      }
    `
  }

  const Globals = {
    default: `
      <mblock>Global content</mblock>
    `
  }

  const lips = new Lips()

  lips.register('captions', Captions )
  lips.register('globals', Globals )

  return lips
}

type ContentType = 'tool' | 'view' | 'global'
type Content = {
  type: ContentType
  key?: string
  body?: ToolbarOption
}
export type ToolbarState = {
  expanded: boolean
  content: Content | null
}

export default ( input: ToolbarInput, hook?: HandlerHook ) => {
  input.tools = {
    POINTER: {
      icon: 'bx bx-pointer',
      title: 'Pointer',
      active: true
    },
    PICKER: {
      icon: 'bx bx-color-fill',
      title: 'Picker'
    },
    PENCIL: {
      title: 'Pencil',
      variants: {
        '*': {
          icon: 'bx bx-pencil',
          title: 'Pencil',
          parent: 'PENCIL'
        },
        'pen': {
          icon: 'bx bx-pen',
          title: 'Pen',
          parent: 'PENCIL'
        }
      }
    },
    FLOW: {
      icon: 'bx bx-git-merge',
      title: 'Flow',
      disabled: true
    }
  }
  input.views = {
    text: {
      title: 'Text',
      selected: '*',
      variants: {
        '*': {
          icon: 'bx bx-text',
          title: 'Inline text',
          shortcut: 'command + y',
          tool: 'TEXT',
          parent: 'text'
        },
        'circle': {
          icon: 'bx bx-paragraph',
          title: 'Paragraph text',
          shortcut: 'command + y',
          tool: 'TEXT',
          parent: 'text'
        },
        'blockquote': {
          icon: 'bx bxs-quote-alt-left',
          title: 'Blockquote',
          shortcut: 'command + y',
          tool: 'TEXT',
          parent: 'text'
        }
      }
    },
    shape: {
      title: 'Shape',
      selected: '*',
      variants: {
        '*': {
          icon: 'bx bx-shape-square',
          title: 'Rectangle Shape',
          shortcut: 'command + y',
          tool: 'POINTER',
          parent: 'shape',
          instructions: 'Create a rectangle-like or square-like shape, resizable and adjustable at any position'
        },
        'circle': {
          icon: 'bx bx-shape-circle',
          title: 'Circle shape',
          shortcut: 'command + y',
          tool: 'POINTER',
          parent: 'shape',
          instructions: 'Create a circle shape, resizable and adjustable at any position'
        },
        'dynamic': {
          icon: 'bx bx-shape-polygon',
          title: 'Dynamic shape',
          shortcut: 'command + y',
          tool: 'POINTER',
          parent: 'shape',
          instructions: 'Create a free form shape using svg, with curves, resizable and adjustable at any position'
        }
      }
    },
    image: {
      title: 'Image',
      variants: {
        '*': {
          icon: 'bx bx-image-alt',
          title: 'Image',
          shortcut: 'command + y',
          tool: 'POINTER',
          parent: 'image'
        },
        'icon': {
          icon: 'bx bx-home-smile',
          title: 'Font icons',
          shortcut: 'command + y',
          tool: 'POINTER',
          parent: 'image'
        }
      }
    },
    video: {
      icon: 'bx bx-movie-play',
      title: 'Video',
      shortcut: 'command + y',
      tool: 'POINTER'
    },
    audio: {
      icon: 'bx bx-equalizer',
      title: 'Audio',
      tool: 'POINTER'
    }
  }
  input.globals = {
    styles: {
      icon: 'bx bx-slider-alt',
      title: 'Styles'
    },
    assets: {
      icon: 'bx bx-landscape',
      title: 'Assets'
    },
    // connect: {
    //   icon: 'bx bx-podcast',
    //   title: 'Connect',
    //   event: {
    //     type: 'action',
    //     params: true,
    //     shortcut: 'command + z'
    //   }
    // },
    plugins: {
      icon: 'bx bx-customize',
      title: 'Plugins'
    },
    settings: {
      icon: 'bx bx-cog',
      title: 'Settings'
    }
  }

  const state: ToolbarState = {
    expanded: false,
    content: null
  }

  const handler: Handler<ToolbarInput, ToolbarState> = {
    onMount(){
      // Set to default position
      ;(!this.input.position || typeof this.input.position === 'string')
      && setTimeout( () => {
        const
        indication = typeof this.input.position === 'string' ? this.input.position : 'left-center',
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
    },
    viewOptionCaptions( type, key, option ){
      let body = option
      if( option.parent )
        switch( type ){
          case 'tool': if( this.input.tools ) body = this.input.tools[ option.parent ]; break
          case 'view': if( this.input.views ) body = this.input.views[ option.parent ]; break
        }

      if( !body ) return

      this.state.expanded = true
      this.state.content = { type, key, body }
    },

    onHandleOption( type: ContentType, key: string, option: ToolbarOption | ToolbarGlobalOption ){
      if( option.disabled ) return

      console.log(`Option [${key}] -- `, option )

      // Show option details when block is already expanded
      this.state.expanded && this.viewOptionCaptions( type, key, option )
    },
    onShowOptionCaptions( type: ContentType, key: string, option: ToolbarOption | ToolbarGlobalOption, e: Event ){
      e.preventDefault()
      if( option.disabled ) return

      console.log(`Option [${key}] -- `, option )
      this.viewOptionCaptions( type, key, option )

      /**
       * Auto-close expanded container on external click
       * 
       * TODO: Scope the click to anywhere but the toolbar block
       */
      hook?.editor?.$viewport?.on('click.toolbar-expand', () => {
        this.state.expanded = false
        this.state.content = null

        hook?.editor?.$viewport?.off('.toolbar-expand')
      })
    },

    onHandleSelect( type: string, key: string, selected: string ){
      // console.log('selected --', key, selected )
      switch( type ){
        case 'tool': if( this.input.tools ) this.input.tools[ key ].selected = selected; break
        case 'view': if( this.input.views ) this.input.views[ key ].selected = selected; break
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
          <if( input.tools )>
            <mul options="tools">
              <for in=input.tools>
                <if( each.variants )>
                  <const selected="each.variants[ each.selected || '*' ]"></const>
                  <option type="tool" ...selected></option>
                </if>
                <else>
                  <option type="tool" ...each></option>
                </else>
              </for>
            </mul>
          </if>

          <if( input.views )>
            <div divider></div>
            <mul options="views">
              <for in=input.views>
                <if( each.variants )>
                  <const selected="each.variants[ each.selected || '*' ]"></const>
                  <option type="view" ...selected></option>
                </if>
                <else>
                  <option type="view" ...each></option>
                </else>
              </for>
            </mul>
          </if>

          <if( input.globals )>
            <mul options="globals">
              <for in=input.globals>
                <option type="global" ...each></option>
              </for>
            </mul>
          </if>
        </mblock>

        <mblock container class="state.expanded && 'expanded'">
          <if( state.content )>
            <switch( state.content.type )>
              <case is="['tool', 'view']">
                <captions ...state.content.body
                          on-select( onHandleSelect, state.content.type, state.content.key )></captions>
              </case>
              <case is="global">
                <globalcontent ...state.content.body></globalcontent>
              </case>
            </switch>
          </if>
        </mblock>
      </mblock>
    </mblock>
  `

  return new Component<ToolbarInput, ToolbarState>('toolbar', template, { input, state, handler, macros, stylesheet }, { lips: dependencies() })
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

    [container] {
      position: absolute;
      top: 0;
      left: 100%;
      margin: 0 8px;
      width: 18rem;
      height: 100%;
      transform: translateX(-150%);
      transition: var(--me-slide-transition);

      &.expanded {
        transform: translateX(0%);
      }
    }
  }
`