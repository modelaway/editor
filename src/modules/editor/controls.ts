import type Editor from '.'
import type { MovableOptions, MovableEffect } from '../../types/controls'

import $, { type Cash } from 'cash-dom'
import { EDITOR_EDGE_PADDING } from '../constants'

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

  movable( $block: Cash, options?: MovableOptions, effect?: MovableEffect ){
    if( !$block?.length )
      throw new Error('Undefined block element')

    options = { 
      // Default apex position
      $handle: $block,
      apex: ['top', 'left'],
      ...options
    }

    function getBlockPosition(){
      const element = $block[0]
      if( !element ) throw new Error('Undefined block element')
      
      const
      rect = element.getBoundingClientRect(),
      top = rect.top || parseInt( $block.css('top') as string ),
      left = rect.left || parseInt( $block.css('left') as string )

      return {
        top,
        left,
        right: rect.right && self.editor.$viewport?.length
                        ? ( self.editor.$viewport.width() - rect.right )
                        : parseInt( $block.css('right') as string ) || (left + $block.width()),
        bottom: rect.bottom && self.editor.$viewport?.length
                        ? ( self.editor.$viewport.height() - rect.bottom )
                        : parseInt( $block.css('bottom') as string ) || (top + $block.height())
      }
    }

    const self = this
    let
    isMoving: boolean = false,
    cursorX: number = 0,
    cursorY: number = 0,
    startPosition = { top: 0, left: 0, right: 0, bottom: 0 }

    /**
     * Trigger move effect on block by default
     */
    const $handle = (options?.$handle || $block) as Cash

    $handle.on('mousedown', e => {
      isMoving = true
      $block.css('cursor', 'move')
      
      cursorX = e.pageX
      cursorY = e.pageY
      startPosition = getBlockPosition()

      // Trigger move started effect
      typeof effect === 'function'
      && effect( $block, 'started', {
        top: options?.apex.includes('top') ? `${startPosition.top}px` : 'unset',
        left: options?.apex.includes('left') ? `${startPosition.left}px` : 'unset',
        right: options?.apex.includes('right') ? `${startPosition.right}px` : 'unset',
        bottom: options?.apex.includes('bottom') ? `${startPosition.bottom}px` : 'unset'
      })
    })

    $(document)
    .on('mousemove', e => {
      if( !isMoving || !$block?.length ) return

      const
      deltaX = e.pageX - cursorX,
      deltaY = e.pageY - cursorY

      if( Number.isNaN( deltaX ) || Number.isNaN( deltaY ) ) return

      let
      top = startPosition.top + deltaY,
      left = startPosition.left + deltaX,
      right = startPosition.right - deltaX,
      bottom = startPosition.bottom - deltaY

      const position: Position = {}

      position.top = options?.apex.includes('top') ? `${top}px` : 'unset'
      position.left = options?.apex.includes('left') ? `${left}px` : 'unset'
      position.right = options?.apex.includes('right') ? `${right}px` : 'unset'
      position.bottom = options?.apex.includes('bottom') ? `${bottom}px` : 'unset'

      // Move target to new position
      $block.css( position )
      // Trigger moving effect
      typeof effect === 'function' && effect( $block, 'moving', position )
    })
    .on('mouseup', () => {
      if( !isMoving ) return
      
      isMoving = false
      $block.css('cursor', 'default')
      
      // Trigger move stopped effect
      const { top, left, right, bottom } = getBlockPosition()

      typeof effect === 'function'
      && effect( $block, 'stopped', {
        top: options?.apex.includes('top') ? `${top}px` : 'unset',
        left: options?.apex.includes('left') ? `${left}px` : 'unset',
        right: options?.apex.includes('right') ? `${right}px` : 'unset',
        bottom: options?.apex.includes('bottom') ? `${bottom}px` : 'unset'
      })
    })

    return {
      dispose(){
        $handle.off('mousedown')

        $(document).off('mousemove')
        $(document).off('mouseup')
      }
    }
  }
}