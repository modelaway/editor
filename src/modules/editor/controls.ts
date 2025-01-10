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
    [ posX, posY ] = indication.split('-'),
    position: Position = {}

    if( !posY )
      throw new Error('Invalid positioning indication')

    function sidePosition( pos: string ){
      switch( pos ){
        case 'top':
        case 'left':
        case 'right':
        case 'bottom': position[ pos as keyof Position ] = `${EDITOR_EDGE_PADDING}px`; break
      }
    }
    function centerPosition( pos: string ){
      console.log($viewport.width() / 2, $block.width() / 2)
      switch( pos ){
        case 'top':
        case 'bottom': position.left = `${($viewport.width() / 2) - ($block.width() / 2)}px`; break
        case 'left':
        case 'right': position.top = `${($viewport.height() / 2) - ($block.height() / 2)}px`; break
      }
    }

    if( posX == 'center' ){
      centerPosition( posY )
      sidePosition( posY )
    }
    else if( posY == 'center' ){
      centerPosition( posX )
      sidePosition( posX )
    }
    else {
      sidePosition( posX )
      sidePosition( posY )
    }

    /**
     * TODO: Add support for smart repositionning when 
     * indicated position is already take by another 
     * block to avoid overlapping
     */

    return position
  }

  /**
   * 
   */
  movable<Input = void, State = void, Static = void, Context = void>( component: Component<Input, State, Static, Context>, options?: MovableOptions ){
    return new Movable<Input, State, Static, Context>( this.editor, component, options )
  }

  /**
   * 
   */
  sortable<Input = void, State = void, Static = void, Context = void>( component: Component<Input, State, Static, Context>, options: SortableOptions ){
    return new Sortable<Input, State, Static, Context>( this.editor, component, options )
  }
}