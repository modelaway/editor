
import type Modela from './modela'
import View from './view'
import {
  VIEW_KEY_SELECTOR,
  VIEW_NAME_SELECTOR
} from './constants'

export default class Views {
  private flux: Modela

  /**
   * List of actively mapped views
   */
  public list: ObjectType<View> = {}

  /**
   * Default view state
   */
  private currentView?: View

  constructor( flux: Modela ){
    this.flux = flux
  }

  /**
   * Check whether a view is mounted into the
   * editor context.
   */
  has( key: string ){
    return this.list[ key ] && this.list[ key ].key === key
  }

  /**
   * Return view mounted in editor context
   */
  get( key: string ){
    return this.list[ key ]
  }

  /**
   * Record editor context's view
   */
  set( view: View ){
    if( !view.key ) return
    this.list[ view.key ] = view
  }

  /**
   * Clear all views mounted in the editor context
   */
  clear(){
    this.list = {}
  }

  /**
   * Add view component via editor contxt to the DOM
   */
  add( name: string, to: string, triggerType?: AddViewTriggerType ){
    const component = this.flux.store.getComponent( name )
    if( !component )
      throw new Error(`Unknown <${name}> view`)

    this.currentView = new View( this.flux )
    this.currentView.mount( component, to, triggerType )

    /**
     * Set this view in global namespace
     */
    this.set( this.currentView )
  }

  /**
   * Lookup existing HTML elements in the DOM to identify
   * and mount any view that can be edited via the editor
   * context
   * 
   * Target: Native HTML tags or custom views
   */
  lookup( e: Event ){
    if( this.currentView?.$ && e.target == this.currentView.$.get(0) ){
      /**
       * Identify parent of target by `e.currentTarget`
       * that are different from `e.target`: Upward cascade
       * triggered elements
       * 
       * Retain the last triggered parent for top view
       * highlighting reference.
       */
      if( e.target == e.currentTarget ) return
      this.currentView.setParent( e.currentTarget as HTMLElement )

      return
    }

    if( !e.currentTarget ) return

    /**
     * Mount current view with only known tags or 
     * components
     */
    const $currentTarget = $(e.currentTarget) as JQuery<HTMLElement>
    // Identify component name or its HTML nodeName
    let cname = $currentTarget.attr( VIEW_NAME_SELECTOR )
                || $currentTarget.prop('nodeName').toLowerCase()

    const component = this.flux.store.getComponent( cname )
    if( !component || this.currentView?.$ && e.currentTarget == this.currentView.$.get(0) )
      return
    
    /**
     * Component's name can be the same as its HTML 
     * nodeName identifier.
     * 
     * Eg. `fieldset` name for <fieldset> tag/nodeName
     * 
     * If not, then preempt to the component's actual name 
     * instead of the HTML nodeName.
     * 
     * Eg. `text` for <span> tag/nodeName
     */
    cname = component.name
    
    // Dismiss all active views
    Object
    .values( this.list )
    .map( view => view.dismiss() )

    /**
     * Inspect view
     */
    const key = $currentTarget.attr( VIEW_KEY_SELECTOR )

    // Create new view instance or use existing.
    this.currentView = key && this.get( key ) || new View( this.flux )
    this.currentView.inspect( $currentTarget, cname, true )

    /**
     * Set this view in global namespace
     */
    this.set( this.currentView )
  }

  /**
   * Propagate view control over every nexted nexted elements
   * or children -> children withing a give node.
   * 
   * Target: Native HTML tags or custom views
   */
  propagate( $node: JQuery<HTMLElement> ){
    if( !$node.length ) return

    // Identify component name or its HTML nodeName
    let cname = $node.attr( VIEW_NAME_SELECTOR )
                || $node.prop('nodeName').toLowerCase()

    const component = this.flux.store.getComponent( cname )
    if( component?.name ){
      /**
       * Component's name can be the same as its HTML 
       * nodeName identifier.
       * 
       * Eg. `fieldset` name for <fieldset> tag/nodeName
       * 
       * If not, then preempt to the component's actual name 
       * instead of the HTML nodeName.
       * 
       * Eg. `text` for <span> tag/nodeName
       */
      cname = component.name
      
      /**
       * Check whether the view is not yet mounted in 
       * the editor context
       */
      const key = $node.attr( VIEW_KEY_SELECTOR )
      if( !key || !this.get( key ) ){
        /**
         * Inspect view
         */
        const view = new View( this.flux )
        view.inspect( $node, cname )

        /**
         * Set this view in global namespace
         */
        this.set( view )
      }
    }

    // Proceed to root node's nexted children -> children and on.
    const self = this
    $node.children().length
    && $node.children().each( function(){ self.propagate.bind(self)( $(this) ) } )
  }

  /**
   * Remove a view from the DOM and the 
   * editor context
   */
  remove( key: string ){
    if( !this.has( key ) ) return
    
    this.get( key ).destroy()
    delete this.list[ key ]
  }

  /**
   * Duplicate a view
   */
  duplicate( key: string, $nextTo?: JQuery<HTMLElement> ){
    if( !this.has( key ) ) return

    const duplicateView = new View( this.flux )
    duplicateView.mirror( this.get( key ), $nextTo )

    /**
     * Set this view in global namespace
     */
    this.set( duplicateView )
  }

  /**
   * Move view within the DOM
   * 
   * Direction: `up`, `down`, `any`
   */
  move( key: string, direction?: string ){
    if( !this.has( key ) ) return
    
    this.get( key ).move( direction )
  }
}
