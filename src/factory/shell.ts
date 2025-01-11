import { Component } from '../lib/lips/lips'

export type ShellInput = {

}
export default ( input: ShellInput ) => {
  const template = `
    <modela>
      <viewport>
        <mcanvas></mcanvas>
      </viewport>
    </modela>
  `

  return new Component<ShellInput>( 'shell', template, { input } )
}