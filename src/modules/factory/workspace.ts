import { Component } from '../../component/lips'

export const createGlobal = () => {
  const globalBlock = `<mblock container>
  </mblock>`
  
  /**
   * 
   */
  return `<mglobal>
    <minline show="global">
      <micon class="bx bx-dots-vertical-rounded"></micon>
    </minline>

    <mblock dismiss="global" backdrop></mblock>
    ${globalBlock}
  </mglobal>`
}

export type WorkspaceInput = {

}
export default ( input: WorkspaceInput ) => {
  const template = `<modela>
    <mcanvas></mcanvas>
    <snapguide horizontal></snapguide>
    <snapguide vertical></snapguide>

    ${createGlobal()}
  </modela>`

  return new Component<WorkspaceInput>( 'workspace', template, { input } )
}