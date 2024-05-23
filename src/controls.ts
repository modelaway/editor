import type Modela from './modela'
import {
  CONTROL_ROOT,
  VIEW_IDENTIFIER,
  VIEW_KEY_SELECTOR,
  VIEW_ACTIVE_SELECTOR,
  VIEW_PLACEHOLDER_SELECTOR,
  CONTROL_TOOLBAR_SELECTOR,
  CONTROL_PANEL_SELECTOR,
  CONTROL_BLOCK_SELECTOR
} from './constants'
import { createPanel } from './block.factory'

export default class Controls {
  public flux: Modela

  private $globalBlock?: JQuery<HTMLElement>
  private $globalToolbar?: JQuery<HTMLElement>
  
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
    const self = this

    if( !self.flux.$modela
        || !self.flux.$root
        || !self.flux.$root.length
        || !self.flux.$modela.length
        || !this.flux.views ) return

    /**
     * Listen to View components or any editable tag
     */
    const selectors = `${this.flux.settings.viewOnly ? VIEW_IDENTIFIER : ''}:not([${VIEW_PLACEHOLDER_SELECTOR}],[${CONTROL_PANEL_SELECTOR}] *)`
    this.flux.settings.hoverSelect ?
              self.flux.$root.on('mouseover', selectors, self.flux.views.lookup.bind( self.flux.views ) )
              : self.flux.$root.on('click', selectors, self.flux.views.lookup.bind( self.flux.views ) )

    function onToolbarToggle( this: Event ){
      const
      $this = $(this),
      /**
       * Lookup the DOM from the main parent perspective
       * make it easier to find different options blocks
       */
      $toolbar = $this.parents(`[${CONTROL_TOOLBAR_SELECTOR}]`)
      
      switch( $this.attr('toggle') ){
        // Show extra options
        case 'extra': {
          $toolbar.find('[options="extra"]').addClass('active')
          $this.hide() // Hide toggle
        } break

        // Show sub options
        case 'sub': {
          $toolbar.find('[options="sub"]').addClass('active')
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
    function onToolbarDismiss( this: Event ){
      const
      $this = $(this),
      /**
       * Lookup the DOM from the main parent perspective
       * make it easier to find different options blocks
       */
      $toolbar = $this.parents(`[${CONTROL_TOOLBAR_SELECTOR}]`)

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
    function onToolbarShow( this: Event ){
      if( !self.flux.views ) return

      const viewKey = $(this).attr( VIEW_KEY_SELECTOR )
      if( !viewKey ) return

      // Show toolbar
      const view = self.flux.views.get( viewKey )
      view && view.showToolbar()
    }

    function onControlPanelTabToggle( this: Event ){
      const
      $this = $(this),
      $panel = $this.parents(`[${CONTROL_PANEL_SELECTOR}]`)

      // Disable currently active tab & section
      $panel.find('.active').removeClass('active')

      // Active tab
      $this.addClass('active')
      // Show active section
      $panel.find(`[section="${$this.attr('tab')}"]`).addClass('active')
    }
    function onControlPanelDismiss( this: Event ){
      $(this).parents(`[${CONTROL_PANEL_SELECTOR}]`).remove()
    }

    function onControlBlockShow( this: Event ){
      const $this = $(this)
      
      switch( $this.attr('show') ){
        case 'global': {
          self.$globalToolbar?.hide()
          self.$globalBlock?.show()
        } break
      }
    }
    function onControlBlockDismiss( this: Event ){
      const $this = $(this)
      
      switch( $this.attr('dismiss') ){
        case 'global': {
          self.$globalToolbar?.show()
          self.$globalBlock?.hide()
        } break
      }
    }

    function onViewStoreShow( e: Event ){
      if( !e.target || !self.flux.views ) return

      const viewKey = $(e.target).attr( VIEW_KEY_SELECTOR )
      if( !viewKey ) return

      self.flux.views.add('card', viewKey, true )
    }

    function onEventShow( this: Event ){
      const
      $this = $(this),
      $trigger = $this.parents(`[${CONTROL_TOOLBAR_SELECTOR}]`)

      switch( $this.attr('show') ){
        case 'panel': {
          const key = $trigger.attr( CONTROL_TOOLBAR_SELECTOR )
          if( !key ) return

          const view = self.flux.views.get( key )
          view?.showPanel()
        } break
      }

    }
    function onEventAction( this: Event ){
      const
      $this = $(this),
      $trigger = $this.parents(`[${CONTROL_TOOLBAR_SELECTOR}]`)

      console.log('---', $this.attr('action'))

    }

    self.flux.$root
    /**
     * Show extra and sub toolbar options
     */
    .on('click', `[${VIEW_ACTIVE_SELECTOR}]`, onToolbarShow )
    /**
     * Listen to placeholder add-view trigger
     */
    .on('click', `[${VIEW_PLACEHOLDER_SELECTOR}]`, onViewStoreShow )

    /**
     * Show extra and sub toolbar options
     */
    .on('click', `[${CONTROL_TOOLBAR_SELECTOR}] [toggle]`, onToolbarToggle )
    /**
     * Dismiss extra and sub toolbar options
     */
    .on('click', `[${CONTROL_TOOLBAR_SELECTOR}] [dismiss]`, onToolbarDismiss )

    /**
     * Toolbar show event trigger
     */
    .on('click', `[${CONTROL_TOOLBAR_SELECTOR}] [show]`, onEventShow )
    /**
     * Toolbar action event trigger
     */
    .on('click', `[${CONTROL_TOOLBAR_SELECTOR}] [action]`, onEventAction )


    self.flux.$modela
    /**
     * Show extra and sub toolbar options
     */
    .on('click', `[${CONTROL_TOOLBAR_SELECTOR}] [toggle]`, onToolbarToggle )
    /**
     * Dismiss extra and sub toolbar options
     */
    .on('click', `[${CONTROL_TOOLBAR_SELECTOR}] [dismiss]`, onToolbarDismiss )

    /**
     * Switch between control panel tabs
     */
    .on('click', `[${CONTROL_PANEL_SELECTOR}] [tab]`, onControlPanelTabToggle )
    /**
     * Dismiss control panel
     */
    .on('click', `[${CONTROL_PANEL_SELECTOR}] [dismiss]`, onControlPanelDismiss )

    /**
     * Show control blocks
     */
    .on('click', `[${CONTROL_TOOLBAR_SELECTOR}] [show], [${CONTROL_BLOCK_SELECTOR}] [show]`, onControlBlockShow )
    /**
     * Dismiss control blocks
     */
    .on('click', `[${CONTROL_TOOLBAR_SELECTOR}] [dismiss], [${CONTROL_BLOCK_SELECTOR}] [dismiss]`, onControlBlockDismiss )
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
    $(`[${VIEW_PLACEHOLDER_SELECTOR}]`).attr( VIEW_PLACEHOLDER_SELECTOR, status )
  }
}
