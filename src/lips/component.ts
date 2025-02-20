import type Lips from './lips'
import type { 
  Handler,
  ComponentScope,
  ComponentOptions,
  VariableScope,
  MeshRender,
  MeshTemplate,
  RenderedNode,
  FGUDependency,
  FGUDependencies
} from '.'

import $, { Cash } from 'cash-dom'
import Events from './events'
import Benchmark from './benchmark'
import NodeManager, { NodeMeta, NodeType } from './nodemanager'
import Stylesheet from '../modules/stylesheet'
import { 
  isDiff,
  isEqual,
  deepClone,
  deepAssign,
  SPREAD_VAR_PATTERN,
  ARGUMENT_VAR_PATTERN
} from './utils'
import { effect, EffectControl, signal } from './signal'

function preprocessTemplate( str: string ){
  const matchEventHandlers = ( input: string ) => {
    const pattern = /on-([a-zA-Z-]+)\s*\(/g
    let
    result = input,
    match
    
    while( ( match = pattern.exec( input ) ) !== null ){
      const event = match[1]
      const startIndex = match.index + match[0].length
      let 
        parenthesesCount = 1,
        position = startIndex
      
      while( position < input.length && parenthesesCount > 0 ){
        if( input[position] === '(' ) parenthesesCount++
        if( input[position] === ')' ) parenthesesCount--
        position++
      }
      
      if( parenthesesCount === 0 ){
        const 
        expression = input.slice( startIndex, position - 1 ).trim(),
        prefix = input.slice( 0, match.index ),
        replacement = `on-${event}="${expression}"`,
        suffix = input.slice( position )
        
        result = prefix + replacement + suffix
        input = result  // Update input for next iteration
        pattern.lastIndex = prefix.length + replacement.length
      }
    }
    
    return result
  }
  
  let result = (str || '').trim()
                          .replace(/>\s*</g, '><')
                          .replace(/\s{2,}/g, ' ')
                          .replace(/[\r\n\t]/g, '')
                          .replace( /<\{([^}]+)\}\s+(.*?)\/>/g, '<lips dtag="$1" $2></lips>')
                          .replace( /<(\w+)(\s+[^>]*)?\/>/g, '<$1$2></$1>')
                          .replace( /<if\(\s*(.*?)\s*\)>/g, '<if by="$1">')
                          .replace( /<else-if\(\s*(.*?)\s*\)>/g, '<else-if by="$1">')
                          .replace( /<switch\(\s*(.*?)\s*\)>/g, '<switch by="$1">')
                          .replace( /<log\(\s*(.*?)\s*\)>/g, '<log args="$1">')
                          .replace( /\[(.*?)\]/g, match => match.replace(/\s+/g, '') )

  return matchEventHandlers( result )
}

$.fn.extend({
  attrs: function(){
    const 
    obj: any = {},
    elem = this[0]

    elem
    && elem.nodeType !== Node.TEXT_NODE
    && $.each( elem.attributes, function( this: any ){ obj[ this.name ] = this.value })

    return obj
  }
})

type Metavars<I, S, C> = { 
  state: S,
  input: I,
  context: C
}

export default class Component<Input = void, State = void, Static = void, Context = void> extends Events {
  private template: string
  private macros: Record<string, string>
  private $?: Cash

  public input: Input
  public state: State
  public static: Static
  public context: Context

  public __name__: string
  private __previous?: Metavars<Input, State, Context>
  private __stylesheet?: Stylesheet
  private __macros: Map<string, Cash> = new Map() // Cached macros templates
  private __components: Map<string, Component> = new Map() // Cached nexted components
  private __dependencies?: FGUDependencies = new Map() // Initial FGU dependencies
  private __attachableEvents: { $node: Cash, _event: string, instruction: string, scope?: Record<string, any> }[] = []

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
  private ICE: EffectControl // Internal Component Effect

  public lips?: Lips
  private benchmark: Benchmark

  // Fine-Grained Nodes (FGN)
  private FGN: NodeManager

  private __path = ''
  private __pathCounter = 0
  private __renderDepth = 0

  /**
   * Allow methods of `handler` to be dynamically
   * added to `this` component object.
   */
  ;[key: string]: any

  constructor( name: string, template: string, { input, state, context, _static, handler, stylesheet, macros }: ComponentScope<Input, State, Static, Context>, options?: ComponentOptions ){
    super()

    this.template = preprocessTemplate( template )
    this.macros = macros || {}

    if( options?.lips ) this.lips = options.lips    
    if( options?.debug ) this.debug = options.debug
    if( options?.prekey ) this.prekey = options.prekey

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
     * Component rendered nodes manager
     */
    this.FGN = new NodeManager()

    /**
     * Track rendering cycle metrics to evaluate
     * performance.
     * 
     */
    this.benchmark = new Benchmark( this.debug )
    
    /**
     * Triggered an initial input is provided
     */
    if( this.input
        && Object.keys( this.input ).length
        && typeof this.onInput == 'function' ){
      this.onInput.bind(this)( this.input )
      this.emit('component:input', this )
    }

    this.IUC = setInterval( () => {
      /**
       * Apply update only when a new change 
       * occured on the state.
       * 
       * Merge with initial/active state.
       */
      this.state
      && isDiff( this.__previous?.state as Record<string, any>, this.state as Record<string, any> )
      && this.setState( this.state )
    }, this.IUC_BEAT )

    /**
     * Set context update effect listener
     * to merge with initial/active context
     * after any occurances.
     */
    Array.isArray( context )
    && context.length
    && this.lips?.useContext<Context>( context, ctx => {
      if( !isDiff( this.context as Record<string, any>, ctx ) ) return

      setContext( ctx )
      
      /**
       * Triggered anytime component context changed
       */
      typeof this.onContext == 'function'
      && this.onContext.bind(this)()
      this.emit('component:context', this )
    })

    this.ICE = effect( () => {
      const
      input = getInput(),
      state = getState(),
      context = getContext()

      // Reset the benchmark
      this.benchmark.reset()

      /**
       * Reinitialize NCC (Nexted Component Count) 
       * before any rendering
       */
      this.NCC = 0

      /**
       * Reset attachble events list before every rendering
       */
      this.__attachableEvents = []

      /**
       * Initial render - parse template and establish 
       * dependencies
       */
      if( !this.isRendered ){
        /**
         * Triggered before component get rendered
         * for the first time.
         */
        typeof this.onCreate == 'function' 
        && this.onCreate.bind(this)()
        this.emit('component:create', this )

        const { _$ } = this.render( undefined, undefined, this.__dependencies )
        this.$ = _$
        // this.__dependencies = dependencies
        
        // Assign CSS relationship attribute
        this.$?.attr('rel', this.__name__ )
        this.isRendered = true
        
        /**
         * Attach/Reattach extracted events
         * listeners anytime component get rendered.
         * 
         * This to avoid loosing binding to attached
         * DOM element's events
         */
        this.attachEvents()
        
        /**
         * Triggered after component get mounted for
         * the first time.
         */
        typeof this.onMount == 'function'
        && this.onMount.bind(this)()
        this.emit('component:mount', this )
      }
      else {
        /**
         * Update only dependent nodes
         */
        this.__updateDepNodes__( { state, input, context }, this.__previous )
        
        /**
         * Triggered anytime component gets updated
         */
        typeof this.onUpdate == 'function' && this.onUpdate.bind(this)()
        this.emit('component:update', this )
      }
      
      /**
       * Save as previous meta variables for next cycle.
       * 
       * IMPORTANT: Required to check changes on the state
       *            during IUC processes.
       */
      this.__previous = {
        input: deepClone( input ),
        state: deepClone( state ),
        context: deepClone( context )
      }

      this.state = state
      this.input = input
      this.context = context

      /**
       * Watch when component's element get 
       * attached to the DOM
       */
      this.lips?.watcher?.watch( this as any )

      /**
       * Log benchmark table
       * 
       * NOTE: Only show in debugging mode
       */
      this.benchmark.log()

      /**
       * Triggered anytime component gets rendered
       */
      typeof this.onRender == 'function' && this.onRender.bind(this)()
      this.emit('component:render', this )
    })
  }

  getState( key: keyof State ){
    const state = this._getState()
    
    return state && typeof state == 'object' && state[ key ]
  }
  setState( data: Partial<Record<keyof State, any>> ){
    const state = this._getState()
    this._setState({ ...state, ...data } as State )

    // TODO: Add batch update
    
  }
  setContext( arg: Partial<Record<string, any>> | string, value?: any  ){
    /**
     * Set global context value from any component
     * 
     * Note: `arg` if object isn't restricted to 
     *        this component's required context fields scope.
     */
    this.lips?.setContext( arg, value )
  }
  setInput( input: Input ){
    /**
     * Apply update only when new input is different 
     * from the incoming input
     */
    if( !isDiff( this.input as Record<string, any>, input as Record<string, any> ) )
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

  render( $nodes?: Cash, scope: VariableScope = {}, sharedDeps?: FGUDependencies ): RenderedNode {
    const dependencies: FGUDependencies = sharedDeps || new Map()

    if( $nodes && !$nodes.length ){
      console.warn('Undefined node element to render')
      return { _$: $nodes, dependencies }
    }

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
      
      let hasReactiveAttr: string | boolean = false
      const internal = () => {
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

            hasReactiveAttr = self.__isReactive__( key ) && key
          }
          else {
            if( scope[ key ]?.type === 'const' )
              throw new Error(`<const ${key}=[value]/> variable already defined`)

            if( !assign ) return

            hasReactiveAttr = self.__isReactive__( assign as string ) && assign as string

            scope[ key ] = {
              value: self.__evaluate__( assign as string, scope ),
              type: 'const'
            }
          }
        } )
      }

      internal()

      hasReactiveAttr
      && self.__trackDep__( dependencies, hasReactiveAttr, $node, internal )
      
      /**
       * BENCHMARK: Tracking total elements rendered
       */
      self.benchmark.inc('elementCount')
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
      const macroInput: Record<string, any> = {}

      /**
       * Also inject macro slotted body into macro input
       * as `__slot__`
       */
      // const nodeContents = $node.contents()
      // if( nodeContents && nodeContents.length ){
      //   const $el = self.render( nodeContents, scope, dependencies )
      //   macroInput.__slot__ = $el.html() || $el.text()
      // }

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
      if( $macroCached?.length ){
        const { _$ } = self.render( $macroCached, scope, dependencies )
        $fragment = $fragment.add( _$ )
      }
      
      else {
        const
        $macro = $( preprocessTemplate( self.macros[ name ] ) ),
        { _$ } = self.render( $macro, scope, dependencies )

        $fragment = $fragment.add( _$ )

        // Cache macro template to be reused
        self.__macros.set( name, $macro )
      }

      /**
       * BENCHMARK: Tracking total elements rendered
       */
      self.benchmark.inc('elementCount')
      
      return $fragment
    }

    function isMesh( arg: any ){
      return typeof arg === 'object'
              && typeof arg.mesh === 'function'
              && typeof arg.update === 'function'
    }

    function execDynamic( $node: Cash ){
      if( !$node.attr('dtag') || $node.prop('tagName') !== 'LIPS' )
        throw new Error('Invalid dynamic tag name')
      
      const attr = $node.attr('dtag') as string
      $node.removeAttr('dtag')

      const result = self.__evaluate__( attr, scope )

      return isMesh( result )
                      /**
                       * Process dynamic content rendering tag set by:
                       * 
                       * Syntax `<{input.render}/>`
                       * processed to `<lips dtag=input.render></lips>`
                       */
                      ? execDynamicElement( $node, result )
                      /**
                      * Process dynamic tag set by:
                      * 
                      * Syntax `<{dynamic-name}/>`
                      * processed to `<lips dtag="[dynamic-name]"></lips>`
                      */
                      : execComponent( $node, result )
    }
    function execDynamicElement( $node: Cash, render: MeshRender ){
      const 
      elementPath = self.__generatePath__('element'),
      meta: NodeMeta = {
        path: elementPath,
        type: 'element'
      },
      renderExec = ( nodeRef: any ) => {
        let $fragment = $()

        const
        argvalues: VariableScope = {},
        { attrs } = self.__getAttributes__( $node )

        attrs && Object
        .entries( attrs )
        .forEach( ([ key, value ]) => {
          /**
           * Only consume declared arguments' value
           */
          if( !render.argv.includes( key ) ) return

          argvalues[ key ] = {
            type: 'const',
            value: value ? self.__evaluate__( value, scope ) : true
          }
        })

        $fragment = $fragment.add( render.mesh( argvalues ) )

        /**
         * IMPORTANT:
         * 
         * Set update dependency track only after $fragment 
         * contain rendered content
         */
        attrs && Object
        .entries( attrs )
        .forEach( ([ key, value ]) => {
          /**
           * Only update declared arguments' value
           */
          if( !render.argv.includes( key ) ) return

          const partialUpdate = ( _scope?: VariableScope ) => {
            render.update({
              [key]: {
                type: 'const',
                value: value ? self.__evaluate__( value, _scope || scope ) : true
              }
            })
          }

          if( self.__isReactive__( value as string, scope ) ){
            const deps = self.__extractExpressionDeps__( value as string, scope )

            deps.forEach( dep => {
              nodeRef.__deps.add( dep )
              self.__trackDep__( dependencies, dep, $fragment, partialUpdate )
            })
          }
        } )

        return $fragment
      }

      return self.FGN.register( elementPath, meta, renderExec )
    }
    function execComponent( $node: Cash, dynamicName?: string ){
      const 
      componentPath = self.__generatePath__('component'),
      meta: NodeMeta = {
        path: componentPath,
        type: 'component'
      },
      renderExec = ( nodeRef: any ) => {
        const name = dynamicName || $node.prop('tagName')?.toLowerCase() as string
        
        if( !name ) throw new Error('Invalid component')
        if( !self.lips ) throw new Error('Nexted component manager is disable')

        const
        __key__ = `${self.prekey}.${name}$${self.NCC++}`,
        { argv, attrs, events } = self.__getAttributes__( $node )

        /**
         * Parse assigned attributes to be injected into
         * the component as input.
         */
        let
        input: any = {},
        $fragment = $()

        /**
         * Cast attributes to compnent inputs
         */
        attrs && Object
        .entries( attrs )
        .forEach( ([ key, value ]) => {
          if( key == 'key' ) return

          if( SPREAD_VAR_PATTERN.test( key ) ){
            const spreads = self.__evaluate__( key.replace( SPREAD_VAR_PATTERN, '' ) as string, scope )
            if( typeof spreads !== 'object' )
              throw new Error(`Invalid spread operator ${key}`)

            for( const _key in spreads )
              input[ _key ] = spreads[ _key ]
          }

          else input[ key ] = value
                  ? self.__evaluate__( value as string, scope )
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
         * Render the whole component for first time
         */
        const template = self.lips.import( name )
        if( !template )
          throw new Error(`<${name}> template not found`)
        
        /**
         * Also inject component slotted body into inputs
         */
        const $nodeContents = $node.contents()
        if( $nodeContents.length ){
          /**
           * Parse a syntactic declaration body content
           */
          if( template.declaration ){
            /**
             * Extract node syntax component declaration tag nodes
             */
            if( template.declaration.tags ){
              Object
              .entries( template.declaration?.tags )
              .forEach( ([ tagname, { type, many }]) => {
                switch( type ){
                  case 'sibling': {
                    const $siblings = $node.siblings( tagname )
                    if( many ){
                      input[ tagname ] = []
                      $siblings.each(function(){
                        input[ tagname ].push( self.__mesh__( $(this), argv, scope, true ) )
                      })
                    }
                    else input[ tagname ] = self.__mesh__( $node.siblings( tagname ).first(), argv, scope, true )
                  } break

                  case 'child': {
                    const $children = $node.children( tagname )
                    if( many ){
                      input[ tagname ] = []
                      $children.each(function(){ 
                        input[ tagname ].push( self.__mesh__( $(this), argv, scope, true ) )
                      })
                    }
                    else input[ tagname ] = self.__mesh__( $node.children( tagname ).first(), argv, scope, true )
                  } break
                }
              } )
            }

            /**
             * Pass raw content nodes to component
             */
            else if( template.declaration.contents )
              input.__contents__ = $nodeContents
          }

          // Regular body contents
          else input = { ...input, ...self.__mesh__( $nodeContents, argv, scope ) }
        }

        console.log( input )

        const
        { state, _static, handler, context, default: _default, stylesheet } = template,
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
        
        /**
         * Setup input track
         */
        attrs && Object
        .entries( attrs )
        .forEach( ([ key, value ]) => {
          if( SPREAD_VAR_PATTERN.test( key ) ){
            const spreadvalues = ( _scope?: VariableScope ) => {
              const
              extracted: Record<string, any> = {},
              spreads = self.__evaluate__( key.replace( SPREAD_VAR_PATTERN, '' ) as string, _scope || scope )
              if( typeof spreads !== 'object' )
                throw new Error(`Invalid spread operator ${key}`)

              for( const _key in spreads )
                extracted[ _key ] = spreads[ _key ]

              component.subInput( extracted )
            }
            
            if( self.__isReactive__( key as string, scope ) ){
              const deps = self.__extractExpressionDeps__( value as string, scope )
              
              deps.forEach( dep => {
                nodeRef.__deps.add( dep )
                self.__trackDep__( dependencies, dep, $fragment, spreadvalues )
              })
            }
          }
          else {
            const evalue = ( _scope?: VariableScope ) => {
              component.subInput({
                [key]: value ? self.__evaluate__( value as string, _scope || scope ) : true
              })
            }
            
            if( self.__isReactive__( value as string, scope ) ){
              const deps = self.__extractExpressionDeps__( value as string, scope )
              
              deps.forEach( dep => {
                nodeRef.__deps.add( dep )
                self.__trackDep__( dependencies, dep, $fragment, evalue )
              })
            }
          }
        })

        /**
         * BENCHMARK: Tracking total elements rendered
         */
        self.benchmark.inc('elementCount')
        
        return $fragment
      }

      return self.FGN.register( componentPath, meta, renderExec )
    }
    function execElement( $node: Cash ): Cash {
      const 
      elementPath = self.__generatePath__('element'),
      meta: NodeMeta = {
        path: elementPath,
        type: 'element'
      },
      renderExec = ( nodeRef: any ) => {
        if( !$node.length || !$node.prop('tagName') ) return $node

        const
        $fragment = $(`<${$node.prop('tagName').toLowerCase()}/>`),
        $contents = $node.contents()

        // Process contents recursively if they exist
        $contents.length
        && $fragment.append( self.__withPath__( `${elementPath}/content`, () => self.render( $contents, scope, dependencies )._$ ) )

        // Process attributes
        const 
        { attrs, events } = self.__getAttributes__( $node ),
        processAttrs = ( list: Record<string, any>, track: boolean = false ) => {
          list && Object
          .entries( list )
          .forEach( ([ attr, value ]) => {
            switch( attr ){
              // Inject inner html into the element
              case 'html': {
                const updateHTML = ( _scope?: VariableScope ) => {
                  $fragment.html( self.__evaluate__( value as string, _scope || scope ) )
                }

                updateHTML()

                if( track && self.__isReactive__( value as string, scope ) ){
                  const deps = self.__extractExpressionDeps__( value as string, scope )

                  deps.forEach( dep => {
                    nodeRef.__deps.add( dep )
                    self.__trackDep__( dependencies, dep, $fragment, updateHTML )
                  })
                }
              } break

              // Inject text into the element
              case 'text': {
                const updateText = ( _scope?: VariableScope ) => {
                  let text = self.__evaluate__( value as string, _scope || scope )

                  // Apply translation
                  if( self.lips && !$node.is('[no-translate]') ){
                    const { text: _text } = self.lips.i18n.translate( text )
                    text = _text
                  }

                  $fragment.text( text )
                }

                updateText()
                
                if( track && self.__isReactive__( value as string, scope ) ){
                  const deps = self.__extractExpressionDeps__( value as string, scope )

                  deps.forEach( dep => {
                    nodeRef.__deps.add( dep )
                    self.__trackDep__( dependencies, dep, $fragment, updateText )
                  })
                }
              } break

              // Convert object style attribute to string
              case 'style': {
                const updateStyle = ( _scope?: VariableScope ) => {
                  const style = self.__evaluate__( value as string, _scope || scope )
                  
                  // Defined in object format
                  if( typeof style === 'object' ){
                    let str = ''

                    Object
                    .entries( style )
                    .forEach( ([ k, v ]) => str += `${k}:${v};` )
                    
                    str.length && $fragment.attr('style', str )
                  }
                  // Defined in string format
                  else $fragment.attr('style', style )
                }

                updateStyle()
                
                if( track && self.__isReactive__( value as string, scope ) ){
                  const deps = self.__extractExpressionDeps__( value as string, scope )

                  deps.forEach( dep => {
                    nodeRef.__deps.add( dep )
                    self.__trackDep__( dependencies, dep, $fragment, updateStyle )
                  })
                }
              } break

              // Inject the evaluation result of any other attributes
              default: {
                const updateAttrs = ( _scope?: VariableScope ) => {
                  const res = value ?
                              self.__evaluate__( value as string, _scope || scope )
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
                              : value !== undefined ? value : true

                  /**
                   * (?) evaluation return signal to unset the attribute.
                   * 
                   * Very useful case where the attribute don't necessarily
                   * have values by default.
                   */
                  res === undefined || res === false
                                ? $fragment.removeAttr( attr )
                                : $fragment.attr( attr, res )
                }

                updateAttrs()
                
                if( track && self.__isReactive__( value as string, scope ) ){
                  const deps = self.__extractExpressionDeps__( value as string, scope )

                  deps.forEach( dep => {
                    nodeRef.__deps.add( dep )
                    self.__trackDep__( dependencies, dep, $fragment, updateAttrs )
                  })
                }
              }
            }
          })
        }

        // Record attachable events to the element
        events && Object
        .entries( events )
        .forEach( ([ _event, value ]) => {
          self.__attachableEvents.push({
            _event,
            $node: $fragment,
            instruction: value as string,
            scope
          })
        })

        // Check, process & track spread attributes
        attrs && Object
        .keys( attrs )
        .forEach( key => {
          if( !SPREAD_VAR_PATTERN.test( key ) ) return

          const updateSpreadAttrs = ( _scope?: VariableScope ) => {
            const
            extracted: Record<string, any> = {},
            spreads = self.__evaluate__( key.replace( SPREAD_VAR_PATTERN, '' ) as string, _scope || scope )
            if( typeof spreads !== 'object' )
              throw new Error(`Invalid spread operator ${key}`)

            for( const _key in spreads )
              extracted[ _key ] = spreads[ _key ]

            processAttrs( extracted )
          }

          delete attrs[ key ]
          updateSpreadAttrs()

          if( key && self.__isReactive__( key, scope ) ){
            const deps = self.__extractExpressionDeps__( key, scope )

            deps.forEach( dep => {
              nodeRef.__deps.add( dep )
              self.__trackDep__( dependencies, dep, $fragment, updateSpreadAttrs )
            })
          }
        })
        
        processAttrs( attrs, true )
        
        /**
         * BENCHMARK: Tracking total elements rendered
         */
        self.benchmark.inc('elementCount')
          
        return $fragment
      }

      return self.FGN.register( elementPath, meta, renderExec )
    }
    function execText( $node: Cash ): Cash {
      const
      textPath = self.__generatePath__('element'),
      meta: NodeMeta = {
        path: textPath,
        type: 'element'
      },
      renderExec = ( nodeRef: any ) => {
        const
        content = $node.text(),
        // Initial rendering
        $fragment = $(document.createTextNode( self.__interpolate__( content, scope ) ) )

        // Track for update rendering
        if( content && self.__isReactive__( content, scope ) ){
          const
          deps = self.__extractTextDeps__( content, scope ),
          updateTextContent = ( _scope?: VariableScope ) => {
            const text = self.__interpolate__( content, _scope || scope )
            if( !$fragment[0] ) return
            $fragment[0].textContent = text
          }
          
          deps.forEach( dep => {
            nodeRef.__deps.add( dep )
            self.__trackDep__( dependencies, dep, $fragment, updateTextContent )
          })
        }

        return $fragment
      }

      return self.FGN.register( textPath, meta, renderExec )
    }

    function parse( $node: Cash ){
      if( $node.get(0)?.nodeType === Node.COMMENT_NODE )
        return $node

      if( $node.get(0)?.nodeType === Node.TEXT_NODE )
        return execText( $node )

      // Render in-build syntax components
      if( $node.is('let') ) return execLet( $node )
      else if( $node.is('const') ) return execConst( $node )
      else if( $node.is('if, for, switch, async') ) return execComponent( $node )
      /**
       * Ignore <else-if> and <else> tags as node
       * for their should be already process by <if>
       */
      else if( $node.is('else-if, else') ) return
      else if( $node.is('lips') ) return execDynamic( $node )
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
      this.__renderDepth++

      // Process nodes
      $nodes = $nodes || $(this.template)
      $nodes.each( function(){
        const $node = parse( $(this) )
        if( $node ) _$ = _$.add( $node )
      } )

      /**
       * BENCHMARK: Tracking total occurence of recursive rendering
       */
      self.benchmark.inc('renderCount')
    }
    catch( error ){ console.error('Rendering Failed --', error ) }
    finally {
      this.__renderDepth--
      
      // Clear path when main render completes
      if( this.__renderDepth === 0 ){
        this.__path = ''
        this.__pathCounter = 0
      }
    }
    
    return { _$, dependencies }
  }
  /**
   * Rerender component using the original content 
   * of the component to during rerendering
   */
  rerender(){
    if( !this.template )
      throw new Error('Component template is empty')

    const { _$: $clone } = this.render()
    
    this.$?.replaceWith( $clone )
    this.$ = $clone

    // Reassign CSS relationship attribute
    this.$?.attr('rel', this.__name__ )
  }

  /**
   *
   */
  private __mesh__( $tagnode: Cash, argv: string[] = [], scope: VariableScope = {}, useAttributes = false ){
    const self = this
    let contents: MeshTemplate = {
      render: {
        argv,
        partial: undefined,
        mesh( argvalues?: VariableScope ){
          const $contents = $tagnode.contents()
          if( !$contents.length ) return

          this.partial = self.render( $contents, { ...scope, ...argvalues } )

          /**
           * Share partial dependenies with main thread
           * to have a parallel update on the same node
           * both ways.
           * 
           * 1. From main FGU dependency track
           * 2. From mesh rendering track
           */
          this.partial.dependencies.forEach( ( dependents, path ) => {
            !self.__dependencies?.has( path )
                          ? self.__dependencies?.set( path, dependents )
                          : dependents.forEach( dependent => self.__dependencies?.get( path )?.add( dependent ) )
          } )

          return this.partial._$
        },
        update( argvalues?: VariableScope ){
          if( !this.partial ) return
          const { dependencies } = this.partial

          dependencies.forEach( ( dependents, path ) => {
            dependents.forEach( ({ $node, update }) => {
              if( !$node.closest('body').length ){
                dependents.delete({ $node, update })
                return
              }

              console.log('update --', update )
              update({ ...scope, ...argvalues })
            })

            /**
             * Clean up if no more dependents
             */
            !dependents.size && dependencies.delete( path )
          })
        }
      }
    }

    /**
     * Allow attributes consumption as input/props
     */
    if( useAttributes )
      contents = {
        ...contents,
        ...self.__getAttributes__( $tagnode )
      }

    return contents
  }
  private __getAttributes__( $node: Cash ){
    const 
    extracted = ($node as any).attrs(),
    events: Record<string, any> = {},
    attrs: Record<string, any> = {}

    let argv: string[] = []

    // Process attributes including spread operator
    extracted && Object
    .entries( extracted )
    .forEach( ([ key, value ]) => {
      if( ARGUMENT_VAR_PATTERN.test( key ) ){
        const [ _, vars] = key.match( ARGUMENT_VAR_PATTERN ) || []
        argv = vars.split(',')
      }
      else if( /^on-/.test( key ) )
        events[ key.replace(/^on-/, '') ] = value
      
      else attrs[ key ] = value
    })

    return { argv, events, attrs }
  }
  private __generatePath__( type: NodeType ): string {
    const key = `${type}-${this.__pathCounter++}`

    return this.__path ? `${this.__path}/${key}` : key
  }
  private __withPath__<T>( path: string, fn: () => T ): T {
    const prevPath = this.__path
    this.__path = path

    const result = fn()
    this.__path = prevPath

    return result
  }

  private __evaluate__( script: string, scope?: VariableScope ){
    try {
      script = script.trim()
      
      if( scope ){
        const _scope: Record<string, any> = {}
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
    return str.replace( /{\s*([^{}]+)\s*}/g, ( _, expr ) => this.__evaluate__( expr, scope ) )
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
  private  __detachEvent__( element: Cash | Component, _event: string ){
    element.off( _event )
  }

  private __extractTextDeps__( expr: string, scope?: VariableScope ): string[] {
    const deps = new Set<string>()
    
    // Handle interpolation expressions
    const matches = expr.match(/{\s*([^{}]+)\s*}/g) || []
    matches.forEach( match => {
      const
      innerExpr = match.replace(/[{}]/g, '').trim(),
      exprDeps = this.__extractExpressionDeps__( innerExpr, scope )

      exprDeps.forEach( dep => deps.add( dep ) )
    })

    return Array.from( deps )
  }
  private __extractExpressionDeps__( expr: string, scope?: VariableScope ): string[] {
    const pattern = /\b(state|input|context)(?:\.[a-zA-Z_]\w*)+(?=\.[a-zA-Z_]\w*\(|\s|;|,|\)|$)/g
    let matches = Array.from( expr.matchAll( pattern ) )

    if( scope && Object.keys( scope ).length ){
      const scopeRegex = new RegExp(`\\b(${Object.keys( scope ).join('|')})`, 'g')
      
      matches = [
        ...matches,
        ...Array.from( expr.matchAll( scopeRegex ) )
      ]
    }
      
    return matches.map( m => m[0] )
  }
  private __isReactive__( expr: string, scope?: VariableScope ): boolean {
    // Reactive component variables
    if( /(state|input|context)\.[\w.]+/.test( expr ) ) return true
    // Reactive internal scope
    if( scope
        && Object.keys( scope ).length
        && new RegExp( Object.keys( scope ).join('|') ).test( expr ) ) return true

    return false
  }
  private __trackDep__( dependencies: FGUDependencies, dep: string, $node: Cash, update: () => void ){
    !dependencies.has( dep ) && dependencies.set( dep, new Set() )
    dependencies.get( dep )?.add({ $node, update })
  }

  private __valuePath__( obj: any, path: string[] ): any {
    return path.reduce( ( curr, part ) => curr?.[ part ], obj )
  }
  private __updateDepNodes__( current: Metavars<Input, State, Context>, previous?: Metavars<Input, State, Context> ){
    if( !this.__dependencies?.size ) return

    /**
     * We only care about paths that have registered 
     * dependencies. No need to scan entire state/input/context
     */
    this.__dependencies.forEach( ( dependents, path ) => {
      const
      [ scope, ...parts ] = path.split('.'),
      ovalue = previous && this.__valuePath__( previous[ scope as keyof Metavars<Input, State, Context>  ], parts ),
      nvalue = this.__valuePath__( current[ scope as keyof Metavars<Input, State, Context> ], parts )

      /**
       * Skip if value hasn't changed
       */
      if( isEqual( ovalue, nvalue ) ) return
      
      /**
       * Handle updates for each dependent node/component
       */
      dependents.forEach( ({ $node, update }) => {
        /**
         * Only clean up non-syntactic dependencies 
         * or node no longer in DOM
         */
        if( !$node.closest('body').length ){
          dependents.delete({ $node, update })
          return
        }

        update()
      })

      /**
       * Clean up if no more dependents
       */
      !dependents.size && this.__dependencies?.delete( path )
    })
  }

  attachEvents(){
    this.__attachableEvents.forEach( ({ $node, _event, instruction, scope }) => {
      $node.off( _event )
      && this.__attachEvent__( $node, _event, instruction, scope )
    })

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
    /**
     * Dispose signal effect dependency of this
     * component.
     */
    this.ICE.dispose()
    /**
     * Dispose rendered nodes manager
     */
    this.FGN.dispose()
    /**
     * Stop watcher when component's element get 
     * detached from the DOM
     */
    this.lips?.watcher?.unwatch( this as any )

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
}