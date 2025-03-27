import type Editor from '../editor'
import type { Metavars, Component } from '@lipsjs/lips'

import $, { type Cash } from 'cash-dom'
import { EventEmitter } from 'events'
import { throttle } from '../utils'

const
SELECTED_CLASS = 'selected',
DRAG_CLASS = 'sortable-drag',
GHOST_CLASS = 'sortable-ghost',
GROUP_DROP_CLASS = 'sortable-group-drop',
PLACEHOLDER_CLASS = 'sortable-placeholder',

ANIMATION_DEFAULT = 150,
Z_INDEX_GHOST = 1000,
SCROLL_SPEED = 20,
DRAG_THRESHOLD = 5,
DRAG_ZONE_SIZE = 0.3 // 30% of item height for group insertion

export type ReorderedItems = {
  $: Cash
  key: string
  path: string
  sourceIndex: number
  targetIndex: number
}
export type Reordered = {
  items: ReorderedItems[]
  sourcePath: string
  targetPath: string
  level: number
}

export type SortableOptions = {
  list: string
  item: string
  uid: string  // Unique item identifier (attribute)
  pathattr: string // Item path identifier (attribute)
  groupattr?: string // Group item identifier (attribute)
  handle?: string
  placeholder?: string
  animation?: number
  ghostClass?: string
  dragClass?: string
  selectedClass?: string
  groupDropClass?: string
  nested?: boolean
  multiDrag?: boolean
  dragThreshold?: number
  scrollSpeed?: number
}

export default class Sortable<MT extends Metavars> extends EventEmitter {
  private editor: Editor
  private component: Component<MT> | null

  private options: SortableOptions
  private dragging: boolean = false
  private scrollInterval?: number

  private $block?: Cash
  private $ghost: Cash | null = null
  private $sourceList: Cash | null = null
  private $placeholder: Cash | null = null
  private $dragElements: Cash[] = []

  private level: number = 0
  private startY: number = 0
  private selectedItems: Map<string, Cash> = new Map()
  private boundHandleKeyboard: ( e: KeyboardEvent ) => void

  constructor( editor: Editor, component: Component<MT>, options: SortableOptions ){
    super()
    
    this.editor = editor
    this.component = component
    
    this.options = {
      animation: ANIMATION_DEFAULT,
      ghostClass: GHOST_CLASS,
      dragClass: DRAG_CLASS,
      selectedClass: SELECTED_CLASS,
      groupDropClass: GROUP_DROP_CLASS,
      nested: true,
      multiDrag: true,
      dragThreshold: DRAG_THRESHOLD,
      scrollSpeed: SCROLL_SPEED,
      ...options
    }

    this.boundHandleKeyboard = this.handleKeyboard.bind(this)
    
    this.component.node && this.bind()
    this.component.on('component:attached', () => this.bind() )
    this.component.on('component:detached', () => this.unbind() )
    this.component.on('component:attachment-timeout', () => console.warn('Sortable component failed to attach within timeout period') )
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
    $container = this.$block?.find( this.options.list ).parent()
    if( !$container?.length ) return

    const 
    containerHeight = $container.innerHeight() || 0,
    containerOffset = $container.offset()?.top || 0,
    relativeY = clientY - containerOffset
    
    if( relativeY < scrollThreshold )
      this.startAutoScroll( $container, -(this.options.scrollSpeed || SCROLL_SPEED) )
    
    else if( relativeY > containerHeight - scrollThreshold )
      this.startAutoScroll( $container, this.options.scrollSpeed || SCROLL_SPEED )
    
    else this.stopAutoScroll()
  }
  private startAutoScroll( $container: Cash, speed: number ){
    if( this.scrollInterval ) return
    this.scrollInterval = window.setInterval( () => $container[0]?.scrollBy( 0, speed ), 16 ) // ~60fps
  }
  private stopAutoScroll(){
    if( !this.scrollInterval ) return

    clearInterval( this.scrollInterval )
    this.scrollInterval = undefined
  }

  private getLevel( el: Element ): number {
    return $(el).parents( this.options.list ).length
  }
  private emitReorder( $item: Cash, $list: Cash ){
    // this.emit('sortable.reorder', {
    //   $items: [ $item ],
    //   $sourceList: $list,
    //   $targetList: $list,
    //   oldIndices: [ $item.index() ],
    //   newIndex: $item.index(),
    //   level: this.getLevel( $item[0] as Element )
    // })
  }

  addSelection( $item: Cash ){
    if( !$item[0] ) return

    const 
    self = this,
    uid = $item.attr( this.options.uid )
    if( !uid || this.selectedItems.has( uid ) ) return

    // Unselect any children when parent is selected
    $item
    .find( this.options.item )
    .each(function(){ self.removeSelection( $(this), true ) })

    // Unselect any parent when children is selected
    $item
    .closest(`.${this.options.selectedClass}`)
    .each(function(){ self.removeSelection( $(this), true ) })

    this.selectedItems.set( uid, $item )

    $item
    .addClass( this.options.selectedClass as string )
    .attr({
      'aria-selected': 'true',
      'aria-grabbed': 'false'
    })

    this.emit('sortable.select', [ ...this.selectedItems.keys() ])
  }
  removeSelection( $item: Cash, partial = false ){
    if( !$item[0] ) return

    const uid = $item.attr( this.options.uid ) as string
    if( !this.selectedItems.has( uid ) ) return

    this.selectedItems.delete( uid )

    $item
    .removeClass( this.options.selectedClass )
    .attr({
      'aria-selected': 'false',
      'aria-grabbed': 'false'
    })

    !partial && this.emit('sortable.select', [ ...this.selectedItems.keys() ])
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

    this.$placeholder = $('<div/>').addClass( this.options.placeholder || PLACEHOLDER_CLASS )
                                    .attr('role', 'presentation')

    // Insert placeholder after the last dragged item initially
    const $lastDragElement = this.$dragElements[ this.$dragElements.length - 1 ]
    this.$placeholder.insertAfter( $lastDragElement )

    this.$dragElements.forEach( $each => {
      this.options.dragClass && $each.addClass( this.options.dragClass )
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
    $belowItem = $below.is( this.options.item ) ? $below : $below.closest( this.options.item )
    let $belowList = $below.is( this.options.list ) ? $below : $below.closest( this.options.list )

    /**
     * Find the nearest list if we're not over a valid target
     */
    if( !$belowList?.length ){
      if( !this.$sourceList ) return

      $belowList = this.$sourceList
    }

    // Get item's position and dimensions
    const belowOffset = $belowItem.offset()
    if( !belowOffset ) return

    const
    itemTop = belowOffset.top,
    itemHeight = $belowItem.outerHeight() || 0,
    itemBottom = itemTop + itemHeight,
    ghostCenter = y,
    $belowListItems = $belowList.find( this.options.item )
    
    let placed = false

    // Check if hovering over a group item
    if( $belowItem.length && this.options.groupattr && $belowItem.attr( this.options.groupattr ) === 'group' ){
      // Calculate drag zones
      const 
      topZone = itemTop + (itemHeight * DRAG_ZONE_SIZE),
      bottomZone = itemBottom - (itemHeight * DRAG_ZONE_SIZE)

      // If in middle zone of group, place inside group
      if( ghostCenter > topZone && ghostCenter < bottomZone ){
        const $groupList = $belowItem.find(this.options.list).first()
        
        if( $groupList.length ){
          this.$placeholder?.prependTo($groupList)
          $belowItem.addClass( GROUP_DROP_CLASS )

          placed = true
        }
      }
    }

    // If not placing in group, handle normal positioning
    if( !placed ){
      // Remove any existing group drop styling
      this.$block.find(`.${GROUP_DROP_CLASS}`).removeClass( GROUP_DROP_CLASS )

      $belowListItems.each(( _, each ) => {
        const 
        $each = $(each),
        eachOffset = $each.offset()

        if( !eachOffset || this.$dragElements.some( $drag => $drag.is( $each ) ) ) return

        const elemCenter = eachOffset.top + ( $each.outerHeight() || 0 ) / 2
        if( ghostCenter > elemCenter ){
          this.$placeholder?.insertAfter( $each )
          placed = true
        }
      })

      !placed && $belowListItems.length
      && this.$placeholder?.insertBefore( $belowListItems.first() )

      // If list is empty, append placeholder
      !placed && !$belowListItems.length
      && this.$placeholder?.appendTo( $belowList )
    }
  }, 16, { leading: true, trailing: true })

  private endDrag(){
    if( !this.dragging ) return

    // Store placeholder reference and validate its position
    const 
    $placeholder = this.$placeholder,
    $placeholderParent = $placeholder?.parent()
    let inserted = false

    if( $placeholder?.length && $placeholderParent?.length ){
      /**
       * Move all selected elements to new position
       * Validate each move to prevent hierarchy errors
       */
      this.$dragElements
      .reverse()
      .forEach( $each => {
        $each
        .removeClass( this.options.dragClass )
        .attr('aria-grabbed', 'false')
        
        // Skip if placeholder not in DOM
        if( !$placeholder.parent().length ) return

        /**
         * Prevent inserting element into itself or its 
         * children. Check if placeholder is inside the 
         * current element (would create invalid hierarchy)
         */
        if( $placeholder.parents().get().includes( $each[0] as any ) ) return
        if( $each.is( $placeholder ) ) return
        
        $each.insertBefore( $placeholder )
        inserted = true
      })
    }

    if( inserted ){
      const items: ReorderedItems[] = this.$dragElements.map( ( $: Cash, idx: number ) => ({
        $,
        path: $.attr( this.options.pathattr ) as string,
        key: $.attr( this.options.uid ) as string,
        sourceIndex: this.$dragElements.map( $each => $each.index() )[ idx ],
        targetIndex: (this.$placeholder?.index() || 0) + idx
      }))

      this.emit('sortable.reorder', {
        items,
        sourcePath: this.$sourceList?.attr( this.options.pathattr ),
        targetPath: this.$placeholder?.closest( this.options.list ).attr( this.options.pathattr ),
        level: this.getLevel( this.$placeholder?.[0] as Element )
      } as Reordered )
    }

    // Clean up any remaining group-drop-target classes
    this.$block?.find('.'+ this.options.groupDropClass ).removeClass( this.options.groupDropClass )
    
    this.options.ghostClass && this.$block?.find('.'+ this.options.ghostClass ).remove()
    this.options.placeholder && this.$block?.find('.'+ this.options.placeholder ).remove()

    this.$ghost?.remove()
    this.$placeholder?.remove()
    
    $(document).off('.sortable')
    
    // Clear state
    this.dragging = false
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
    this.$block = this.component?.node
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
        
        this.selectedItems.has( $item.attr( this.options.uid ) as string )
                      ? this.removeSelection( $item )
                      : this.addSelection( $item )
      })

    $list.on('mousedown', this.options.handle || this.options.item, ( e: MouseEvent ) => {
      // Only left mouse button
      if( e.button !== 0 ) return
      e.stopPropagation()

      let $item = $(e.target as Element)
      if( $item.not( this.options.item ) )
        $item = $item.closest( this.options.item )

      if( !$item.length || !$item[0] ) return
      e.preventDefault()
      
      this.$sourceList = $item.closest( this.options.list )
      this.level = this.getLevel( $item[0] as Element )

      // Handle multi-selection drag
      if( this.options.multiDrag && this.selectedItems.size > 0 ){
        if( !this.selectedItems.has( $item.attr( this.options.uid ) as string ) ){
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