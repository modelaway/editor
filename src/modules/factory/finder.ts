import Lips, { Component } from '../../lib/lips/lips'
import * as Helpers from './helpers'
import {
  CONTROL_PANEL_SELECTOR,
  CONTROL_LANG_SELECTOR,
  VIEW_EMPTY_SELECTOR,
  FORM_SEPERATOR_SELECTOR
} from '../constants'
import { Handler } from '../../lib/lips'

export type SearchResult = {
  key: string
  label: string
  icon: string
  type: string
}
export type FinderInput = {
  key: string
  list: ObjectType<Listset> 
}
export type FinderState = {
  query: string
  results: ObjectType<SearchResult>
}
export default ( input: FinderInput, hook: HandlerHook ) => {
  const lips = new Lips()
  lips.register('inputs', Helpers.Inputs() )

  const state = {
    query: '',
    results: []
  }

  const handler: Handler<FinderInput, FinderState> = {
    onInput({ results }){
      if( results ) this.state.results = results
    },
    onInputChange( e ){
      this.state.query = e.target.value

      console.log( this.state.query )

      typeof hook.metacall == 'function'
      && hook.metacall('finder.search', this.state.query )
    }
  }

  const macros = {
    searchResult: `
      <mblock class="results">
        <if( state.results.length )>
          <for in=state.results>
            <mblock class="listset">
              <if( each.label )>
                <mlabel ${CONTROL_LANG_SELECTOR}>{each.label}</mlabel>
              </if>

              <mul>
                <for in=each.items>
                  <mli class="each.disabled ? 'disabled' : false">
                    <micon class=each.icon></micon>
                    <minline ${CONTROL_LANG_SELECTOR}>{each.title}</minline>

                    <if( each.value )>
                      <minline class="value" ${CONTROL_LANG_SELECTOR}>{each.value}</minline>
                    </if>

                    <if( each.sub )>
                      <minline class="sub-arrow"><micon class="bx bx-chevron-right"></micon></minline>
                    </if>
                  </mli>
                </for>
              </mul>
            
              <if( each.separate )>
                <mblock ${FORM_SEPERATOR_SELECTOR}></mblock>
              </if>
            </mblock>
          </for>
        </if>
        <else>
          <mblock ${VIEW_EMPTY_SELECTOR} ${CONTROL_LANG_SELECTOR}>No result</mblock>
        </else>
      </mblock>
    `
  }
  
  const template = `
    <mblock ${CONTROL_PANEL_SELECTOR}=input.key>
      <mblock dismiss="panel" backdrop></mblock>
      <mblock container>
        <mblock class="header">
          <mblock>
            <minline ${CONTROL_LANG_SELECTOR}>Add view</minline>

            <!-- Dismiss control panel -->
            <minline dismiss="panel" title="Dismiss" ${CONTROL_LANG_SELECTOR}><micon class="bx bx-x"></micon></minline>
          </mblock>

          <inputs type="search"
                  name="search"
                  value=state.query
                  placeholder="Search view"
                  on-change( onInputChange )></inputs>
        </mblock>

        <searchResult></searchResult>
      </mblock>
    </mblock>
  `

  return new Component<FinderInput, FinderState>('finder', template, { input, state, handler, macros })
}