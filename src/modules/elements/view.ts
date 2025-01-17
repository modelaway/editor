import type Frame from '../frame'
import type { HandlerHook } from '../../types/controls'
import type { ViewBlockProperties, ViewComponent, ViewBridge } from '../../types/view'

import $, { type Cash } from 'cash-dom'
import EventEmitter from 'events'
import State from '../state'
import {
  VIEW_KEY_SELECTOR,
  VIEW_NAME_SELECTOR,
  VIEW_ACTIVE_SELECTOR,
  VIEW_CAPTION_SELECTOR,
  VIEW_TYPES_ALLOWED_SELECTOR,
  
  CONTROL_MENU_SELECTOR,
  CONTROL_QUICKSET_SELECTOR,
  
  CONTROL_EDGE_MARGIN,
  CONTROL_MENU_MARGIN,
  CONTROL_QUICKSET_MARGIN,
  VIEW_CONTROL_OPTIONS
} from '../constants'
import { Component } from '../../lib/lips/lips'
import Menu, { MenuInput, MenuState } from '../../factory/menu'
import Finder, { FinderInput, FinderState } from '../../factory/finder'
import Quickset, { QuicksetInput, QuicksetState } from '../../factory/quickset'
import { debug, hashKey } from '../utils'

/**
 * Help manage the basic UI elements that are 
 * vuable by design with human eye.
 */
export default class View extends EventEmitter {
  /**
   * Access to frame's instance and 
   * relative functional classes.
   */
  private readonly frame: Frame

  /**
   * Remote Cash element object of the view.
   */
  public $?: Cash

  /**
   * Unique key identifying the view in
   * the editor context.
   */
  public key?: string

  /**
   * View component as original define.
   */
  private vc?: ViewComponent
  
  /**
   * Closes parent of this view that is also in
   * the editor context view.
   */
  private $parent?: Cash

  /**
   * Between View & Component interaction bridge
   */
  public bridge: ViewBridge

  /**
   * Quickset block component
   */
  private Quickset?: Component<QuicksetInput, QuicksetState>
  /**
   * Quickset block component
   */
  private Menu?: Component<MenuInput, MenuState>
  /**
   * Finder panel block component
   */
  private Finder?: Component<FinderInput, FinderState>

  constructor( frame: Frame ){
    super()

    this.frame = frame
    this.bridge = {
      state: new State(),
      events: new EventEmitter(),
      assets: frame.editor.assets,
      fn: frame.editor.fn,
      i18n: frame.editor.i18n,
      css: undefined,
      $: undefined
    }
  }
  
  /**
   * Run initial 
   */
  private initialize(){
    if( !this.$?.length ) return

    try {
      /**
       * Initialize default styles of the view
       */
      const { name, styles } = this.get()
      if( name && typeof styles === 'function' ){
        const sheet = styles( this.bridge ).sheet
        sheet && this.frame.styles.addRules( sheet, { rel: this.key as string, scope: true } )
      }

      /**
       * Override bridge primary css interface methods
       * 
       * - .custom() return custom CSS properties of defined 
       *             in the document stylesheets
       * - .style() returns style properties of this view
       */
      // if( this.bridge.css ){
      //   // this.bridge.css.custom = async () => (await this.frame.remote?.customCSSProps() as Record<string, string>)
      //   this.bridge.css.style = async () => this.frame.editor.fn.extractStyle( this.$ as Cash )
      // }
    }
    catch( error: any ){ debug( error.message ) }

    // Make view's remove Cash object
    this.bridge.$ = this.$

    // Give away control to view component
    const takeover = this.getSpec('takeover')
    typeof takeover == 'function' && takeover( this.bridge )

    this.bridge.events.emit('mounted')
    debug('view initialized')

    /**
     * Override bridge primary fn interface methods
     */
    if( this.bridge.fn ){
      this.bridge.fn.syncQuickset = ( updates: Record<string, any>, fn?: () => void ) => {
        /**
         * Attach `options.` scope to update options' keys
         */
        const _updates: Record<string, any> = {}

        Object
        .entries( updates )
        .map( ([ key, value ]) => _updates[`options.${key}`] = value )

        this.Quickset?.subInput( _updates )

        typeof fn == 'function' && fn()
      }
      this.bridge.fn.pushHistoryStack = () => this.emit('view.changed')
    }
  }

  set( values: any ){
    if( typeof values !== 'object' 
        || !Object.keys( values ).length )
      throw new Error('Invalid method argument')

    this.vc = this.vc ? { ...this.vc, ...values } : values
    debug('view component - ', this.vc )
  }
  get(): ViewComponent {
    if( !this.vc )
      throw new Error('Invalid method called')

    return this.vc
  }
  getSpec( type: keyof ViewComponent ): any {
    if( !this.vc )
      throw new Error('Invalid method called')

    return this.vc[ type ]
  }

  /**
   * Map out a normal HTML element to editor
   * context view using native elements cognition
   * process.
   */
  inspect( $this: Cash, name: string, activate = false ){
    debug('current target - ', $this.length )

    this.$ = $this
    if( !this.$.length )
      throw new Error('Invalid View Element')
    
    /**
     * Mount inspected view into editor context
     */
    this.key = this.$.attr( VIEW_KEY_SELECTOR ) as string
    if( !this.key ){
      /**
       * Generate and assign view tracking key
       */
      this.key = hashKey()

      this.$.attr({
        [VIEW_KEY_SELECTOR]: this.key, // Set view key
        [VIEW_NAME_SELECTOR]: name // Set view node name identify
      })
    }

    if( !this.vc ){
      // Set view specifications
      this.set( this.frame.editor.store.getView( name ) )
      // Initialize view properties
      this.initialize()
    }

    // Auto-trigger current view
    activate && this.trigger()
  }
  /**
   * Mount new view comopnent into the DOM
   */
  mount( vc: ViewComponent, to: string ){
    if( !this.frame.$canvas.length ) return

    /**
     * `to` field should only be a model-view-key to be
     * sure the destination view is within editor control
     * scope.
     */
    const $to = this.frame.$canvas.find(`[${VIEW_KEY_SELECTOR}="${to}"]`)
    if( !$to.length )
      throw new Error(`Invalid destination view - <key:${to}>`)
    
    if( typeof vc.render !== 'function' )
      throw new Error(`<${vc.name}> render function not specified`)
    
    /**
     * Render new element with default component and 
     * defined global settings
     */
    const element = vc.render( this.bridge )
    debug('mount view - ', element )

    // Add view to the DOM
    this.$ = $(element)

    /**
     * Generate and assign tracking key to the 
     * new view
     */
    this.key = hashKey()

    this.$.attr({
      [VIEW_KEY_SELECTOR]: this.key, // Set view key
      [VIEW_NAME_SELECTOR]: vc.name // Set view node name identify
    })

    /**
     * Extract defined view blocks props
     */
    const renderingProps = this.frame.editor.fn.extractProperties( element )
    this.inject( renderingProps )

    // Set view specifications
    this.set( vc )
    // Initialize view properties
    this.initialize()
    // Auto-trigger current view
    this.trigger()
  }
  /**
   * Create a clone/duplicate of an extisin view
   * in the editor context.
   */
  mirror( viewInstance: View, $nextTo?: Cash ){
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

    debug('mirror view - ', this.$.length )

    /**
     * Add cloned view next to a given view element 
     * at a specific position
     */
    $nextTo?.length
        ? $nextTo.after( this.$ )
        // Append cloned view directly next to the original view
        : viewInstance.$.parent().append( this.$ )

    /**
     * Generate and assign view tracking key
     */
    this.key = hashKey()
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

        return
      }

      /**
       * Assign props to specified content blocks
       */
      const $block = this.$.find( each.selector )

      each.caption && $block.data( VIEW_CAPTION_SELECTOR, each.caption )
      each.allowedViewTypes && $block.data( VIEW_TYPES_ALLOWED_SELECTOR, each.allowedViewTypes )
    } )
  }
  destroy(){
    if( !this.$?.length ) 
      throw new Error('Invalid method called')
    
    // Dismiss controls related to the view
    this.dismiss()

    // Remove element from the DOM
    this.$.remove()

    /**
     * Clear all namespaces styles attached to this
     * viwe element if there are no other instances of 
     * this view in the DOM.
     */
    this.frame.styles.removeRules( this.key as string )

    this.$ = undefined
    this.vc = undefined
    this.key = undefined
    this.$parent = undefined
  }

  /**
   * Show view's editing quickset
   */
  showQuickset(){
    if( !this.frame.editor.$viewport || !this.key || !this.$ )
      throw new Error('Invalid method called')

    if( this.frame.editor.$viewport.find(`[${CONTROL_QUICKSET_SELECTOR}="${this.key}"]`).length ) 
      return

    const
    { quickset, menu } = this.get() as ViewComponent,
    options = typeof quickset == 'function' ? quickset( this.bridge ) : {},
    settings = {
      editing: true,
      visible: true,
      detached: typeof menu == 'function'
    }

    // Calculate quickset position
    let { x, y, height } = this.frame.getTopography( this.$ )
    debug('show view quickset: ', x, y )

    // Adjust by left edges
    if( x < 15 ) x = CONTROL_EDGE_MARGIN

    /**
     * Create and hook quickset to view
     * component operations.
     */
    const 
    input: QuicksetInput = {
      key: this.key,
      /**
       * Extend options list with default view 
       * control options
       */
      options: { ...options, ...VIEW_CONTROL_OPTIONS },
      settings,
      position: { left: `${x}px`, top: `${y}px` }
    },
    hook: HandlerHook = { 
      events: this.bridge.events,
      metacall: this.metacall.bind(this)
    }
    this.Quickset = Quickset( input, hook )
    let $quickset = this.Quickset.appendTo( this.frame.editor.$viewport ).getNode()

    /**
     * Position quickset relatively to the view
     * component.
     */
    const
    tHeight = $quickset.find(':scope > [container]').height() || 0,
    dueYPosition = tHeight + (CONTROL_QUICKSET_MARGIN * 2)
    
    const
    wWidth = $(window).width() || 0,
    wHeight = $(window).height() || 0

    // Adjust by right edge
    if( x > (wWidth - tHeight) )
      x = wWidth - tHeight - CONTROL_EDGE_MARGIN

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
    if( y > (wHeight - tHeight) ) 
      y = wHeight - tHeight - CONTROL_EDGE_MARGIN

    // Update quickset position
    this.Quickset.subInput({ position: { left: `${x}px`, top: `${y}px` } })
    // Fire show quickset listeners
    this.bridge.events.emit('quickset.show')
  }
  showMenu(){
    if( !this.frame.editor.$viewport || !this.key || !this.$ ) 
      throw new Error('Invalid method called')

    if( this.frame.editor.$viewport.find(`[${CONTROL_MENU_SELECTOR}="${this.key}"]`).length ) 
      return

    const { caption, menu } = this.get() as ViewComponent
    if( typeof menu !== 'function' ) return

    // Calculate menu position
    let { x, y, width } = this.frame.getTopography( this.$ )
    debug('show view menu: ', x, y )
    
    const
    input = {
      caption,
      key: this.key,
      options: menu( this.bridge )
    },
    hook: HandlerHook = {
      metacall: this.metacall.bind(this)
    }
    this.Menu = Menu( input, hook )
    let $menu = this.Menu.appendTo( this.frame.editor.$viewport ).getNode()

    const
    pWidth = $menu.find(':scope > [container]').width() || 0,
    pHeight = $menu.find(':scope > [container]').height() || 0,
    // Window dimensions
    wWidth = $(window).width() || 0,
    wHeight = $(window).height() || 0,
    
    dueXPosition = pWidth + CONTROL_MENU_MARGIN
    
    /**
     * Not enough space at the left, position at the right
     */
    if( ( x - dueXPosition ) < CONTROL_EDGE_MARGIN ){
      /**
       * Not enough space at the right either, position 
       * over view.
       */
      if( x + width + dueXPosition < wWidth )
        x += width + CONTROL_MENU_MARGIN
    }
    // Adjust by left edges
    else x -= dueXPosition

    /**
     * Display menu in window view when element 
     * is position to close to the bottom.
     */
    if( ( y + pHeight + CONTROL_EDGE_MARGIN ) > wHeight )
      y -= pHeight
    
    // Adjust by the top edges
    else if( y < CONTROL_EDGE_MARGIN )
      y = CONTROL_EDGE_MARGIN
    
    // Update menu's position
    this.Menu.subInput({ position: { left: `${x}px`, top: `${y}px` } })
    // Fire show menu listeners
    this.bridge.events.emit('menu.show')
  }
  showFinder( $trigger: Cash ){
    if( !this.frame.editor.$viewport || !this.key || !this.$ )
      throw new Error('Invalid method called')

    /**
     * Put finder panel in position
     */
    let { x, y } = this.frame.getTopography( $trigger )

    const
    input = { key: this.key as string, list: this.frame.editor.store.searchView() },
    hook = {
      events: this.bridge.events,
      metacall: this.metacall.bind(this)
    }
    this.Finder = Finder( input, hook )
    let $finder = this.Finder.appendTo( this.frame.editor.$viewport ).getNode()

    const
    pWidth = $finder.find(':scope > [container]').width() || 0,
    pHeight = $finder.find(':scope > [container]').height() || 0,
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
  showMovable(){


    // Fire show movable listeners
    this.bridge.events.emit('movable.show')
  }
  
  move( direction?: string ){
    if( !this.$?.length || !this.key ) 
      throw new Error('Invalid method called')

    switch( direction ){
      case 'up': {
        let $anchor = this.$.prev()
        $anchor.length && this.$.before( $anchor )
      } break
      
      case 'down': {
        let $anchor = this.$.next()
        $anchor.length && this.$.after( $anchor )
      } break

      default: this.showMovable()
    }
  }
  dismiss(){
    // Unhighlight triggered views
    this.$?.removeAttr( VIEW_ACTIVE_SELECTOR )
    
    // Remove editing quickset if active
    this.Quickset?.destroy()
    this.Quickset = undefined

    // Remove editing control menu if active
    this.Menu?.destroy()
    this.Menu = undefined

    // Remove editing finder menu if active
    this.Finder?.destroy()
    this.Finder = undefined

    // Remove view's CSS rules 
    this.frame.styles.removeRules( this.key as string )

    /**
     * Fire dismiss function provided with 
     * view component.
     */
    const dismiss = this.getSpec('dismiss')
    typeof dismiss === 'function' && dismiss( this.bridge )
  }
  trigger(){
    if( !this.key || !this.$ ) return
    debug('trigger view')

    /**
     * Highlight triggered view: Delay due to 
     * pre-unhighlight effect.
     */
    this.$?.attr( VIEW_ACTIVE_SELECTOR, 'true' )

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

  /**
   * REVIEW: Not very confortable with the `metacall`
   * function being here really.
   * 
   * Look a moving it somewhere secure later.
   */
  metacall( key: string, data?: any ){
    if( !this.key ) return

    switch( key ){
      case 'menu': this.showMenu(); break
      case 'menu.dismiss': this.Menu?.destroy(); break

      case 'finder.search':
        /**
         * Trigger search with minimum 2 character input value
         */
        data.length > 2
        && this.Finder?.subInput({ list: this.frame.editor.store.searchView( data ) })
        break

      case 'view.sub.delete': this.frame.elements.remove( this.key ); break
      case 'view.sub.duplicate': this.frame.elements.duplicate( this.key ); break
      case 'view.sub.move-up': this.frame.elements.move( this.key, 'up'); break
      case 'view.sub.move-down': this.frame.elements.move( this.key, 'down'); break
      case 'view.sub.copy': this.frame.editor.clipboard = { type: 'view', key: this.key }; break
    }
  }
}