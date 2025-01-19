import type Handles from '.'
import type { HandleInterface } from '.'
import type FrameStyle from '../frame/styles'
import type Stylesheet from '../../lib/stylesheet'

import $, { type Cash } from 'cash-dom'

type SelectActionType = 'start' | 'handle' | 'stop'

export default class Selectable implements HandleInterface {
  private context: Handles
  private style: Stylesheet | FrameStyle
  private $coverage?: Cash

  private startX = 0
  private startY = 0
  private cursorX = 0
  private cursorY = 0

  constructor( context: Handles ){
    this.context = context
    this.style = this.context.styles('dragselect', this.getStyleSheet() )
  }

  private getStyleSheet(){
    return `
      dragselect {
        position: absolute;
        z-index: 10000;
        border: 1px solid rgba(99, 179, 237, 0.5);
        backgroundColor: rgba(99, 179, 237, 0.15);
        pointerEvents: none;
      }
    `
  }

  private start( e: any ){
    if( e.button !== 0 || !this.context.$canvas?.length ) return
    
    e.preventDefault()

    const rect = this.context.$canvas[0]?.getBoundingClientRect()
    if( !rect ) return

    this.context.isSelecting = true
    
    this.startX = e.pageX - rect.left
    this.startY = e.pageY - rect.top
    this.cursorX = this.startX
    this.cursorY = this.startY

    this.$coverage = $('<dragselect></dragselect>')
    this.$coverage.css({
      left: `${this.startX}px`,
      top: `${this.startY}px`,
      width: '0',
      height: '0'
    })

    this.context.$canvas.append( this.$coverage )
  }
  private handle( e: any ){
    if( this.context.isPanning 
        || this.context.isMoving
        || !this.context.isSelecting 
        || !this.$coverage?.length 
        || !this.context.$canvas?.length ) return

    const rect = this.context.$canvas[0]?.getBoundingClientRect()
    if( !rect ) return

    this.cursorX = e.pageX - rect.left
    this.cursorY = e.pageY - rect.top

    const
    width = Math.abs( this.cursorX - this.startX ),
    height = Math.abs( this.cursorY - this.startY ),
    left = Math.min( this.cursorX, this.startX ),
    top = Math.min( this.cursorY, this.startY )

    this.$coverage.css({
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`
    })

    const selectables = this.context.$canvas.find( this.context.options.element )
    if( !selectables?.length ) return

    const selectedElements = selectables.filter(( _, element ) => {
      const
      elementRect = element.getBoundingClientRect(),
      canvasRect = rect

      if( !canvasRect ) return false

      const
      elementLeft = elementRect.left - canvasRect.left,
      elementTop = elementRect.top - canvasRect.top

      return !( elementLeft > left + width
                || elementLeft + elementRect.width < left
                || elementTop > top + height
                || elementTop + elementRect.height < top )
    })

    selectedElements?.length && this.context.emit('selecting', selectedElements )
  }
  private stop(){
    if( !this.context.isSelecting ) return

    this.context.isSelecting = false

    const
    width = Math.abs( this.cursorX - this.startX ),
    height = Math.abs( this.cursorY - this.startY )

    if( width > ( this.context.options.SELECTION_MIN_SIZE || 5 )
        && height > ( this.context.options.SELECTION_MIN_SIZE || 5 ) ){
      const selectables = this.context.$canvas.find( this.context.options.element )
      selectables?.length && this.context.emit('selection.end', selectables )
    }

    this.$coverage?.remove()
    this.$coverage = undefined
  }

  enable(){
    if( !this.context.$canvas.length ) return

    this.context
    .events( this.context.$canvas )
    .on('mousedown.dragselect', e => {
      !this.context.constraints<SelectActionType>('select', 'start', e )
      && this.start( e )
    })

    this.context
    .events( this.context.$viewport )
    .on('mousemove.dragselect', e => this.handle( e ) )
    .on('mouseup.dragselect', () => this.stop() )
  }
  disable(){
    this.context.events( this.context.$canvas ).off('.dragselect')
    this.context.events( this.context.$viewport ).off('.dragselect')

    this.$coverage?.remove()
    this.$coverage = undefined
    /**
     * Clear style by dom type
     */
    'removeRules' in this.style
            ? this.style.removeRules('dragselect')
            : this.style.clear()
  }
}