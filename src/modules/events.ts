import { type Cash } from 'cash-dom'
import type Editor from './editor'

import {
  CONTROL_FLOATING_SELECTOR,
  CONTROL_TOOLBAR_SELECTOR,
  CONTROL_PANEL_SELECTOR,
  CONTROL_FRAME_SELECTOR
} from './constants'
import { debug } from './utils'

/**
 * Global event listener of tab components 
 * in the editor.
 */
export function onTab( $this: Cash, editor: Editor ){
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
 * Editor component display trigger events
 */
export function onShow( $this: Cash, editor: Editor ){
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
      editor.$global?.addClass('active')

      // TODO: Open global tabs by `$this.attr('params')` value

    } break

    // Show main canvas overview
    // case 'overview': editor.canvas.overview(); break

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
      const frame = editor.canvas.active()
      if( !frame ) return

      const key = $trigger.attr( CONTROL_TOOLBAR_SELECTOR )
      if( !key ) return

      const view = frame.vieeditor.get( key )
      if( !view ) return
      
      view.showPanel()
    } break

    case 'finder': {
      const frame = editor.canvas.active()
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
      
      editor.clipboard = {
        type: 'finder',
        value: key ? 'discret' : 'alley',
        key
      }

      switch( $this.attr('params') ){
        case 'view': view.showViewFinder( $trigger ); break
        // case 'layout': showLayoutFinder( $trigger, editor ); break
      }
    } break
  }
}

/**
 * Global apply event: To trigger `name` and `value`
 * application from editor to views
 */
export function onApply( $this: Cash, editor: Editor ){
  debug('apply event --', $this.attr('apply'), $this.attr('params') )

  const frame = editor.canvas.active()
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
 * Global editor action event listener
 */
export function onAction( $this: Cash, editor: Editor ){
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
      
      editor.canvas.addFrame( options )
    } break
    // Focus a frame for edit
    // case 'frame.focus': editor.canvas.focus( $trigger.attr( CONTROL_FRAME_SELECTOR ) as string ); break
    // Delete a frame
    case 'frame.delete': editor.canvas.remove( $trigger.attr( CONTROL_FRAME_SELECTOR ) as string ); break

    /**
     * -------------- History navigation controls --------------
     */
    // Undo history
    case 'undo': {
      const frame = editor.canvas.active()
      if( !frame ) return

      // Revert to last history stack
      const content = frame.history.undo()
      content !== undefined && frame.setContent( content )
    } break
    // Redo history
    case 'redo': {
      const frame = editor.canvas.active()
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
      const frame = editor.canvas.active()
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
          || editor.clipboard?.type !== 'finder'
          || !editor.clipboard.key ) return

      const frame = editor.canvas.active()
      if( !frame ) return
      
      // Use finder initiation trigger key as destination
      frame.vieeditor.add( name, editor.clipboard.key, editor.clipboard.value )
      // Clear clipboard
      editor.clipboard = null

      onDismiss( $this, editor )
    } break
    // Move view up
    case 'view.move-up': {
      const frame = editor.canvas.active()
      if( !frame ) return
      
      frame.views.move( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string, 'up' )
    } break
    // Move view down
    case 'view.move-down': {
      const frame = editor.canvas.active()
      if( !frame ) return
      
      frame.views.move( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string, 'down' )
    } break
    // Move view
    case 'view.move': {
      const frame = editor.canvas.active()
      if( !frame ) return
      
      frame.views.move( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string, 'any' )
    } break
    // Duplicate view
    case 'view.duplicate': {
      const frame = editor.canvas.active()
      if( !frame ) return
      
      frame.views.duplicate( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string )
    } break
    // Delete view
    case 'view.delete': {
      const frame = editor.canvas.active()
      if( !frame ) return
      
      frame.views.remove( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string )
    } break
    // Copy to clipboard
    case 'view.copy': {
      editor.clipboard = {
        type: $this.attr('params') as ClipBoard['type'],
        key: $trigger.attr( CONTROL_TOOLBAR_SELECTOR )
      }
    } break
    // Paste clipboard content
    case 'view.paste': {
      if( !editor.clipboard?.key || editor.clipboard.type !== 'view' )
        return

      const frame = editor.canvas.active()
      if( !frame ) return

      // Paste view
      const
      nextViewKey = $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) || $trigger.attr( CONTROL_FLOATING_SELECTOR ),
      nextToView = frame.views.get( nextViewKey as string )

      // Duplicated view next to specified pasting view position
      nextToView && frame.views.duplicate( editor.clipboard.key as string, nextToView.$ )
      // Remove visible floating active
      // editor.$root?.find(`[${CONTROL_FLOATING_SELECTOR}]`).remove()

      editor.clipboard = null
    } break
  }
}

/**
 * Global editor component dismissing event listener
 */
export function onDismiss( $this: Cash, editor: Editor ){
  debug('dismiss event --', $this.attr('dismiss') )

  /**
   * Lookup the DOM from the main parent perspective
   * make it easier to find different options blocks
   */
  const $trigger = $this.parents(`[${CONTROL_TOOLBAR_SELECTOR}],[${CONTROL_PANEL_SELECTOR}],[${CONTROL_FLOATING_SELECTOR}]`)
  
  switch( $this.attr('dismiss') ){
    case 'global': editor.$global?.removeClass('active'); break
    
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
export function onCustomListener( $this: Cash, editor: Editor ){
  debug('custom on-* event --', $this.attr('on'), $this.attr('params') )

  const
  /**
   * Lookup the DOM from the main parent perspective
   * make it easier to find different options blocks
   */
  $trigger = $this.parents(`[${CONTROL_TOOLBAR_SELECTOR}],[${CONTROL_PANEL_SELECTOR}],[${CONTROL_FLOATING_SELECTOR}]`),
  frame = editor.canvas.active()
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