import type { 
  TObject,
  LipsConfig,
  Template,
  EventListener,
  Handler,
  ComponentScope,
  ComponentOptions,
  VariableScope
} from '.'

import $, { type Cash } from 'cash-dom'
import I18N from './i18n'
import Benchmark from './benchmark'
import ParallelExecutor from './parallel'
import Stylesheet from '../../modules/stylesheet'
import { isDiff, deepClone, deepAssign } from './utils'
import { effect, EffectControl, signal } from './signal'

import * as Router from './router'

const SPREAD_VAR_PATTERN = /^\.\.\./

function preprocessTemplate( str: string ){
  return (str || '').trim()
            .replace( /<if\(\s*(.*?)\s*\)>/g, '<if by="$1">')
            .replace( /<else-if\(\s*(.*?)\s*\)>/g, '<else-if by="$1">')
            .replace( /<switch\(\s*(.*?)\s*\)>/g, '<switch by="$1">')
            .replace( /<log\(\s*(.*?)\s*\)>/g, '<log args="$1">')
            .replace( /on-([a-zA-Z-]+)\(((?:function\s*(?:\w+\s*)?\([^)]*\)\s*{[\s\S]*?}|\([^)]*\)\s*=>[\s\S]*?|[^)]+))\)(?=[>\s])/g, ( match, event, expression ) => {
              /**
               * If we're dealing with complex functions, 
               * we might need to handle nested brackets
               */
              if( expression.includes('{') ){
                let 
                openCount = 0,
                closeCount = 0,
                fullExpression = expression,
                restOfString = match.slice( match.indexOf( expression ) + expression.length )
                
                // Handle potential nested braces
                for( const char of restOfString ){
                  if( char === '{' ) openCount++
                  if( char === '}' ){
                    closeCount++
                    if( openCount === closeCount ) break
                  }
                  
                  fullExpression += char
                }
                
                return `on-${event}="${fullExpression.trim()}"`
              }
              
              return `on-${event}="${expression.trim()}"`
            })
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
  private macros: TObject<string>
  private $?: Cash

  public input: Input
  public state: State
  public static: Static
  public context: Context

  private __name__: string
  private __state?: State // Partial state
  private __stylesheet?: Stylesheet
  private __macros: Map<string, Cash> = new Map() // Cached macros templates
  private __components: Map<string, Component> = new Map() // Cached nexted components
  private __events: TObject<EventListener[]> = {}
  private __once_events: TObject<EventListener[]> = {}
  private __attachableEvents: { $node: Cash, _event: string, instruction: string, scope?: TObject<any> }[] = []

  private __templateCache: Map<string, Cash> = new Map()

  /**
   * Nexted Component Count (NCC) in tree
   * hieralchy and discovery order
   */
  private NCC = 0
  private prekey = '0'
  private debug = false
  private isRendered = false
  private enableSmartDiff = true
  private enableTemplateCache = true

  private _setInput: ( input: Input ) => void
  private _setState: ( state: State ) => void
  private _getState: () => State | undefined

  // Internal Update Clock (IUC)
  private IUC: NodeJS.Timeout
  private IUC_BEAT = 5 // ms
  private SEC: EffectControl // Signal Effect Controls
  private parallel = new ParallelExecutor

  public lips?: Lips
  private benchmark: Benchmark

  /**
   * Allow methods of `handler` to be dynamically
   * added to `this` component object.
   */
  [key: string]: any

  constructor( name: string, template: string, { input, state, context, _static, handler, stylesheet, macros }: ComponentScope<Input, State, Static, Context>, options?: ComponentOptions ){
    this.template = preprocessTemplate( template )
    this.macros = macros || {}

    if( options?.lips ) this.lips = options.lips    
    if( options?.debug ) this.debug = options.debug
    if( options?.prekey ) this.prekey = options.prekey
    if( options?.enableSmartDiff ) this.enableSmartDiff = options.enableSmartDiff
    if( options?.enableTemplateCache ) this.enableTemplateCache = options.enableTemplateCache

    this.__name__ = name

    this.input = input || {} as Input
    this.state = state || {} as State
    this.static = _static || {} as Static
    this.context = {} as Context
    
    handler && this.setHandler( handler )
    stylesheet && this.setStylesheet( stylesheet )

    const
    [ getInput, setInput ] = signal<Input>( this.input ),
    [ getState, setState ] = signal<State>( this.state ),
    [ getContext, setContext ] = signal<Context>( this.context )

    this._setInput = setInput
    this._setState = setState
    this._getState = getState
    
    /**
     * Track rendering cycle metrics to evaluate
     * performance.
     * 
     */
    this.benchmark = new Benchmark( this.debug )
    
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
      && isDiff( this.__state as Record<string, any>, this.state as Record<string, any> )
      && this.setState( this.state )
    }, this.IUC_BEAT )

    /**
     * Set context update effect listener
     * to merge with initial/active context
     * after any occurances.
     */
    Array.isArray( context )
    && context.length
    && this.lips?.useContext( context, ctx => isDiff( this.context as TObject<any>, ctx ) && setContext( ctx ) )

    this.SEC = effect( () => {
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
      if( this.isRendered ){
        this.detachEvents()
        this.rerender()
      }
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
      this.__state = deepClone( this.state )
      
      /**
       * Triggered after component get mounted for
       * the first time.
       */
      !this.isRendered
      && typeof this.onMount == 'function'
      && this.onMount.bind(this)( this.input )

      /**
       * Flag to know when element is initially or force
       * to render.
       */
      this.isRendered = true
      
      /**
       * Triggered anytime component gets rendered
       */
      typeof this.onRender == 'function' && this.onRender.bind(this)()
      this.emit('render')
    })
  }

  getState( key: keyof State ){
    const state = this._getState()
    
    return state && typeof state == 'object' && state[ key ]
  }
  setState( data: Partial<Record<keyof State, any>> ){
    const state = this._getState()
    this._setState({ ...state, ...data } as State )
    
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
    if( !isDiff( this.input as TObject<any>, input as TObject<any> ) )
      return
    
    // Set new input.
    this._setInput( input )
    
    /**
     * Triggered anytime component recieve new input
     */
    typeof this.onInput == 'function'
    && this.onInput.bind(this)( input )
  }
  /**
   * Inject grain/partial input to current component 
   * instead of sending a whole updated input
   */
  subInput( data: Record<string, any> ){
    if( typeof data !== 'object' )
      throw new Error('Invalid sub input data argument')

    this.setInput( deepAssign<Input>( this.input, data ) )
  }
  setHandler( list: Handler<Input, State, Static, Context> ){
    Object
    .entries( list )
    .map( ([ method, fn ]) => this[ method ] = fn.bind(this) )
  }
  setStylesheet( sheet?: string ){
    const cssOptions = {
      sheet,
      /**
       * Inject root component styles into global meta
       * style tag.
       */
      meta: this.__name__ === '__ROOT__'
    }

    this.__stylesheet = new Stylesheet( this.__name__, cssOptions )
  }

  getNode(){
    if( !this.$ )
      throw new Error('getNode() is expected to be call after component get rendered')

    return this.$
  }
  find( selector: string ){
    return this.$?.find( selector )
  }

  render( $nodes?: Cash, scope: VariableScope = {} ){
    if( $nodes && !$nodes.length ){
      console.warn('Undefined node element to render')
      return $nodes
    }

    /**
     * Try to get from cache first
     */
    // const
    // cacheKey = this.getCacheKey( $nodes?.prop('outerHTML') || this.template, scope ),
    // cached = this.getCachedTemplate( cacheKey )
    // if( cached ){
    //   this.benchmark.inc('cacheHit')
    //   return cached
    // }

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
        // Process spread assign
        if( SPREAD_VAR_PATTERN.test( key ) ){
          const spreads = self.__evaluate__( key.replace( SPREAD_VAR_PATTERN, '' ) as string, scope )
          if( typeof spreads !== 'object' )
            throw new Error(`Invalid spread operator ${key}`)

          for( const _key in spreads )
            scope[ _key ] = {
              value: spreads[ _key ],
              type: 'let'
            }
        }
        else {
          if( !assign ) return

          scope[ key ] = {
            value: self.__evaluate__( assign as string, scope ),
            type: 'let'
          }
        }
      } )
      
      /**
       * BENCHMARK: Tracking total elements rendered
       */
      self.benchmark.inc('elementCount')
    }

    function execConst( $node: Cash ){
      const attributes = ($node as any).attrs()
      if( !attributes ) return 
      
      Object
      .entries( attributes )
      .forEach( ([ key, assign ]) => {
        // Process spread assign
        if( SPREAD_VAR_PATTERN.test( key ) ){
          const spreads = self.__evaluate__( key.replace( SPREAD_VAR_PATTERN, '' ) as string, scope )
          if( typeof spreads !== 'object' )
            throw new Error(`Invalid spread operator ${key}`)

          for( const _key in spreads ){
            if( scope[ _key ]?.type === 'const' )
              throw new Error(`<const ${_key}=[value]/> by spread operator ${key}. [${_key}] variable already defined`)
          
            scope[ _key ] = {
              value: spreads[ _key ],
              type: 'const'
            }
          }
        }
        else {
          if( scope[ key ]?.type === 'const' )
            throw new Error(`<const ${key}=[value]/> variable already defined`)

          if( !assign ) return

          scope[ key ] = {
            value: self.__evaluate__( assign as string, scope ),
            type: 'const'
          }
        }
      } )
        
      /**
       * BENCHMARK: Tracking total elements rendered
       */
      self.benchmark.inc('elementCount')
    }

    function execFor( $node: Cash ){
      const
      $contents = $node.contents() as Cash
      if( !$contents.length ) return $()

      const _in = self.__evaluate__( $node.attr('in') as string, scope )
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
          if( $contents.length ){
            const forScope: VariableScope = {
              ...scope,
              index: { value: x, type: 'const' }
            }

            $fragment = $fragment.add( self.render( $contents, forScope ) )
          }
      }

      else if( Array.isArray( _in ) ){
        let index = 0
        for( const each of _in ){
          if( $contents.length ){
            const forScope: VariableScope = {
              ...scope, 
              each: { value: each, type: 'const' },
              index: { value: index, type: 'const' }
            }

            $fragment = $fragment.add( self.render( $contents, forScope ) )
          }
          
          index++
        }
      }

      else if( typeof _in == 'object' ){
        let index = 0
        for( const key in _in ){
          if( $contents.length ){
            const forScope: VariableScope = {
              ...scope, 
              key: { value: key, type: 'const' },
              each: { value: _in[ key ], type: 'const' },
              index: { value: index, type: 'const' }
            }

            $fragment = $fragment.add( self.render( $contents, forScope ) )
          }
          
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

          if( matched ) return

          if( $child.is('case') && _is !== undefined ){
            const isValue = self.__evaluate__( _is as string, scope )

            if( (Array.isArray( isValue ) && isValue.includes( switchBy )) || isValue === switchBy ){
              matched = true
              
              if( $contents.length )
                $fragment = $fragment.add( self.render( $contents, scope ) )
            }
          }
          
          if( !matched && $child.is('default') && $contents.length )
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
      const $ifContents = $node.contents()
      if( !$ifContents.length ) return $()

      const 
      $fragment = $(),
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
        
      const
      [ fn, ...args ] = attr.trim().split(/\s*,\s*/),
      _await = (self[ fn ] || self.__evaluate__( fn, scope )).bind(self) as any
      
      if( typeof _await !== 'function' )
        throw new Error(`Undefined <${fn}> handler method`)

      const _args = args.map( each => (self.__evaluate__( each, scope )) )

      _await( ..._args )
      .then( ( response: any ) => {
        const 
        resolveContent = $resolve?.contents(),
        responseScope: VariableScope = {
          ...scope,
          response: { value: response, type: 'const' }
        }
        
        resolveContent.length
        && $fragment.replaceWith( self.render( resolveContent, responseScope ) )
      })
      .catch( ( error: unknown ) => {
        const 
        catchContent = $catch?.contents(),
        errorScope: VariableScope = {
          ...scope,
          error: { value: error, type: 'const' }
        }

        catchContent.length
        && $fragment.replaceWith( self.render( catchContent, errorScope ) )
      })
      
      /**
       * BENCHMARK: Tracking total elements rendered
       */
      self.benchmark.inc('elementCount')

      return $fragment
    }

    function execLog( $node: Cash ){
      const args = $node.attr('args')
      if( !args ) return

      self.__evaluate__(`console.log(${args})`, scope )
    }

    function execMacro( $node: Cash ){
      const name = $node.prop('tagName')?.toLowerCase() as string
      if( !name )
        throw new Error('Undefined macro')

      if( !self.macros[ name ] )
        throw new Error('Macro component not found')
      
      // Initial macro input
      const macroInput: TObject<any> = {}

      /**
       * Also inject macro slotted body into macro input
       * as `__slot__`
       */
      const nodeContents = $node.contents()
      if( nodeContents && nodeContents.length ){
        const $el = self.render( nodeContents, scope )
        macroInput.__slot__ = $el.html() || $el.text()
      }

      /**
       * Parse assigned attributes to be injected into
       * the macro as input.
       * 
       * Note: Macro components can also access same
       *      state data level as the host component
       */
      const attrs = ($node as any).attrs()

      Object
      .entries( attrs )
      .forEach( ([ key, value ]) => {
        if( key == 'key' ) return

        // Macro events
        if( /^on-/.test( key ) ){
          self.__attachableEvents.push({
            $node,
            _event: key.replace(/^on-/, ''),
            instruction: value as string,
            scope
          })
          
          return
        }

        // Process spread operator attributes
        else if( SPREAD_VAR_PATTERN.test( key ) ){
          const spreads = self.__evaluate__( key.replace( SPREAD_VAR_PATTERN, '' ) as string, scope )
          if( typeof spreads !== 'object' )
            throw new Error(`Invalid spread operator ${key}`)

          for( const _key in spreads )
            macroInput[ _key ] = spreads[ _key ]
        }

        // Regular macro input attributes
        else macroInput[ key ] = value ? self.__evaluate__( value as string, scope ) : true
      })

      /**
       * Inject macro input into scope
       * thread using `macro` namespace
       */
      scope.macro = {
        value: macroInput,
        type: 'const'
      }

      let $fragment = $()

      // First check template from cache
      const $macroCached = self.__macros.get( name )
      if( $macroCached?.length )
        $fragment = $fragment.add( self.render( $macroCached, scope ) )
      
      else {
        const $macro = $( preprocessTemplate( self.macros[ name ] ) )
        $fragment = $fragment.add( self.render( $macro, scope ) )

        // Cache macro template to be reused
        self.__macros.set( name, $macro )
      }

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
      __key__ = `${self.prekey}.${name}$${self.NCC++}`,
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

        // Process spread operator attributes
        else if( SPREAD_VAR_PATTERN.test( key ) ){
          const spreads = self.__evaluate__( key.replace( SPREAD_VAR_PATTERN, '' ) as string, scope )
          if( typeof spreads !== 'object' )
            throw new Error(`Invalid spread operator ${key}`)

          for( const _key in spreads )
            input[ _key ] = spreads[ _key ]
        }

        // Regular input attributes
        else {
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
        }
      })

      /**
       * Also inject component slotted body into inputs
       * as `__slot__`
       */
      const
      nodeContents = $node.contents()
      if( nodeContents && nodeContents.length ){
        const $el = self.render( nodeContents, scope )
        input.__slot__ = $el.html() || $el.text()
      }
    
      let $fragment = $()
      
      /**
       * Update previously cached component by
       * injecting updated inputs
       */
      const cached = self.__components.get( __key__ )
      if( cached ){
        cached.setInput( deepClone( input ) )

        // Replace the original node with the fragment in the DOM
        $fragment = $fragment.add( cached.getNode() )
      }
      /**
       * Render the whole component for first time
       */
      else {
        const
        { state, _static, handler, context, default: _default, stylesheet } = self.lips.import( name ),
        component = new Component( name, _default, {
          state: deepClone( state ),
          input: deepClone( input ),
          context,
          _static: deepClone( _static ),
          handler,
          stylesheet
        }, {
          debug: self.debug,
          lips: self.lips,
          prekey: __key__
        })
        
        $fragment = $fragment.add( component.getNode() )
        // Replace the original node with the fragment in the DOM
        self.__components.set( __key__, component )

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
      else if( $node.is('const') ) return execConst( $node )
      else if( $node.is('if') ) return execIf( $node )
      /**
       * Ignore <else-if> and <else> tags as node 
       * for their should be already process by <if>
       */
      else if( $node.is('else-if, else') ) return
      else if( $node.is('for') ) return execFor( $node )
      else if( $node.is('switch') ) return execSwitch( $node )
      else if( $node.is('async') ) return execAsync( $node )
      else if( $node.is('log') ) return execLog( $node )
      
      // Identify and render macro components
      else if( $node.prop('tagName')?.toLowerCase() in self.macros )
        return execMacro( $node )
      
      // Identify and render custom components
      else if( self.lips && self.lips.has( $node.prop('tagName')?.toLowerCase() ) )
        return execComponent( $node )

      // Any other note type
      return execElement( $node )
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

    /**
     * Cache the result before returning
     */
    // this.cacheTemplate( cacheKey, _$ )

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
    // if( this.enableSmartDiff && this.$ )
    //   this.$ = this.updateChangedParts( this.$, $clone )
    
    // else {
      this.$?.replaceWith( $clone )
      this.$ = $clone
    // }

    // Reassign CSS relationship attribute
    this.$.attr('rel', this.__name__ )
  }

  /**
   * Create a unique key based on template 
   * and scope values
   */
  private getCacheKey( template: string, scope: VariableScope = {} ): string {
    // 
    const scopeValues = Object.entries( scope )
                              .map(([ key, value ]) => `${key}:${JSON.stringify(value.value)}`)
                              .join('|')

    return `${template}:${scopeValues}`
  }

  private cacheTemplate( key: string, $node: Cash ): void {
    this.enableTemplateCache && this.__templateCache.set( key, $node.clone() )
  }
  private getCachedTemplate( key: string ): Cash | undefined {
    if( !this.enableTemplateCache )
      return

    return this.__templateCache.get( key )?.clone()
  }
  // Add benchmark tracking for optimizations
  // private initBenchmark(): void {
  //   this.benchmark.addMetric('cacheHit', 'Template cache hits')
  //   this.benchmark.addMetric('diffSkip', 'Nodes skipped by smart diff')
  // }

  /**
   * Smart Diffing Implementation
   */
  private nodesEqual( $old: Cash, $new: Cash ): boolean {
    if( !this.enableSmartDiff ) return false
    
    // Compare tag names
    if( $old.prop('tagName') !== $new.prop('tagName') ) return false
    
    // Compare attributes
    const 
    oldAttrs = ($old as any).attrs(),
    newAttrs = ($new as any).attrs()

    if( !this.attributesEqual( oldAttrs, newAttrs ) )return false
    
    // Compare text content for text nodes
    if( $old[0]?.nodeType === Node.TEXT_NODE 
        && $new[0]?.nodeType === Node.TEXT_NODE )
      return $old.text() === $new.text()
    
    // Compare children length
    if( $old.children().length !== $new.children().length ) return false
    
    return true
  }

  private attributesEqual( oldAttrs: Record<string, any>, newAttrs: Record<string, any> ): boolean {
    const
    oldKeys = Object.keys( oldAttrs ),
    newKeys = Object.keys( newAttrs )
    
    if( oldKeys.length !== newKeys.length ) return false
    
    return oldKeys.every( key => {
      // Special handling for event handlers (on-*)
      if( key.startsWith('on-') ) return true

      return oldAttrs[ key ] === newAttrs[ key ]
    })
  }

  private updateChangedParts( $old: Cash, $new: Cash ): Cash {
    if( !this.enableSmartDiff ) return $new
    
    // If nodes are equal, keep the old one
    if( this.nodesEqual( $old, $new ) ){
      this.benchmark.inc('diffSkip')
      return $old
    }
    
    // Update attributes if needed
    const
    oldAttrs = ($old as any).attrs(),
    newAttrs = ($new as any).attrs()
    
    Object
    .keys( newAttrs )
    .forEach( key => oldAttrs[ key ] !== newAttrs[ key ] && $old.attr( key, newAttrs[ key ]) )
    
    // Remove attributes that are not in new node
    Object
    .keys( oldAttrs )
    .forEach( key => !( key in newAttrs ) && $old.removeAttr( key ) )
    
    // Update children recursively
    const
    $oldChildren = $old.children(),
    $newChildren = $new.children()
    
    $oldChildren.each( ( ch, oldChild ) => {
      const
      $oldChild = $(oldChild),
      $newChild = $newChildren.eq( ch )
      
      $newChild.length && this.updateChangedParts( $oldChild, $newChild )
    })
    
    return $old
  }

  private __evaluate__( script: string, scope?: VariableScope ){
    try {
      script = script.trim()
      
      if( scope ){
        const _scope: TObject<any> = {}
        for( const key in scope )
          _scope[ key ] = scope[ key ].value

        const
        expression = `with( scope ){ return ${script}; }`,
        fn = new Function('self', 'input', 'state', 'static', 'context', 'scope', expression )

        return fn( this, this.input, this.state, this.static, this.context, _scope || {} )
      }
      else {
        const 
        expression = `return ${script}`,
        fn = new Function('self', 'input', 'state', 'static', 'context', expression )

        return fn( this, this.input, this.state, this.static, this.context )
      }
    }
    catch( error ){ return script }
  }
  private __interpolate__( str: string, scope?: VariableScope ){
    return str.replace( /{\s*([^{}]+)\s*}/g, ( _, expr) => this.__evaluate__( expr, scope ) )
  }
  private __attachEvent__( element: Cash | Component, _event: string, instruction: string, scope?: VariableScope ){
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
    this.parallel.add( () => this.__attachableEvents.forEach( ({ $node, _event, instruction, scope }) => {
      $node.off( _event )
      && this.__attachEvent__( $node, _event, instruction, scope )
    } ) )

    /**
     * Also propagate to nexted component
     */
    this.parallel.add( () => Object
                              .values( this.__components )
                              .forEach( component => component.attachEvents() ) )
  }
  detachEvents(){
    this.parallel.add( () => this.__attachableEvents.forEach( ({ $node, _event }) => this.__detachEvent__( $node, _event ) ) )

    /**
     * Also propagate to nexted component
     */
    this.parallel.add( () => Object
                              .values( this.__components )
                              .forEach( component => component.detachEvents() ) )
  }
  
  destroy(){
    /**
     * Dispose signal effect dependency of this
     * component.
     */
    this.SEC.dispose()

    /**
     * Detached all events
     */
    this.detachEvents()

    /**
     * Destroy nexted components as well
     */
    for( const each in this.__components ){
      const component = this.__components.get( each )

      component?.destroy()
      component?.delete( each )
    }

    /**
     * Clear component and its styles from 
     * the DOM
     */
    this.$?.remove()
    this.__stylesheet?.clear()

    /**
     * Turn off this component's IUC
     */
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