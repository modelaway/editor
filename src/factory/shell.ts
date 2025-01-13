import { Component } from '../lib/lips/lips'

export type ShellInput = {

}
export default ( input: ShellInput ) => {
  const template = `
    <mshell>
      <viewport>
        <mcanvas></mcanvas>
      </viewport>
    </mshell>
  `

  return new Component<ShellInput>( 'shell', template, { input } )
}