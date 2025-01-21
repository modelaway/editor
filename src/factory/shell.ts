import type Lips from '../lib/lips/lips'

export type ShellInput = {

}
export default ( lips: Lips, input: ShellInput ) => {
  const template = `
    <mshell>
      <viewport>
        <mcanvas></mcanvas>
      </viewport>
    </mshell>
  `

  return lips.render<ShellInput>( 'shell', { default: template }, input )
}