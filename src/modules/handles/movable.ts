import type Handles from '.'
import type { HandleInterface } from '.'
import type SnapGuidable from './snapguidable'

import $, { type Cash } from 'cash-dom'

type MoveActionType = 'start' | 'handle' | 'stop'
export default class Movable implements HandleInterface {
  private context: Handles
  private $wrapper?: Cash
  private cursorX = 0
  private cursorY = 0
  private startTop = 0
  private startLeft = 0
  private snapguide?: SnapGuidable

  constructor( context: Handles, snapguide?: SnapGuidable ){
    this.context = context
    this.snapguide = snapguide
  }

  private start( e: any ){
    const $target = $(e.target).closest( this.context.options.WRAPPER_TAG )
    if( !$target.length ) return

    e.preventDefault()

    /**
     * Relative-like content element cannot be 
     * moved by drag
     */
    const position = $target.css('position')
    if( !position || !['fixed', 'absolute'].includes( position ) ) return

    this.$wrapper = $target
    this.context.isMoving = true

    this.cursorX = e.pageX
    this.cursorY = e.pageY

    this.startTop = parseFloat( this.$wrapper?.css('top') as string ) || 0
    this.startLeft = parseFloat( this.$wrapper?.css('left') as string ) || 0
  }
  private handle( e: any ){
    if( this.context.isPanning
        || this.context.isResizing
        || !this.context.isMoving
        || !this.$wrapper?.length ) return

    const
    scaleQuo = this.context.getScaleQuo(),
    deltaX = ( e.pageX - this.cursorX ) * scaleQuo,
    deltaY = ( e.pageY - this.cursorY ) * scaleQuo

    if( Number.isNaN( deltaX ) || Number.isNaN( deltaY ) ) return

    let
    newTop = this.startTop + deltaY,
    newLeft = this.startLeft + deltaX

    if( this.snapguide ){
      const snapped = this.snapguide.calculate( this.$wrapper, newLeft, newTop )

      if( snapped ){
        newTop = snapped.newTop
        newLeft = snapped.newLeft
      }
    }

    this.$wrapper.css({ top: `${newTop}px`, left: `${newLeft}px` })
  }
  private stop(){
    if( !this.context.isMoving ) return

    this.context.isMoving = false
    this.$wrapper = undefined

    this.snapguide?.hide()
  }

  apply(){
    if( !this.context.$canvas.length ) return

    this.context
    .events( this.context.$canvas )
    .on('mousedown.move', this.context.options.element, e => {
      this.context.constraints<MoveActionType>('move', 'start', e )
      && this.start( e )
    } )

    this.context
    .events( this.context.$viewport )
    .on('mousemove.move', e => this.handle( e ) )
    .on('mouseup.move', () => this.stop() )
  }
  discard(){
    this.context.events( document).off('.move')
  }
}