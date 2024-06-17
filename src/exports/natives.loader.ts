import type Modela from './modela'
import { ViewComponent } from '../types/view'

import Text from '../natives/Text'
import Block from '../natives/Block'
import Image from '../natives/Image'
import Button from '../natives/Button'
import Paragraph from '../natives/Paragraph'

const Native: ViewComponent[] = [
  Text,
  Block,
  Image,
  Button,
  Paragraph
]

type NativeOptions = {
  views?: string[]
}

export default function ModelaNativesLoader( modela: Modela, options?: NativeOptions ){
  /**
   * Modela object instance is required to load
   * the anything in-build into the editor.
   */
  if( !modela
      || !modela.store 
      || typeof modela.store.addView !== 'function' )
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
          
        modela.store.addView( view )
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
          
        modela.store.removeView( view.name )
      } )

      /**
       * 
       */
    }
  }
}