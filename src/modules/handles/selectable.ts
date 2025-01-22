import type Handles from '.'
import type { HandleInterface } from '.'
import type Wrappable from './wrappable'
import type FrameStyle from '../frame/styles'
import type Stylesheet from '../../lib/stylesheet'

import $, { type Cash } from 'cash-dom'
import { throttle } from '../utils'

type SelectActionType = 'start' | 'handle' | 'stop'

export default class Selectable implements HandleInterface {
  private context: Handles
  private wrappable?: Wrappable
  private style: Stylesheet | FrameStyle

  private $coverage?: Cash
  private $selectedElements?: Cash
  private $previouslySelected?: Cash
  private $progressiveSelection?: Cash

  private startX = 0
  private startY = 0
  private cursorX = 0
  private cursorY = 0
  private isShiftKeyPressed = false
  private isPendingSelect = false

  private throttled: any

  constructor( context: Handles, wrappable?: Wrappable ){
    this.context = context
    this.wrappable = wrappable
    this.style = this.context.styles('dragselect', this.getStyleSheet() )
  }

  private getStyleSheet(){
    return `
      ${this.context.options.DRAG_SELECT_TAG} {
        position: absolute;
        z-index: 10000;
        border: 1px solid var(--me-primary-color);
        background-color: var(--me-primary-color-fade);
        pointer-events: none;

        &.inclusive {
          border: 2px dashed var(--me-primary-color);
          background-color: var(--me-primary-color-fade);
          opacity: 0.7;
        }
      }
    `
  }
  private getIntersectingElements( rect: DOMRect, left: number, top: number, width: number, height: number ): Cash | null {
    const
    stag = this.context.options.DRAG_SELECT_TAG,
    wtag = this.context.options.WRAPPER_TAG,
    $selectables = this.context.$canvas.find(`${this.context.options.element}:not(${stag},${wtag},${wtag} .handle)`)
    
    if( !$selectables?.length ) return null

    const scaleQuo = this.context.getScaleQuo()

    return $selectables.filter( ( _, element ) => {
      const elementRect = element.getBoundingClientRect()
      if( !rect ) return false

      const
      elementLeft = ( elementRect.left - rect.left ) * scaleQuo,
      elementTop = ( elementRect.top - rect.top ) * scaleQuo

      return !( elementLeft > left + width
                || elementLeft + elementRect.width < left
                || elementTop > top + height
                || elementTop + elementRect.height < top )
    })
  }
  private filterSelection( intersectingElements: Cash, isInclusive: boolean ): Cash {
    if( !isInclusive ) {
      return intersectingElements.filter( ( _, element ) => {
        const selectedChildren = intersectingElements.filter( ( _, child ) => {
          return child !== element && element.contains( child )
        })
        return selectedChildren.length === 0
      })
    }
    return intersectingElements
  }
  private updateProgressiveSelection( $newlySelected: Cash ): Cash {
    // First selection
    if( !this.$selectedElements ){
      this.$selectedElements = $newlySelected
      return $newlySelected
    }

    const
    // Find elements to unwrap (previously selected but not in new selection)
    $elementsToUnwrap = this.$selectedElements.filter( ( _, element ) => {
      return !$newlySelected.filter(( _, newElement ) => newElement === element ).length
    }),

    // Find elements to wrap (in new selection but not previously selected)
    $elementsToWrap = $newlySelected.filter(( _, element ) => {
      return !this.$selectedElements?.filter(( _, selectedElement ) => selectedElement === element ).length
    })

    // Unwrap elements that are no longer in selection
    $elementsToUnwrap.length && this.wrappable?.deactivate( $elementsToUnwrap )
    // Wrap newly selected elements
    $elementsToWrap.length && this.wrappable?.activate( $elementsToWrap )

    // Update current selection based on mode
    if( this.isShiftKeyPressed ){
      // In inclusive mode, combine previous and new selection
      const combinedSelection = $()

      this.$selectedElements.each(( _, element ) => {
        !$elementsToUnwrap.filter(( _, unwrapped ) => unwrapped === element ).length
        && combinedSelection.add( element )
      })

      $elementsToWrap.each( ( _, element ) => combinedSelection.add( element ) )
      this.$selectedElements = combinedSelection

      return combinedSelection
    }
    
    // In exclusive mode, replace with new selection
    else {
      this.$selectedElements = $newlySelected
      return $newlySelected
    }
  }

  private start( e: any ){
    if( e.button !== 0 || !this.context.$canvas?.length ) return

    e.preventDefault()

    const rect = this.context.$canvas[0]?.getBoundingClientRect()
    if( !rect ) return

    this.isPendingSelect = true
    this.isShiftKeyPressed = e.shiftKey

    const scaleQuo = this.context.getScaleQuo()

    this.startX = ( e.pageX - rect.left ) * scaleQuo
    this.startY = ( e.pageY - rect.top ) * scaleQuo
    this.cursorX = this.startX
    this.cursorY = this.startY

    // Store currently wrapped elements before starting new selection
    if( !this.isShiftKeyPressed ){
      this.$previouslySelected = this.context.$canvas.find(`${this.context.options.element}[data-is-wrapped="true"]`)
      
      // Clear progressive selection for new drag operation
      this.$progressiveSelection = undefined
    }
  }
  private handle( e: any ){
    if( this.context.isPanning
        || this.context.isMoving
        || this.context.isResizing
        || !this.context.$canvas?.length ) return

    const rect = this.context.$canvas[0]?.getBoundingClientRect()
    if( !rect ) return

    const scaleQuo = this.context.getScaleQuo()

    if( this.isPendingSelect ){
      const
      currentX = ( e.pageX - rect.left ) * scaleQuo,
      currentY = ( e.pageY - rect.top ) * scaleQuo,
      deltaX = Math.abs( currentX - this.startX ),
      deltaY = Math.abs( currentY - this.startY ),
      selectThreshold = this.context.options.DRAG_SELECT_THRESHOLD || 5

      if( Math.max( deltaX, deltaY ) > selectThreshold ){
        this.isPendingSelect = false
        this.context.isSelecting = true

        // Create selection coverage element only after threshold is met
        this.$coverage = $(`<${this.context.options.DRAG_SELECT_TAG}/>`)
        this.$coverage.css({
          left: `${this.startX}px`,
          top: `${this.startY}px`,
          width: '0',
          height: '0'
        })

        this.isShiftKeyPressed && this.$coverage.addClass('inclusive')
        this.context.$canvas.append( this.$coverage )
      }
      else return
    }

    if( !this.context.isSelecting || !this.$coverage?.length ) return

    // Update selection rectangle visual
    this.cursorX = ( e.pageX - rect.left ) * scaleQuo
    this.cursorY = ( e.pageY - rect.top ) * scaleQuo

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

    // Maintain shift key state
    this.isShiftKeyPressed = e.shiftKey
    this.$coverage?.toggleClass('inclusive', this.isShiftKeyPressed )

    // Handle selection with throttling
    if( !this.throttled )
      this.throttled = throttle( ( rect: DOMRect, left: number, top: number, width: number, height: number ) => {
        const intersectingElements = this.getIntersectingElements( rect, left, top, width, height )
        if( !intersectingElements ) return

        const filteredSelection = this.filterSelection( intersectingElements, this.isShiftKeyPressed )
        
        // Update selection and handle wrap/unwrap
        const updatedSelection = this.updateProgressiveSelection( filteredSelection )
        
        // Emit selection event
        if( updatedSelection?.length ){
          this.context.emit('selecting', updatedSelection )
        }
      }, 10 )

    this.throttled( rect, left, top, width, height )
  }
  private stop( e: any ){
    if( !this.isPendingSelect && !this.context.isSelecting ) return

    this.context.isSelecting = false
    this.isPendingSelect = false

    const
    width = Math.abs( this.cursorX - this.startX ),
    height = Math.abs( this.cursorY - this.startY )

    if( width > ( this.context.options.DRAG_SELECT_MIN_SIZE || 5 )
        && height > ( this.context.options.DRAG_SELECT_MIN_SIZE || 5 ) ){
      const rect = this.context.$canvas[0]?.getBoundingClientRect()
      if( !rect ) return

      const
      left = Math.min( this.cursorX, this.startX ),
      top = Math.min( this.cursorY, this.startY )

      // Get final selection
      const intersectingElements = this.getIntersectingElements( rect, left, top, width, height )
      if( !intersectingElements ) return

      const 
      filteredSelection = this.filterSelection( intersectingElements, this.isShiftKeyPressed ),
      // Do final wrap/unwrap update
      finalSelection = this.updateProgressiveSelection( filteredSelection )
      
      if( finalSelection?.length ){
        /**
         * First unwrap all elements to prepare for multi-wrap
         * then apply multi-wrap.
         */
        this.wrappable?.deactivate( finalSelection )
        this.wrappable?.activate( finalSelection )
        
        this.context.emit('selection.end', finalSelection )
      }
    }
    // If the selection was too small and not in shift mode, restore previous selection
    else if( !this.isShiftKeyPressed && this.$previouslySelected?.length ){
      this.wrappable?.activate( this.$previouslySelected )
      this.$selectedElements = this.$previouslySelected
    }

    // Cleanup only if not in shift mode
    if( !this.isShiftKeyPressed ){
      this.$coverage?.remove()

      this.$coverage = undefined
      this.$previouslySelected = undefined
      this.$progressiveSelection = undefined
    }
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
    .on('mousemove.dragselect', e => {
      !this.context.constraints<SelectActionType>('select', 'handle', e )
      && this.handle( e )
    })
    .on('mouseup.dragselect', e => {
      !this.context.constraints<SelectActionType>('select', 'stop', e )
      && this.stop( e )
    })
  }
  disable(){
    this.context.events( this.context.$canvas ).off('.dragselect')
    this.context.events( this.context.$viewport ).off('.dragselect')

    this.$coverage?.remove()

    this.$coverage = undefined
    this.$progressiveSelection = undefined

    'removeRules' in this.style
            ? this.style.removeRules('dragselect')
            : this.style.clear()
  }
}