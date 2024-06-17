import type Frame from './frame'
import type { FrameQuery } from '../lib/frame.window'
import type { AddViewTriggerType, ViewComponent } from '../types/view'

import View from './view'
import {
  VIEW_KEY_SELECTOR,
  VIEW_NAME_SELECTOR
} from './constants'

export default class Views {
  private frame: Frame

  /**
   * List of actively mapped views
   */
  public list: ObjectType<View> = {}

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
    this.list[ view.key ] = view
  }

  /**
   * Loop operation on all active views
   */
  each( fn: ( view: View ) => void ){
    if( typeof fn !== 'function' )
      throw new Error('Expected each callback function')

    Object.values( this.list ).map( fn )
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
  async add( name: string, to: string, triggerType?: AddViewTriggerType ){
    const vc = await this.frame.flux.store.getView( name )
    if( !vc )
      throw new Error(`Unknown <${name}> view`)

    this.currentView = new View( this.frame )
    await this.currentView.mount( vc as ViewComponent, to, triggerType )

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
  async lookup( $$currentTarget: FrameQuery ){
    /**
     * Inspect view
     */
    const key = await $$currentTarget.attr( VIEW_KEY_SELECTOR )
    if( this.has( key ) ){
      // Dismiss all active views
      this.each( view => view.dismiss() )
      this.get( key ).trigger()
      return
    }

    // Identify view component name or its HTML nodeName
    let cname = await $$currentTarget.attr( VIEW_NAME_SELECTOR )
                || (await $$currentTarget.prop('nodeName')).toLowerCase()

    let vc = await this.frame.flux.store.getView( cname, $$currentTarget )
    if( !vc ) return
    
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
    
    // Dismiss all active views
    this.each( view => view.dismiss() )

    // Create new view instance or use existing.
    this.currentView = new View( this.frame )
    if( !this.currentView ) return

    await this.currentView.inspect( $$currentTarget, cname, true )

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
  async propagate( $$node: FrameQuery ){
    if( !$$node.length ) return

    // Identify view component name or its HTML nodeName
    let cname = await $$node.attr( VIEW_NAME_SELECTOR )
                || (await $$node.prop('nodeName')).toLowerCase()

    const vc = await this.frame.flux.store.getView( cname )
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
      const key = await $$node.attr( VIEW_KEY_SELECTOR )
      if( !key || !this.has( key ) ){
        /**
         * Inspect view
         */
        const view = new View( this.frame )
        await view.inspect( $$node, cname )

        /**
         * Set this view in global namespace
         */
        this.set( view )
      }
    }

    // Proceed to root node's nexted children -> children and on.
    const 
    self = this,
    $$children = await $$node.children()
    
    $$children.length && await $$children.each( async $$this => await self.propagate.bind(self)( $$this ) )
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
  async duplicate( key: string, $$nextTo?: FrameQuery ){
    if( !this.has( key ) ) return

    const duplicateView = new View( this.frame )
    await duplicateView.mirror( this.get( key ), $$nextTo )

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