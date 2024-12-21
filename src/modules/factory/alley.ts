import { Component } from '../../lib/lips/lips'
import {
  VIEW_ALLEY_SELECTOR,
  VIEW_REF_SELECTOR
} from '../constants'
import { generateKey } from '../utils'

/**
 * Create common alley block
 */
export type AlleyInput = {
  key?: string
  discret?: boolean
}
export default ( input: AlleyInput = {} ) => {
  const factory = ({ key, discret }: AlleyInput ) => {
    return `<mblock ${VIEW_ALLEY_SELECTOR}="${generateKey()}" ${VIEW_REF_SELECTOR}="${key}" status="active" ${discret ? 'discret' : ''}></mblock>`
  }

  return new Component<AlleyInput>('alley', factory( input ), { input })
}
