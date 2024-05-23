
import type Modela from './modela'
import View from './view'
import {
  VIEW_KEY_SELECTOR,
  VIEW_NAME_SELECTOR
} from './constants'

export default class Views {
  /**
   * List of actively mapped views
   */
  public list: { [index: string]: View } = {}

  /**
   * Default view state
   */
  private currentView?: View

  private flux: Modela

  constructor( flux: Modela ){
    this.flux = flux
  }

  has( key: string ){
    return this.list[ key ] && this.list[ key ].key === key
  }
  get( key: string ){
    return this.list[ key ]
  }
  set( view: View ){
    if( !view.key ) return
    this.list[ view.key ] = view
  }
  clear(){
    this.list = {}
  }
  add( name: string, to: string, isPlaceholder = true ){
    const component = this.flux.store.getComponent( name )
    if( !component )
      throw new Error(`Unknown <${name}> view`)

    this.currentView = new View( this.flux )
    this.currentView.mount( component, to, isPlaceholder )

    /**
     * Set this view in global namespace
     */
    this.set( this.currentView )
  }
  lookup( e: Event ){
    if( this.currentView && e.target == this.currentView.element ){
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
    const $currentTarget = $(e.currentTarget)
    // Identify component name or its HTML nodeName
    let cname = $currentTarget.attr( VIEW_NAME_SELECTOR )
                || $currentTarget.prop('nodeName').toLowerCase()

    const component = this.flux.store.getComponent( cname )
    if( !component || this.currentView && e.currentTarget == this.currentView.element )
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
    const viewKey = $currentTarget.attr( VIEW_KEY_SELECTOR )

    this.currentView = viewKey ? this.get( viewKey ) : new View( this.flux )
    this.currentView.inspect( e.currentTarget as HTMLElement, cname )

    /**
     * Set this view in global namespace
     */
    this.set( this.currentView )
  }
  remove( key: string ){
    if( !this.has( key ) ) return
    
    const view = this.get( key )
    view.destroy()

    delete this.list[ key ]
  }
  duplicate( key: string ){
    if( !this.has( key ) ) return

    const duplicateView = new View( this.flux )
    duplicateView.mirror( this.get( key ) )

    /**
     * Set this view in global namespace
     */
    this.set( duplicateView )
  }
}
