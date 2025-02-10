import type Editor from '.'
import type { ViewDefinition } from '../../types/view'

import Text from '../../natives/Text'
import Block from '../../natives/Block'
import Image from '../../natives/Image'
import Button from '../../natives/Button'
import Fonticon from '../../natives/Fonticon'
import Paragraph from '../../natives/Paragraph'

const Native: ViewDefinition[] = [
  Text,
  Block,
  Image,
  Button,
  Fonticon,
  Paragraph
]

type NativeOptions = {
  views?: string[]
}

export function Loader( editor: Editor, options?: NativeOptions ){
  /**
   * Editor object instance is required to load
   * the anything in-build into the editor.
   */
  if( !editor
      || !editor.store 
      || typeof editor.store.views.add !== 'function' )
    return

  return {
    load: () => {
      /**
       * Load in-build native views into modela editor
       */
      Native.map( view => {
        // Load only defined views
        if( Array.isArray( options?.views )
            && options.views.length
            && !options.views.includes( view.name ) ) return
          
        editor.store.views.add( view )
      } )

      /**
       * 
       */
    },
    
    unload: () => {
      /**
       * Remove in-build native views from modela editor
       */
      Native.map( view => {
        // Load only defined views
        if( Array.isArray( options?.views )
            && options.views.length
            && !options.views.includes( view.name ) ) return
          
        editor.store.views.remove( view.name )
      } )

      /**
       * 
       */
    }
  }
}