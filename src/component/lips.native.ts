import type { 
  TObject,
  LipsConfig,
  Template,
  EventListener,
  Handler,
  ComponentScope,
  ComponentOptions
} from '.'

import I18N from './i18n'
import Benchmark from './benchmark'
import Stylesheet from './stylesheet'
import { deepAssign } from '../modules/utils'
import { isEquals, uniqueObject } from './utils'
import { effect, signal } from './signal'

import * as Router from './router'

function preprocessTemplate( str: string ){
  return str.trim()
            .replace(/<if\(\s*(.*?)\s*\)>/g, '<if by="$1">')
            .replace(/<else-if\(\s*(.*?)\s*\)>/g, '<else-if by="$1">')
            .replace(/<switch\(\s*(.*?)\s*\)>/g, '<switch by="$1">')
}

// Utility functions to replace jQuery methods
function getAttributes( element: Element ){
  const obj: TObject<string> = {}
  Array.from( element.attributes ).forEach( attr => obj[ attr.name ] = attr.value )

  return obj
}

function getTagName( element: Element | null ){
  if( !element ) return false
  return element.tagName.toLowerCase()
}

export default class Lips<Context = any> {
  private debug = false
  private context?: Context
  private store: TObject<Template> = {}
  private __root?: Component

  public i18n = new I18N()

  private _setContext: ( ctx: Context ) => void
  private _getContext: () => Context

  constructor( config?: LipsConfig ){
    if( config?.debug ) 
      this.debug = config.debug

    const [ getContext, setContext ] = signal<Context>( config?.context || {} )

    this._setContext = setContext
    this._getContext = getContext
    
    this.register( 'router', Router )
  }

  async register( name: string, template: Template<any, any, any, any> ){
    this.store[ name ] = template
  }

  unregister( name: string ){
    delete this.store[ name ]
  }

  has( name: string ){
    return name in this.store
  }

  import( pathname: string ): Template {
    if( !this.has( pathname ) ) throw new Error(`<${pathname}> component not found`)

    if( !this.store[ pathname ].default )
      throw new Error(`Invalid <${pathname}> component`)

    return this.store[ pathname ]
  }

  render( name: string, template: Template ){
    const { default: _default, ...scope } = template,
          options: ComponentOptions = { debug: this.debug, prekey: '0', lips: this }

    return new Component( name, _default, scope, options )
  }

  root( template: Template, selector: string ){
    this.__root = this.render( '__ROOT__', template )
    this.__root.appendTo( selector )

    return this.__root
  }

  language( lang: string ){
    this.i18n.setLang( lang )
    && this.__root?.rerender()
  }

  setContext( key: Context | string, value?: any ){
    typeof key == 'string'
      ? this._setContext({ ...this.context, [ key ]: value } as Context )
      : this._setContext({ ...this.context, ...key } as Context )
  }

  useContext( fields: (keyof Context)[], fn: ( ...args: any[] ) => void ){
    effect( () => {
      this.context = this._getContext()

      const ctx: any = {}
      fields.forEach( field => {
        if( !this.context ) return
        ctx[ field ] = this.context[ field ]
      })

      typeof fn === 'function' && fn( ctx )
    })
  }
}

export class Component<Input = void, State = void, Static = void, Context = void> {
  private template: string
  private $?: HTMLElement
  public input: Input
  public state: State
  public static: Static
  public context: Context

  private __name__: string
  private __state?: State // Partial state
  private __stylesheet?: Stylesheet
  private __components: TObject<Component> = {}
  private __events: TObject<EventListener[]> = {}
  private __once_events: TObject<EventListener[]> = {}
  private __attachableEvents: { $node: HTMLElement, _event: string, instruction: string, scope?: TObject<any> }[] = []

  /**
   * Nexted Component Count (NCC) in tree
   * hieralchy and discovery order
   */
  private NCC = 0
  private prekey = '0'
  private debug = false
  private isRendered = false

  private _setInput: ( input: Input ) => void
  private _setState: ( state: State ) => void
  private _getState: () => State | undefined

  // Internal Update Clock (IUC)
  private IUC: NodeJS.Timeout
  private IUC_BEAT = 5 // ms

  public lips?: Lips
  private benchmark: Benchmark

  /**
   * Allow methods of `handler` to be dynamically
   * added to `this` component object.
   */
  [key: string]: any

  constructor( name: string, template: string, { input, state, context, _static, handler, stylesheet }: ComponentScope<Input, State, Static, Context>, options?: ComponentOptions ){
    this.template = preprocessTemplate( template )

    if( options?.lips ) this.lips = options.lips    
    if( options?.debug ) this.debug = options.debug
    if( options?.prekey ) this.prekey = options.prekey

    this.__name__ = name

    const cssOptions = {
      css: stylesheet,
      /**
       * Inject root component styles into global meta
       * style tag.
       */
      meta: this.__name__ === '__ROOT__'
    }
    this.__stylesheet = new Stylesheet( this.__name__, cssOptions )
    this.benchmark = new Benchmark( this.debug )
    
    /**
     * Triggered an initial input is provided
     */
    this.input = input || {} as Input
    this.state = state || {} as State
    this.static = _static || {} as Static
    this.context = {} as Context

    handler && this.setHandler( handler )

    const
    [ getInput, setInput ] = signal<Input>( this.input ),
    [ getState, setState ] = signal<State>( this.state ),
    [ getContext, setContext ] = signal<Context>( this.context )

    this._setInput = setInput
    this._setState = setState
    this._getState = getState
    
    this.input
    && Object.keys( this.input ).length
    && typeof this.onInput == 'function'
    && this.onInput.bind(this)()

    this.IUC = setInterval( () => {
      this.state
      && !isEquals( this.__state as TObject<any>, this.state as TObject<any> )
      && this.setState( this.state )
    }, this.IUC_BEAT )

    Array.isArray( context )
    && context.length
    && this.lips?.useContext( context, ctx => !isEquals( this.context as TObject<any>, ctx ) && setContext( ctx ) )

    effect( () => {
      this.input = getInput()
      this.state = getState()
      this.context = getContext()

      this.benchmark.reset()
      this.NCC = 0
      this.__attachableEvents = []

      if( this.isRendered ) this.rerender()
      else {
        typeof this.onCreate == 'function'
        && this.onCreate.bind(this)()

        this.$ = this.render()
        this.$.setAttribute('rel', this.__name__ )
      }

      this.detachEvents()
      this.attachEvents()

      this.benchmark.log()
      this.__state = uniqueObject( this.state )
      
      !this.isRendered
      && typeof this.onMount == 'function'
      && this.onMount.bind(this)()

      this.isRendered = true
      
      typeof this.onRender == 'function'
      && this.onRender.bind(this)()
    })
  }

  getState( key: string ){
    const state = this._getState() as TObject<any>
    return state && typeof state == 'object' && state[ key ]
  }
  setState( data: any ){
    const state = this._getState() as TObject<keyof State>
    this._setState({ ...state, ...data })
    typeof this.onUpdate == 'function'
    && this.onUpdate.bind(this)()
  }
  setInput( input: Input ){
    if( isEquals( this.input as TObject<any>, input as TObject<any> ) )
      return
    
    this._setInput({ ...this.input, ...input })
    typeof this.onInput == 'function'
    && this.onInput.bind(this)()
  }
  subInput( data: TObject<any> ){
    if( typeof data !== 'object' ) 
      return this.getNode()
    
    this.setInput( deepAssign( this.input as TObject<any>, data ) )
  }
  setHandler( list: Handler<Input, State, Static, Context> ){
    Object.entries( list )
    .forEach( ([ method, fn ]) => this[ method ] = fn.bind(this) )
  }

  getNode(){
    if( !this.$ )
      throw new Error('Component is not rendered')
    return this.$
  }
  find( selector: string ){
    return this.$?.querySelector( selector )
  }
  findAll( selector: string ){
    return this.$?.querySelectorAll( selector )
  }

  render( nodes: Node[] | null = null, scope: Record<string, any> = {} ): HTMLElement {
    const self = this, fragment = document.createDocumentFragment()

    function execLet( node: Element ): void {
      const attributes = getAttributes( node )
      if( !attributes.length ) return

      Object
      .entries( attributes )
      .forEach( ([ name, value ]) => {
        if( !value ) return
        scope[ name ] = self.__evaluate__( value, scope )
      })

      self.benchmark.inc( 'elementCount' )
    }

    function execFor( node: Element ): DocumentFragment {
      const contents = [ ...Array.from( node.childNodes ) ]
      const inValue = self.__evaluate__( node.getAttribute('in') as string, scope )
      const from = node.getAttribute( 'from' )
      const to = node.getAttribute( 'to' )
      const localFragment = document.createDocumentFragment()

      if( from !== null && to !== null ){
        const start = parseFloat( from ), end = parseFloat( to )
        for( let i = start; i <= end; i++ )
          if( contents.length )
            localFragment.appendChild( self.render( contents, { index: i } ) )
      } else if( Array.isArray( inValue ) ){
        inValue.forEach( ( each, index ) => {
          if( contents.length )
            localFragment.appendChild( self.render( contents, { each, index } ) )
        })
      } else if( typeof inValue === 'object' ){
        Object.entries( inValue ).forEach( ( [ key, each ], index ) => {
          if( contents.length )
            localFragment.appendChild( self.render( contents, { index, key, each } ) )
        })
      }

      self.benchmark.inc( 'elementCount' )
      return localFragment
    }

    function execSwitch( node: Element ): DocumentFragment {
      const by = node.getAttribute( 'by' )
      const localFragment = document.createDocumentFragment()

      if( by ){
        const switchValue = self.__evaluate__( by, scope )
        let matched = false

        ;[ ...Array.from( node.children ) ].forEach( child => {
          if( matched ) return
          const isValue = child.getAttribute( 'is' ) as string

          if( child.tagName === 'CASE' && self.__evaluate__( isValue, scope ) === switchValue ){
            matched = true
            localFragment.appendChild( self.render( [ ...child.childNodes ], scope ) )
          } else if( child.tagName === 'DEFAULT' && !matched )
            localFragment.appendChild( self.render( [ ...child.childNodes ], scope ) )
        })
      }

      self.benchmark.inc( 'elementCount' )
      return localFragment
    }

    function execIf( node: Element ): DocumentFragment | undefined {
      const condition = node.getAttribute( 'by' )
      if( condition && node.childNodes.length )
        if( self.__evaluate__( condition, scope ) )
          return self.render( [ ...node.childNodes ], scope )

      let sibling = node.nextElementSibling
      while( sibling ){
        if( sibling.tagName === 'ELSE-IF' ){
          const elseIfCondition = sibling.getAttribute( 'by' )
          if( self.__evaluate__( elseIfCondition, scope ) )
            return self.render( [ ...sibling.childNodes ], scope )
        } else if( sibling.tagName === 'ELSE' )
          return self.render( [ ...sibling.childNodes ], scope )
        sibling = sibling.nextElementSibling
      }

      self.benchmark.inc( 'elementCount' )
    }

    function execAsync( node: Element ): DocumentFragment {
      const attr = node.getAttribute( 'await' )
      if( !attr ) throw new Error( 'Undefined async <await> attribute' )

      const preloadNode = node.querySelector( 'preload' )
      const resolveNode = node.querySelector( 'resolve' )
      const catchNode = node.querySelector( 'catch' )
      const preloadFragment = document.createDocumentFragment()

      if( preloadNode && preloadNode.childNodes.length )
        preloadFragment.appendChild( self.render( [ ...preloadNode.childNodes ], scope ) )

      node.replaceWith( preloadFragment )

      const [ fn, ...args ] = attr.trim().split( /\s*,\s*/ )
      const asyncFunction = ( self[ fn ] || self.__evaluate__( fn, scope ) ).bind( self )

      if( typeof asyncFunction !== 'function' )
        throw new Error( `Undefined <${fn}> handler method` )

      const evaluatedArgs = args.map( arg => self.__evaluate__( arg, scope ) )

      asyncFunction( ...evaluatedArgs )
        .then( response => {
          if( resolveNode && resolveNode.childNodes.length )
            preloadFragment.replaceWith( self.render( [ ...resolveNode.childNodes ], { ...scope, response } ) )
        })
        .catch( error => {
          if( catchNode && catchNode.childNodes.length )
            preloadFragment.replaceWith( self.render( [ ...catchNode.childNodes ], { ...scope, error } ) )
        })

      self.benchmark.inc( 'elementCount' )
      return preloadFragment
    }

    function execElement( node: Element ): HTMLElement {
      const element = document.createElement( node.tagName.toLowerCase() )
      const attributes = [ ...node.attributes ]

      attributes.forEach( ( { name, value } ) => {
        if( name.startsWith( 'on-' ) ){
          const eventName = name.slice( 3 )
          element.addEventListener( eventName, () => self.__evaluate__( value, scope ) )
        } else {
          const result = self.__evaluate__( value || true, scope )
          result !== '?' ? element.setAttribute( name, result ) : element.removeAttribute( name )
        }
      })

      [ ...node.childNodes ].forEach( child => {
        element.appendChild( self.render( [ child ], scope ) )
      })

      self.benchmark.inc( 'elementCount' )
      return element
    }

    function parse( node: Node ): Node | undefined {
      if( node.nodeType === Node.TEXT_NODE )
        return document.createTextNode( self.__interpolate__( node.textContent ?? '', scope ) )

      if( node instanceof Element ){
        if( node.tagName === 'LET' ) return execLet( node )
        if( node.tagName === 'IF' ) return execIf( node )
        if( node.tagName === 'FOR' ) return execFor( node )
        if( node.tagName === 'SWITCH' ) return execSwitch( node )
        if( node.tagName === 'ASYNC' ) return execAsync( node )
        return execElement( node )
      }
    }

    const nodeList = nodes ? [ ...nodes ] : [ ...this.template ]
    nodeList.forEach( node => {
      const result = parse( node )
      if( result ) fragment.appendChild( result )
    })

    self.benchmark.inc( 'renderCount' )
    return fragment
  }

  rerender(){
    if( !this.template )
      throw new Error('Component template is empty')

    const clone = this.render()
    this.$?.replaceWith( clone )
    this.$ = clone
    this.$.setAttribute('rel', this.__name__ )
  }

  private __evaluate__( script: string, scope?: TObject<any> ){
    try {
      script = script.trim()
      const
      expression = scope ? `with( scope ){ return ${script}; }` : `return ${script}`,
      fn = new Function('self', 'input', 'state', 'static', 'context', 'scope', expression )
      return fn( this, this.input, this.state, this.static, this.context, scope || {} )
    }
    catch( error ){ return script }
  }
  private __interpolate__( str: string, scope?: TObject<any> ){
    return str.replace(/{\s*([^{}]+)\s*}/g, ( _, expr) => this.__evaluate__( expr, scope ) )
  }
  private __attachEvent__( element: HTMLElement, _event: string, instruction: string, scope?: TObject<any> ){
    if( /(\s*\w+|\s*\([^)]*\)|\s*)\s*=>\s*(\s*\{[^}]*\}|\s*[^\n;"]+)/g.test( instruction ) )
      element.addEventListener( _event, this.__evaluate__( instruction, scope ) )
    else {
      const [ fn, ...args ] = instruction.split(/\s*,\s*/)
      if( typeof this[ fn ] !== 'function' ) return

      element.addEventListener( _event, ( event ) => {
        const _fn = this[ fn ].bind(this)
        const _args = args.map( each => this.__evaluate__( each, scope ) ).concat(event)
        _fn( ..._args )
      })
    }
  }
  private __detachEvent__( element: HTMLElement, _event: string ){
    const clone = element.cloneNode( true )
    element.replaceWith( clone )
  }

  attachEvents(){
    this.__attachableEvents.forEach( ({ $node, _event, instruction, scope }) => {
      this.__attachEvent__( $node, _event, instruction, scope )
    })

    Object.values( this.__components )
    .forEach( component => component.attachEvents() )
  }
  detachEvents(){
    this.__attachableEvents.forEach( ({ $node, _event }) => {
      this.__detachEvent__( $node, _event )
    })

    Object.values( this.__components )
    .forEach( component => component.detachEvents() )
  }
  
  destroy(){
    for( const each in this.__components ){
      this.__components[ each ].destroy()
      delete this.__components[ each ]
    }

    this.detachEvents()
    this.$?.remove()
    this.__stylesheet?.clear()
    clearInterval( this.IUC )
  }

  appendTo( arg: HTMLElement | string ){
    const $to = typeof arg === 'string' ? document.querySelector( arg ) : arg
    $to?.appendChild( this.$ )
    return this
  }
  prependTo( arg: HTMLElement | string ){
    const $to = typeof arg === 'string' ? document.querySelector( arg ) : arg
    $to?.insertBefore( this.$, $to.firstChild )
    return this
  }
  replaceWith( arg: HTMLElement | string ){
    const $with = typeof arg === 'string' ? document.querySelector( arg ) : arg
    this.$?.replaceWith( $with )
    return this
  }

  on( _event: string, fn: EventListener ){
    if( !Array.isArray( this.__events[ _event ] ) )
      this.__events[ _event ] = []

    this.__events[ _event ].push( fn )
    this.$?.addEventListener( _event, fn )
  }
  off( _event: string ){
    const listeners = this.__events[ _event ]
    if( Array.isArray( listeners ) ){
      listeners.forEach( listener => this.$?.removeEventListener( _event, listener ) )
      delete this.__events[ _event ]
    }
  }
  emit( _event: string, ...args: any[] ){
    const listeners = this.__events[ _event ] || []
    listeners.forEach( listener => listener( ...args ) )
  }
}