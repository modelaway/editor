import type Modela from './modela'
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
  CONTROL_TOOLBAR_MARGIN
} from './constants'
import { Stylesheet } from './css'
import {
  createPlaceholder,
  createToolbar,
  createPanel
} from './block.factory'
import { 
  log,
  i18n,
  generateKey,
  defineProperties,
  extractProperties
} from './utils'

class State {
  private state: ObjectType<any> = {}

  set( field: string, value: any ){
    this.state[ field ] = value

    // Call lifecyle event functions
  }
  get( field?: string ){
    return field ? this.state[ field ] : this.state 
  }
  delete( field: string ) {
    delete this.state[ field ]

    // Call lifecyle event functions
  }
  clear(){
    this.state = {}

    // Call lifecyle event functions
  }
  json(){
    return JSON.parse( JSON.stringify( this.state ) )
  }
}

export default class View {
  /**
   * Access to modela's core instance and 
   * relative functional classes.
   */
  private flux: Modela

  /**
   * View's styles application handler
   */
  private styles?: Stylesheet 

  /**
   * Native HTML element and JQuery element
   * object of the view.
   */
  public element?: HTMLElement | string
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
   * View component state
   */
  private state: State

  /**
   * Holding global properties and utils methods.
   * provided to component lifecycle methods.
   */
  private global: GlobalSet

  constructor( flux: Modela ){
    this.flux = flux

    /**
     * Initial component state
     */
    this.state = new State()
    
    /**
     * global
     */
    this.global = {
      css: flux.css,
      assets: flux.assets,
      i18n,
      defineProperties
    }
  }

  private getEventObject( type: string, dataset?: ObjectType<any> ){
    return {
      type,
      view: this.$ as JQuery<HTMLElement>,
      dataset,
      state: this.state
    }
  }
  private getTopography( $view?: JQuery<HTMLElement> | null, strict = false ){
    $view = $view || this.$
    if( !$view?.length )
      throw new Error('Invalid method call. Expected a valid $view element')
    
    /**
     * View position coordinates in the DOM base on
     * which related triggers will be positionned.
     */
    let { left, top } = $view.offset() || { left: 0, top: 0 }

    // Determite position of element relative to window only
    if( strict ){
      top -= $(window).scrollTop() || 0
      left -= $(window).scrollLeft() || 0
    }

    return { 
      x: left,
      y: top,
      width: $view.width() || 0,
      height: $view.height() || 0
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
      if( name && typeof styles === 'function' ){
        this.styles = new Stylesheet({
          nsp: name,
          key: this.key,
          /**
           * Run the defined `styles()` method of the component
           * to get initial style properties.
           */
          props: styles( this.getEventObject('toolbar'), this.global )
        })

        this.styles.load()
      }
    }
    catch( error: any ){ log( error.message ) }

    /**
     * Attach a next placeholder to the new view element
     * 
     * Only add placehlder to no `absolute`, `fixed` or `sticky`
     * position elements to void unnecessary stack of placehlder
     * element around static or relative position elements.
     */
    try {
      if( this.flux.settings.enablePlaceholders
          && !this.$?.next(`[${VIEW_PLACEHOLDER_SELECTOR}="${this.key}"]`).length ){
        
        this.$?.css('position')
        && !['fixed', 'absolute', 'sticky'].includes( this.$.css('position') as string )
        && this.$.after( createPlaceholder( this.key as string ) )
      }
    }
    catch( error: any ){ log( error.message ) }
  }

  set( values: any ){
    if( typeof values !== 'object' 
        || !Object.keys( values ).length )
      throw new Error('Invalid method argument')

    this.component = this.component ? { ...this.component, ...values } : values
    log('component - ', this.component )
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
  inspect( element: HTMLElement, name: string ){
    this.element = element
    log('current target - ', element )

    this.$ = $(element)
    if( !this.$.length )
      throw new Error('Invalid View Element')
    
    /**
     * Mount inspected view into editor context
     */
    const isMounted = this.$.attr( VIEW_KEY_SELECTOR ) !== undefined
    if( !isMounted ){
      /**
       * Generate and assign view tracking key
       */
      this.key = generateKey()

      this.$.attr({
        [VIEW_KEY_SELECTOR]: this.key, // Set view key
        [VIEW_NAME_SELECTOR]: name // Set view node name identify
      })
      
      // Set view specifications
      this.set( this.flux.store.getComponent( name ) )
      // Initialize view properties
      this.initialize()
    }

    // Auto-trigger current view
    this.trigger()
  }
  /**
   * Mount new view comopnent into the DOM
   */
  mount( component: ViewComponent, to: string, isPlaceholder = true ){
    /**
     * `to` field should only be a model-view-key to be
     * sure the destination view is within editor control
     * scope.
     */
    const $to = $(`[${VIEW_KEY_SELECTOR}="${to}"]`)
    if( !$to.length )
      throw new Error(`Invalid destination view - <key:${to}>`)
    
    if( typeof component.render !== 'function' )
      throw new Error(`<${component.name}> render function not specified`)
    
    /**
     * Render new element with default component and 
     * defined global settings
     */
    this.element = component.render( this.getEventObject('render'), this.global )
    log('mount view - ', this.element )

    // Add view to the DOM
    this.$ = $(this.element)
    $to[ isPlaceholder ? 'after' : 'append' ]( this.$ )

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
    const renderingProps = extractProperties( this.element )
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
    this.element = viewInstance.$.clone().get(0)
    if( !this.element )
      throw new Error('View instance HTML element not found')

    log('mirror view - ', this.element )

    // Add cloned view to the DOM
    this.$ = $(this.element)

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
    log('parent target - ', parent )

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

    typeof this.component.apply == 'function'
    && this.component.apply( this.getEventObject( type, dataset ), this.global )
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

    this.$.remove()

    // Clear all styles attached from the DOM
    this.styles?.clear()

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
    if( !this.flux.$root || !this.key ) 
      throw new Error('Invalid method called')

    if( this.flux.$root.find(`[${CONTROL_TOOLBAR_SELECTOR}="${this.key}]"`).length ) 
      return

    const toolbar = this.get('toolbar')
    if( !toolbar ) return

    const $toolbar = $(createToolbar( this.key, toolbar( this.getEventObject('toolbar'), this.global ), true ))

    let { x, y, height } = this.getTopography()
    log('show view toolbar: ', x, y )

    // Adjust by left edges
    if( x < 15 ) x = CONTROL_EDGE_MARGIN

    $toolbar.css({ left: `${x}px`, top: `${y}px` })
    this.flux.$root.append( $toolbar )

    const
    tHeight = $toolbar.find('> [container]').height() || 0,
    dueYPosition = tHeight + CONTROL_TOOLBAR_MARGIN
    
    /**
     * Push slightly on top of element in normal position
     * but adjust below the element if it's to close to
     * the top edge.
     */
    if( ( y - dueYPosition ) < CONTROL_EDGE_MARGIN ) y += height + CONTROL_TOOLBAR_MARGIN
    else y -= dueYPosition

    // Adjust by right & bottom edges
    const
    wWidth = $(window).width() || 0,
    wHeight = $(window).height() || 0

    if( x > (wWidth - tHeight) ) x = wWidth - tHeight - CONTROL_EDGE_MARGIN
    if( y > (wHeight - tHeight) ) y = wHeight - tHeight - CONTROL_EDGE_MARGIN

    $toolbar.css({ left: `${x}px`, top: `${y}px` })
  }
  showPanel(){
    if( !this.flux.$modela || !this.key ) 
      throw new Error('Invalid method called')

    if( this.flux.$modela.find(`[${CONTROL_PANEL_SELECTOR}="${this.key}]"`).length ) 
      return

    const { caption, panel } = this.get()
    if( !panel ) return

    const $panel = $(createPanel( this.key, caption, panel( this.getEventObject('panel'), this.global ) ))

    let { x, y, width } = this.getTopography( null, true )
    log('show view panel: ', x, y )

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
    if( ( x - dueXPosition ) < 15 ){
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
    if( y + pHeight > wHeight )
      y -= pHeight
    
    $panel.css({ left: `${x}px`, top: `${y}px` })
  }
  showMovable(){

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
    typeof dismiss === 'function' && dismiss( this.getEventObject('dismiss'), this.global )
  }
  trigger(){
    if( !this.key || !this.$ ) return
    log('trigger view')

    /**
     * Highlight triggered view: Delay due to 
     * pre-unhighlight effect.
     */
    setTimeout( () => this.$?.attr( VIEW_ACTIVE_SELECTOR, 'true' ), 200 )

    /**
     * Fire activation function provided with 
     * view component.
     */
    const activate = this.get('activate')
    typeof activate === 'function' && activate( this.getEventObject('activate'), this.global )
  }
  triggerParent(){
    if( !this.key ) return
    log('trigger parent view')
    
  }
  dismissParent(){
    
  }
}