import type { 
  TObject,
  LipsConfig,
  Template,
  EventListener,
  Handler,
  ComponentScope,
  ComponentOptions
} from '.'

import $, { type Cash } from 'cash-dom'
import I18N from './i18n'
import Benchmark from './benchmark'
import Stylesheet from './stylesheet'
import { isEquals, uniqueObject, deepAssign } from './utils'
import { effect, signal } from './signal'

import * as Router from './router'

function preprocessTemplate( str: string ){
  return (str || '').trim()
            .replace(/<if\(\s*(.*?)\s*\)>/g, '<if by="$1">')
            .replace(/<else-if\(\s*(.*?)\s*\)>/g, '<else-if by="$1">')
            .replace(/<switch\(\s*(.*?)\s*\)>/g, '<switch by="$1">');
}

$.fn.extend({
  attrs: function(){
    const 
    obj: any = {},
    elem = this[0]

    elem && $.each( elem.attributes, function( this: any ){ obj[ this.name ] = this.value })

    return obj
  },
  tagname: function(){
    const tn = (this as any).prop('tagName')
    if( !tn ) return false

    return tn.toLowerCase()
  }
})

export default class Lips<Context = any> {
  private debug = false
  private context?: Context
  private store: ObjectType<Template> = {}
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
    
    /**
     * Register native components
     * 
     * `<router routers=[] global, ...></router>` -- Internal Routing Component
     */
    this.register('router', Router )
  }

  async register( name: string, template: Template<any, any, any, any> ){
    /**
     * TODO: Register component by providing file path.
     */
    // if( typeof template == 'string' ){
    //   try { this.store[ name ] = await import( template ) as Template }
    //   catch( error ){ throw new Error(`Component <${name}> template not found at ${template}`) }

    //   return
    // }

    this.store[ name ] = template
  }

  unregister( name: string ){
    delete this.store[ name ]
  }

  has( name: string ){
    return name in this.store
  }
  import( pathname: string ): Template {
    // Fetch from registered component
    if( !this.has( pathname ) )
      throw new Error(`<${pathname}> component not found`)

    if( !this.store[ pathname ].default )
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

  render( name: string, template: Template ){
    const
    { default: _default, ...scope } = template,
    options: ComponentOptions = {
      debug: this.debug,
      prekey: '0',
      lips: this
    }

    return new Component( name, _default, scope, options )
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

  setContext( key: Context | string, value?: any ){
    typeof key == 'string' ?
              this._setContext({ ...this.context, [key]: value } as Context )
              : this._setContext({ ...this.context, ...key } as Context )
  }
  useContext( fields: (keyof Context)[], fn: ( ...args: any[] ) => void ){
    effect( () => {
      this.context = this._getContext()

      const ctx: any = {}
      fields.forEach( field => {
        if( !this.context ) return
        ctx[ field ] = this.context[ field ]
      } )

      typeof fn === 'function' && fn( ctx )
    } )
  }
}

export class Component<Input = void, State = void, Static = void, Context = void> {
  private template: string
  private $?: Cash
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
  private __attachableEvents: { $node: Cash, _event: string, instruction: string, scope?: TObject<any> }[] = []

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
    
    /**
     * Triggered an initial input is provided
     */
    this.input
    && Object.keys( this.input ).length
    && typeof this.onInput == 'function'
    && this.onInput.bind(this)( this.input )

    this.IUC = setInterval( () => {
      /**
       * Apply update only when a new change 
       * occured on the state.
       * 
       * Merge with initial/active state.
       */
      this.state
      && !isEquals( this.__state as TObject<any>, this.state as TObject<any> )
      && this.setState( this.state )
    }, this.IUC_BEAT )

    /**
     * Set context update effect listener
     * to merge with initial/active context
     * after any occurances.
     */
    Array.isArray( context )
    && context.length
    && this.lips?.useContext( context, ctx => !isEquals( this.context as TObject<any>, ctx ) && setContext( ctx ) )

    effect( () => {
      this.input = getInput()
      this.state = getState()
      this.context = getContext()

      // Reset the benchmark
      this.benchmark.reset()

      /**
       * Reinitialize NCC before any rendering
       */
      this.NCC = 0

      /**
       * Reset attachble events list before every rendering
       */
      this.__attachableEvents = []
      
      /**
       * Render/Rerender component
       */
      if( this.isRendered ) this.rerender()
      else {

        /**
         * Triggered before component get rendered
         * for the first time.
         */
        typeof this.onCreate == 'function'
        && this.onCreate.bind(this)()

        this.$ = this.render()
        
        // Assign CSS relationship attribute
        this.$.attr('rel', this.__name__ )
      }

      /**
       * Attach/Reattach extracted events
       * listeners anytime component get rendered.
       * 
       * This to avoid loosing binding to attached
       * DOM element's events
       */
      this.detachEvents()
      this.attachEvents()

      /**
       * Log benchmark table
       * 
       * NOTE: Only show in debugging mode
       */
      this.benchmark.log()

      /**
       * Hold state value since last signal update.
       * 
       * IMPORTANT: Required to check changes on the state
       *            during IUC processes.
       */
      this.__state = uniqueObject( this.state )
      
      /**
       * Triggered after component get mounted for
       * the first time.
       */
      !this.isRendered
      && typeof this.onMount == 'function'
      && this.onMount.bind(this)()

      /**
       * Flag to know when element is initially or force
       * to render.
       */
      this.isRendered = true
      
      /**
       * Triggered anytime component gets rendered
       */
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
    
    /**
     * Triggered anytime component state gets updated
     */
    typeof this.onUpdate == 'function'
    && this.onUpdate.bind(this)()
  }
  setInput( input: Input ){
    /**
     * Apply update only when new input is different 
     * from the incoming input
     */
    if( isEquals( this.input as TObject<any>, input as TObject<any> ) )
      return
    
    // Merge with initial/active input.
    this._setInput({ ...this.input, ...input })
    
    /**
     * Triggered anytime component recieve new input
     */
    typeof this.onInput == 'function'
    && this.onInput.bind(this)( this.input )
  }
  /**
   * Inject grain/partial input to current component 
   * instead of sending a whole updated input
   */
  subInput( data: TObject<any> ){
    if( typeof data !== 'object' ) 
      return this.getNode()
    
    this.setInput( deepAssign( this.input as TObject<any>, data ) )
  }
  setHandler( list: Handler<Input, State, Static, Context> ){
    Object
    .entries( list )
    .map( ([ method, fn ]) => this[ method ] = fn.bind(this) )
  }

  getNode(){
    if( !this.$ )
      throw new Error('getNode() is expected to be call after component get rendered')

    return this.$
  }
  find( selector: string ){
    return this.$?.find( selector )
  }

  render( $nodes?: Cash, scope: TObject<any> = {} ){
    const self = this
    /**
     * Initialize an empty cash object to 
     * act like a DocumentFragment
     */
    let _$ = $()

    function execLet( $node: Cash ){
      const attributes = ($node as any).attrs()
      if( !attributes ) return 
      
      Object
      .entries( attributes )
      .forEach( ([ key, assign ]) => {
        if( !assign ) return
        scope[ key ] = self.__evaluate__( assign as string, scope )
      } )
        
      /**
       * BENCHMARK: Tracking total elements rendered
       */
      self.benchmark.inc('elementCount')
    }

    function execFor( $node: Cash ){
      const
      $contents = $node.contents() as Cash,
      _in = self.__evaluate__( $node.attr('in') as string, scope )

      let
      $fragment = $(),
      _from = $node.attr('from') as any,
      _to = $node.attr('to') as any
      
      if( _from !== undefined ){
        _from = parseFloat( _from )

        if( _to == undefined )
          throw new Error('Expected <from> <to> attributes of the for loop to be defined')

        _to = parseFloat( _to )

        for( let x = _from; x <= _to; x++ )
          if( $contents.length ) 
            $fragment = $fragment.add( self.render( $contents, { index: x }) )
      }

      else if( Array.isArray( _in ) ){
        let index = 0
        for( const each of _in ){
          if( $contents.length )
            $fragment = $fragment.add( self.render( $contents, { each, index }) )
          
          index++
        }
      }

      else if( typeof _in == 'object' ){
        let index = 0
        for( const key in _in ){
          if( $contents.length )
            $fragment = $fragment.add( self.render( $contents, {
              index,
              key,
              each: _in[ key ]
            }) )
          
          index++
        }
      }
        
      /**
       * BENCHMARK: Tracking total elements rendered
       */
      self.benchmark.inc('elementCount')

      return $fragment
    }

    function execSwitch( $node: Cash ){
      const by = $node.attr('by')
      let $fragment = $()

      if( by ){
        const switchBy = self.__evaluate__( by, scope )
        let matched = false

        $node.children().each( function(){
          const
          $child = $(this),
          $contents = $child.contents(),
          _is = $child.attr('is')

          if( matched || !_is ) return

          if( $child.is('case') ){
            const isValue = self.__evaluate__( _is, scope )

            if( (Array.isArray( isValue ) && isValue.includes( switchBy )) || isValue === switchBy ){
              matched = true

              if( $contents.length )
                $fragment = $fragment.add( self.render( $contents, scope ) )
            }
          }
          else if ( $child.is('default') && !matched && $contents.length )
            $fragment = $fragment.add( self.render( $contents, scope ) )
        })
      }
        
      /**
       * BENCHMARK: Tracking total elements rendered
       */
      self.benchmark.inc('elementCount')

      return $fragment
    }

    function execIf( $node: Cash ){
      const 
      $fragment = $(),
      $ifContents = $node.contents(),
      condition = $node.attr('by')

      // Evaluate the primary <if(condition)>
      if( condition && $ifContents.length ){
        if( self.__evaluate__( condition, scope ) )
          return self.render( $ifContents, scope )

        // Check for <else-if(condition)> and <else>
        let $sibling = $node.nextAll('else-if, else').first()
        while( $sibling.length > 0 ){
          const $contents = $sibling.contents()

          if( $sibling.is('else-if') ){
            const elseIfCondition = $sibling.attr('by') as string
            if( self.__evaluate__( elseIfCondition, scope ) && $contents.length )
              return self.render( $contents, scope )
          } 
          else if( $sibling.is('else') && $contents.length )
            return self.render( $contents, scope )
          
          $sibling = $sibling.nextAll('else-if, else').first()
        }
      }
        
      /**
       * BENCHMARK: Tracking total elements rendered
       */
      self.benchmark.inc('elementCount')

      return $fragment
    }

    function execAsync( $node: Cash ){
      const attr = $node.attr('await') as string
      if( !attr )
        throw new Error('Undefined async <await> attribute')

      const
      $preload = $node.find('preload').clone(),
      $resolve = $node.find('resolve').clone(),
      $catch = $node.find('catch').clone()
      let $fragment = $()

      // Initially append preload content
      const preloadContent = $preload.contents()
      if( preloadContent.length )
        $fragment = $fragment.add( self.render( preloadContent, scope ) )
        
      // Replace the original node with the fragment in the DOM
      // $node.replaceWith( $fragment )

      const
      [ fn, ...args ] = attr.trim().split(/\s*,\s*/),
      _await = (self[ fn ] || self.__evaluate__( fn, scope )).bind(self) as any
      
      if( typeof _await !== 'function' )
        throw new Error(`Undefined <${fn}> handler method`)

      const _args = args.map( each => (self.__evaluate__( each, scope )) )

      _await( ..._args )
      .then( ( response: any ) => {
        const resolveContent = $resolve?.contents()
        
        resolveContent.length
        && $fragment.replaceWith( self.render( resolveContent, { ...scope, response } ) )
      })
      .catch( ( error: unknown ) => {
        const catchContent = $catch?.contents()

        catchContent.length
        && $fragment.replaceWith( self.render( catchContent, { ...scope, error } ) )
      })
      
      /**
       * BENCHMARK: Tracking total elements rendered
       */
      self.benchmark.inc('elementCount')

      return $fragment
    }

    function execComponent( $node: Cash ){
      const name = $node.prop('tagName')?.toLowerCase() as string
      if( !name )
        throw new Error('Invalid component')

      if( !self.lips )
        throw new Error('Nexted component manager is disable')

      const 
      __key__ = `${self.prekey}.${self.NCC++}`,
      /**
       * Parse assigned attributes to be injected into
       * the component as input.
       */
      input: any = {},
      attrs = ($node as any).attrs(),
      events: TObject<any> = {}

      Object
      .entries( attrs )
      .forEach( ([ key, value ]) => {
        if( key == 'key' ) return

        // Component events
        if( /^on-/.test( key ) ){
          events[ key.replace(/^on-/, '') ] = value
          return
        }
        
        input[ key ] = value ?
                        self.__evaluate__( value as string, scope )
                        /**
                         * IMPORTANT: An attribute without a value is
                         * considered neutral but `true` of a value by
                         * default.
                         * 
                         * Eg. <counter initial=3 throttle/>
                         * 
                         * the `throttle` attribute is hereby an input with a
                         * value `true`.
                         */
                        : true
      })

      /**
       * Also inject component slotted body into inputs
       * as `__slot__`
       */
      const
      nodeContents = $node.contents()
      if( nodeContents ){
        const $el = self.render( nodeContents, scope )
        input.__slot__ = $el.html()
      }
    
      /**
       * Specify component relationship with other 
       * resources like `style tags`, `script tags`, 
       * etc, using [rel] attribute
       */
      let $fragment = $()
      
      /**
       * Update previously rendered component by
       * injecting updated inputs
       */
      if( self.__components[ __key__ ] ){
        self.__components[ __key__ ].setInput( uniqueObject( input ) )

        // Replace the original node with the fragment in the DOM
        $fragment = $fragment.add( self.__components[ __key__ ].getNode() )
        // $node.replaceWith( $fragment )
      }
      /**
       * Render the whole component for first time
       */
      else {
        const
        { state, _static, handler, context, default: _default, stylesheet } = self.lips.import( name ),
        component = new Component( name, _default, {
          state: uniqueObject( state ),
          input: uniqueObject( input ),
          context,
          _static: uniqueObject( _static ),
          handler,
          stylesheet
        }, {
          debug: self.debug,
          lips: self.lips,
          prekey: __key__
        })
        
        $fragment = $fragment.add( component.getNode() )
        // Replace the original node with the fragment in the DOM
        // $node.replaceWith( $fragment )
        self.__components[ __key__ ] = component

        // Listen to this nexted component's events
        Object
        .entries( events )
        .forEach( ([ _event, instruction ]) => self.__attachEvent__( component, _event, instruction, scope ) )
      }
      
      /**
       * BENCHMARK: Tracking total elements rendered
       */
      self.benchmark.inc('elementCount')
      
      return $fragment
    }

    function execElement( $node: Cash ){
      if( !$node.length || !$node.prop('tagName') ) return $node

      const
      $fnode = $(`<${$node.prop('tagName').toLowerCase()}/>`),
      $contents = $node.contents()

      $contents.length && $fnode.append( self.render( $contents, scope ) )

      // Process attributes
      const attributes = ($node as any).attrs()

      attributes && Object
      .entries( attributes )
      .forEach( ([ attr, value ]) => {
        // Record attachable events to the element
        if( /^on-/.test( attr ) ){
          self.__attachableEvents.push({
            $node: $fnode,
            _event: attr.replace(/^on-/, ''),
            instruction: value as string,
            scope
          })

          return
        }

        switch( attr ){
          // Inject inner html into the element
          case 'html': $fnode.html( self.__evaluate__( value as string, scope ) ); break

          // Inject text into the element
          case 'text': {
            let text = self.__evaluate__( value as string, scope )

            // Apply translation
            if( self.lips && !$node.is('[no-translate]') ){
              const { text: _text } = self.lips.i18n.translate( text )
              text = _text
            }

            $fnode.text( text )
          } break

          // Convert object style attribute to string
          case 'style': {
            const style = self.__evaluate__( value as string, scope )
            
            // Defined in object format
            if( typeof style === 'object' ){
              let str = ''

              Object
              .entries( style )
              .forEach( ([ k, v ]) => str += `${k}:${v};` )
              
              str.length && $fnode.attr('style', str )
            }
            // Defined in string format
            else $fnode.attr('style', style )
          } break

          // Inject the evaulation result of any other attributes
          default: {
            const res = value ?
                          self.__evaluate__( value as string, scope )
                          /**
                           * IMPORTANT: An attribute without a value is
                           * considered neutral but `true` of a value by
                           * default.
                           * 
                           * Eg. <counter initial=3 throttle/>
                           * 
                           * the `throttle` attribute is hereby an input with a
                           * value `true`.
                           */
                          : true
            
            /**
             * (?) evaluation return signal to uset the attribute.
             * 
             * Very useful case where the attribute don't necessarily
             * have values by default.
             */
            res === undefined || res === false
                              ? $fnode.removeAttr( attr )
                              : $fnode.attr( attr, res )
          }
        }
      })
      
      /**
       * BENCHMARK: Tracking total elements rendered
       */
      self.benchmark.inc('elementCount')

      return $fnode
    }

    function parse( $node: Cash ){
      if( $node.get(0)?.nodeType === Node.TEXT_NODE )
        return document.createTextNode( self.__interpolate__( $node.text(), scope ) )

      // Render in-build syntax components
      if( $node.is('let') ) return execLet( $node )
      else if( $node.is('if') ) return execIf( $node )
      /**
       * Ignore <else-if> and <else> tags as node 
       * for their should be already process by <if>
       */
      else if( $node.is('else-if, else') ) return
      else if( $node.is('for') ) return execFor( $node )
      else if( $node.is('switch') ) return execSwitch( $node )
      else if( $node.is('async') ) return execAsync( $node )
      
      // Identify and render custom components
      else if( self.lips && self.lips.has( $node.prop('tagName')?.toLowerCase() ) )
        return execComponent( $node )

      // Any other note type
      return execElement( $node )
    }

    if( $nodes && !$nodes.length ){
      console.warn('Undefined node element to render')
      return $nodes
    }
    
    try {
      // Process nodes
      $nodes = $nodes || $(this.template)
      $nodes.each( function(){
        const $node = parse( $(this) )
        if( $node ) _$ = _$.add( $node )
      } )
    }
    catch( error ){ console.error('Rendering Failed --', error ) }

    /**
     * BENCHMARK: Tracking total occurence of recursive rendering
     */
    self.benchmark.inc('renderCount')
  
    return _$
  }
  /**
   * Rerender component using the original content 
   * of the component to during rerendering
   */
  rerender(){
    if( !this.template )
      throw new Error('Component template is empty')

    const $clone = this.render()

    this.$?.replaceWith( $clone )
    this.$ = $clone
    
    // Reassign CSS relationship attribute
    this.$.attr('rel', this.__name__ )
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
  private __attachEvent__( element: Cash | Component, _event: string, instruction: string, scope?: TObject<any> ){
    /**
     * Execute function script directly attach 
     * as the listener.
     * 
     * Eg. 
     *  `on-click="() => console.log('Hello world')"`
     *  `on-change="e => self.onChange(e)"`
     */
    if( /(\s*\w+|\s*\([^)]*\)|\s*)\s*=>\s*(\s*\{[^}]*\}|\s*[^\n;"]+)/g.test( instruction ) )
      element.on( _event, this.__evaluate__( instruction, scope ) )

    /**
     * Execute reference handler function
     * 
     * Eg. 
     *  `on-input="handleInputValue"`
     *  `on-click="handleClick, this.input.count++"`
     * 
     * Note: `handleInputValue` and `handleClick` handlers
     *       must be defined as `handler` at the component
     *       level before any assignment.
     */
    else {
      let [ fn, ...args ] = instruction.split(/\s*,\s*/)
      
      /**
       * Evaluate whether `fn` is a function name
       * of an expression resulting in a function 
       * name.
       */
      fn = this.__evaluate__( fn, scope )
      if( typeof this[ fn ] !== 'function' ) return
        // throw new Error(`Undefined <${fn}> ${_event} event method`)

      element.on( _event, ( ...params: any[] ) => {
        const _fn = this[ fn ].bind(this)
        let _args = args.map( each => (this.__evaluate__( each, scope )) )

        if( params.length )
          _args = [ ..._args, ...params ]

        _fn( ..._args )
      })
    }
  }
  private __detachEvent__( element: Cash | Component, _event: string ){
    element.off( _event )
  }

  attachEvents(){
    this.__attachableEvents.forEach( ({ $node, _event, instruction, scope }) => {
      $node.off( _event )
      && this.__attachEvent__( $node, _event, instruction, scope )
    } )

    /**
     * Also propagate to nexted component
     */
    Object
    .values( this.__components )
    .forEach( component => component.attachEvents() )
  }
  detachEvents(){
    this.__attachableEvents.forEach( ({ $node, _event }) => this.__detachEvent__( $node, _event ) )

    /**
     * Also propagate to nexted component
     */
    Object
    .values( this.__components )
    .forEach( component => component.detachEvents() )
  }
  
  destroy(){
    // Destroy nexted components as well
    for( const each in this.__components ){
      this.__components[ each ].destroy()
      delete this.__components[ each ]
    }

    this.detachEvents()
    this.$?.remove()
    this.__stylesheet?.clear()

    // Turn off IUC
    clearInterval( this.IUC )
  }

  appendTo( arg: Cash | string ){
    const $to = typeof arg == 'string' ? $(arg) : arg
    this.$?.length && $to.append( this.$ )

    return this
  }
  prependTo( arg: Cash | string ){
    const $to = typeof arg == 'string' ? $(arg) : arg
    this.$?.length && $to.prepend( this.$ )

    return this
  }
  replaceWith( arg: Cash | string ){
    const $with = typeof arg == 'string' ? $(arg) : arg
    this.$?.length && $with.replaceWith( this.$ )

    return this
  }

  on( _event: string, fn: EventListener ){
    if( !Array.isArray( this.__events[ _event ] ) )
      this.__events[ _event ] = []

    this.__events[ _event ].push( fn )
    return this
  }
  once( _event: string, fn: EventListener ){
    if( !Array.isArray( this.__once_events[ _event ] ) )
      this.__once_events[ _event ] = []

    this.__once_events[ _event ].push( fn )
    return this
  }
  off( _event: string ){
    delete this.__events[ _event ]
    delete this.__once_events[ _event ]

    return this
  }
  emit( _event: string, ...params: any[] ){
    this.__events[ _event ]?.forEach( fn => fn( ...params ) )

    // Once listeners
    this.__once_events[ _event ]?.forEach( fn => fn( ...params ) )
    delete this.__once_events[ _event ]
  }
}