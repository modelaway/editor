import { Component } from '../../component/lips'
import {
  CONTROL_LANG_SELECTOR,
  CONTROL_FLOATING_SELECTOR
} from '../constants'

export type FloatingInput = {
  key: string
  type: 'view' | 'layout'
  triggers: string[]
}
export default ( input: FloatingInput ) => {
  const factory = ({ key, type, triggers }: FloatingInput ) => {
    if( !Array.isArray( triggers ) || !triggers.length )
      throw new Error('Undefined triggers list')

    let list = ''
    triggers.map( each => {
      switch( each ){
        case 'addpoint': list += `<mli show="finder" params="${type}" title="Add view" ${CONTROL_LANG_SELECTOR}><micon class="bx bx-plus"></micon></mli>`; break
        case 'paste': list += `<mli action="paste" params="${type}" title="Paste view" ${CONTROL_LANG_SELECTOR}><micon class="bx bx-paste"></micon></mli>`; break
      }
    } )

    return `<mblock ${CONTROL_FLOATING_SELECTOR}="${key}"><mul>${list}</mul></mblock>`
  }

  return new Component<FloatingInput>('floating', factory( input ), { input })
}