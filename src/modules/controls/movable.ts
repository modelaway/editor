import type Editor from '../editor'
import type { Component } from '../../lips/lips'

import $, { type Cash } from 'cash-dom'
import { EventEmitter } from 'events'

type PositionApex = Array<'top' | 'left' | 'right' | 'bottom'>

export interface MovableOptions {
  handle?: string
  apex?: PositionApex
}

interface CalcPosition {
  top: number
  left: number
  right: number
  bottom: number
}
interface Position {
  top?: string
  left?: string
  right?: string
  bottom?: string
}

interface MovableEventMap {
  'started': ( position: Position ) => void
  'moving': ( position: Position ) => void
  'stopped': ( position: Position ) => void
}

export default class Movable<Input = void, State = void, Static = void, Context = void> extends EventEmitter {
  private editor: Editor
  private component: Component<Input, State, Static, Context> | null
  private options: MovableOptions

  private $block?: Cash
  private $handle?: Cash

  private isMoving: boolean = false
  private cursorX: number = 0
  private cursorY: number = 0
  private startPosition?: CalcPosition = { top: 0, left: 0, right: 0, bottom: 0 }

  constructor( editor: Editor, component: Component<Input, State, Static, Context>, options?: MovableOptions ){
    super()

    this.editor = editor
    this.component = component
    
    this.options = {
      apex: ['top', 'left'], // Default apex position
      ...options
    }
    
    this.component.getNode() && this.bind()
    this.component.on('attached', () => this.bind() )
    this.component.on('detached', () => this.unbind() )
    this.component.on('attachment-timeout', () => console.warn('Movable component failed to attach within timeout period') )
  }

  private getBlockPosition(): CalcPosition | undefined {
    if( !this.$block?.length ) return

    const element = this.$block[0]
    if( !element ) throw new Error('Undefined block element')
    
    const
    rect = element.getBoundingClientRect(),
    top = rect.top || parseInt( this.$block.css('top') as string ),
    left = rect.left || parseInt( this.$block.css('left') as string )

    return {
      top,
      left,
      right: rect.right && this.editor.$shell?.length
                                ? ( this.editor.$shell.width() - rect.right )
                                : parseInt( this.$block.css('right') as string ) || (left + this.$block.width()),
      bottom: rect.bottom && this.editor.$shell?.length
                                ? ( this.editor.$shell.height() - rect.bottom )
                                : parseInt( this.$block.css('bottom') as string ) || (top + this.$block.height())
    }
  }

  private onMouseDown = (e: MouseEvent): void => {
    this.isMoving = true
    this.$block?.css('cursor', 'move')
    
    this.cursorX = e.pageX
    this.cursorY = e.pageY

    this.startPosition = this.getBlockPosition()
    if( !this.startPosition ) return

    this.emit('started', {
      top: this.options.apex?.includes('top') ? `${this.startPosition.top}px` : 'unset',
      left: this.options.apex?.includes('left') ? `${this.startPosition.left}px` : 'unset',
      right: this.options.apex?.includes('right') ? `${this.startPosition.right}px` : 'unset',
      bottom: this.options.apex?.includes('bottom') ? `${this.startPosition.bottom}px` : 'unset'
    })
  }
  private onMouseMove = (e: MouseEvent): void => {
    if( !this.isMoving || !this.$block?.length || !this.startPosition ) return

    const
    deltaX = e.pageX - this.cursorX,
    deltaY = e.pageY - this.cursorY

    if( Number.isNaN( deltaX ) || Number.isNaN( deltaY ) ) return

    const
    top = this.startPosition.top + deltaY,
    left = this.startPosition.left + deltaX,
    right = this.startPosition.right - deltaX,
    bottom = this.startPosition.bottom - deltaY

    const position: Position = {
      top: this.options.apex?.includes('top') ? `${top}px` : 'unset',
      left: this.options.apex?.includes('left') ? `${left}px` : 'unset',
      right: this.options.apex?.includes('right') ? `${right}px` : 'unset',
      bottom: this.options.apex?.includes('bottom') ? `${bottom}px` : 'unset'
    }

    // Move target to new position
    this.$block.css( position as Record<string, string> )
    // Trigger moving emit
    this.emit('moving', position )
  }
  private onMouseUp = (): void => {
    if( !this.isMoving ) return
    
    this.isMoving = false
    this.$block?.css('cursor', 'default')
    
    const position = this.getBlockPosition()
    if( !position ) return
    
    this.emit('stopped', {
      top: this.options.apex?.includes('top') ? `${position.top}px` : 'unset',
      left: this.options.apex?.includes('left') ? `${position.left}px` : 'unset',
      right: this.options.apex?.includes('right') ? `${position.right}px` : 'unset',
      bottom: this.options.apex?.includes('bottom') ? `${position.bottom}px` : 'unset'
    })
  }

  bind(): void {
    /**
     * Set block element with component node
     * 
     * IMPORTANT: Help rebind to the new $block element
     *            instance when component rerenders.
     */
    this.$block = this.component?.getNode()
    if( !this.$block ) return

    // Default use $block as handle
    this.$handle = this.options.handle && this.component?.find( this.options.handle ) || this.$block

    this.unbind()

    this.$handle.on('mousedown', this.onMouseDown )
    $(document)
    .on('mousemove.movable', this.onMouseMove )
    .on('mouseup.movable', this.onMouseUp )
  }
  unbind(): void {
    this.$handle?.off('mousedown')
    $(document).off('.movable')
  }

  dispose(){
    this.component = null
    this.$block = undefined
    this.$handle = undefined
  }
}