import { Handler } from '../lib/lips'
import { Component } from '../lib/lips/lips'

export type HouseInput = {
  key: string
  settings: {
    visible?: boolean
  }
}
export default ( input: HouseInput, hook?: HandlerHook ) => {

  const handler: Handler<HouseInput> = {
    getStyle(){
      const style: Record<string, string> = {
        display: this.input.settings?.visible ? 'block' : 'none'
      }

      return style
    }
  }

  const template = `
    <mglobal style=self.getStyle()>
      <minline show="global">
        <micon class="bx bx-dots-vertical-rounded"></micon>
      </minline>

      <mblock dismiss="global" backdrop></mblock>
      <mblock container></mblock>
    </mglobal>
  `

  return new Component<HouseInput>('house', template, { input, handler, stylesheet } )
}

const stylesheet = `
  [show],
  [backdrop],
  [container] {
    position: fixed;
    z-index: 201;
  }
  
  [show] {
    left: 0;
    top: calc(50% - 40px);
    margin: 2px;
    padding: 20px 22px 20px 2px;
    border-radius: 0 100px 100px 0;
    transition: ease-in-out var(--me-active-transition);
  }
  [show]:hover { 
    background-color: var(--me-primary-color-fade);
  }
  [show] micon {
    padding: 5px 0;
    cursor: pointer;
    color: var(--me-trigger-text-color);
    border-radius: var(--me-border-radius-inside);
    background-color: var(--me-primary-color-transparent);
    backdrop-filter: var(--me-backdrop-filter);
    font-size: var(--me-icon-size)!important;
  }
  [backdrop] {
    display: none;
    width: 100vw;
    height: 100vh;
    left: 0;
    top: 0;
  }
  
  [container] {
    left: -100%;
    min-width: 25vw;
    margin: 15px;
    height: calc(100vh - 30px);
    overflow: hidden;
    border-radius: 20px;
    transition: var(--me-slide-transition);
    backdrop-filter: var(--me-backdrop-filter);
    background-color: rgba(225, 225, 225, .6);
    box-shadow: var(--me-box-shadow);
  }
  &.active > [backdrop] { display: block; }
  &:hover > [container],
  &.active > [container] { left: 0; }
`