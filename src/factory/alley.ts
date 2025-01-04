import type { Handler } from '../lib/lips'
import type { HandlerHook } from '../types/controls'

import { Component } from '../lib/lips/lips'
import {
  VIEW_ALLEY_SELECTOR,
  VIEW_REF_SELECTOR
} from '../modules/constants'
import { generateKey } from '../modules/utils'

/**
 * Create common alley block
 */
export type AlleyInput = {
  key?: string
  discret?: boolean
}
export default ( input: AlleyInput = {}, hook: HandlerHook ) => {
  const handler: Handler<AlleyInput> = {
    onHandleAlley(){

    }
  }

  const template = `
    <mblock ${VIEW_ALLEY_SELECTOR}="${generateKey()}" 
            ${VIEW_REF_SELECTOR}=input.key
            status="active"
            discret=input.discret
            on-click( onHandleAlley )></mblock>
  `

  return new Component<AlleyInput>('alley', template, { input, handler })
}
