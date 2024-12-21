import { Component } from '../../lib/lips/lips'
import {
  CONTROL_LANG_SELECTOR,
  VIEW_EMPTY_SELECTOR
} from '../constants'
import { createFormSeperator, createListItem } from '.'

export type SearchResultInput = {
  list: ObjectType<Listset>
}
export default ( input: SearchResultInput ) => {
  const factory = ({ list }: SearchResultInput ) => {
    let listsetHTML = ''
    
    /**
     * Generate HTML content of panel sections
     */
    Object.values( list ).map( ({ label, items, seperate }: Listset, index: number ) => {
      // Do not render empty list
      if( !Array.isArray( items ) || !items.length )
        return

      // Insert seperator between group blocks
      if( seperate && index > 0 )
        listsetHTML += createFormSeperator()
      
      listsetHTML += `<mblock class="listset">
        ${label ? `<mlabel ${CONTROL_LANG_SELECTOR}>${label.replace(/-/g, ' ').toCapitalCase()}</mlabel>` : ''}
        <mul>${items.map( each => (createListItem( each )) ).join('')}</mul>
      </mblock>`
    } )

    return listsetHTML || `<mblock ${VIEW_EMPTY_SELECTOR} ${CONTROL_LANG_SELECTOR}>No result</mblock>`
  }

  return new Component<SearchResultInput>('searchResult', factory( input ), { input })
}
