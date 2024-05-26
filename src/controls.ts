import type Modela from './modela'
import {
  CONTROL_ROOT,
  VIEW_IDENTIFIER,
  VIEW_KEY_SELECTOR,
  VIEW_REF_SELECTOR,
  VIEW_ACTIVE_SELECTOR,
  VIEW_PLACEHOLDER_SELECTOR,
  CONTROL_FLOATING_SELECTOR,
  CONTROL_TOOLBAR_SELECTOR,
  CONTROL_ADDPOINT_MARGIN,
  CONTROL_PANEL_SELECTOR,
  CONTROL_BLOCK_SELECTOR
} from './constants'
import { createFloating } from './block.factory'

let ADDPOINT_DISMISS_DELAY: any

type Clipboard = {
  type: 'view' | 'font'
  key?: string
  value?: any
}

function onToolbarToggle( $this: JQuery<HTMLElement>, self: Controls ){
  /**
   * Lookup the DOM from the main parent perspective
   * make it easier to find different options blocks
   */
  const $toolbar = $this.parents(`[${CONTROL_TOOLBAR_SELECTOR}]`)
  
  switch( $this.attr('toggle') ){
    // Show extra options
    case 'extra': {
      $toolbar.find('[options="extra"]').addClass('active')
      $this.hide() // Hide toggle
    } break

    // Show sub options
    case 'sub': {
      $toolbar.find(`[options="sub"][extends="${$this.attr('params')}"]`).addClass('active')
      /**
       * Hide the main options to give space to 
       * sub options: Usually long
       */
      $toolbar.find('[options="main"]').hide()

      // Auto-dismiss extra options if exist
      $toolbar.find('[options="extra"]').removeClass('active')
      $toolbar.find('[toggle="extra"]').show() // Restore toggle
    } break
  }
}
function onToolbarDismiss( $this: JQuery<HTMLElement>, self: Controls ){
  /**
   * Lookup the DOM from the main parent perspective
   * make it easier to find different options blocks
   */
  const $toolbar = $this.parents(`[${CONTROL_TOOLBAR_SELECTOR}]`)

  switch( $this.attr('dismiss') ){
    // Dismiss extra options
    case 'extra': {
      $toolbar.find('[options="extra"]').removeClass('active')
      $toolbar.find('[toggle="extra"]').show() // Restore toggle
    } break

    // Dismiss sub options
    case 'sub': {
      $toolbar.find('[options="sub"]').removeClass('active')
      // Restore main options to default
      $toolbar.find('[options="main"]').show()
    } break
  }
}
function onToolbarShow( $this: JQuery<HTMLElement>, self: Controls ){
  console.log( self )
  if( !self.flux.views ) return

  const viewKey = $this.attr( VIEW_KEY_SELECTOR )
  if( !viewKey ) return

  // Show toolbar
  const view = self.flux.views.get( viewKey )
  view && view.showToolbar()
}

function onControlPanelTabToggle( $this: JQuery<HTMLElement>, self: Controls ){
  const $panel = $this.parents(`[${CONTROL_PANEL_SELECTOR}]`)

  // Disable currently active tab & section
  $panel.find('.active').removeClass('active')

  // Active tab
  $this.addClass('active')
  // Show active section
  $panel.find(`[section="${$this.attr('tab')}"]`).addClass('active')
}
function onControlPanelDismiss( $this: JQuery<HTMLElement>, self: Controls ){
  $this.parents(`[${CONTROL_PANEL_SELECTOR}]`).remove()
}

function onControlBlockShow( $this: JQuery<HTMLElement>, self: Controls ){
  switch( $this.attr('show') ){
    case 'global': {
      self.$globalToolbar?.hide()
      self.$globalBlock?.show()
    } break
  }
}
function onControlBlockDismiss( $this: JQuery<HTMLElement>, self: Controls ){
  switch( $this.attr('dismiss') ){
    case 'global': {
      self.$globalToolbar?.show()
      self.$globalBlock?.hide()
    } break
  }
}

function onFloatingShow( $this: JQuery<HTMLElement>, self: Controls ){
  // Placeholder's ref key to attached view
  const key = $this.attr( VIEW_REF_SELECTOR )

  if( !key ) return
  clearTimeout( ADDPOINT_DISMISS_DELAY )

  const triggers = ['addpoint']

  /**
   * Show paste-view trigger point when a pending
   * copy of view is in the clipboard.
   */
  if( self.clipboard?.type == 'view' )
    triggers.push('paste')

  let $trigger = self.flux.$root?.find(`[${CONTROL_FLOATING_SELECTOR}]`)

  // Insert new floating point to the DOM
  if( !$trigger?.length )
    self.flux.$root?.append( createFloating( key, 'view', triggers ) )

  // Change key of currently floating point to new trigger's key
  else if( !$trigger.is(`[${CONTROL_FLOATING_SELECTOR}="${key}"]`) ){
    $trigger.attr( CONTROL_FLOATING_SELECTOR, key )
            .html( createFloating( key, 'view', triggers, true ) )
  }
  
  // Addpoint already active
  else return

  $trigger = self.flux.$root?.find(`[${CONTROL_FLOATING_SELECTOR}="${key}"]`)
  if( !$trigger?.length ) return
  
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
function onAddPointDismiss( $this: JQuery<HTMLElement>, self: Controls ){
  ADDPOINT_DISMISS_DELAY = setTimeout( () => self.flux.$root?.find(`[${CONTROL_FLOATING_SELECTOR}]`).remove(), 500 )
}

function onViewStoreShow( e: Event, self: Controls ){
  if( !e.target || !self.flux.views ) return

  const viewKey = $(e.target).attr( VIEW_KEY_SELECTOR )
  if( !viewKey ) return

  self.flux.views.add('card', viewKey, true )
}

function onEventShow( $this: JQuery<HTMLElement>, self: Controls ){
  const $trigger = $this.parents(`[${CONTROL_TOOLBAR_SELECTOR}]`)

  switch( $this.attr('show') ){
    case 'panel': {
      const key = $trigger.attr( CONTROL_TOOLBAR_SELECTOR )
      if( !key ) return

      const view = self.flux.views.get( key )
      view?.showPanel()
    } break
  }

}
function onEventAction( $this: JQuery<HTMLElement>, self: Controls ){
  const $trigger = $this.parents(`[${CONTROL_TOOLBAR_SELECTOR}],[${CONTROL_FLOATING_SELECTOR}]`)
  
  switch( $this.attr('action') ){
    /**
     * -------------- View meta controls --------------
     */

    // Duplicate exising view
    case 'duplicate': self.flux.views.duplicate( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string ); break

    // Delete view
    case 'delete': self.flux.views.remove( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string ); break

    // Copy to clipboard
    case 'copy': {
      self.clipboard = {
        type: $this.attr('params') as Clipboard['type'],
        key: $trigger.attr( CONTROL_TOOLBAR_SELECTOR )
      }
    } break

    // Paste clipboard content
    case 'paste': {
      if( !self.clipboard ) return

      // Paste view
      if( self.clipboard.type == 'view' ){
        if( !self.clipboard.key ) return

        const
        nextViewKey = $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) || $trigger.attr( CONTROL_FLOATING_SELECTOR ),
        nextToView = self.flux.views.get( nextViewKey as string )

        // Duplicated view next to specified pasting view position
        nextToView && self.flux.views.duplicate( self.clipboard.key as string, nextToView.$ )
        // Remove visible floating active
        self.flux.$root?.find(`[${CONTROL_FLOATING_SELECTOR}]`).remove()
      }

      // TODO: Paste image
      // ...

      self.clipboard = null
    } break

    // Move view up
    case 'move': self.flux.views.move( $trigger.attr( CONTROL_TOOLBAR_SELECTOR ) as string, $this.attr('params') as string ); break


  }
}

export default class Controls {
  flux: Modela

  $globalBlock?: JQuery<HTMLElement>
  $globalToolbar?: JQuery<HTMLElement>
  
  /**
   * Copy element clipboard
   */
  clipboard: Clipboard | null = null
  
  constructor( flux: Modela ){
    this.flux = flux
  }
  
  /**
   * Enable control actions' event listeners
   */
  enable(){
    this.flux.$modela = $(CONTROL_ROOT)

    this.$globalBlock = $(`${CONTROL_ROOT} [${CONTROL_BLOCK_SELECTOR}="global"]`)
    this.$globalToolbar = $(`${CONTROL_ROOT} [${CONTROL_TOOLBAR_SELECTOR}="global"]`)

    // Activate all inert add-view placeholders
    this.setPlaceholders('active')

    // Initialize event listeners
    this.events()
  }

  events(){
    if( !this.flux.$modela
        || !this.flux.$root
        || !this.flux.$root.length
        || !this.flux.$modela.length
        || !this.flux.views ) return

    /**
     * Listen to View components or any editable tag
     */
    const selectors = `${this.flux.settings.viewOnly ? VIEW_IDENTIFIER : ''}:not([${VIEW_PLACEHOLDER_SELECTOR}],[${CONTROL_PANEL_SELECTOR}] *)`
    this.flux.settings.hoverSelect ?
              this.flux.$root.on('mouseover', selectors, this.flux.views.lookup.bind( this.flux.views ) )
              : this.flux.$root.on('click', selectors, this.flux.views.lookup.bind( this.flux.views ) )

    const self = this
    function handler( fn: Function ){
      return function( this: Event ){
        typeof fn === 'function' && fn( $(this), self )
      }
    }

    this.flux.$root
    /**
     * Show extra and sub toolbar options
     */
    .on('click', `[${VIEW_ACTIVE_SELECTOR}]`, handler( onToolbarShow ) )
    /**
     * Show floating triggers on placeholder hover
     */
    .on('mouseenter', `[${VIEW_PLACEHOLDER_SELECTOR}]`, handler( onFloatingShow ) )
    /**
     * Dismiss floating triggers on placeholder hover
     */
    // .on('mouseleave', `[${VIEW_PLACEHOLDER_SELECTOR}]`, onAddPointDismiss )

    /**
     * Show extra and sub toolbar options
     */
    .on('click', `[${CONTROL_TOOLBAR_SELECTOR}] [toggle]`, handler( onToolbarToggle ) )
    /**
     * Dismiss extra and sub toolbar options
     */
    .on('click', `[${CONTROL_TOOLBAR_SELECTOR}] [dismiss]`, handler( onToolbarDismiss ) )

    /**
     * Show event trigger
     */
    .on('click', '[show]', handler( onEventShow ) )
    /**
     * Action event trigger
     */
    .on('click', '[action]', handler( onEventAction ) )


    this.flux.$modela
    /**
     * Show extra and sub toolbar options
     */
    .on('click', `[${CONTROL_TOOLBAR_SELECTOR}] [toggle]`, handler( onToolbarToggle ) )
    /**
     * Dismiss extra and sub toolbar options
     */
    .on('click', `[${CONTROL_TOOLBAR_SELECTOR}] [dismiss]`, handler( onToolbarDismiss ) )

    /**
     * Switch between control panel tabs
     */
    .on('click', `[${CONTROL_PANEL_SELECTOR}] [tab]`, handler( onControlPanelTabToggle ) )
    /**
     * Dismiss control panel
     */
    .on('click', `[${CONTROL_PANEL_SELECTOR}] [dismiss]`, handler( onControlPanelDismiss ) )

    /**
     * Show control blocks
     */
    .on('click', `[${CONTROL_TOOLBAR_SELECTOR}] [show], [${CONTROL_BLOCK_SELECTOR}] [show]`, handler( onControlBlockShow ) )
    /**
     * Dismiss control blocks
     */
    .on('click', `[${CONTROL_TOOLBAR_SELECTOR}] [dismiss], [${CONTROL_BLOCK_SELECTOR}] [dismiss]`, handler( onControlBlockDismiss ) )
  }

  destroy(){
    // Disable add-view placeholders
    this.setPlaceholders('inert')

    this.flux.$modela?.off()
    this.flux.$modela?.remove()

    this.flux.$root?.off()
  }

  /**
   * Set general state of placeholders
   * 
   * - active: Enable add-view placeholders highlighting during editing
   * - inert: Disable add-view placeholders
   */
  setPlaceholders( status = 'active' ){
    if( !this.flux.settings.enablePlaceholders ) return
    $(`[${VIEW_PLACEHOLDER_SELECTOR}]`).attr('status', status )
  }
}
