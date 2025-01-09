import type Editor from '.'
import type { Cash } from 'cash-dom'
import type { Component } from '../../lib/lips/lips'

import { EDITOR_EDGE_PADDING } from '../constants'
import Movable, { type MovableOptions } from '../controls/movable'
import Sortable, { type SortableOptions } from '../controls/sortable'

export default class Controls {
  private editor: Editor

  constructor( editor: Editor ){
    this.editor = editor
  }
  /**
   * 
   */
  letPosition( $block: Cash, indication: string ): Position {
    if( !this.editor.$viewport?.length )
      throw new Error('Undefined editor viewport')

    const
    $viewport = this.editor.$viewport,
    posTypes = indication.split('-'),
    position: Position = {}

    if( posTypes.length > 1 )
      console.warn('Only two position types are allowed for control positioning')

    posTypes.forEach( pos => {
      switch( pos ){
        case 'top':
        case 'left':
        case 'right':
        case 'bottom': position[ pos ] = `${EDITOR_EDGE_PADDING}px`; break
        case 'center': {
          position.top = `${($viewport.height() / 2) - ($block.height() / 2)}px`
          position.left = `${($viewport.width() / 2) - ($block.width() / 2)}px`
        } break
      }
    })

    /**
     * TODO: Add support for smart repositionning when 
     * indicated position is already take by another 
     * block to avoid overlapping
     */

    return position
  }

  movable<Input = void, State = void, Static = void, Context = void>( component: Component<Input, State, Static, Context>, options?: MovableOptions ){
    return new Movable<Input, State, Static, Context>( this.editor, component, options )
  }

  sortable<Input = void, State = void, Static = void, Context = void>( component: Component<Input, State, Static, Context>, options: SortableOptions ){
    return new Sortable<Input, State, Static, Context>( this.editor, component, options )
  }
}