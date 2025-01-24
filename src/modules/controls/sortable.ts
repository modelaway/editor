import type Editor from '../editor'
import type { Component } from '../../lips/lips'

import $, { type Cash } from 'cash-dom'
import { EventEmitter } from 'events'
import { throttle } from '../utils'

const
ANIMATION_DEFAULT = 150,
GHOST_CLASS = 'sortable-ghost',
DRAG_CLASS = 'sortable-drag',
SELECTED_CLASS = 'selected',
PLACEHOLDER_CLASS = 'sortable-placeholder',
Z_INDEX_GHOST = 1000,
SCROLL_SPEED = 20,
DRAG_THRESHOLD = 5

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
  dragThreshold?: number
  scrollSpeed?: number
}

export default class Sortable<Input = void, State = void, Static = void, Context = void> extends EventEmitter {
  private editor: Editor
  private component: Component<Input, State, Static, Context> | null

  private options: SortableOptions
  private dragging: boolean = false
  private scrollInterval?: number

  private $block?: Cash
  private $ghost: Cash | null = null
  private $sourceList: Cash | null = null
  private $placeholder: Cash | null = null
  private $dragElements: Cash[] = []

  private sourceGroup: string = ''
  private level: number = 0
  private startY: number = 0
  private selectedItems: Map<Element, Cash> = new Map()
  private boundHandleKeyboard: ( e: KeyboardEvent ) => void

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
      dragThreshold: DRAG_THRESHOLD,
      scrollSpeed: SCROLL_SPEED,
      ...options
    }

    this.boundHandleKeyboard = this.handleKeyboard.bind(this)
    
    this.component.getNode() && this.bind()
    this.component.on('render', () => this.bind() )
  }

  private handleKeyboard( e: KeyboardEvent ){
    if( !this.selectedItems.size ) return

    const 
    $selected = [ ...this.selectedItems.values() ][0],
    $list = $selected.closest( this.options.list )
    
    switch( e.key ){
      case 'ArrowUp': {
        e.preventDefault()

        const $prev = $selected.prev( this.options.item )
        if( !$prev.length ) return

        $selected.insertBefore( $prev )
        this.emitReorder( $selected, $list )
      } break

      case 'ArrowDown': {
        e.preventDefault()

        const $next = $selected.next( this.options.item )
        if( !$next.length ) return
        
        $selected.insertAfter( $next )
        this.emitReorder( $selected, $list )
      } break
    }
  }

  private handleAutoScroll( clientY: number ){
    const 
    scrollThreshold = 50,
    viewportHeight = window.innerHeight
    
    if( clientY < scrollThreshold )
      this.startAutoScroll( -(this.options.scrollSpeed || SCROLL_SPEED) )
    
    else if( clientY > viewportHeight - scrollThreshold )
      this.startAutoScroll( this.options.scrollSpeed || SCROLL_SPEED )
    
    else this.stopAutoScroll()
  }
  private startAutoScroll( speed: number ){
    if( this.scrollInterval ) return
    this.scrollInterval = window.setInterval( () => window.scrollBy( 0, speed ), 16 ) // ~60fps
  }
  private stopAutoScroll(){
    if( !this.scrollInterval ) return

    clearInterval( this.scrollInterval )
    this.scrollInterval = undefined
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
  private emitReorder( $item: Cash, $list: Cash ){
    this.emit('sortable.reorder', {
      $items: [ $item ],
      $sourceList: $list,
      $targetList: $list,
      oldIndices: [ $item.index() ],
      newIndex: $item.index(),
      level: this.getLevel( $item[0] as Element )
    })
  }

  addSelection( $item: Cash ){
    if( !$item[0] ) return

    const 
    self = this,
    mkey = $item[0]
    if( this.selectedItems.has( mkey ) ) return

    // Unselect any children when parent is selected
    $item
    .find( this.options.item )
    .each( function(){ self.removeSelection( $(this), true ) } )

    // Unselect any parent when children is selected
    $item
    .closest(`.${this.options.selectedClass}`)
    .each( function(){ self.removeSelection( $(this), true ) } )

    this.selectedItems.set( mkey, $item )

    $item
    .addClass( this.options.selectedClass as string )
    .attr({
      'aria-selected': 'true',
      'aria-grabbed': 'false'
    })

    this.emit('sortable.select', [ ...this.selectedItems.values() ])
  }
  removeSelection( $item: Cash, partial = false ){
    if( !$item[0] ) return

    const mkey = $item[0]
    if( !this.selectedItems.has( mkey ) ) return

    this.selectedItems.delete( mkey )

    $item
    .removeClass( this.options.selectedClass )
    .attr({
      'aria-selected': 'false',
      'aria-grabbed': 'false'
    })

    !partial && this.emit('sortable.select', [ ...this.selectedItems.values() ])
  }
  clearSelection( $list?: Cash ){
    this.selectedItems.clear()

    ;($list || this.$block)
    ?.find(`.${this.options.selectedClass}`)
    ?.removeClass( this.options.selectedClass )
    ?.attr({
      'aria-selected': 'false',
      'aria-grabbed': 'false'
    })
    
    this.emit('sortable.select', [])
  }

  private startDrag( $item: Cash, y: number ){
    if( this.dragging ) return

    this.dragging = true
    this.startY = y

    /**
     * Create composite ghost for multiple items
     */
    if( this.$dragElements.length > 1 ){
      const $ghostList = $('<div/>').addClass( this.options.ghostClass as string )
                                    .attr('role', 'list')

      this.$dragElements.forEach( $each => {
        const $clone = $each.clone()
                            .css('position', 'relative')
                            .attr('role', 'listitem') 

        $ghostList.append( $clone )
      })

      this.$ghost = $ghostList
    }
    else this.$ghost = $item.clone()
                            .addClass( this.options.ghostClass as string )
                            .attr('role', 'listitem')

    this.$ghost.css({
      position: 'fixed',
      width: $item.outerWidth(),
      top: $item.position()?.top || 0,
      zIndex: Z_INDEX_GHOST,
      pointerEvents: 'none'
    })

    /**
     * Create placeholder covering total height 
     * of selected items
     */
    const totalHeight = this.$dragElements.reduce( ( sum, $each ) => sum + $each.outerHeight(), 0 )

    this.$placeholder = $('<div/>').addClass( this.options.placeholder || PLACEHOLDER_CLASS )
                                    .attr('role', 'presentation')
                                    .css({
                                      height: totalHeight,
                                      marginBottom: $item.css('marginBottom') || '0px'
                                    })

    this.$dragElements.forEach( $each => {
      this.options.dragClass
      && $each.addClass( this.options.dragClass )

      $each.attr('aria-grabbed', 'true')
    })
    
    this.$block?.append( this.$ghost )
  }
  private readonly onDrag = throttle( ( x: number, y: number ) => {
    if( !this.dragging || !this.$block?.length ) return

    const deltaY = y - this.startY
    this.$ghost?.css('transform', `translateY(${deltaY}px)`)

    // Handle auto-scrolling
    this.handleAutoScroll( y )

    const elemBelow = document.elementFromPoint( x, y )
    if( !elemBelow ) return
    
    const 
    $below = $(elemBelow),
    $belowList = $below.closest( this.options.list )
    if( !$belowList.length ) return

    // const 
    // targetGroup = this.getGroup( $belowList[0] as Element ),
    // targetLevel = this.getLevel( $belowList[0] as Element )
    
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
        this.$placeholder?.insertAfter( $each )
        placed = true
      }
    })

    if( !placed && $belowItems.length )
      this.$placeholder?.insertBefore( $belowItems.first() )

    else if( !placed )
      $belowList.append( this.$placeholder as Cash )

  }, 16, { leading: true, trailing: true })
  private endDrag(){
    if( !this.dragging ) return
    
    this.emit('sortable.reorder', {
      $items: this.$dragElements,
      $sourceList: this.$sourceList,
      $targetList: this.$placeholder?.closest( this.options.list ),
      oldIndices: this.$dragElements.map( $each => $each.index() ),
      newIndex: this.$placeholder?.index(),
      level: this.getLevel( this.$placeholder?.[0] as Element )
    })

    // Store placeholder reference before later removal
    const $placeholder = this.$placeholder

    /**
     * Move all selected elements to new position
     */
    this.$dragElements
    .reverse()
    .forEach( $each => {
      $each
      .removeClass( this.options.dragClass )
      .attr('aria-grabbed', 'false')
      
      // Skip if placeholder not in DOM
      $placeholder?.parent().length
      && $each.insertBefore( $placeholder )
    })
    
    this.options.ghostClass && this.$block?.find('.'+ this.options.ghostClass ).remove()
    this.options.placeholder && this.$block?.find('.'+ this.options.placeholder ).remove()

    this.$ghost?.remove()
    this.$placeholder?.remove()
    
    $(document).off('.sortable')
    
    // Clear state
    this.dragging = false
    this.sourceGroup = ''
    this.level = 0

    this.$ghost = null
    this.$sourceList = null
    this.$placeholder = null
    this.$dragElements = []

    this.stopAutoScroll()
  }

  private addAccessibilityAttributes(){
    this.$block
    ?.find( this.options.item )
    .attr({
      'role': 'listitem',
      'aria-grabbed': 'false',
      'tabindex': '0'
    })

    this.$block
    ?.find( this.options.list )
    .attr({
      'role': 'list',
      'aria-dropeffect': 'move'
    })
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
    
    const $list = this.$block.find( this.options.list )
    if( !$list?.length ) return

    this.unbind()

    // Add accessibility attributes
    this.addAccessibilityAttributes()

    // Add keyboard support
    $(document).on('keydown.sortable', this.boundHandleKeyboard )

    /**
     * Handle on- multiple select 
     */
    this.options.multiDrag
    && $list.on('click', this.options.item, ( e: MouseEvent ) => {
        e.preventDefault()
        e.stopPropagation()

        if( !e.ctrlKey && !e.metaKey ){
          this.clearSelection()
          return
        }
        
        const $item = $(e.currentTarget as Element)
        if( !$item[0] ) return
        
        this.selectedItems.has( $item[0] )
                      ? this.removeSelection( $item )
                      : this.addSelection( $item )
      })

    $list
    .on('mousedown', this.options.handle || this.options.item, ( e: MouseEvent ) => {
      // Only left mouse button
      if( e.button !== 0 ) return
      e.stopPropagation()

      let $item = $(e.target as Element)
      if( $item.not( this.options.item ) )
        $item = $item.closest( this.options.item )

      if( !$item.length || !$item[0] ) return
      e.preventDefault()
      
      this.$sourceList = $item.closest( this.options.list )
      this.sourceGroup = this.getGroup( this.$sourceList[0] as Element )
      this.level = this.getLevel( $item[0] as Element )

      // Handle multi-selection drag
      if( this.options.multiDrag && this.selectedItems.size > 0 ){
        if( !this.selectedItems.has( $item[0] ) ){
          this.clearSelection( $list )
          this.addSelection( $item )
        }

        this.$dragElements = [ ...this.selectedItems.values() ]
      }
      else this.$dragElements = [ $item ]
      
      const threshold = this.options.dragThreshold || DRAG_THRESHOLD
      let
      hasReachedThreshold = false,
      startX = e.clientX

      const checkThreshold = ( moveEvent: MouseEvent ) => {
        if( !hasReachedThreshold ){
          const deltaX = Math.abs( moveEvent.clientX - startX )
          const deltaY = Math.abs( moveEvent.clientY - this.startY )
          
          if( deltaX > threshold || deltaY > threshold ){
            hasReachedThreshold = true
            this.startDrag( $item, moveEvent.clientY )
          }
        }
        
        hasReachedThreshold && this.onDrag( moveEvent.clientX, moveEvent.clientY )
      }

      $(document)
      .on('mousemove.sortable', checkThreshold )
      .on('mouseup.sortable', () => {
        hasReachedThreshold && this.endDrag()
        $(document).off('.sortable')
      })
    })
  }
  unbind(){
    this.$block?.find( this.options.list )?.off('mousedown click')
    $(document).off('.sortable')
  }
  dispose(){
    this.unbind()
    this.clearSelection()
    this.stopAutoScroll()

    this.component = null
    this.$block = undefined
  }
}