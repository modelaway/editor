import type Editor from './editor'
import type { FrameQuery } from '../lib/frame.window'
import type { ViewBlockProperties } from '../types/view'

import $, { type Cash } from 'cash-dom'
import { createSelectFileInput } from './factory'
import { debug } from './utils'

export default class Functions {
  private readonly editor: Editor

  constructor( editor: Editor ){
    this.editor = editor

    this.selectFile = this.selectFile.bind( this )
  }

  debug = debug

  /**
   * Select file(s) from local computer
   */
  selectFile( options: SelectFileOptions ): Promise<InputFiles[]> {
    return new Promise( resolve => {
      const $input = $(createSelectFileInput( options ))
      // this.editor.$viewport?.append( $input )

      $input
      /**
       * Handle selected file(s)
       */
      .on('change', function( e ){
        const input = $(e.target).get(0) as HTMLInputElement
        if( !input
            || !input.files
            || !input.files.length )
          return
        
        const files = Array.from( input.files ).map( file => ({ file, src: URL.createObjectURL( file ) }))

        // Auto-remove select input from the DOM
        $input.remove()

        resolve( files ) 
      })
      .find('input')

      /**
       * Auto-remove select input from the DOM if select 
       * dialog get cancelled/closed
       */
      .on('cancel', () => $input.remove() )

      /**
       * Automatically open select dialog
       */
      .trigger('click')
    } )
  }

  /**
   * Define view block props as HTML comment.
   */
  defineProperties( props: ViewBlockProperties ){
    if( typeof props !== 'object'
        || !Object.keys( props ).length )
      throw new Error('Invalid props. Non-empty object expected')

    return `<!--${JSON.stringify( props )}-->`
  }
  /**
   * Extract defined view block props from HTML comment
   * format to object.
   */
  extractProperties( element: string ): ViewBlockProperties[] {
    const extracted = element.match(/<!--{(.+)}-->/g)
    if( !extracted?.length ) return []

    return extracted.map( each => {
      try { return JSON.parse( each.replace(/^<!--/, '').replace(/-->$/, '') ) }
      catch( error ){ return null }
    } )
  }

  /**
   * Extract an element style attribute value
   * into an object.
   */
  extractStyle( $this: Cash ){
    const styleStr = $this.attr('style')
    if( !styleStr ) return {}

    const styles: ObjectType<string> = {}
    
    styleStr.split(/;/).forEach( ( each: string ) => {
      const [name, value] = each.split(':')
      if( !name || !value ) return
      
      styles[ name.trim() ] = value.trim()
    } )

    return styles
  }

  /**
   * Apply grain update to toolbar options
   */
  updateToolbar( updates: ObjectType<any> ){
    throw new Error('Method not available')
  }

  /**
   * Push new content change history stack
   */
  pushHistoryStack(){
    throw new Error('Method not available')
  }
}
