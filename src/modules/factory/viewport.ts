import { Component } from '../../lib/lips/lips'

export type ViewportInput = {

}
export default ( input: ViewportInput ) => {
  const template = `
    <viewport>
      <mcanvas></mcanvas>
    </viewport>
  `

  return new Component<ViewportInput>( 'viewport', template, { input } )
}