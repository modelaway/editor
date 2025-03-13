import type { Handler, Metavars } from '../../lips'

export type XPInput = {}

const Explorer = () => {

  const handler: Handler<Metavars<XPInput>> = {
    onInput(){
      console.log('--- input:', this.input )
    }
  }

  const template = `
    <mblock>Explore</mblock>
  `

  const stylesheet = ``

  return { default: template, handler, stylesheet }
}

export default Explorer