import type Frame from '../frame'
import type { ViewComponent } from '../../types/view'

import $, { type Cash } from 'cash-dom'
import View from './view'
import Flow from './flow'
import {
  VIEW_KEY_SELECTOR,
  VIEW_NAME_SELECTOR
} from '../constants'

export default class Elements {
  private frame: Frame

  /**
   * List of actively mapped elements
   */
  public list: Record<string, View> = {}

  /**
   * Default view state
   */
  private currentView?: View

  constructor( frame: Frame ){
    this.frame = frame
  }

  /**
   * Check whether a view is mounted into the
   * editor context.
   */
  has( key: string ){
    return key in this.list && this.list[ key ].key === key
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

    /**
     * Relay every view update event to its frame
     */
    view.on('view.changed', ( ...args: any[] ) => this.frame.emit('view.changed', ...args ) )

    this.list[ view.key ] = view
  }

  /**
   * Loop operation on all active elements
   */
  each( fn: ( view: View ) => void ){
    if( typeof fn !== 'function' )
      throw new Error('Expected each callback function')

    Object.values( this.list ).map( fn )
  }

  /**
   * Clear all elements mounted in the editor context
   */
  clear(){
    this.list = {}
  }

  /**
   * Add view component via editor contxt to the DOM
   */
  add( name: string, to: string ){
    const vc = this.frame.editor.store.getView( name )
    if( !vc )
      throw new Error(`Unknown <${name}> view`)

    this.currentView = new View( this.frame )
    this.currentView.mount( vc as ViewComponent, to )

    /**
     * Set this view in global namespace
     */
    this.set( this.currentView )
  }

  /**
   * Dismiss all/any active elements
   */
  dismissAll(){
    this.each( view => view.dismiss() )
  }

  /**
   * Lookup existing HTML elements in the DOM to identify
   * and mount any view that can be edited via the editor
   * context
   * 
   * Target: Native HTML tags or custom elements
   */
  lookup( $currentTarget: Cash, e?: Event ){
    /**
     * Inspect inert view
     */
    const key = $currentTarget.attr( VIEW_KEY_SELECTOR ) as string
    if( this.has( key ) ){
      // Stop event propagation when there's a view match
      e?.stopPropagation()

      // Dismiss all active elements
      this.dismissAll()
      
      // Create new view instance or use existing.
      this.currentView = this.get( key )
      if( !this.currentView ) return

      this.currentView.inspect( $currentTarget, this.currentView.getSpec('name'), true )
    }

    // Inspect new view
    else {
      // Identify view component name or its HTML nodeName
      let cname = $currentTarget.attr( VIEW_NAME_SELECTOR )
                  || $currentTarget.prop('nodeName').toLowerCase()

      let vc = this.frame.editor.store.getView( cname, $currentTarget )
      if( !vc ) return

      // Stop event propagation when there's a view match
      e?.stopPropagation()
      
      /**
       * View component's name can be the same as its HTML
       * nodeName identifier.
       * 
       * Eg. `fieldset` name for <fieldset> tag/nodeName
       * 
       * If not, then preempt to the view component's actual name
       * instead of the HTML nodeName.
       * 
       * Eg. `text` for <span> tag/nodeName
       */
      cname = vc.name
      
      // Dismiss all active elements
      this.dismissAll()

      // Create new view instance or use existing.
      this.currentView = new View( this.frame )
      if( !this.currentView ) return

      this.currentView.inspect( $currentTarget, cname, true )

      /**
       * Set this view in global namespace
       */
      this.set( this.currentView )
    }
  }

  /**
   * Propagate view control over every nexted nexted elements
   * or children -> children withing a give node.
   * 
   * Target: Native HTML tags or custom views
   */
  propagate( $node: Cash ){
    if( !$node.length ) return

    // Identify view component name or its HTML nodeName
    let cname = $node.attr( VIEW_NAME_SELECTOR )
                || $node.prop('nodeName').toLowerCase()

    const vc = this.frame.editor.store.getView( cname )
    if( vc?.name ){
      /**
       * View component's name can be the same as its HTML 
       * nodeName identifier.
       * 
       * Eg. `fieldset` name for <fieldset> tag/nodeName
       * 
       * If not, then preempt to the view component's actual name 
       * instead of the HTML nodeName.
       * 
       * Eg. `text` for <span> tag/nodeName
       */
      cname = vc.name
      
      /**
       * Check whether the view is not yet mounted in 
       * the editor context
       */
      const key = $node.attr( VIEW_KEY_SELECTOR )
      if( !key || !this.has( key ) ){
        /**
         * Inspect view
         */
        const view = new View( this.frame )
        view.inspect( $node, cname )

        /**
         * Set this view in global namespace
         */
        this.set( view )
      }
    }

    // Proceed to root node's nexted children -> children and on.
    const 
    self = this,
    $children = $node.children()
    
    $children.length && $children.each(function(){ self.propagate.bind(self)( $(this) ) })
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
  duplicate( key: string, $nextTo?: Cash ){
    if( !this.has( key ) ) return

    const duplicateView = new View( this.frame )
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