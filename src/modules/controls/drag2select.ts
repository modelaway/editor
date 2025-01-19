import type Editor from '../editor'
import type { Component } from '../../lib/lips/lips'

import $, { type Cash } from 'cash-dom'
import { EventEmitter } from 'events'

interface SelectionArea {
  x: number
  y: number
  width: number
  height: number
}

interface SelectionEventMap {
  'selection.start': ( position: { x: number, y: number } ) => void
  'selecting': ( area: SelectionArea, selectedElements: Cash ) => void
  'selection.end': ( selectedElements: Cash ) => void
}

declare interface Drag2SelectEvent {
  on<U extends keyof SelectionEventMap>( event: U, listener: SelectionEventMap[U] ): this
  emit<U extends keyof SelectionEventMap>( event: U, ...args: Parameters<SelectionEventMap[U]> ): boolean
}

export interface Drag2SelectOptions {
  containerSelector?: string
  selectableItems?: string
  minSize?: number
}

export default class Drag2Select<Input = void, State = void, Static = void, Context = void> extends EventEmitter implements Drag2SelectEvent {
  private editor: Editor
  private component: Component<Input, State, Static, Context> | null
  private options: Drag2SelectOptions

  private $container?: Cash
  private $coverage?: Cash
  private selectedElements: Set<Element>

  private isSelecting: boolean = false
  private startX: number = 0
  private startY: number = 0
  private currentX: number = 0
  private currentY: number = 0

  constructor( editor: Editor, component: Component<Input, State, Static, Context>, options?: Drag2SelectOptions ){
    super()

    this.editor = editor
    this.component = component
    this.selectedElements = new Set()
    
    this.options = {
      minSize: 5, // Default minimum size to trigger selection
      ...options
    }
    
    this.component.getNode() && this.bind()
    this.component.on('render', () => this.bind() )
  }

  private createCoverage(): void {
    if( !this.$coverage?.length ){
      this.$coverage = $('<div class="d2s-coverage"></div>')
                        .css({
                          position: 'absolute',
                          border: '1px solid rgba(99, 179, 237, 0.5)',
                          backgroundColor: 'rgba(99, 179, 237, 0.15)',
                          pointerEvents: 'none',
                          zIndex: 1000
                        })

      this.$container?.append( this.$coverage )
    }
  }
  private updateCoverage(): void {
    if( !this.$coverage ) return

    const
    width = Math.abs( this.currentX - this.startX ),
    height = Math.abs( this.currentY - this.startY ),
    left = Math.min( this.currentX, this.startX ),
    top = Math.min( this.currentY, this.startY )

    this.$coverage.css({
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`
    })

    const area: SelectionArea = { x: left, y: top, width, height }
    
    const selectables = this.options.selectableItems 
      ? this.$container?.find( this.options.selectableItems )
      : this.$container?.children()

    if( !selectables ) return

    const selectedElements = selectables.filter(( _, element ) => {
      const
      rect = element.getBoundingClientRect(),
      containerRect = (this.$container?.[0] as Element).getBoundingClientRect()
      
      if( !containerRect ) return false

      const
      elementLeft = rect.left - containerRect.left,
      elementTop = rect.top - containerRect.top

      return !( elementLeft > area.x + area.width
                || elementLeft + rect.width < area.x
                || elementTop > area.y + area.height
                || elementTop + rect.height < area.y )
    })

    this.emit('selecting', area, selectedElements )
  }

  private onMouseDown = ( e: MouseEvent ): void => {
    if( e.button !== 0 || !this.$container?.[0] ) return
    
    const rect = this.$container[0].getBoundingClientRect()
    if( !rect ) return

    this.isSelecting = true
    this.startX = e.pageX - rect.left
    this.startY = e.pageY - rect.top
    this.currentX = this.startX
    this.currentY = this.startY

    this.createCoverage()
    this.updateCoverage()
    
    this.emit('selection.start', { x: this.startX, y: this.startY })
  }
  private onMouseMove = ( e: MouseEvent ): void => {
    if( !this.isSelecting || !this.$container?.[0] ) return

    const rect = this.$container[0].getBoundingClientRect()

    this.currentX = e.pageX - rect.left
    this.currentY = e.pageY - rect.top

    this.updateCoverage()
  }
  private onMouseUp = (): void => {
    if( !this.isSelecting ) return
    
    this.isSelecting = false

    const
    width = Math.abs( this.currentX - this.startX ),
    height = Math.abs( this.currentY - this.startY )

    if( width > ( this.options.minSize || 0 ) && height > ( this.options.minSize || 0 ) ){
      const selectables = this.options.selectableItems 
        ? this.$container?.find( this.options.selectableItems )
        : this.$container?.children()
      
      selectables?.length && this.emit('selection.end', selectables ) 
    }

    this.$coverage?.remove()
    this.$coverage = undefined
  }

  bind(): void {
    /**
     * Set container element with component node
     * or find by selector if provided
     */
    this.$container = this.options.containerSelector
                              ? this.component?.find( this.options.containerSelector )
                              : this.component?.getNode()

    if( !this.$container ) return

    this.$container.css('position') === 'static'
    && this.$container.css('position', 'relative')
    
    this.unbind()

    this.$container.on('mousedown', this.onMouseDown )
    $(document)
    .on('mousemove.selection', this.onMouseMove )
    .on('mouseup.selection', this.onMouseUp )
  }
  unbind(): void {
    this.$container?.off('mousedown')
    $(document).off('.selection')

    this.$coverage?.remove()
    this.$coverage = undefined
  }
  dispose(){
    this.unbind()

    this.component = null
    this.$container = undefined

    this.selectedElements.clear()
  }
}