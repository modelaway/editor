import $, { type Cash } from 'cash-dom'
import { EDITOR_EDGE_PADDING } from '../constants'

type MovableEffect = ( block: Cash, event: 'started' | 'moving' | 'stopped', position: { left: number, top: number } ) => void

/**
 * 
 */
export const letPosition = ( $block: Cash, indication: string ): Position => {
    const
    posTypes = indication.split('-'),
    position: Position = { top: '0px', left: '0px' }

    if( posTypes.length > 1 )
      console.warn('Only two position types are allowed for control positioning')

    posTypes.forEach( pos => {
      switch( pos ){
        case 'top': position.top = EDITOR_EDGE_PADDING; break
        case 'left': position.left = EDITOR_EDGE_PADDING; break
        case 'right': position.left = `calc(100% - ${$block.width()}px - ${EDITOR_EDGE_PADDING})`; break
        case 'bottom': position.top = `calc(100% - ${$block.height()}px - ${EDITOR_EDGE_PADDING})`; break
        case 'center': {
          position.top = `calc(50% - ${$block.height() / 2}px)`
          position.left = `calc(50% - ${$block.width() / 2}px)`
        } break
      }
    })

    if( !position.top && !posTypes.includes('top') ) position.top = EDITOR_EDGE_PADDING
    if( !position.left && !posTypes.includes('left') ) position.left = EDITOR_EDGE_PADDING

    /**
     * TODO: Add support for smart repositionning when 
     * indicated position is already take by another 
     * block to avoid overlapping
     */

    return position
  }

export const movable = ( $block: Cash, $handle?: Cash, effect?: MovableEffect ) => {
    let
    isMoving: boolean = false,
    cursorX: number = 0,
    cursorY: number = 0,
    startTop: number = 0,
    startLeft: number = 0

    /**
     * Trigger move effect on block by default
     */
    $handle = $handle || $block
    $handle.on('mousedown', e => {
      isMoving = true
      
      cursorX = e.pageX
      cursorY = e.pageY

      startTop = parseInt( $block.css('top') as string )
      startLeft = parseInt( $block.css('left') as string )

      $block.css('cursor', 'move')

      // Trigger move started effect
      typeof effect === 'function'
      && effect( $block, 'started', { top: startTop, left: startLeft })
    })

    $(document)
    .on('mousemove', e => {
      if( !isMoving || !$block?.length ) return

      const
      deltaX = e.pageX - cursorX,
      deltaY = e.pageY - cursorY

      if( Number.isNaN( deltaX ) || Number.isNaN( deltaY ) ) return

      let
      top = startTop + deltaY,
      left = startLeft + deltaX

      // Move target to new position
      $block.css({ top: `${top}px`, left: `${left}px`, right: 'unset', bottom: 'unset' })

      // Trigger moving effect
      typeof effect === 'function' && effect( $block, 'moving', { left, top } )
    })
    .on('mouseup', () => {
      isMoving = false
      $block.css('cursor', 'default')

      // Trigger move stopped effect
      typeof effect === 'function'
      && effect( $block, 'stopped', {
        top: parseInt( $block.css('top') as string ),
        left: parseInt( $block.css('left') as string )
      })
    })
  }