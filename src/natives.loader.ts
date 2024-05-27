import type Modela from './modela'

import Div from './natives/Div'
import Text from './natives/Text'
import Button from './natives/Button'
import Paragraph from './natives/Paragraph'

const Native: ViewComponent[] = [
  Div,
  Text,
  Button,
  Paragraph
]

type NativeOptions = {
  components?: string[]
}

export default function ModelaNativesLoader( modela: Modela, options?: NativeOptions ){
  /**
   * Modela object instance is required to load
   * the anything in-build into the editor.
   */
  if( !modela
      || !modela.store 
      || typeof modela.store.addComponent !== 'function' )
    return

  return {
    load: () => {
      /**
       * Load in-build native components into modela editor
       */
      Native.map( component => {
        // Load only defined components
        if( Array.isArray( options?.components )
            && options.components.length
            && !options.components.includes( component.name ) ) return
          
        modela.store.addComponent( component )
      } )

      /**
       * 
       */
    },
    
    unload: () => {
      /**
       * Remove in-build native components from modela editor
       */
      Native.map( component => {
        // Load only defined components
        if( Array.isArray( options?.components )
            && options.components.length
            && !options.components.includes( component.name ) ) return
          
        modela.store.removeComponent( component.name )
      } )

      /**
       * 
       */
    }
  }
}