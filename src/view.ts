import type Modela from './modela'
import type { AddViewTriggerType, ViewBlockProperties, ViewComponent, ViewComponentBridge } from './types/view'

import EventEmitter from 'events'
import State from './state'
import {
  VIEW_KEY_SELECTOR,
  VIEW_NAME_SELECTOR,
  VIEW_ACTIVE_SELECTOR,
  VIEW_CAPTION_SELECTOR,
  VIEW_PLACEHOLDER_SELECTOR,
  VIEW_TYPES_ALLOWED_SELECTOR,
  
  CONTROL_PANEL_SELECTOR,
  CONTROL_TOOLBAR_SELECTOR,
  CONTROL_FLOATING_SELECTOR,
  
  CONTROL_EDGE_MARGIN,
  CONTROL_PANEL_MARGIN,
  CONTROL_TOOLBAR_MARGIN,
  VIEW_REF_SELECTOR
} from './constants'
import { Stylesheet } from './css'
import {
  createPlaceholder,
  createToolbar,
  createPanel,
  createDiscretAddpoint
} from './block.factory'
import { 
  debug,
  generateKey,
  getTopography
} from './utils'

export default class View {
  /**
   * Access to modela's core instance and 
   * relative functional classes.
   */
  private readonly flux: Modela

  /**
   * View's styles application handler
   */
  private styles?: Stylesheet 

  /**
   * Native HTML element and JQuery element
   * object of the view.
   */
  public $?: JQuery<HTMLElement>

  /**
   * Unique key identifying the view in
   * the editor context.
   */
  public key?: string

  /**
   * View component as original define.
   */
  private component?: ViewComponent
  
  /**
   * Closes parent of this view that is also in
   * the editor context view.
   */
  private $parent?: JQuery<HTMLElement>

  /**
   * Between View & Component interaction bridge
   */
  public bridge: ViewComponentBridge

  constructor( flux: Modela ){
    this.flux = flux
    
    this.bridge = {
      state: new State(),
      events: new EventEmitter(),
      assets: flux.assets,
      fn: flux.fn,
      i18n: flux.i18n,
      css: undefined,
      $: undefined
    }
  }
  
  /**
   * Run initial 
   */
  private initialize(){
    try {
      /**
       * Initialize default styles of the view
       */
      const { name, styles } = this.get()
      if( name && typeof styles === 'function' )
        this.styles =
        this.bridge.css = new Stylesheet( name, styles( this.bridge ) )

        /**
         * Override bridge css.style() function to
         * return style of this view only.
         */
        if( this.bridge.css )
          this.bridge.css.style = () => (this.flux.fn.extractStyle( this.$ as JQuery<HTMLElement> ))
    }
    catch( error: any ){ debug( error.message ) }

    /**
     * Attach a next placeholder to the new view element
     */
    try {
      if( this.flux.settings.enablePlaceholders
          && !this.$?.next(`[${VIEW_PLACEHOLDER_SELECTOR}="${this.key}"]`).length ){
        
        /**
         * Use discret placehlder to no `absolute`, `fixed` or `sticky`
         * position elements to void unnecessary stack of relative placeholder
         * elements around static or relative position elements.
         */
        const freePositions = ['fixed', 'absolute', 'sticky']
        
        freePositions.includes( this.$?.css('position') as string ) ?
                                      this.$?.prepend( this.flux.i18n.propagate( $(createDiscretAddpoint( this.key as string )) ) )
                                      : this.$?.after( createPlaceholder( this.key as string ) )
      }
    }
    catch( error: any ){ debug( error.message ) }

    // Make view's JQuery object
    this.bridge.$ = this.$ as JQuery<HTMLElement>

    // Give away control to view component
    const takeover = this.get('takeover')
    typeof takeover == 'function' && takeover( this.bridge )

    debug('view initialized')
  }

  set( values: any ){
    if( typeof values !== 'object' 
        || !Object.keys( values ).length )
      throw new Error('Invalid method argument')

    this.component = this.component ? { ...this.component, ...values } : values
    debug('component - ', this.component )
  }
  get( type?: keyof ViewComponent ): any {
    if( !this.component ) 
      throw new Error('Invalid method called')

    return type ? this.component[ type ] : this.component
  }

  /**
   * Map out a normal HTML element to editor
   * context view using native views cognition
   * process.
   */
  inspect( $this: JQuery<HTMLElement>, name: string, activate = false ){
    debug('current target - ', $this.get(0) )

    this.$ = $this
    if( !this.$.length )
      throw new Error('Invalid View Element')
    
    /**
     * Mount inspected view into editor context
     */
    this.key = this.$.attr( VIEW_KEY_SELECTOR )
    if( !this.key ){
      /**
       * Generate and assign view tracking key
       */
      this.key = generateKey()

      this.$.attr({
        [VIEW_KEY_SELECTOR]: this.key, // Set view key
        [VIEW_NAME_SELECTOR]: name // Set view node name identify
      })
    }

    if( !this.component ){
      // Set view specifications
      this.set( this.flux.store.getComponent( name ) )
      // Initialize view properties
      this.initialize()
    }

    // Auto-trigger current view
    activate && this.trigger()
  }
  /**
   * Mount new view comopnent into the DOM
   */
  mount( component: ViewComponent, to: string, triggerType: AddViewTriggerType = 'self' ){
    /**
     * `to` field should only be a model-view-key to be
     * sure the destination view is within editor control
     * scope.
     */
    const $to = $(`[${triggerType == 'placeholder' ? VIEW_REF_SELECTOR : VIEW_KEY_SELECTOR}="${to}"]`)
    if( !$to.length )
      throw new Error(`Invalid destination view - <key:${to}>`)
    
    if( typeof component.render !== 'function' )
      throw new Error(`<${component.name}> render function not specified`)
    
    /**
     * Render new element with default component and 
     * defined global settings
     */
    const element = component.render( this.bridge )
    debug('mount view - ', element )

    // Add view to the DOM
    this.$ = $(element)

    switch( triggerType ){
      case 'placeholder':
      case 'discret': $to.after( this.$ ); break
      case 'self':
      default: $to.append( this.$ )
    }

    /**
     * Generate and assign tracking key to the 
     * new view
     */
    this.key = generateKey()

    this.$.attr({
      [VIEW_KEY_SELECTOR]: this.key, // Set view key
      [VIEW_NAME_SELECTOR]: component.name // Set view node name identify
    })

    /**
     * Extract defined view blocks props
     */
    const renderingProps = this.flux.fn.extractProperties( element )
    this.inject( renderingProps )

    // Set view specifications
    this.set( component )
    // Initialize view properties
    this.initialize()
    // Auto-trigger current view
    this.trigger()
  }
  /**
   * Create a clone/duplicate of an extisin view
   * in the editor context.
   */
  mirror( viewInstance: View, $nextTo?: JQuery<HTMLElement> ){
    /**
     * Argument must be a new instance of view class
     */
    if( typeof viewInstance !== 'object' 
        || !viewInstance.key
        || !viewInstance.$
        || this.key )
      return

    // Clone view element
    this.$ = viewInstance.$.clone()
    if( !this.$.length )
      throw new Error('View instance HTML element not found')

    debug('mirror view - ', this.$.get(0) )

    /**
     * Add cloned view next to a given view element 
     * at a specific position
     */
    if( $nextTo?.length ){
      /**
       * Add next to the view's attached placeholder 
       * or the view itself if no placeholder.
       */
      if( $nextTo.next().is(`[${VIEW_PLACEHOLDER_SELECTOR}]`) )
        $nextTo = $nextTo.next()
      
      $nextTo.after( this.$ )
    }
    // Append cloned view directly next to the original view
    else viewInstance.$.parent().append( this.$ )

    /**
     * Generate and assign view tracking key
     */
    this.key = generateKey()
    this.$.attr( VIEW_KEY_SELECTOR, this.key )

    // Clone view specifications
    this.set( viewInstance.get() )
    // Initialize view properties
    this.initialize()
  }

  setParent( parent: HTMLElement ){
    if( !parent ) return

    this.$parent = $(parent)
    debug('parent target - ', parent )

    // Get parent's default component

    // Auto-trigger current view's parent
    this.triggerParent()
  }
  getParent(){
    return this.$parent
  }

  inject( props: ViewBlockProperties[] ){
    if( !Array.isArray( props ) || !props.length ) return

    props.forEach( each => {
      if( !this.$ ) return

      if( !each.selector ){
        each.caption && this.$.data( VIEW_CAPTION_SELECTOR, each.caption )
        each.allowedViewTypes && this.$.data( VIEW_TYPES_ALLOWED_SELECTOR, each.allowedViewTypes )
        each.addView
        && this.flux.settings.enablePlaceholders
        && this.$.append( createPlaceholder() )

        return
      }

      /**
       * Assign props to specified content blocks
       */
      const $block = this.$.find( each.selector )

      each.caption && $block.data( VIEW_CAPTION_SELECTOR, each.caption )
      each.allowedViewTypes && $block.data( VIEW_TYPES_ALLOWED_SELECTOR, each.allowedViewTypes )
      each.addView
      && this.flux.settings.enablePlaceholders
      && $block.append( createPlaceholder() )
    } )
  }
  update( type: string, dataset: any ){
    if( !this.component ) 
      throw new Error('Invalid method called')

    this.bridge.events.emit('apply', type, dataset )
  }
  destroy(){
    if( !this.$?.length ) 
      throw new Error('Invalid method called')
    
    // Dismiss controls related to the view
    this.dismiss()

    // Remove placeholder attached to the view
    this.$.next(`[${VIEW_PLACEHOLDER_SELECTOR}]`).remove()
    // Remove visible floating active
    this.flux.$root?.find(`[${CONTROL_FLOATING_SELECTOR}="${this.key}"]`).remove()

    // Remove element from the DOM
    this.$.remove()

    /**
     * Clear all namespaces styles attached to this
     * viwe element if there are no other instances of 
     * this view in the DOM.
     */
    !this.flux.$root?.find(`[${VIEW_NAME_SELECTOR}="${this.get('name')}"]`).length 
    && this.styles?.clear()

    this.$ = undefined
    this.key = undefined
    this.styles = undefined
    this.$parent = undefined
    this.component = undefined
  }

  /**
   * Show view's editing toolbar
   */
  showToolbar(){
    if( !this.flux.$root || !this.key || !this.$ ) 
      throw new Error('Invalid method called')

    if( this.flux.$root.find(`[${CONTROL_TOOLBAR_SELECTOR}="${this.key}"]`).length ) 
      return

    const 
    { toolbar, panel } = this.get() as ViewComponent,
    options = typeof toolbar == 'function' ? toolbar( this.bridge ) : {},
    settings = {
      editing: true,
      detached: typeof panel == 'function'
    }
    let $toolbar = $(createToolbar( this.key, options, settings ))
    // Apply translation to text contents in toolbar
    $toolbar = this.flux.i18n.propagate( $toolbar )

    let { x, y, height } = getTopography( this.$ )
    debug('show view toolbar: ', x, y )

    // Adjust by left edges
    if( x < 15 ) x = CONTROL_EDGE_MARGIN

    $toolbar.css({ left: `${x}px`, top: `${y}px` })
    this.flux.$root.append( $toolbar )

    const
    tHeight = $toolbar.find('> [container]').height() || 0,
    dueYPosition = tHeight + (CONTROL_TOOLBAR_MARGIN * 2)
    
    const
    wWidth = $(window).width() || 0,
    wHeight = $(window).height() || 0

    // Adjust by right edge
    if( x > (wWidth - tHeight) ) x = wWidth - tHeight - CONTROL_EDGE_MARGIN

    /**
     * Push slightly on top of element in normal position
     * but adjust below the element if it's to close to
     * the top edge.
     */
    if( height < (wHeight - tHeight) ){
      if( ( y - dueYPosition ) < CONTROL_EDGE_MARGIN ) y += height
      else y -= dueYPosition
    }
    // Adjust by the bottom edges
    if( y > (wHeight - tHeight) ) y = wHeight - tHeight - CONTROL_EDGE_MARGIN

    $toolbar.css({ left: `${x}px`, top: `${y}px` })

    // Fire show toolbar listeners
    this.bridge.events.emit('show.toolbar')
  }
  showPanel(){
    if( !this.flux.$modela || !this.key || !this.$ ) 
      throw new Error('Invalid method called')

    if( this.flux.$modela.find(`[${CONTROL_PANEL_SELECTOR}="${this.key}"]`).length ) 
      return

    const { caption, panel } = this.get() as ViewComponent
    if( typeof panel !== 'function' ) return

    let $panel = $(createPanel( this.key, caption, panel( this.bridge ) ))
    // Apply translation to text contents in panel
    $panel = this.flux.i18n.propagate( $panel )

    let { x, y, width } = getTopography( this.$, true )
    debug('show view panel: ', x, y )

    this.flux.$modela.append( $panel )

    const
    pWidth = $panel.find('> [container]').width() || 0,
    pHeight = $panel.find('> [container]').height() || 0,
    // Window dimensions
    wWidth = $(window).width() || 0,
    wHeight = $(window).height() || 0,
    
    dueXPosition = pWidth + CONTROL_PANEL_MARGIN
    
    /**
     * Not enough space at the left, position at the right
     */
    if( ( x - dueXPosition ) < CONTROL_EDGE_MARGIN ){
      /**
       * Not enough space at the right either, position 
       * over view.
       */
      if( x + width + dueXPosition < wWidth )
        x += width + CONTROL_PANEL_MARGIN
    }
    // Adjust by left edges
    else x -= dueXPosition

    /**
     * Display panel in window view when element 
     * is position to close to the bottom.
     */
    if( ( y + pHeight + CONTROL_EDGE_MARGIN ) > wHeight )
      y -= pHeight
    
    // Adjust by the top edges
    else if( y < CONTROL_EDGE_MARGIN )
      y = CONTROL_EDGE_MARGIN
    
    $panel.css({ left: `${x}px`, top: `${y}px` })

    // Fire show panel listeners
    this.bridge.events.emit('show.panel')
  }
  showMovable(){


    // Fire show movable listeners
    this.bridge.events.emit('show.movable')
  }
  
  move( direction?: string ){
    if( !this.$?.length || !this.key ) 
      throw new Error('Invalid method called')

    switch( direction ){
      case 'up': {
        const $placeholder = this.$?.next(`[${VIEW_PLACEHOLDER_SELECTOR}]`)
        /**
         * Check whether previous view above has placeholder then
         * point moving anchor to after the placeholder (view itself).
         */
        let $anchor = this.$.prev(`[${VIEW_PLACEHOLDER_SELECTOR}]`).length ?
                                    this.$.prev(`[${VIEW_PLACEHOLDER_SELECTOR}]`).prev()
                                    : this.$.prev()
                                    
        /**
         * In case this view is the last top element in its 
         * container.
         */
        if( !$anchor.length ) return
        
        /**
         * Move this view and its placeholder to the view 
         * right above it in the same container
         */
        $anchor.before( this.$ )
        $placeholder?.length && this.$.after( $placeholder )
      } break

      case 'down': {
        const $placeholder = this.$?.next(`[${VIEW_PLACEHOLDER_SELECTOR}]`)

        let $anchor = $placeholder?.length ?
                          $placeholder.next() // View right below the placeholder
                          : this.$.next()

        /**
         * In case this view is the last bottom element in its 
         * container.
         */
        if( !$anchor.length ) return

        /**
         * Check whether next view below has placeholder then
         * point moving anchor to the placeholder.
         */
        if( $anchor.next(`[${VIEW_PLACEHOLDER_SELECTOR}]`).length )
          $anchor = $anchor.next(`[${VIEW_PLACEHOLDER_SELECTOR}]`)
        
        /**
         * Move this view and its placeholder to the view 
         * right below it in the same container
         */
        $anchor.after( this.$ )
        $placeholder?.length && this.$.after( $placeholder )
      } break

      default: this.showMovable()
    }
  }
  dismiss(){
    // Unhighlight triggered views
    $(`[${VIEW_KEY_SELECTOR}="${this.key}"]`).removeAttr( VIEW_ACTIVE_SELECTOR )
    // Remove editing toolbar if active
    this.flux.$root?.find(`[${CONTROL_TOOLBAR_SELECTOR}="${this.key}"]`).remove()
    // Remove editing control panel if active
    this.flux.$modela?.find(`[${CONTROL_PANEL_SELECTOR}="${this.key}"]`).remove()

    /**
     * Fire dismiss function provided with 
     * view component.
     */
    const dismiss = this.get('dismiss')
    typeof dismiss === 'function' && dismiss( this.bridge )
  }
  trigger(){
    if( !this.key || !this.$ ) return
    debug('trigger view')

    /**
     * Highlight triggered view: Delay due to 
     * pre-unhighlight effect.
     */
    setTimeout( () => this.$?.attr( VIEW_ACTIVE_SELECTOR, 'true' ), 200 )

    /**
     * Fire activation function provided with 
     * view component.
     */
    this.bridge.events.emit('activate')
  }
  triggerParent(){
    if( !this.key ) return
    debug('trigger parent view')
    
  }
  dismissParent(){
    
  }
}