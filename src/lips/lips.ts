import type { LipsConfig, Template, ComponentOptions } from '.'

import I18N from './i18n'
import DWS from './dws'
import Component from './component'
import { effect, signal } from './signal'
import { isDiff } from './utils'
import * as If from './syntax/if'
import * as For from './syntax/for'
import * as pd from './syntax/pd'
import * as Switch from './syntax/switch'
import * as Router from './syntax/router'

export default class Lips<Context = any> {
  private debug = false
  private store: Record<string, Template> = {}

  private __root?: Component
  public i18n = new I18N()
  public watcher?: DWS

  private _setContext: ( ctx: Context ) => void
  private _getContext: () => Context

  constructor( config?: LipsConfig ){
    if( config?.debug ) 
      this.debug = config.debug

    this.watcher = new DWS()
    
    const [ getContext, setContext ] = signal<Context>( config?.context || {} )

    this._setContext = setContext
    this._getContext = getContext

    /**
     * Register syntax components
     * 
     * `<router routers=[] global, ...></router>` -- Internal Routing Component
     */
    this.register('if', If )
    this.register('pd', pd )
    this.register('for', For )
    this.register('switch', Switch )
    this.register('router', Router )
  }

  register( name: string, template: Template<any, any, any, any> ){
    /**
     * TODO: Register component by providing file path.
     */
    // if( typeof template == 'string' ){
    //   try { this.store[ name ] = await import( template ) as Template }
    //   catch( error ){ throw new Error(`Component <${name}> template not found at ${template}`) }

    //   return
    // }

    this.store[ name ] = template

    return this
  }
  unregister( name: string ){
    delete this.store[ name ]

    return this
  }

  has( name: string ){
    return name in this.store
  }
  import( pathname: string ): Template {
    // Fetch from registered component
    if( !this.has( pathname ) )
      throw new Error(`<${pathname}> component not found`)
    
    /**
     * Only syntactic component are allowed to 
     * no have template's `default` export.
     */
    if( !this.store[ pathname ].declaration?.syntax && !this.store[ pathname ].default )
      throw new Error(`Invalid <${pathname}> component`)
    
    return this.store[ pathname ]
  
    /**
     * TODO: Import component directly from a file
     */
    // try {
    //   const template = await import( pathname ) as Template
    //   if( !template?.default )
    //     throw null

    //   this.register( pathname, template )
    //   return template
    // }
    // catch( error ){ throw new Error(`No <${pathname}> component found`) }
  }
  render<Input = void, State = void, Static = void, Context = void>( name: string, template: Template<Input, State, Static, Context>, input?: Input ){
    const
    { default: _default, ...scope } = template,
    options: ComponentOptions = {
      debug: this.debug,
      prekey: '0',
      lips: this
    }

    return new Component<Input, State, Static, Context>( name, _default || '', { ...scope, input }, options )
  }
  root( template: Template, selector: string ){
    this.__root = this.render('__ROOT__', template )
    this.__root.appendTo( selector )

    return this.__root
  }

  language( lang: string ){
    this.i18n.setLang( lang )
    /**
     * Rerender root component when language changed
     */
    && this.__root?.rerender()
  }

  setContext( arg: Context | string, value?: any ){
    // Always get latest state
    const currentContext = this._getContext()

    /**
     * Change context only when tangible updates
     * are detected.
     * 
     * Note: Context may not be initialize at instanciation
     * of Lips.
     */
    if( typeof arg === 'string' ){
      const updates = { ...currentContext, [arg]: value }
      isDiff( currentContext, updates ) && this._setContext( updates )
    }
    /**
     * no-array object guard
     */
    else if( !Array.isArray( arg ) ){
      const updates = { ...currentContext, ...arg }
      isDiff( currentContext, updates ) && this._setContext( updates )
    }
    
    else throw new Error('Invalid context data')
  }
  getContext(){
    return this._getContext()
  }
  useContext<P extends Context>( fields: (keyof Context)[], fn: ( context: P ) => void ){
    if( !fields.length ) return

    effect( () => {
      const context = this._getContext() as Context
      if( !context ) return

      const ctx = Object.fromEntries( fields.map( field => [ field, context[ field ] ]) ) as unknown as P
      
      /**
       * Propagate context change effect to component 
       * only when its registered scope have changed
       */
      ctx
      && typeof fn === 'function'
      && Object.keys( ctx ).length
      && fn( ctx )
    })
  }

  dispose(){
    this.watcher?.dispose()
    this.__root?.destroy()
  }
}