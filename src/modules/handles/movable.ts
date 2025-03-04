import type Handles from '.'
import type { HandleInterface } from '.'
import type SnapGuidable from './snapguidable'

import $, { type Cash } from 'cash-dom'

type MoveActionType = 'start' | 'handle' | 'stop'

export default class Movable implements HandleInterface {
  private context: Handles
  private $holder?: Cash
  private cursorX = 0
  private cursorY = 0
  private startTop = 0
  private startLeft = 0
  private snapguide?: SnapGuidable
  private initialCursorX = 0
  private initialCursorY = 0
  private MOVE_THRESHOLD = 5
  private isPendingMove = false

  constructor( context: Handles, snapguide?: SnapGuidable ){
    this.context = context
    this.snapguide = snapguide
  }

  private start( e: any ){
    const $target = $(e.target).closest( this.context.options.HOLDER_TAG )
    if( !$target.length ) return

    e.preventDefault()

    /**
     * Relative-like content element cannot be 
     * moved by drag
     */
    const position = $target.css('position')
    if( !position || !['fixed', 'absolute'].includes( position ) ) return

    this.$holder = $target
    this.isPendingMove = true

    this.initialCursorX = this.cursorX = e.pageX
    this.initialCursorY = this.cursorY = e.pageY

    this.startTop = parseFloat( this.$holder?.css('top') as string ) || 0
    this.startLeft = parseFloat( this.$holder?.css('left') as string ) || 0
  }
  private handle( e: any ){
    if( this.context.isPanning
        || this.context.isResizing
        || !this.$holder?.length ) return

    const scaleQuo = this.context.getScaleQuo()

    if( this.isPendingMove ){
      const
      deltaX = Math.abs( e.pageX - this.initialCursorX ),
      deltaY = Math.abs( e.pageY - this.initialCursorY ),
      moveThreshold = this.context.options.MOVE_THRESHOLD || 5

      if( Math.max( deltaX, deltaY ) > moveThreshold ){
        this.isPendingMove = false
        this.context.isMoving = true
        this.cursorX = e.pageX
        this.cursorY = e.pageY
      }
      else return
    }

    if( !this.context.isMoving ) return

    const
    deltaX = ( e.pageX - this.cursorX ) * scaleQuo,
    deltaY = ( e.pageY - this.cursorY ) * scaleQuo

    if( Number.isNaN( deltaX ) || Number.isNaN( deltaY ) ) return

    let
    newTop = this.startTop + deltaY,
    newLeft = this.startLeft + deltaX

    if( this.snapguide ){
      const snapped = this.snapguide.calculate( this.$holder, newLeft, newTop )

      if( snapped ){
        newTop = snapped.newTop
        newLeft = snapped.newLeft
      }
    }

    this.$holder.css({ top: `${newTop}px`, left: `${newLeft}px` })
  }
  private stop(){
    if( !this.isPendingMove && !this.context.isMoving ) return

    this.context.isMoving = false
    this.isPendingMove = false
    this.$holder = undefined

    this.snapguide?.hide()
  }

  enable(){
    if( !this.context.$canvas.length ) return

    this.context
    .events( this.context.$canvas )
    .on('mousedown.move', `[${this.context.options.attribute}]`, e => {
      !this.context.constraints<MoveActionType>('move', 'start', e )
      && this.start( e )
    } )

    this.context
    .events( this.context.$viewport )
    .on('mousemove.move', e => { 
      !this.context.constraints<MoveActionType>('move', 'handle', e )
      && this.handle( e )
    } )
    .on('mouseup.move', e => {
      !this.context.constraints<MoveActionType>('move', 'stop', e )
      && this.stop()
    } )
  }
  disable(){
    this.context.events( document).off('.move')
  }
}