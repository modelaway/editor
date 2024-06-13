import type Controls from './controls'
import {
  CONTROL_FLOATING_SELECTOR,
  CONTROL_DISCRET_SELECTOR,
  CONTROL_TOOLBAR_SELECTOR,
  CONTROL_PANEL_SELECTOR,
  CONTROL_FRAME_SELECTOR
} from './constants'
import { debug } from './utils'

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
  $trigger = $this.parents(`[${CONTROL_TOOLBAR_SELECTOR}],[${CONTROL_PANEL_SELECTOR}],[${CONTROL_FLOATING_SELECTOR}],[${CONTROL_DISCRET_SELECTOR}]`)

  switch( $this.attr('show') ){
    case 'styles':
    case 'assets':
    case 'settings': {
      self.$global?.addClass('active')

      // TODO: Open global tabs by `$this.attr('params')` value

    } break

    // Show main board
    case 'board': self.flux.frames.board(); break

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
      const frame = self.flux.frames.active()
      if( !frame ) return

      const key = $trigger.attr( CONTROL_TOOLBAR_SELECTOR )
      if( !key ) return

      const view = frame.views.get( key )
      if( !view ) return
      
      view.showPanel()
    } break

    case 'finder': {
      const frame = self.flux.frames.active()
      if( !frame ) return

      /**
       * Hold find view trigger key in clipboard as 
       * destination element to the following `add-view`
       * procedure.
       */
      const key = $trigger.attr( CONTROL_FLOATING_SELECTOR ) || $trigger.attr( CONTROL_DISCRET_SELECTOR )
      if( !key ) return
      
      const view = frame.views.get( key )
      if( !view ) return
      
      self.flux.controls.clipboard = {
        type: 'finder',
        value: key ? 'discret' : 'placeholder',
        key
      }

      switch( $this.attr('params') ){
        case 'view': view.showViewFinder( $trigger ); break
        // case 'layout': showLayoutFinder( $trigger, self ); break
      }
    } break
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
  frame = self.flux.frames.active()
  if( !frame ) return

  const key = $trigger.attr( CONTROL_TOOLBAR_SELECTOR )
        || $trigger.attr( CONTROL_PANEL_SELECTOR )
        || $trigger.attr( CONTROL_FLOATING_SELECTOR )
        || $trigger.attr( CONTROL_DISCRET_SELECTOR )
  if( !key ) return

  const view = frame.views.get( key )
  if( !view ) return

  const
  _attr = $this.attr('apply') as string,
  _params = $this.attr('params')

  view.bridge.events.emit('apply', _attr, _params )
}
export function onAction( $this: JQuery<HTMLElement>, self: Controls ){
  debug('action event --', $this.attr('action'), $this.attr('params') )
  /**
   * Lookup the DOM from the main parent perspective
   * make it easier to find different options blocks
   */
  const $trigger = $this.parents(`[${CONTROL_FRAME_SELECTOR}],[${CONTROL_TOOLBAR_SELECTOR}],[${CONTROL_FLOATING_SELECTOR}],[${CONTROL_DISCRET_SELECTOR}]`)
  
  switch( $this.attr('action') ){
    /**
     * -------------- Frame meta self --------------
     */
    // Mount a frame for edit on the board
    case 'frame.edit': self.flux.frames.edit( $trigger.attr( CONTROL_FRAME_SELECTOR ) as string ); break
    // Delete a frame on the board
    case 'frame.delete': self.flux.frames.remove( $trigger.attr( CONTROL_FRAME_SELECTOR ) as string ); break

    /**
     * -------------- View meta self --------------
     */
    // Add new view to the DOM
    case 'add-view': {
      const name = $this.attr('params')
      if( !name 
          || self.flux.controls.clipboard?.type !== 'finder'
          || !self.flux.controls.clipboard.key ) return

      const frame = self.flux.frames.active()
      if( !frame ) return
      
      // Use finder initiation trigger key as destination
      frame.views.add( name, self.flux.controls.clipboard.key, self.flux.controls.clipboard.value )
      // Clear clipboard
      self.flux.controls.clipboard = null

      onDismiss( $this, self )
    } break

    /**
     * -------------- View meta self --------------
     */
    // Move view up
    case 'view.move-up': {
      const frame = self.flux.frames.active()
      if( !frame ) return
      
      frame.views.move( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string, 'up' )
    } break
    // Move view down
    case 'view.move-down': {
      const frame = self.flux.frames.active()
      if( !frame ) return
      
      frame.views.move( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string, 'down' )
    } break
    // Move view
    case 'view.move': {
      const frame = self.flux.frames.active()
      if( !frame ) return
      
      frame.views.move( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string, 'any' )
    } break
    // Duplicate view
    case 'view.duplicate': {
      const frame = self.flux.frames.active()
      if( !frame ) return
      
      frame.views.duplicate( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string )
    } break
    // Delete view
    case 'view.delete': {
      const frame = self.flux.frames.active()
      if( !frame ) return
      
      frame.views.remove( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string )
    } break
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

      const frame = self.flux.frames.active()
      if( !frame ) return

      // Paste view
      const
      nextViewKey = $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) || $trigger.attr( CONTROL_FLOATING_SELECTOR ),
      nextToView = frame.views.get( nextViewKey as string )

      // Duplicated view next to specified pasting view position
      nextToView && frame.views.duplicate( self.clipboard.key as string, nextToView.$$ )
      // Remove visible floating active
      // self.flux.$root?.find(`[${CONTROL_FLOATING_SELECTOR}]`).remove()

      self.clipboard = null
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
    case 'global': self.$global?.removeClass('active'); break
    
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
export function onCustomListener( $this: JQuery<HTMLElement>, self: Controls ){
  debug('custom on-* event --', $this.attr('on'), $this.attr('params') )

  const
  /**
   * Lookup the DOM from the main parent perspective
   * make it easier to find different options blocks
   */
  $trigger = $this.parents(`[${CONTROL_TOOLBAR_SELECTOR}],[${CONTROL_PANEL_SELECTOR}],[${CONTROL_FLOATING_SELECTOR}],[${CONTROL_DISCRET_SELECTOR}]`),
  frame = self.flux.frames.active()
  if( !frame ) return

  const key = $trigger.attr( CONTROL_TOOLBAR_SELECTOR )
        || $trigger.attr( CONTROL_PANEL_SELECTOR )
        || $trigger.attr( CONTROL_FLOATING_SELECTOR )
        || $trigger.attr( CONTROL_DISCRET_SELECTOR )
  if( !key ) return

  const view = frame.views.get( key )
  if( !view ) return

  const 
  _event = $this.attr('on') as string,
  _params = $this.attr('params')

  view.bridge.events.emit( _event, _params )
}

// export function onContentChange( $this: JQuery<HTMLElement>, self: Controls ){
//   self.history.lateRecord( $this.html() )
// }