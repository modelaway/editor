import type { MediaScreen } from '../../types/frame'
import type { Handler, Metavars } from '../../lips'

import { MEDIA_SCREENS } from '../../modules/constants'

export type MSInput = {}

type Setting = {
  type: 'checkbox'
  name: 'rounded' | 'transparent'
  disabled: boolean
  checked: boolean
  label: string
}
type State = {
  selected: MediaScreen & { key: string } | null
  rounded: boolean
  transparent: boolean
}
type Static = {
  screens: Record<string, MediaScreen>
  settings: Setting[]
}

/**
 * Global plugins template
 */
const MediaScreens = () => {

  const _static: Static = {
    screens: MEDIA_SCREENS,
    settings: [
      {
        type: 'checkbox',
        name: 'rounded',
        disabled: false,
        checked: false,
        label: 'Rounded frame edges'
      },
      {
        type: 'checkbox',
        name: 'transparent',
        disabled: false,
        checked: true,
        label: 'Use transparent background'
      }
    ]
  }

  const state: State = {
    selected: null,
    rounded: false,
    transparent: true
  }

  const handler: Handler<Metavars<MSInput, State>> = {
    onScreenSelect( key: string, screen: MediaScreen ){
      this.state.selected = { ...screen, key }
    },
    onSettingsChange( name: string, value: boolean ){
      this.state[ name as 'rounded' | 'transparent' ] = value
    },
    onDone(){
      this.emit('change', {
        ...this.state.selected,
        rounded: this.state.rounded,
        transparent: this.state.transparent
      })
    }
  }

  const template = `
    <mblock>
      <mul>
        <for [key, each] in=static.screens>
          <mli>
            <mblock class="state.selected && state.selected.key == key && 'selected'"
                    on-click( onScreenSelect, key, each )>
              <switch( each.device )>
                <case is="mobile"><micon class="bx bx-mobile"></micon></case>
                <case is="tablet"><micon class="bx bx-tab"></micon></case>
                <case is="desktop"><micon class="bx bx-laptop"></micon></case>
                <case is="tv"><micon class="bx bx-tv"></micon></case>
              </switch>

              <mblock>{key}</mblock>
              <minline class="size">{parseInt( each.width )} x {parseInt( each.height )}</minline>
            </mblock>
          </mli>
        </for>
      </mul>

      <mblock settings>
        <for [setting] in=static.settings>
          <forminput ...setting on-change( onSettingsChange, setting.name )/>
        </for>
      </mblock>

      <mblock actions>
        <button disabled=!state.selected
                on-click( state.selected && 'onDone' )>Create</button>
      </mblock>
    </mblock>
  `

  const stylesheet = `
    mul {
      width: 100%;
      display: flex;
      flex-wrap: wrap;

      mli {
        position: relative;
        display: block;
        width: 100%;
        flex: 0 0 33.33333%;
        max-width: 33.33333%;
        
        > mblock {
          text-align: center;
          border-radius: var(--me-border-radius-inside);
          border: 1px solid var(--me-border-color);
          padding: 1rem 0;
          margin: .2rem;

          micon {
            display: inline-block;
            margin-bottom: .7rem;
            font-size: 3rem;
            color: var(--me-primary-color-transparent);
          }
          minline { 
            font-size: var(--me-small-font-size);
            color: gray;
          }

          &:hover,
          &.selected {
            background-color: var(--me-primary-color-fade);
          }
          &:active {
            background-color: var(--me-primary-color-transparent);
          }
        }
      }
    }

    [settings] {
      padding: 1.5rem 1rem 0 1rem;
    }

    [actions] {
      text-align: right;
      padding: 0 .5rem .5rem 1rem;

      button {
        padding: 0.7rem 1.5rem;
        background-color: var(--me-primary-color);
        color: var(--me-inverse-color);
        border-radius: var(--me-border-radius-inside);
        border: none;
        cursor: pointer;

        &:disabled {
          background-color: var(--me-primary-color-fade);
          color: var(--me-primary-color-transparent);
          cursor: not-allowed;
        }
      }
    }
  `

  return { default: template, state, _static, handler, stylesheet }
}

export default MediaScreens