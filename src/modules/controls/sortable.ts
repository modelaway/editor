import type Editor from '../editor'
import type { Component } from '../../lib/lips/lips'

import $, { type Cash } from 'cash-dom'
import { EventEmitter } from 'events'

const
ANIMATION_DEFAULT = 150,
GHOST_CLASS = 'sortable-ghost',
DRAG_CLASS = 'sortable-drag',
SELECTED_CLASS = 'selected',
PLACEHOLDER_CLASS = 'sortable-placeholder',
Z_INDEX_GHOST = 1000

export type SortableOptions = {
  list: string
  item: string
  handle?: string
  placeholder?: string
  animation?: number
  ghostClass?: string
  dragClass?: string
  selectedClass?: string
  group?: string | {
    name: string
    pull?: boolean | string[]
    put?: boolean | string[]
  }
  nested?: boolean
  multiDrag?: boolean
}

export default class Sortable<Input = void, State = void, Static = void, Context = void> extends EventEmitter {
  private editor: Editor
  private component: Component<Input, State, Static, Context> | null

  private options: SortableOptions
  private dragging: boolean = false

  private $block?: Cash
  private $ghost: any = null
  private $sourceList: any = null
  private $placeholder: any = null
  private $dragElements: Cash[] = []

  private sourceGroup: string = ''
  private level: number = 0
  private startY: number = 0
  private selectedItems: Set<any> = new Set()

  constructor( editor: Editor, component: Component<Input, State, Static, Context>, options: SortableOptions ){
    super()
    
    this.editor = editor
    this.component = component
    
    this.options = {
      animation: ANIMATION_DEFAULT,
      ghostClass: GHOST_CLASS,
      dragClass: DRAG_CLASS,
      selectedClass: SELECTED_CLASS,
      nested: true,
      multiDrag: true,
      ...options
    }

    this.component.getNode() && this.bind()
    this.component.on('render', () => this.bind() )
  }

  private getGroup( el: Element ): string {
    if( typeof this.options.group === 'string' ) return this.options.group
    if( typeof this.options.group === 'object' ) return this.options.group.name

    return $(el).closest( this.options.list ).attr('data-group') || ''
  }
  private canTransfer( fromGroup: string, toGroup: string ): boolean {
    if( !this.options.group ) return false
    if( typeof this.options.group === 'string' ) return true
    
    const group = this.options.group
    if( !group.pull || !group.put ) return false

    const 
    canPull = Array.isArray( group.pull ) ? 
              group.pull.includes( toGroup ) : 
              group.pull === true,
    
    canPut = Array.isArray( group.put ) ? 
             group.put.includes( fromGroup ) : 
             group.put === true

    return canPull && canPut
  }
  private getLevel( el: Element ): number {
    return $(el).parents( this.options.list ).length
  }

  addSelection( $item: Cash ){
    if( this.selectedItems.has( $item[0] ) ) return

    this.selectedItems.add( $item[0] )
    $item.addClass( this.options.selectedClass as string )
  }
  removeSelection( $item: Cash ){
    if( !this.selectedItems.has( $item[0] ) ) return

    this.selectedItems.delete($item[0])
    $item.removeClass( this.options.selectedClass )
  }
  clearSelection( $list?: Cash ){
    this.selectedItems.clear()
    ;($list || this.$block)?.find(`.${this.options.selectedClass}`)?.removeClass( this.options.selectedClass )
  }

  private startDrag( $item: any, y: number ){
    this.dragging = true
    this.startY = y

    /**
     * Create composite ghost for multiple items
     */
    if( this.$dragElements.length > 1 ){
      const $ghostList = $('<div/>').addClass( this.options.ghostClass as string )

      this.$dragElements.forEach( $each => $ghostList.append( $each.clone().css('position', 'relative') ) )
      this.$ghost = $ghostList
    }
    else this.$ghost = $item.clone().addClass( this.options.ghostClass )

    this.$ghost.css({
      position: 'fixed',
      width: $item.outerWidth(),
      // left: $item.offset().left,
      top: $item.position().top,
      zIndex: Z_INDEX_GHOST,
      pointerEvents: 'none'
    })

    /**
     * Create placeholder covering total height 
     * of selected items
     */
    const totalHeight = this.$dragElements.reduce( ( sum, $each ) => sum + $each.outerHeight(), 0 )

    this.$placeholder = $('<div/>').addClass( this.options.placeholder || PLACEHOLDER_CLASS )
                                    .css({
                                      height: totalHeight,
                                      marginBottom: $item.css('marginBottom')
                                    })

    // $item.after( this.$placeholder )
    this.$dragElements.forEach( $each => this.options.dragClass && $each.addClass( this.options.dragClass ) )
    
    this.$block?.append( this.$ghost )
  }
  private onDrag( x: number, y: number ){
    if( !this.dragging || !this.$block?.length ) return

    const deltaY = y - this.startY
    this.$ghost.css('transform', `translateY(${deltaY}px)`)

    const elemBelow = document.elementFromPoint( x, y )
    if( !elemBelow ) return
    
    const 
    $below = $(elemBelow),
    $belowList = $below.closest( this.options.list )
    if( !$belowList.length ) return

    const 
    targetGroup = this.getGroup( $belowList[0] as Element ),
    targetLevel = this.getLevel( $belowList[0] as Element )
    
    // console.log('guard --', targetGroup, targetLevel, this.level )

    // if( !this.canTransfer( this.sourceGroup, targetGroup ) ) return
    // if( !this.options.nested && targetLevel !== this.level ) return
    
    const
    $belowItems = $belowList.find( this.options.item ),
    ghostCenter = y

    let placed = false
    $belowItems.each( ( _, each ) => {
      const $each = $(each)
      if( this.$dragElements.some( $drag => $drag.is( $each ) ) ) return

      const elemCenter = ($each.offset()?.top || 0) + $each.outerHeight() / 2
      if( ghostCenter > elemCenter ){
        this.$placeholder.insertAfter( $each )
        placed = true
      }
    })

    if( !placed && $belowItems.length )
      this.$placeholder.insertBefore( $belowItems.first() )

    else if( !placed )
      $belowList.append( this.$placeholder )
  }
  private endDrag(){
    if( !this.dragging ) return

    const
    $newList = this.$placeholder.closest( this.options.list ),
    $oldList = this.$sourceList,
    newIndex = this.$placeholder.index(),
    oldIndices = this.$dragElements.map( $each => $each.index() )
    
    this.emit('sortable:reorder', {
      elements: this.$dragElements,
      oldList: $oldList,
      newList: $newList,
      oldIndices: oldIndices,
      newIndex: newIndex,
      level: this.getLevel( this.$placeholder[0] )
    })

    /**
     * Move all selected elements to new position
     */
    this.$dragElements
    .reverse()
    .forEach( $each => {
      $each
      .removeClass( this.options.dragClass )
      .insertBefore( this.$placeholder )
    })
    
    if( this.options.ghostClass )
      this.$block?.find('.'+ this.options.ghostClass ).remove()
    if( this.options.placeholder )
      this.$block?.find('.'+ this.options.placeholder ).remove()

    this.$ghost.remove()
    this.$placeholder.remove()
    
    $(document).off('.sortable')
    
    // Clear state
    this.dragging = false
    this.sourceGroup = ''
    this.level = 0

    this.$ghost = null
    this.$sourceList = null
    this.$placeholder = null
    this.$dragElements = []
  }

  bind(){
    /**
     * Set block element with component node
     * 
     * IMPORTANT: Help rebind to the new $block element
     *            instance when component rerenders.
     */
    this.$block = this.component?.getNode()
    if( !this.$block ) return
    
    const
    $list = this.$block.find( this.options.list )
    if( !$list?.length ) return

    this.unbind()

    /**
     * Handle on- multiple select 
     */
    this.options.multiDrag
    && $list.on('click', this.options.item, ( e: MouseEvent ) => {
        if( !e.ctrlKey && !e.metaKey ) return
        
        const $item = $(e.currentTarget as Element)
        this.selectedItems.has( $item[0] )
                      ? this.removeSelection( $item )
                      : this.addSelection( $item )
      })

    const handle = this.options.handle || this.options.item

    $list.on('mousedown', handle, ( e: MouseEvent ) => {
      if( e.button !== 0 ) return // Only left mouse button

      let $item = $(e.target as Element)
      if( $item.not( this.options.item ) )
        $item = $item.closest( this.options.item )

      if( !$item.length ) return
      e.preventDefault()
      
      this.$sourceList = $item.closest( this.options.list )
      this.sourceGroup = this.getGroup( this.$sourceList[0] )
      this.level = this.getLevel( $item[0] as Element )

      // Handle multi-selection drag
      if( this.options.multiDrag && this.selectedItems.size > 0 ){
        if( !this.selectedItems.has( $item[0] ) ){
          this.clearSelection( $list )
          this.addSelection( $item )
        }

        this.$dragElements = Array.from( this.selectedItems ).map( each => $(each) )
      }
      else this.$dragElements = [ $item ]
      
      this.startDrag( $item, e.clientY )

      $(document)
      .on('mousemove.sortable', ( e: MouseEvent ) => this.onDrag( e.clientX, e.clientY ) )
      .on('mouseup.sortable', () => this.endDrag() )
    })
  }
  unbind(){
    this.$block?.find( this.options.list )?.off('mousedown click')
    $(document).off('.sortable')
  }

  dispose(){
    this.component = null
    this.$block = undefined

    this.clearSelection()
  }
}