import type Frame from '../frame'
import type { HandlerHook } from '../../types/controls'
import type { ViewBlockProperties, ViewDefinition, ViewInstance } from '../../types/view'

import $, { type Cash } from 'cash-dom'
import EventEmitter from 'events'
import State from './state'
import {
  ELEMENT_KEY_SELECTOR,
  ELEMENT_TYPE_SELECTOR,
  ELEMENT_ACTIVE_SELECTOR,
  ELEMENT_CAPTION_SELECTOR,
  ELEMENT_TYPES_ALLOWED_SELECTOR,
  
  CONTROL_MENU_SELECTOR,
  CONTROL_QUICKSET_SELECTOR,
  
  CONTROL_EDGE_MARGIN,
  CONTROL_MENU_MARGIN,
  CONTROL_QUICKSET_MARGIN,
  ELEMENT_CONTROL_OPTIONS,
  CONTROL_HOLDER_SELECTOR
} from '../constants'
import { Component } from '../../lips/lips'
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
   * Unique key identifying the view in
   * the editor context.
   */
  public key?: string

  /**
   * View definition as original define.
   */
  private vdef?: ViewDefinition
  
  /**
   * View instance
   */
  public instance: ViewInstance

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
    this.instance = {
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
    if( !this.instance.$?.length ) return

    try {
      /**
       * Initialize default styles of the view
       */
      const { type, styles } = this.get()
      if( type && typeof styles === 'function' ){
        const sheet = styles( this.instance ).sheet
        sheet && this.frame.styles.addRules( sheet, { rel: this.key as string, scope: true } )
      }

      /**
       * Override instance primary css interface methods
       * 
       * - .custom() return custom CSS properties of defined 
       *             in the document stylesheets
       * - .style() returns style properties of this view
       */
      // if( this.instance.css ){
      //   // this.instance.css.custom = async () => (await this.frame.remote?.customCSSProps() as Record<string, string>)
      //   this.instance.css.style = async () => this.frame.editor.fn.extractStyle( this.instance.$ as Cash )
      // }
    }
    catch( error: any ){ debug( error.message ) }

    // Give away control to view definition
    const takeover = this.getDefinition('takeover')
    typeof takeover == 'function' && takeover( this.instance )

    this.instance.events.emit('mounted')
    debug('view initialized')

    /**
     * Override instance primary fn interface methods
     */
    if( this.instance.fn ){
      this.instance.fn.syncQuickset = ( updates: Record<string, any>, fn?: () => void ) => {
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
      this.instance.fn.pushHistoryStack = () => this.emit('view.changed')
    }
  }
  private setKey( value?: string ){
    value = value || hashKey()

    this.key = value
    this.instance.state.set('key', value )
  }

  set( values: any ){
    if( typeof values !== 'object' 
        || !Object.keys( values ).length )
      throw new Error('Invalid method argument')

    this.vdef = this.vdef ? { ...this.vdef, ...values } : values
    debug('view definition - ', this.vdef )
  }
  get(): ViewDefinition {
    if( !this.vdef )
      throw new Error('Invalid method called')

    return this.vdef
  }
  getDefinition( type: keyof ViewDefinition ): any {
    if( !this.vdef )
      throw new Error('Invalid method called')

    return this.vdef[ type ]
  }

  /**
   * Map out a normal HTML element to editor
   * context view using native elements cognition
   * process.
   */
  inspect( $this: Cash, type: string, activate = false ){
    debug('current target - ', $this.length )

    this.instance.$ = $this
    if( !this.instance.$.length )
      throw new Error('Invalid View Element')
    
    /**
     * Mount inspected view into editor context
     */
    if( this.instance.$.attr( ELEMENT_KEY_SELECTOR ) )
      this.setKey( this.instance.$.attr( ELEMENT_KEY_SELECTOR ) as string )
    
    /**
     * Generate and assign view tracking key
     */
    else {
      this.setKey()

      this.instance.$.attr({
        [ELEMENT_KEY_SELECTOR]: this.key as string, // Set view key
        [ELEMENT_TYPE_SELECTOR]: type // Set view node name identify
      })
    }

    if( !this.vdef ){
      // Set view specifications
      this.set( this.frame.editor.store.views.get( type ) )
      // Initialize view properties
      this.initialize()
    }

    // Auto-activate current view
    activate && this.activate()
  }
  /**
   * Mount new view comopnent into the DOM
   */
  mount( vdef: ViewDefinition, to: string ){
    if( !this.frame.$canvas.length ) return

    /**
     * `to` field should only be a model-view-key to be
     * sure the destination view is within editor control
     * scope.
     */
    const $to = this.frame.$canvas.find(`[${ELEMENT_KEY_SELECTOR}="${to}"]`)
    if( !$to.length )
      throw new Error(`Invalid destination view - <key:${to}>`)
    
    if( typeof vdef.render !== 'function' )
      throw new Error(`<${vdef.type}> render function not specified`)
    
    /**
     * Render new element with default definition and 
     * defined global settings
     */
    const element = vdef.render( this.instance )
    debug('mount view - ', element )

    // Add view to the DOM
    this.instance.$ = $(element)

    /**
     * Generate and assign tracking key to the 
     * new view
     */
    this.setKey()

    this.instance.$.attr({
      [ELEMENT_KEY_SELECTOR]: this.key as string, // Set view key
      [ELEMENT_TYPE_SELECTOR]: vdef.type // Set view node name identify
    })

    /**
     * Extract defined view blocks props
     */
    const renderingProps = this.frame.editor.fn.extractProperties( element )
    this.inject( renderingProps )

    // Set view specifications
    this.set( vdef )
    // Initialize view properties
    this.initialize()
    // Auto-activate current view
    this.activate()
  }
  /**
   * Create a clone/duplicate of an extisin view
   * in the editor context.
   */
  mirror( originalView: View, $nextTo?: Cash ){
    /**
     * Argument must be a new instance of view class
     */
    if( typeof originalView.instance !== 'object' 
        || !originalView.key
        || !originalView.instance.$
        || this.key )
      return

    let $original = originalView.instance.$

    /**
     * View holder awareness
     */
    if( $original.closest(`[${CONTROL_HOLDER_SELECTOR}]`).length )
      $original = $original.closest(`[${CONTROL_HOLDER_SELECTOR}]`)
    
    // Clone view element
    this.instance.$ = $original.clone()
    if( !this.instance.$.length )
      throw new Error('View instance HTML element not found')

    debug('mirror view - ', this.instance.$.length )
    $nextTo = $nextTo || $original

    /**
     * Add cloned view next to a given view element 
     * at a specific position
     */
    $nextTo.after( this.instance.$ )
    
    /**
     * Generate and assign view tracking key
     */
    this.setKey()
    this.instance.$.attr( ELEMENT_KEY_SELECTOR, this.key as string )

    /**
     * Shift cloned view from 15/15 pixels from 
     * the original
     */
    this.instance.$.css({
      left: `${parseFloat( $nextTo.css('left') as string ) + 15}px`,
      top: `${parseFloat( $nextTo.css('top') as string ) + 15}px`
    })
    
    // Clone view specifications
    this.set( originalView.get() )
    // Initialize view properties
    this.initialize()
  }
  
  inject( props: ViewBlockProperties[] ){
    if( !Array.isArray( props ) || !props.length ) return

    props.forEach( each => {
      if( !this.instance.$ ) return

      if( !each.selector ){
        each.caption && this.instance.$.data( ELEMENT_CAPTION_SELECTOR, each.caption )
        each.allowedViewTypes && this.instance.$.data( ELEMENT_TYPES_ALLOWED_SELECTOR, each.allowedViewTypes )

        return
      }

      /**
       * Assign props to specified content blocks
       */
      const $block = this.instance.$.find( each.selector )

      each.caption && $block.data( ELEMENT_CAPTION_SELECTOR, each.caption )
      each.allowedViewTypes && $block.data( ELEMENT_TYPES_ALLOWED_SELECTOR, each.allowedViewTypes )
    } )
  }

  /**
   * Show view's editing quickset
   */
  quickset(){
    if( !this.frame.editor.$viewport || !this.key || !this.instance.$ )
      throw new Error('Invalid method called')

    if( this.frame.editor.$viewport.find(`[${CONTROL_QUICKSET_SELECTOR}="${this.key}"]`).length ) 
      return

    const
    { quickset, menu } = this.get() as ViewDefinition,
    settings = {
      editing: true,
      visible: true
    }

    // Calculate quickset position
    let { x, y, height } = this.frame.getTopography( this.instance.$ )
    debug('show view quickset: ', x, y )

    // Adjust by left edges
    if( x < 15 ) x = CONTROL_EDGE_MARGIN

    let options = typeof quickset == 'function' ? quickset( this.instance ) : {}
    options = {
      ...options,
      ...ELEMENT_CONTROL_OPTIONS
    }
    if( typeof menu !== 'function' )
      delete options.menu
    
    // No quickset options
    if( !Object.keys( options ).length ) return

    /**
     * Create and hook quickset to view
     * definition operations.
     */
    const 
    input: QuicksetInput = {
      key: this.key,
      /**
       * Extend options list with default view 
       * control options
       */
      options,
      settings,
      position: { left: `${x}px`, top: `${y}px` }
    },
    hook: HandlerHook = {
      events: this.instance.events,
      metacall: this.metacall.bind(this)
    }
    this.Quickset = Quickset( this.frame.editor.lips, input, hook )
    let $quickset = this.Quickset.appendTo( this.frame.editor.$viewport ).getNode()

    /**
     * Position quickset relatively to the view
     * definition.
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
    this.instance.events.emit('quickset.show')
  }
  menu(){
    if( !this.frame.editor.$viewport || !this.key || !this.instance.$ ) 
      throw new Error('Invalid method called')

    if( this.frame.editor.$viewport.find(`[${CONTROL_MENU_SELECTOR}="${this.key}"]`).length ) 
      return

    const { caption, menu } = this.get() as ViewDefinition
    if( typeof menu !== 'function' ) return

    // Calculate menu position
    let { x, y, width } = this.frame.getTopography( this.instance.$ )
    debug('show view menu: ', x, y )
    
    const
    input = {
      caption,
      key: this.key,
      options: menu( this.instance )
    },
    hook: HandlerHook = {
      events: this.instance.events,
      metacall: this.metacall.bind(this)
    }
    this.Menu = Menu( this.frame.editor.lips, input, hook )
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
    this.instance.events.emit('menu.show')
  }
  finder( $trigger: Cash ){
    if( !this.frame.editor.$viewport || !this.key || !this.instance.$ )
      throw new Error('Invalid method called')

    /**
     * Put finder panel in position
     */
    let { x, y } = this.frame.getTopography( $trigger )

    const
    input = { key: this.key as string, list: this.frame.editor.store.views.search() },
    hook = {
      events: this.instance.events,
      metacall: this.metacall.bind(this)
    }
    this.Finder = Finder( this.frame.editor.lips, input, hook )
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
  
  activate(){
    if( !this.key || !this.instance.$ ) return
    debug('trigger view')

    /**
     * Highlight triggered view: Delay due to 
     * pre-unhighlight effect.
     */
    this.instance.$?.attr( ELEMENT_ACTIVE_SELECTOR, 'true' )

    /**
     * View activation awareness.
     */
    this.instance.events.emit('activate')
  }
  deactivate(){
    if( !this.key || !this.instance.$ ) return
    debug('trigger view')
    
    // Remove editing quickset if active
    this.Quickset?.destroy()
    this.Quickset = undefined

    // Remove editing control menu if active
    this.Menu?.destroy()
    this.Menu = undefined

    // Remove editing finder menu if active
    this.Finder?.destroy()
    this.Finder = undefined

    /**
     * View activation awareness.
     */
    this.instance.$?.removeAttr( ELEMENT_ACTIVE_SELECTOR )
    this.instance.events.emit('deactivate')
  }
  destroy(){
    if( !this.instance.$?.length ) 
      throw new Error('Invalid method called')

    // If having handle grab
    this.frame.handles?.manual.hold?.release( this.instance.$ )
    
    // Deactivate controls related to the view
    this.deactivate()

    // Remove element from the DOM
    this.instance.$.remove()

    /**
     * Clear all namespaces styles attached to this
     * viwe element if there are no other instances of 
     * this view in the DOM.
     */
    this.frame.styles.removeRules( this.key as string )

    this.instance.$ = undefined
    this.vdef = undefined
    this.key = undefined
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
      case 'menu': this.menu(); break
      case 'menu.dismiss': this.Menu?.destroy(); break

      case 'finder.search':
        /**
         * Trigger search with minimum 2 character input value
         */
        data.length > 2
        && this.Finder?.subInput({ list: this.frame.editor.store.views.search( data ) })
        break

      case 'view.sub.delete': this.frame.elements.remove( this.key ); break
      case 'view.sub.duplicate': this.frame.elements.duplicate( this.key ); break
      case 'view.sub.copy': this.frame.editor.clipboard = { type: 'view', key: this.key }; break
    }
  }
}