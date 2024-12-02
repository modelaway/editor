import type { ViewCaption } from '../../types/view'
import { Component } from '../../component/lips'
import {
  CONTROL_LANG_SELECTOR,
  CONTROL_PANEL_SELECTOR
} from '../constants'
import { createInput, createFormSeperator, createListItem } from '.'

export type PanelInput = {
  key: string
  caption: ViewCaption
  options: PanelSections
  position?: {
    left: string
    top: string
  }
  active?: string 
}
export default ( input: PanelInput ) => {
  const factory = ({ key, caption, options, position, active }: PanelInput ) => {
    if( typeof options !== 'object' )
      throw new Error('Invalid createPanel options')

    let
    sectionTabs = '',
    sectionBodies = ''

    const composeSection = ( name: string, { icon, title, fieldsets, listsets }: PanelSection, isActive: boolean ) => {
      /**
       * List of tabs
       */
      sectionTabs += `<mli tab="${name}" ${isActive ? 'class="active"' : ''} ${title ? `title="${title}" ${CONTROL_LANG_SELECTOR}` : ''}><micon class="${icon}"></micon></mli>`

      let fieldsetHTML = ''
      fieldsets?.map( ({ label, fields, seperate }) => {
        // Do not render empty fieldset
        if( !Array.isArray( fields ) || !fields.length )
          return
        
        fieldsetHTML += `<fieldset>
          ${label ? `<mlabel ${CONTROL_LANG_SELECTOR}>${label}</mlabel>` : ''}
          ${fields.map( each => (createInput( each )) ).join('')}
        </fieldset>`

        // Add seperator to this block
        if( seperate )
          fieldsetHTML += createFormSeperator()
      } )

      let listsetHTML = ''
      listsets?.map( ({ label, items, seperate }) => {
        // Do not render empty list
        if( !Array.isArray( items ) || !items.length )
          return
        
        listsetHTML += `<mblock class="listset">
          ${label ? `<mlabel ${CONTROL_LANG_SELECTOR}>${label}</mlabel>` : ''}
          <mul>${items.map( each => (createListItem( each )) ).join('')}</mul>
        </mblock>`

        // Add seperator to this block
        if( seperate )
          listsetHTML += createFormSeperator()
      } )

      sectionBodies += `<mblock section="attributes" class="active">
        <mblock>${fieldsetHTML}</mblock>
        <mblock>${listsetHTML}</mblock>
      </mblock>`
    }

    /**
     * Generate HTML content of panel sections
     */
    Object.entries( options ).map( ( [name, section], index ) => composeSection( name, section, active == name || index === 0) )

    // let optionalAttrs = ''
    // if( typeof position == 'object' ) 
    //   optionalAttrs += ` style="left:${position.left};top:${position.top};"`

    return `<mblock ${CONTROL_PANEL_SELECTOR}="${key}"
                    style="typeof input.position == 'object' ? { left: input.position.left, top: input.position.top } : '?'">
      <mblock dismiss="panel" backdrop></mblock>
      <mblock container>
        <mblock class="header">
          <mblock>
            <micon class=input.caption.icon></micon>
            <mlabel ${CONTROL_LANG_SELECTOR}>{input.caption.title}</mlabel>

            <!-- Dismiss control panel -->
            <span dismiss="panel" title="Dismiss" ${CONTROL_LANG_SELECTOR}><micon class="bx bx-x"></micon></span>
          </mblock>

          <mul options="tabs">${sectionTabs}</mul>
        </mblock>

        <mblock class="body">${sectionBodies}</mblock>
      </mblock>
    </mblock>`
  }

  return new Component<PanelInput>('panel', factory( input ), { input })
}
