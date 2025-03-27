import Lips, { Metavars } from '@lipsjs/lips'

export type ShellInput = {

}
export default ( lips: Lips, input: ShellInput ) => {
  const template = `
    <mshell>
      <viewport>
        <mcanvas/>
      </viewport>
    </mshell>
  `

  return lips.render<Metavars<ShellInput>>( 'shell', { default: template }, input )
}