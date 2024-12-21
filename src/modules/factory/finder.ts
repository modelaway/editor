import { Component } from '../../lib/lips/lips'
import {
  CONTROL_PANEL_SELECTOR,
  CONTROL_LANG_SELECTOR
} from '../constants'
import { createInput } from '.'

export type FinderInput = {
  key: string
  list: ObjectType<Listset> 
}
export default ( input: FinderInput ) => {
  const factory  = ({ key, list }: FinderInput ) => {
    if( !key || !list )
      throw new Error('Invalid createAddViewBlock options')

    return `<mblock ${CONTROL_PANEL_SELECTOR}="${key}">
      <mblock dismiss="panel" backdrop></mblock>
      <mblock container>
        <mblock class="header">
          <mblock>
            <minline ${CONTROL_LANG_SELECTOR}>Add view</minline>

            <!-- Dismiss control panel -->
            <minline dismiss="panel" title="Dismiss" ${CONTROL_LANG_SELECTOR}><micon class="bx bx-x"></micon></minline>
          </mblock>

          ${createInput({
            type: 'search',
            name: 'search',
            placeholder: 'Search view'
          })}
        </mblock>

        <mblock class="results">
          {SearchResult({ list }).template}
        </mblock>
      </mblock>
    </mblock>`
  }

  return new Component<FinderInput>('finder', factory( input ), { input })
}