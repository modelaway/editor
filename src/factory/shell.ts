import type Lips from '../lips/lips'
import type { Metavars  } from '../lips'

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