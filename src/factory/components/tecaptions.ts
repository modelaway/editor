
import type { Handler, Metavars } from '../../lips'

type State = {
  selected: string | null
  instructions?: string
  items: Record<string, ToolbarOption>
}

/**
 * Tools & Element (te) captions template
 */
const TECaptions = () => {
  const state: State = {
    items: {},
    selected: null,
    instructions: undefined
  }
  
  const handler: Handler<Metavars<ToolbarOption, State>> = {
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
      console.log('click---', key )
      this.state.selected = key
      this.state.instructions = this.state.items[ key ].instructions

      // this.emit('select', this.state.selected )
    }
  }

  const template = `
    <mblock>
      <mul>
        <for [key, item] in=state.items>
          <mli id="track" class="state.selected == key && 'selected'"
                on-click( onHandleSelect, key )>
            <micon class=item.icon></micon>
            <mlabel>{item.title}</mlabel>
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
  `

  const stylesheet = `
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

        minline {
          color: gray;
          font-size: var(--me-small-font-size);
        }
        p { margin: .8rem 0 0 0; }
      }
    }
  `
  
  return { state, handler, default: template, stylesheet }
}

export default TECaptions