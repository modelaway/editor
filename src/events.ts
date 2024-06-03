import type Controls from './controls'
import {
  VIEW_KEY_SELECTOR,
  VIEW_REF_SELECTOR,
  CONTROL_FLOATING_SELECTOR,
  CONTROL_DISCRET_SELECTOR,
  CONTROL_TOOLBAR_SELECTOR,
  CONTROL_ADDPOINT_MARGIN,
  CONTROL_PANEL_SELECTOR,
  CONTROL_EDGE_MARGIN
} from './constants'
import { 
  createFloating,
  createFinderPanel,
  createSearchResult
} from './block.factory'
import { debug, getTopography } from './utils'

/**
 * Auto-dismiss an element block at a 
 * time (in Seconds)
 * 
 * Default delay: 8 seconds
 */
let AUTO_DISMISS_TRACKERS: ObjectType<any> = {}
function autoDismiss( id: string, $this: JQuery<HTMLElement>, delay?: number ){
  // Cancel previous auto-dismiss-delay
  clearTimeout( AUTO_DISMISS_TRACKERS[ id ] )
  AUTO_DISMISS_TRACKERS[ id ] = setTimeout( () => $this.remove(), (delay || 5) * 1000 )
}
function finderPosition( $finder: JQuery<HTMLElement>, $trigger: JQuery<HTMLElement> ){
  let { x, y } = getTopography( $trigger, true )
  const
  pWidth = $finder.find('> [container]').width() || 0,
  pHeight = $finder.find('> [container]').height() || 0,
  // Window dimensions
  wWidth = $(window).width() || 0,
  wHeight = $(window).height() || 0
  
  /**
   * Not enough space at the left, position at the right
   */
  if( x < CONTROL_EDGE_MARGIN )
    x = CONTROL_EDGE_MARGIN

  /**
   * Not enough space at the right either, position 
   * over view.
   */
  if( ( x + pWidth + CONTROL_EDGE_MARGIN ) > wWidth )
    x -= pWidth + CONTROL_EDGE_MARGIN

  /**
   * Display panel in window view when element 
   * is position to close to the bottom.
   */
  if( ( y + pHeight + CONTROL_EDGE_MARGIN ) > wHeight )
    y -= pHeight

  $finder.css({ left: `${x}px`, top: `${y}px` })
}
function showViewFinder( key: string, $trigger: JQuery<HTMLElement>, self: Controls ){
  let $finder = $(createFinderPanel( key, self.flux.store.searchComponent() ))

  // Apply translation to text content in finder panel
  $finder = self.flux.i18n.propagate( $finder )
  self.flux.$modela?.append( $finder )

  /**
   * Put finder panel in position
   */
  finderPosition( $finder, $trigger )

  /**
   * Search input event listener
   */
  $finder
  .find('input[type="search"]')
  .on('input', function( this: Event ){
    const query = String( $(this).val() )
    /**
     * Trigger search with minimum 2 character input value
     * but also allow empty input to redisplay default
     * result list.
     */
    if( query.length == 1 ) return

    const 
    results = self.flux.store.searchComponent( query ),
    $results = $finder.find('.results')

    $results.html( createSearchResult( results ) )

    // Apply translation to results text contents
    self.flux.i18n.propagate( $results )
  })
}
function addView( $this: JQuery<HTMLElement>, self: Controls ){
  const name = $this.attr('params')
  if( !name 
      || self.clipboard?.type !== 'finder'
      || !self.clipboard.key ) return

  // Use finder initiation trigger key as destination
  self.flux.views.add( name, self.clipboard.key, self.clipboard.value )
  // Clear clipboard
  self.clipboard = null

  onDismiss( $this, self )
}

export function onTab( $this: JQuery<HTMLElement>, self: Controls ){
  debug('tab event --', $this.attr('tab'), $this.attr('params') )

  const
  /**
   * Lookup the DOM from the main parent perspective
   * make it easier to find different options blocks
   */
  $block = $this.parents(`[${CONTROL_PANEL_SELECTOR}]`)

  // Disable currently active tab & section
  $block.find('.active').removeClass('active')

  // Active tab
  $this.addClass('active')
  // Show active section
  $block.find(`[section="${$this.attr('tab')}"]`).addClass('active')
}
export function onShow( $this: JQuery<HTMLElement>, self: Controls ){
  debug('show event --', $this.attr('show'), $this.attr('params') )

  const
  /**
   * Lookup the DOM from the main parent perspective
   * make it easier to find different options blocks
   */
  $trigger = $this.parents(`[${CONTROL_TOOLBAR_SELECTOR}],[${CONTROL_PANEL_SELECTOR}],[${CONTROL_FLOATING_SELECTOR}],[${CONTROL_DISCRET_SELECTOR}]`),
  key = $trigger.attr( CONTROL_TOOLBAR_SELECTOR )
        || $trigger.attr( CONTROL_PANEL_SELECTOR )
        || $trigger.attr( CONTROL_FLOATING_SELECTOR )
        || $trigger.attr( CONTROL_DISCRET_SELECTOR )
  if( !key ) return

  switch( $this.attr('show') ){
    case 'global': {
      self.$globalToolbar?.hide()
      self.$globalBlock?.show()

      // TODO: Open global tabs by `$this.attr('params')` value

    } break

    // Show extra options
    case 'extra-toolbar': {
      $trigger.find('[options="extra"]').addClass('active')
      $this.hide() // Hide toggle
    } break

    // Show sub options
    case 'sub-toolbar': {
      $trigger.find(`[options="sub"][extends="${$this.attr('params')}"]`).addClass('active')
      /**
       * Hide the main options to give space to 
       * sub options: Usually long
       */
      $trigger.find('[options="main"]').hide()

      // Auto-dismiss extra options if exist
      $trigger.find('[options="extra"]').removeClass('active')
      $trigger.find('[show="extra-toolbar"]').show() // Restore toggle
    } break

    case 'panel': self.flux.views.get( key ).showPanel(); break

    case 'finder': {
      /**
       * Hold find view trigger key in clipboard as 
       * destination element to the following `add-view`
       * procedure.
       */
      self.clipboard = {
        type: 'finder',
        value: $trigger.attr( CONTROL_DISCRET_SELECTOR ) ? 'discret' : 'placeholder',
        key
      }

      switch( $this.attr('params') ){
        case 'view': showViewFinder( key, $trigger, self ); break
        // case 'layout': showLayoutFinder( $trigger, self ); break
      }
    } break
  }
}
export function onDismiss( $this: JQuery<HTMLElement>, self: Controls ){
  debug('dismiss event --', $this.attr('dismiss') )

  /**
   * Lookup the DOM from the main parent perspective
   * make it easier to find different options blocks
   */
  const $trigger = $this.parents(`[${CONTROL_TOOLBAR_SELECTOR}],[${CONTROL_PANEL_SELECTOR}],[${CONTROL_FLOATING_SELECTOR}],[${CONTROL_DISCRET_SELECTOR}]`)
  
  switch( $this.attr('dismiss') ){
    case 'global': {
      self.$globalToolbar?.show()
      self.$globalBlock?.hide()
    } break

    // Dismiss extra options
    case 'extra-toolbar': {
      $trigger.find('[options="extra"]').removeClass('active')
      $trigger.find('[show="extra-toolbar"]').show() // Restore toggle
    } break

    // Dismiss sub options
    case 'sub-toolbar': {
      $trigger.find('[options="sub"]').removeClass('active')
      // Restore main options to default
      $trigger.find('[options="main"]').show()
    } break

    // Dismiss element
    case 'panel':
    default: $trigger.remove(); break
  }
}
export function onApply( $this: JQuery<HTMLElement>, self: Controls ){
  debug('apply event --', $this.attr('apply'), $this.attr('params') )

  const
  /**
   * Lookup the DOM from the main parent perspective
   * make it easier to find different options blocks
   */
  $trigger = $this.parents(`[${CONTROL_TOOLBAR_SELECTOR}],[${CONTROL_PANEL_SELECTOR}],[${CONTROL_FLOATING_SELECTOR}],[${CONTROL_DISCRET_SELECTOR}]`),
  key = $trigger.attr( CONTROL_TOOLBAR_SELECTOR )
        || $trigger.attr( CONTROL_PANEL_SELECTOR )
        || $trigger.attr( CONTROL_FLOATING_SELECTOR )
        || $trigger.attr( CONTROL_DISCRET_SELECTOR )
  if( !key ) return

  const 
  _attr = $this.attr('apply') as string,
  _params = $this.attr('params')

  self.flux.views.get( key )?.bridge.events.emit('apply', _attr, _params )
}
export function onAction( $this: JQuery<HTMLElement>, self: Controls ){
  debug('action event --', $this.attr('action'), $this.attr('params') )
  /**
   * Lookup the DOM from the main parent perspective
   * make it easier to find different options blocks
   */
  const $trigger = $this.parents(`[${CONTROL_TOOLBAR_SELECTOR}],[${CONTROL_FLOATING_SELECTOR}],[${CONTROL_DISCRET_SELECTOR}]`)
  
  switch( $this.attr('action') ){
    // Add new view to the DOM
    case 'add-view': addView( $this, self ); break

    /**
     * -------------- View meta self --------------
     */

    // Move view up
    case 'view.move-up': self.flux.views.move( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string, 'up' ); break
    // Move view down
    case 'view.move-down': self.flux.views.move( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string, 'down' ); break
    // Move view
    case 'view.move': self.flux.views.move( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string, 'any' ); break
    // Duplicate view
    case 'view.duplicate': self.flux.views.duplicate( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string ); break
    // Delete view
    case 'view.delete': self.flux.views.remove( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string ); break
    // Copy to clipboard
    case 'view.copy': {
      self.clipboard = {
        type: $this.attr('params') as ClipBoard['type'],
        key: $trigger.attr( CONTROL_TOOLBAR_SELECTOR )
      }
    } break

    // Paste clipboard content
    case 'view.paste': {
      if( !self.clipboard?.key || self.clipboard.type !== 'view' )
        return

      // Paste view
      const
      nextViewKey = $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) || $trigger.attr( CONTROL_FLOATING_SELECTOR ),
      nextToView = self.flux.views.get( nextViewKey as string )

      // Duplicated view next to specified pasting view position
      nextToView && self.flux.views.duplicate( self.clipboard.key as string, nextToView.$ )
      // Remove visible floating active
      self.flux.$root?.find(`[${CONTROL_FLOATING_SELECTOR}]`).remove()

      self.clipboard = null
    } break

  }
}
export function onToolbar( $this: JQuery<HTMLElement>, self: Controls ){
  const key = $this.attr( VIEW_KEY_SELECTOR )
  debug('toolbar event --', key )

  if( !key ) return

  // Show toolbar
  const view = self.flux.views.get( key )
  view && view.showToolbar()
}
export function onFloating( $this: JQuery<HTMLElement>, self: Controls ){
  // Placeholder's ref key to attached view
  const key = $this.attr( VIEW_REF_SELECTOR )
  debug('floating event --', key )

  if( !key ) return
  const triggers = ['addpoint']

  /**
   * Show paste-view trigger point when a pending
   * copy of view is in the clipboard.
   */
  if( self.clipboard?.type == 'view' )
    triggers.push('paste')

  let $trigger = self.flux.$root?.find(`[${CONTROL_FLOATING_SELECTOR}]`)

  // Insert new floating point to the DOM
  if( !$trigger?.length ){
    let $floating = $(createFloating( key, 'view', triggers ))

    // Apply translation to text content on floating element
    $floating = self.flux.i18n.propagate( $floating )
    self.flux.$root?.append( $floating )

    $trigger = self.flux.$root?.find(`[${CONTROL_FLOATING_SELECTOR}="${key}"]`)
    if( !$trigger?.length ) return

    autoDismiss('floating', $trigger )
  }

  // Change key of currently floating point to new trigger's key
  else if( !$trigger.is(`[${CONTROL_FLOATING_SELECTOR}="${key}"]`) ){
    $trigger.attr( CONTROL_FLOATING_SELECTOR, key )
            .html( createFloating( key, 'view', triggers, true ) )

    autoDismiss('floating', $trigger )
  }
  
  // Addpoint already active
  else return
  
  let { left, top } = $this.offset() || { left: 0, top: 0 }
  const 
  tWidth = $trigger.find('> ul').width() || 0,
  dueXPosition = tWidth + CONTROL_ADDPOINT_MARGIN

  /**
   * Not enough space at the left, position at the right
   */
  if( ( left - dueXPosition ) >= 15 )
    left -= dueXPosition

  $trigger.css({ left: `${left}px`, top: `${top}px` })
}
export function onCustomListener( $this: JQuery<HTMLElement>, self: Controls ){
  debug('custom on-* event --', $this.attr('on'), $this.attr('params') )

  const
  /**
   * Lookup the DOM from the main parent perspective
   * make it easier to find different options blocks
   */
  $trigger = $this.parents(`[${CONTROL_TOOLBAR_SELECTOR}],[${CONTROL_PANEL_SELECTOR}],[${CONTROL_FLOATING_SELECTOR}],[${CONTROL_DISCRET_SELECTOR}]`),
  key = $trigger.attr( CONTROL_TOOLBAR_SELECTOR )
        || $trigger.attr( CONTROL_PANEL_SELECTOR )
        || $trigger.attr( CONTROL_FLOATING_SELECTOR )
        || $trigger.attr( CONTROL_DISCRET_SELECTOR )
  if( !key ) return

  const 
  _event = $this.attr('on') as string,
  _params = $this.attr('params')

  self.flux.views.get( key )?.bridge.events.emit( _event, _params )
}

export function onContentChange( $this: JQuery<HTMLElement>, self: Controls ){
  self.flux.history.lateRecord( $this.html() )
}
