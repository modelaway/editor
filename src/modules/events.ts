import type Workspace from './workspace'
import {
  CONTROL_FLOATING_SELECTOR,
  CONTROL_TOOLBAR_SELECTOR,
  CONTROL_PANEL_SELECTOR,
  CONTROL_FRAME_SELECTOR,
  FRAME_BLANK_DOCUMENT
} from './constants'
import { debug } from './utils'

/**
 * Global event listener of tab components 
 * in the workspace.
 */
export function onTab( $this: JQuery<HTMLElement>, ws: Workspace ){
  debug('tab event --', $this.attr('tab'), $this.attr('params') )

  /**
   * Lookup the DOM from the main parent perspective
   * make it easier to find different options blocks
   */
  const $block = $this.parents(`[${CONTROL_PANEL_SELECTOR}]`)

  // Disable currently active tab & section
  $block.find('.active').removeClass('active')

  // Active tab
  $this.addClass('active')
  // Show active section
  $block.find(`[section="${$this.attr('tab')}"]`).addClass('active')
}

/**
 * Workspace component display trigger events
 */
export function onShow( $this: JQuery<HTMLElement>, ws: Workspace ){
  debug('show event --', $this.attr('show'), $this.attr('params') )

  const
  /**
   * Lookup the DOM from the main parent perspective
   * make it easier to find different options blocks
   */
  $trigger = $this.parents(`[${CONTROL_TOOLBAR_SELECTOR}],[${CONTROL_PANEL_SELECTOR}],[${CONTROL_FLOATING_SELECTOR}]`)

  switch( $this.attr('show') ){
    case 'styles':
    case 'assets':
    case 'settings': {
      ws.$global?.addClass('active')

      // TODO: Open global tabs by `$this.attr('params')` value

    } break

    // Show main canvas overview
    case 'overview': ws.flux.workspace.overview(); break

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

    case 'panel': {
      const frame = ws.flux.frames.active()
      if( !frame ) return

      const key = $trigger.attr( CONTROL_TOOLBAR_SELECTOR )
      if( !key ) return

      const view = frame.views.get( key )
      if( !view ) return
      
      view.showPanel()
    } break

    case 'finder': {
      const frame = ws.flux.frames.active()
      if( !frame ) return

      /**
       * Hold find view trigger key in clipboard as 
       * destination element to the following `add-view`
       * procedure.
       */
      const key = $trigger.attr( CONTROL_FLOATING_SELECTOR )
      if( !key ) return
      
      const view = frame.views.get( key )
      if( !view ) return
      
      ws.clipboard = {
        type: 'finder',
        value: key ? 'discret' : 'alley',
        key
      }

      switch( $this.attr('params') ){
        case 'view': view.showViewFinder( $trigger ); break
        // case 'layout': showLayoutFinder( $trigger, ws ); break
      }
    } break
  }
}

/**
 * Global apply event: To trigger `name` and `value`
 * application from workspace to views
 */
export function onApply( $this: JQuery<HTMLElement>, ws: Workspace ){
  debug('apply event --', $this.attr('apply'), $this.attr('params') )

  const frame = ws.flux.frames.active()
  if( !frame ) return
  
  const
  /**
   * Lookup the DOM from the main parent perspective
   * make it easier to find different options blocks
   */
  $trigger = $this.parents(`[${CONTROL_TOOLBAR_SELECTOR}],[${CONTROL_PANEL_SELECTOR}],[${CONTROL_FLOATING_SELECTOR}]`),
  key = $trigger.attr( CONTROL_TOOLBAR_SELECTOR )
        || $trigger.attr( CONTROL_PANEL_SELECTOR )
        || $trigger.attr( CONTROL_FLOATING_SELECTOR )
  if( !key ) return
  
  const view = frame.views.get( key )
  if( !view ) return

  const
  _attr = $this.attr('apply') as string,
  _params = $this.attr('params')

  view.bridge.events.emit('apply', _attr, _params )
}

/**
 * Global workspace action event listener
 */
export function onAction( $this: JQuery<HTMLElement>, ws: Workspace ){
  debug('action event --', $this.attr('action'), $this.attr('params') )
  /**
   * Lookup the DOM from the main parent perspective
   * make it easier to find different options blocks
   */
  const $trigger = $this.parents(`[${CONTROL_FRAME_SELECTOR}],[${CONTROL_TOOLBAR_SELECTOR}],[${CONTROL_FLOATING_SELECTOR}]`)
  
  switch( $this.attr('action') ){
    /**
     * -------------- Frame controls --------------
     */
    // Add new view to the DOM
    case 'frame.add': {
      const options = {
        title: 'New Frame',
        device: 'default'
      }
      
      ws.flux.frames.add( options )
    } break
    // Focus a frame for edit
    // case 'frame.focus': ws.flux.frames.focus( $trigger.attr( CONTROL_FRAME_SELECTOR ) as string ); break
    // Delete a frame
    case 'frame.delete': ws.flux.frames.remove( $trigger.attr( CONTROL_FRAME_SELECTOR ) as string ); break

    /**
     * -------------- History navigation controls --------------
     */
    // Undo history
    case 'undo': {
      const frame = ws.flux.frames.active()
      if( !frame ) return

      // Revert to last history stack
      const content = frame.history.undo()
      content !== undefined && frame.setContent( content )
    } break
    // Redo history
    case 'redo': {
      const frame = ws.flux.frames.active()
      if( !frame ) return
      
      // Restore a reverted history stack
      const content = frame.history.redo()
      content !== undefined && frame.setContent( content )
    } break

    /**
     * -------------- Media screen switch --------------
     */
    case 'screen-mode.tv':
    case 'screen-mode.tablet':
    case 'screen-mode.mobile':
    case 'screen-mode.desktop':
    case 'screen-mode.default': {
      const frame = ws.flux.frames.active()
      if( !frame ) return

      const [ _, device ] = $this.attr('action')?.split('.') || []
      frame.resize( device )
    } break

    /**
     * -------------- View controls --------------
     */
    // Add new view to the DOM
    case 'add-view': {
      const name = $this.attr('params')
      if( !name 
          || ws.clipboard?.type !== 'finder'
          || !ws.clipboard.key ) return

      const frame = ws.flux.frames.active()
      if( !frame ) return
      
      // Use finder initiation trigger key as destination
      frame.views.add( name, ws.clipboard.key, ws.clipboard.value )
      // Clear clipboard
      ws.clipboard = null

      onDismiss( $this, ws )
    } break
    // Move view up
    case 'view.move-up': {
      const frame = ws.flux.frames.active()
      if( !frame ) return
      
      frame.views.move( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string, 'up' )
    } break
    // Move view down
    case 'view.move-down': {
      const frame = ws.flux.frames.active()
      if( !frame ) return
      
      frame.views.move( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string, 'down' )
    } break
    // Move view
    case 'view.move': {
      const frame = ws.flux.frames.active()
      if( !frame ) return
      
      frame.views.move( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string, 'any' )
    } break
    // Duplicate view
    case 'view.duplicate': {
      const frame = ws.flux.frames.active()
      if( !frame ) return
      
      frame.views.duplicate( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string )
    } break
    // Delete view
    case 'view.delete': {
      const frame = ws.flux.frames.active()
      if( !frame ) return
      
      frame.views.remove( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string )
    } break
    // Copy to clipboard
    case 'view.copy': {
      ws.clipboard = {
        type: $this.attr('params') as ClipBoard['type'],
        key: $trigger.attr( CONTROL_TOOLBAR_SELECTOR )
      }
    } break
    // Paste clipboard content
    case 'view.paste': {
      if( !ws.clipboard?.key || ws.clipboard.type !== 'view' )
        return

      const frame = ws.flux.frames.active()
      if( !frame ) return

      // Paste view
      const
      nextViewKey = $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) || $trigger.attr( CONTROL_FLOATING_SELECTOR ),
      nextToView = frame.views.get( nextViewKey as string )

      // Duplicated view next to specified pasting view position
      nextToView && frame.views.duplicate( ws.clipboard.key as string, nextToView.$$ )
      // Remove visible floating active
      // ws.flux.$root?.find(`[${CONTROL_FLOATING_SELECTOR}]`).remove()

      ws.clipboard = null
    } break
  }
}

/**
 * Global workspace component dismissing event listener
 */
export function onDismiss( $this: JQuery<HTMLElement>, ws: Workspace ){
  debug('dismiss event --', $this.attr('dismiss') )

  /**
   * Lookup the DOM from the main parent perspective
   * make it easier to find different options blocks
   */
  const $trigger = $this.parents(`[${CONTROL_TOOLBAR_SELECTOR}],[${CONTROL_PANEL_SELECTOR}],[${CONTROL_FLOATING_SELECTOR}]`)
  
  switch( $this.attr('dismiss') ){
    case 'global': ws.$global?.removeClass('active'); break
    
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

/**
 * Custom event defined by view, triggered global
 * and forwared to views.
 */
export function onCustomListener( $this: JQuery<HTMLElement>, ws: Workspace ){
  debug('custom on-* event --', $this.attr('on'), $this.attr('params') )

  const
  /**
   * Lookup the DOM from the main parent perspective
   * make it easier to find different options blocks
   */
  $trigger = $this.parents(`[${CONTROL_TOOLBAR_SELECTOR}],[${CONTROL_PANEL_SELECTOR}],[${CONTROL_FLOATING_SELECTOR}]`),
  frame = ws.flux.frames.active()
  if( !frame ) return

  const key = $trigger.attr( CONTROL_TOOLBAR_SELECTOR )
        || $trigger.attr( CONTROL_PANEL_SELECTOR )
        || $trigger.attr( CONTROL_FLOATING_SELECTOR )
  if( !key ) return

  const view = frame.views.get( key )
  if( !view ) return

  const 
  _event = $this.attr('on') as string,
  _params = $this.attr('params')

  view.bridge.events.emit( _event, _params )
}