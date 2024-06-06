import IOF from './custom.iframe.io'
import RJInit, { RJQuery } from './jquery.remote'
import {
	CONTROL_PANEL_SELECTOR,
	VIEW_ACTIVE_SELECTOR,
	VIEW_IDENTIFIER,
	VIEW_PLACEHOLDER_SELECTOR
} from '../constants'
import * as Event from '../events'
import { str2Obj } from '../utils'

let $$: RJQuery

export default class Client {
  private chn: IOF = new IOF({ type: 'IFRAME' })
	// private $root = $('html')

  constructor(){
    this.chn.listen()

		this.chn
		.on('bind', ({ key, settings }) => {
      $$ = RJInit( this.chn )
		})
  }

	// events(){
  //   const self = this
  //   function handler( fn: Function ){
  //     return function( this: Event ){
  //       typeof fn === 'function' && fn( $(this), self )
  //     }
  //   }

  //   this.$root
  //   /**
  //    * Show extra and sub toolbar options
  //    */
  //   .on('click', `[${VIEW_ACTIVE_SELECTOR}]`, handler( Event.onToolbar ) )
  //   /**
  //    * Show floating triggers on placeholder hover
  //    */
  //   .on('mouseenter', `[${VIEW_PLACEHOLDER_SELECTOR}]`, handler( Event.onFloating ) )

  //   .on('input', '[contenteditable]', handler( Event.onContentChange ) )
  //   // .on('keydown', onUserAction )
  //   // .on('paste', onUserAction )

	// }
}