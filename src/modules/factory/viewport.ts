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

export type ViewportInput = {

}
export default ( input: ViewportInput ) => {
  const template = `<viewport>
    <mcanvas></mcanvas>
    
    ${createGlobal()}
  </viewport>`

  return new Component<ViewportInput>( 'viewport', template, { input } )
}