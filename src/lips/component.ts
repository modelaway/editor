import type Lips from './lips'
import type { 
  Handler,
  Metavars,
  ComponentScope,
  ComponentOptions,
  InteractiveMetavars,
  VariableScope,
  MeshRenderer,
  MeshTemplate,
  RenderedNode,
  FGUDependencies,
  FGUDependency,
  Declaration,
  FragmentBoundaries,
  VirtualEvent,
  VirtualEventRecord,
  Macro,
  MeshWireSetup,
  SyntaxAttributes
} from '.'

import UQS from './uqs'
import Events from './events'
import $, { Cash } from 'cash-dom'
import Benchmark from './benchmark'
import { preprocessor } from './preprocess'
import Stylesheet from '../modules/stylesheet'
import { batch, effect, EffectControl, signal } from './signal'
import { 
  isDiff,
  isEqual,
  deepClone,
  deepAssign,
  SPREAD_VAR_PATTERN,
  ARGUMENT_VAR_PATTERN,
  SYNCTAX_VAR_FLAG
} from './utils'

export default class Component<MT extends Metavars> extends Events {
  private template: string
  private declaration: Declaration
  private $?: Cash

  public input: MT['Input']
  public state: MT['State']
  public static: MT['Static']
  public context: MT['Context']

  public __key__: string
  public __name__: string
  private __previous: InteractiveMetavars<MT>
  private __stylesheet?: Stylesheet
  private __macros: Map<string, Macro> = new Map() // Cached macros templates
  private __dependencies: FGUDependencies = new Map() // Initial FGU dependencies
  private __attachedEvents: VirtualEventRecord<Component<MT>>[] = []
  private __renderCache: Map<string, RenderedNode> = new Map()

  // Preserved Child Components
  private PCC: Map<string, Component<MT>> = new Map()

  /**
   * Nexted Component Count (NCC) in tree
   * hieralchy and discovery order
   */
  private NCC = 0
  private prekey = '0'
  private debug = false
  private isRendered = false

  private _setInput: ( input: MT['Input'] ) => void
  private _setState: ( state: MT['State'] ) => void
  private _getState: () => MT['State'] | undefined

  // Update Queue System for high-frequency DOM updates
  private UQS: UQS
  // Internal Component Effect
  private ICE: EffectControl

  public lips: Lips
  private benchmark: Benchmark

  private __path = ''
  private __pathCounter = 0
  private __renderDepth = 0

  /**
   * Allow methods of `handler` to be dynamically
   * added to `this` component object.
   */
  ;[key: string]: any

  constructor( name: string, template: string, { input, state, context, _static, handler, stylesheet, macros, declaration }: ComponentScope<MT>, options: ComponentOptions ){
    super()
    this.lips = options.lips
    this.template = preprocessor( template )

    // console.log( this.template )
  
    if( options?.debug ) this.debug = options.debug
    if( options?.prekey ) this.prekey = options.prekey

    this.__name__ = name
    this.__key__ = `${this.prekey}.${this.__name__}`

    this.declaration = declaration || { name }

    this.input = input || {}
    this.static = _static || {}
    this.context = {}
    /**
     * Detect all state mutations, including deep mutations
     */
    this.state = this.lips.IUC.proxyState<MT['State']>( this.__key__, state || {} as MT['State'] )
    
    macros && this.setMacros( macros )
    handler && this.setHandler( handler )
    stylesheet && this.setStylesheet( stylesheet )

    /**
     * Track rendering cycle metrics to evaluate
     * performance.
     * 
     */
    this.benchmark = new Benchmark( this.debug )
    // Track component creation
    this.benchmark.inc('componentCount')
    
    /**
     * 
     */
    this.UQS = new UQS( this.benchmark )

    /**
     * Triggered during component creation
     * 
     * NOTE: Any state value set during this process
     * is considered initial state.
     */
    typeof this.onCreate == 'function'
    && this.onCreate.bind(this)()
    this.emit('component:create', this )

    /**
     * Triggered an initial input is provided
     */
    if( this.input
        && Object.keys( this.input ).length
        && typeof this.onInput == 'function' ){
      this.onInput.bind(this)( this.input )
      this.emit('component:input', this )
    }

    /**
     * Initialize previous interative metavars to initial metavars
     * 
     * IMPORTANT: this prevent any update effect during
     * component creating for initial input, state and
     * context
     */
    this.__previous = {
      input: deepClone( this.input ),
      state: deepClone( this.state ),
      context: deepClone( this.context )
    }

    const
    [ getInput, setInput ] = signal<MT['Input']>( this.input ),
    [ getState, setState ] = signal<MT['State']>( this.state ),
    [ getContext, setContext ] = signal<MT['Context']>( this.context )

    this._setInput = setInput
    this._setState = setState
    this._getState = getState

    this.lips.IUC.register( this.__key__, () => {
      /**
       * Apply update only when a new change 
       * occured on the state.
       * 
       * Merge with initial/active state.
       */
      this.state
      && isDiff( this.__previous?.state as Record<string, any>, this.state as Record<string, any> )
      && this._setState({ ...this._getState(), ...this.state })
    })
    
    /**
     * Set context update effect listener
     * to merge with initial/active context
     * after any occurances.
     */
    Array.isArray( context )
    && context.length
    && this.lips.useContext<MT['Context']>( context, ctx => {
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

      /**
       * Initial render - parse template and establish 
       * dependencies
       */
      if( !this.isRendered ){
        // Reset benchmark before render
        this.benchmark.reset()
        
        const { $log } = this.render( undefined, undefined, this.__dependencies )
        this.$ = $log
        
        /**
         * Assign CSS relationship attribute
         * for only non-syntax components.
         */
        !declaration?.syntax && this.$?.attr('rel', this.__name__ )

        this.isRendered = true
        
        /**
         * Triggered after component get mounted for
         * the first time.
         */
        typeof this.onMount == 'function'
        && this.onMount.bind(this)()
        this.emit('component:mount', this )

        /**
         * Watch when component's element get 
         * attached to the DOM
         */
        this.lips.watcher.watch( this as any )
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

        // this.state = state
        this.input = input
        this.context = context
      }

      this.benchmark.log()

      /**
       * Triggered anytime component gets rendered
       */
      typeof this.onRender == 'function' && this.onRender.bind(this)()
      this.emit('component:render', this )
    })
  }

  setContext( arg: Partial<Record<string, any>> | string, value?: any  ){
    /**
     * Set global context value from any component
     * 
     * Note: `arg` if object isn't restricted to 
     *        this component's required context fields scope.
     */
    this.lips.setContext( arg, value )
  }
  setInput( input: MT['Input'] ){
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

    this.setInput( deepAssign<MT['Input']>( this.input, data ) )
    return this
  }
  setMacros( template: string ){
    const prepo = preprocessor( template )
    // console.log('prepo macro --', prepo )
    
    const $nodes = $(prepo)
    if( !$nodes.length ) return

    const self = this
    $nodes.each( function(){
      const
      $node = $(this),
      { argv, attrs } = self.__getAttributes__( $node )

      if( !Object.keys( attrs ) )
        throw new Error('Invalid macro component definition')

      if( !attrs.literals.name )
        throw new Error('Undefined macro `name` attribute.')

      if( self.__macros.get( attrs.literals.name ) )
        console.warn(`Duplicate macro <${attrs.literals.name}> will be override`)

      if( !$node.contents()?.length )
        throw new Error('Invalid macro component definition. Template content expected.')

      self.__macros.set( attrs.literals.name, { argv, $node } )
    } )
  }
  setHandler( list: Handler<MT> ){
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
    const
    dependencies: FGUDependencies = sharedDeps || new Map(),
    attachableEvents: VirtualEvent[] = []

    if( $nodes && !$nodes.length ){
      console.warn('Undefined node element to render')
      return { $log: $nodes, dependencies }
    }

    // Start benchmark measuring
    this.benchmark.startRender()

    const self = this
    
    /**
     * Initialize an empty cash object to 
     * act like a DocumentFragment
     */
    let _$ = $()

    function isMesh( arg: any ){
      return arg !== null
              && typeof arg === 'object'
              && typeof arg.mesh === 'function'
              && typeof arg.update === 'function'
    }
    function isTemplate( arg: any ){
      return arg !== null
              && typeof arg === 'object'
              && typeof arg.default
              && typeof arg.default === 'string'
    }
    function handleDynamic( $node: Cash ){
      if( !$node.attr(':dtag') || $node.prop('tagName') !== 'LIPS' )
        throw new Error('Invalid dynamic tag name')
      
      const
      dtag = $node.attr(':dtag') as string,
      result = self.__evaluate__( dtag, scope )
      
      /**
       * Process dynamic content rendering tag set by:
       * 
       * Syntax `<{input.render}/>`
       * processed to `<lips :dtag=input.render></lips>`
       */
      if( isMesh( result ) || result === null )
        return execDynamicElement( $node, dtag, result )

      // else if( isTemplate( result ) )

      /**
      * Process dynamic tag set by:
      * 
      * Syntax `<{dynamic-name}/>`
      * processed to `<lips :dtag="[dynamic-name]"></lips>`
      */
      else return execComponent( $node, result )
    }

    function execLog( $node: Cash ){
      const
      args = $node.attr(':args'),
      logPath = self.__generatePath__('log')
      if( !args ) return
      
      self.__evaluate__(`console.log(${args})`, scope )

      if( self.__isReactive__( args as string, scope ) ){
        const deps = self.__extractExpressionDeps__( args as string, scope )
        
        deps.forEach( dep => self.__trackDep__( dependencies, dep, {
          $fragment: null,
          path: logPath,
          update: memo => self.__evaluate__(`console.log(${args})`, memo ),
          memo: scope,
          batch: true
        }) )
      }
    }
    function execLet( $node: Cash ){
      const
      varPath = self.__generatePath__('var'),
      { attrs } = self.__getAttributes__( $node )
      if( !attrs ) return 
      
      Object
      .entries( attrs.literals )
      .forEach( ([ key, assign ]) => scope[ key ] = { value: assign, type: 'let' } )

      Object
      .entries( attrs.expressions )
      .forEach( ([ key, assign ]) => {
        // Process spread assign
        if( SPREAD_VAR_PATTERN.test( key ) ){
          const spreadExtract = ( update?: boolean, memo?: VariableScope ) => {
            const spreads = self.__evaluate__( key.replace( SPREAD_VAR_PATTERN, '' ) as string, memo || scope )
            if( typeof spreads !== 'object' )
              throw new Error(`Invalid spread operator ${key}`)

            for( const _key in spreads )
              scope[ _key ] = {
                value: spreads[ _key ],
                type: 'let'
              }

            if( update ){
              // TODO: Do more than just update scope
              
            }
          }

          const deps = self.__extractExpressionDeps__( key as string, scope )
          deps.forEach( dep => self.__trackDep__( dependencies, dep, {
            $fragment: null,
            path: `${varPath}.${key}`,
            update: memo => spreadExtract( true, memo ),
            memo: scope,
            batch: true
          }) )

          spreadExtract()
        }
        else if( assign ){
          if( self.__isReactive__( assign as string, scope ) ){
            const 
            deps = self.__extractExpressionDeps__( assign as string, scope ),
            updateVar = ( memo: VariableScope, by?: string ) => {
              scope[ key ] = {
                value: self.__evaluate__( assign as string, memo ),
                type: 'let'
              }

              // TODO: Do more than just update scope
            }

            deps.forEach( dep => self.__trackDep__( dependencies, dep, {
              $fragment: null,
              path: `${varPath}.${key}`,
              update: updateVar,
              memo: scope,
              batch: true
            }) )
          }

          scope[ key ] = {
            value: self.__evaluate__( assign as string, scope ),
            type: 'let'
          }
        }
      })
      
      /**
       * BENCHMARK: Tracking total elements rendered
       */
      self.benchmark.inc('elementCount')
    }
    function execConst( $node: Cash ){
      const
      { attrs } = self.__getAttributes__( $node )
      if( !attrs ) return
      
      Object
      .entries( attrs.literals )
      .forEach( ([ key, assign ]) => scope[ key ] = { value: assign, type: 'const' } )

      Object
      .entries( attrs.expressions )
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
    function execEmptyFragment( $node: Cash ): Cash {
      const
      elementPath = self.__generatePath__('element'),
      $contents = $node.contents()
      let $fragment = $()

      // Process contents recursively if they exist
      if( $contents.length )
        $fragment = $fragment.add( self.__withPath__( elementPath, () => self.render( $contents, scope, dependencies ).$log ) )

      return $fragment
    }
    function execDynamicElement( $node: Cash, dtag: string, renderer: MeshRenderer | null ): Cash {
      const
      { attrs } = self.__getAttributes__( $node ),
      elementPath = self.__generatePath__('element'),
      boundaries = self.__createBoundaries__( elementPath )
      
      let
      $fragment = $(boundaries.start),
      // Keep track of the latest mesh scope
      argvalues: VariableScope = {},
      activeRenderer = renderer

      if( renderer ){
        attrs.literals && Object
        .entries( attrs.literals )
        .forEach( ([ key, value ]) => argvalues[ key ] = { type: 'const', value } )

        attrs.expressions && Object
        .entries( attrs.expressions )
        .forEach( ([ key, value ]) => {
          if( SPREAD_VAR_PATTERN.test( key ) ){
            const
            spreads = self.__evaluate__( key.replace( SPREAD_VAR_PATTERN, '' ) as string, scope )
            if( typeof spreads !== 'object' )
              throw new Error(`Invalid spread operator ${key}`)

            for( const _key in spreads ){
              // Only consume declared arguments' value
              if( _key !== '#' && !renderer.argv.includes( _key ) ) continue

              argvalues[ _key ] = {
                type: 'const',
                value: spreads[ _key ]
              }
            }
          }
          else {
            // Only consume declared arguments' value
            if( key !== '#' && !renderer.argv.includes( key ) ) return

            argvalues[ key ] = {
              type: 'const',
              value: value ? self.__evaluate__( value, scope ) : true
            }
          }
        })

        const $log = renderer.mesh( argvalues )
        if( $log && $log.length )
          $fragment = $fragment.add( $log )
        
        /**
         * IMPORTANT:
         * 
         * Set update dependency track only after $fragment 
         * contain rendered content
         */
        attrs.expressions && Object
        .entries( attrs.expressions )
        .forEach( ([ key, value ]) => {
          if( SPREAD_VAR_PATTERN.test( key ) && self.__isReactive__( key as string, scope ) ){
            const
            deps = self.__extractExpressionDeps__( key as string, scope ),
            spreadPartialUpdate = ( memo: VariableScope, by?: string ) => {
              if( !activeRenderer ) return

              const
              extracted: VariableScope = {},
              spreads = self.__evaluate__( key.replace( SPREAD_VAR_PATTERN, '' ) as string, memo )
              if( typeof spreads !== 'object' )
                throw new Error(`Invalid spread operator ${key}`)

              for( const _key in spreads ){
                // Only update declared arguments' value
                if( _key !== '#' && !activeRenderer.argv.includes( _key ) ) continue

                extracted[ _key ] = {
                  type: 'const',
                  value: spreads[ _key ]
                }
              }

              activeRenderer.update( extracted, boundaries )
            }

            deps.forEach( dep => self.__trackDep__( dependencies, dep, {
              $fragment: null,
              boundaries,
              path: `${elementPath}.${key}`,
              update: spreadPartialUpdate,
              memo: scope,
              batch: true
            }) )
          }
          else if( ( key === '#' || renderer.argv.includes( key ) ) && self.__isReactive__( value as string, scope ) ) {
            const 
            deps = self.__extractExpressionDeps__( value as string, scope ),
            partialUpdate = ( memo: VariableScope, by?: string ) => {
              if( !activeRenderer ) return

              activeRenderer.update({
                [key]: {
                  type: 'const',
                  value: value ? self.__evaluate__( value, memo ) : true
                }
              }, boundaries )
            }
            
            deps.forEach( dep => self.__trackDep__( dependencies, dep, {
              $fragment: null,
              boundaries,
              path: `${elementPath}.${key}`,
              update: partialUpdate,
              memo: scope,
              batch: true
            }) )
          }
        } )
      }
      
      // Track FGU dependency update on the dynamic tag
      if( self.__isReactive__( dtag as string, scope ) ){
        const
        updateDynamicElement = ( memo: VariableScope, by?: string ) => {
          // Update the mesh scope with new values
          argvalues = { ...memo, ...argvalues }

          /**
           * Re-evaluate dynamic tag expression before 
           * re-rendering the element
           */
          const newRenderer = self.__evaluate__( dtag, memo )
          let $newContent
          if( isMesh( newRenderer ) ){
            activeRenderer = newRenderer
            $newContent = newRenderer ? newRenderer.mesh( argvalues ) : null
          }

          // Check if boundaries are in DOM
          if( !document.contains( boundaries.start ) || !document.contains( boundaries.end ) )
            throw new Error('Dynamic element boundaries not found')

          // Render new content
          const
          nodesToRemove = [] // Nodes between boundaries
          let currentNode = boundaries.start.nextSibling
          
          while( currentNode && currentNode !== boundaries.end ){
            nodesToRemove.push( currentNode )
            currentNode = currentNode.nextSibling
          }
          
          // Remove old content and insert new
          $(nodesToRemove).remove()

          $newContent && $(boundaries.start).after( $newContent )
        },
        deps = self.__extractExpressionDeps__( dtag as string, scope )

        deps.forEach( dep => self.__trackDep__( dependencies, dep, {
          $fragment: null,
          boundaries,
          path: elementPath,
          update: updateDynamicElement,
          batch: deps.length > 1,
          memo: { ...scope, ...argvalues }
        }) )
      }

      $fragment = $fragment.add( boundaries.end )

      return $fragment
    }
    function execComponent( $node: Cash, dynamicName?: string ): Cash {
      const name = dynamicName || $node.prop('tagName')?.toLowerCase() as string
      
      if( !name ) throw new Error('Invalid component')
      if( name === self.__name__ ) throw new Error('Render component within itself is forbidden')

      /**
       * Render the whole component for first time
       */
      const template = self.lips.import<any>( name )
      if( !template )
        throw new Error(`<${name}> template not found`)
      
      const
      __key__ = `${self.prekey}.${name}$${self.NCC++}`,
      componentPath = self.__generatePath__('component'),
      boundaries = self.__createBoundaries__( componentPath ),
      { argv, attrs, events } = self.__getAttributes__( $node ),
      TRACKABLE_ATTRS: Record<string, string> = {}

      /**
       * Parse assigned attributes to be injected into
       * the component as input.
       */
      let
      input: any = {},
      $fragment = $(boundaries.start),
      component = self.PCC.get( __key__ )

      /**
       * Cast attributes to compnent inputs
       */
      attrs.literals && Object
      .entries( attrs.literals )
      .forEach( ([ key, value ]) => {
        if( key == 'key' ) return
        input[ key ] = value
      })
      
      attrs.expressions && Object
      .entries( attrs.expressions )
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

        template.declaration?.syntax
                  ? TRACKABLE_ATTRS[`${SYNCTAX_VAR_FLAG + key}`] = value
                  : TRACKABLE_ATTRS[ key ] = value
      })

      /**
       * Also inject component slotted body into inputs
       */
      const $nodeContents = $node.contents()
      if( $nodeContents.length ){
        // Pass in the regular body contents
        input = {
          ...input,
          ...self.__meshwire__({
            $node,
            fragmentPath: componentPath,
            fragmentBoundaries: boundaries,
            getFragment(){ return $fragment },
            setFragment( $newFragment ){ $fragment = $newFragment },
            meshPath: null,
            argv,
            scope,
            useAttributes: true,
            declaration: template.declaration,
          }, TRACKABLE_ATTRS )
        }

        /**
         * Parse a syntactic declaration body contents
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
                case 'nexted': {
                  let $next = $node.next( tagname )
                  if( !$next.length ) return

                  if( many ){
                    input[ tagname ] = []

                    let
                    index = 0,
                    reachedEndOfChain = false
                    
                    // Continue until we reach the end of the chain
                    while( !reachedEndOfChain ){
                      input[ tagname ].push( self.__meshwire__({ 
                        $node: $next,
                        meshPath: `${tagname}[${index}]`,
                        fragmentPath: componentPath,
                        fragmentBoundaries: boundaries,
                        getFragment(){ return $fragment },
                        setFragment( $newFragment ){ $fragment = $newFragment },
                        argv,
                        scope,
                        useAttributes: true,
                        declaration: template.declaration
                      }, TRACKABLE_ATTRS ) )

                      // Check if there's a next sibling
                      if( !$next.next( tagname ).length ){
                        reachedEndOfChain = true
                        break
                      }
                      
                      // Move to the next siblings
                      $next = $next.next( tagname )
                      index++
                    }
                  }
                  else input[ tagname ] = self.__meshwire__({
                        $node: $next,
                        meshPath: tagname,
                        fragmentPath: componentPath,
                        fragmentBoundaries: boundaries,
                        getFragment(){ return $fragment },
                        setFragment( $newFragment ){ $fragment = $newFragment },
                        argv,
                        scope,
                        useAttributes: true,
                        declaration: template.declaration
                      }, TRACKABLE_ATTRS )
                } break

                case 'child': {
                  const $children = $node.children( tagname )
                  if( many ){
                    input[ tagname ] = []
                    $children.each(function( index ){ 
                      input[ tagname ].push( self.__meshwire__({ 
                        $node: $(this),
                        meshPath: `${tagname}[${index}]`,
                        fragmentPath: componentPath,
                        fragmentBoundaries: boundaries,
                        getFragment(){ return $fragment },
                        setFragment( $newFragment ){ $fragment = $newFragment },
                        argv,
                        scope,
                        useAttributes: true,
                        declaration: template.declaration
                      }, TRACKABLE_ATTRS ) )
                    })
                  }
                  else if( $node.children( tagname ).first().length )
                    input[ tagname ] = self.__meshwire__({
                      $node: $node.children( tagname ).first(),
                      meshPath: tagname,
                      fragmentPath: componentPath,
                      fragmentBoundaries: boundaries,
                      getFragment(){ return $fragment },
                      setFragment( $newFragment ){ $fragment = $newFragment },
                      argv,
                      scope,
                      useAttributes: true,
                      declaration: template.declaration
                    }, TRACKABLE_ATTRS )
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
      }

      // Use preserved child component is available
      if( component ){
        component.setInput( deepClone( input ) )
        $fragment = $fragment.add( component.getNode() )
      }
      // Render child component
      else {
        const { declaration, state, _static, handler, context, default: _default, stylesheet } = template
        
        component = new Component( name, _default || '', {
          state: deepClone( state ),
          input: deepClone( input ),
          context,
          _static: deepClone( _static ),
          handler,
          stylesheet,
          declaration
        }, {
          debug: self.debug,
          lips: self.lips,
          prekey: __key__
        })

        $fragment = $fragment.add( component.getNode() )
        // Cache component for reuse.
        self.PCC.set( __key__, component )

        // Listen to this nexted component's events
        Object
        .entries( events )
        .forEach( ([ _event, instruction ]) => !!component && self.__attachEvent__( component, _event, instruction, scope ) )
        
        /**
         * Setup input dependency track
         */
        TRACKABLE_ATTRS && Object
        .entries( TRACKABLE_ATTRS )
        .forEach( ([ key, value ]) => {
          let isSyntax = false
          if( new RegExp(`^${SYNCTAX_VAR_FLAG}`).test( key ) ){
            isSyntax = true
            key = key.replace( SYNCTAX_VAR_FLAG, '' )
          }

          if( SPREAD_VAR_PATTERN.test( key ) ){
            const spreadvalues = ( memo: VariableScope ) => {
              const
              extracted: Record<string, any> = {},
              spreads = self.__evaluate__( key.replace( SPREAD_VAR_PATTERN, '' ) as string, memo )
              if( typeof spreads !== 'object' )
                throw new Error(`Invalid spread operator ${key}`)

              for( const _key in spreads )
                extracted[ _key ] = spreads[ _key ]

              component?.subInput( extracted )
            }
            
            if( self.__isReactive__( key as string, scope ) ){
              const deps = self.__extractExpressionDeps__( value as string, scope )
              
              deps.forEach( dep => self.__trackDep__( dependencies, dep, {
                $fragment: null,
                boundaries,
                path: `${componentPath}.${key}`,
                update: spreadvalues,
                syntax: isSyntax,
                memo: scope,
                batch: true
              }) )
            }
          }
          else {
            const evalue = ( memo: VariableScope ) => {
              component?.subInput({
                [key]: value ? self.__evaluate__( value as string, memo ) : true
              })
            }
            
            if( self.__isReactive__( value as string, scope ) ){
              const deps = self.__extractExpressionDeps__( value as string, scope )
              
              deps.forEach( dep => self.__trackDep__( dependencies, dep, {
                $fragment: null,
                boundaries,
                path: `${componentPath}.${key}`,
                update: evalue,
                syntax: isSyntax,
                memo: scope,
                batch: true
              }) )
            }
          }
        })

        // Close boundaries to the initial fragment when it's added to DOM
        $fragment = $fragment.add( boundaries.end )
      }

      // Track component creation
      self.benchmark.inc('componentCount')

      return $fragment
    }
    function execMacro( $node: Cash ): Cash {
      const name = $node.prop('tagName')?.toLowerCase() as string
      if( !name )
        throw new Error('Invalid macro rendering call')

      const macro = self.__macros.get( name )
      if( !macro )
        throw new Error('Macro component not found')
      
      const
      macroPath = self.__generatePath__('macro'),
      boundaries = self.__createBoundaries__( macroPath ),
      { attrs } = self.__getAttributes__( $node ),
      TRACKABLE_ATTRS: Record<string, string> = {}
      
      /**
       * Parse assigned attributes to be injected into
       * the component as input.
       */
      let
      argvalues: VariableScope = {},
      allvalues: Record<string, any> = {},
      $fragment = $(boundaries.start)

      /**
       * Cast attributes to compnent inputs
       */
      attrs.literals && Object
      .entries( attrs.literals )
      .forEach( ([ key, value ]) => argvalues[ key ] = { value, type: 'const' } )

      attrs.expressions && Object
      .entries( attrs.expressions )
      .forEach( ([ key, value ]) => {
        if( SPREAD_VAR_PATTERN.test( key ) ){
          const spreads = self.__evaluate__( key.replace( SPREAD_VAR_PATTERN, '' ) as string, scope )
          if( typeof spreads !== 'object' )
            throw new Error(`Invalid spread operator ${key}`)

          for( const _key in spreads ){
            allvalues[ _key ] = spreads[ _key ]

            if( macro.argv.includes( _key ) )
              argvalues[ _key ] = {
                value: spreads[ _key ],
                type: 'let'
              }
          }

          /**
           * Always track spread operators for their 
           * content might be reactive
           */
          TRACKABLE_ATTRS[ key ] = value
        }

        else {
          const val = value ? self.__evaluate__( value as string, scope ) : true

          allvalues[ key ] = val

          if( macro.argv.includes( key ) )
            argvalues[ key ] = {
              value: val,
              type: 'let'
            }

          if( macro.argv.includes( key ) )
            TRACKABLE_ATTRS[ key ] = value
        }
          
        /**
         * VERY IMPORTANT: Cancel out invalid argv variables 
         * by `false`. It help assigning `undefined` values
         * to element's attribute that are considered `true`
         * as set.
         * 
         * Eg. <div active=undefined></div> is same as <div active></div>
         * which is considered as <div active=true></div>
         * 
         * REVIEW well before during maintenance
         */
        macro.argv.forEach( each => {
          if( argvalues[ each ] !== undefined ) return

          argvalues[ each ] = {
            value: false, // REVIEW the `false` value assignment later.
            type: 'let'
          }
        })
      })

      /**
       * Return all possible arguments into single object 
       * var that can be accessible in macro template 
       * beside the spreading vars effect.
       * 
       * Useful for cases where many `argv` are passed
       * to the macro but there a need to handle all in
       * a single variable.
       */
      if( macro.argv.includes('__') )
        argvalues['__'] = {
          value: allvalues,
          type: 'const'
        }

      /**
       * - $fragment
       * - macroPath
       * - template.declaration?
       */
      const
      setup: MeshWireSetup = {
        $node: macro.$node,
        meshPath: null,
        fragmentPath: macroPath,
        fragmentBoundaries: boundaries,
        getFragment(){ return $fragment },
        setFragment( $newFragment ){ $fragment = $newFragment },
        argv: macro.argv,
        scope,
        useAttributes: true
      },
      macrowire = self.__meshwire__( setup, TRACKABLE_ATTRS ),
      $log = macrowire.renderer.mesh( argvalues )

      $fragment = $fragment.add( $log )
      
      /**
       * Setup input dependency track
       */
      TRACKABLE_ATTRS && Object
      .entries( TRACKABLE_ATTRS )
      .forEach( ([ key, value ]) => {
        let isSyntax = false
        if( new RegExp(`^${SYNCTAX_VAR_FLAG}`).test( key ) ){
          isSyntax = true
          key = key.replace( SYNCTAX_VAR_FLAG, '' )
        }

        if( SPREAD_VAR_PATTERN.test( key ) ){
          const spreadvalues = ( memo: VariableScope ) => {
            const
            extracted: VariableScope = {},
            spreads = self.__evaluate__( key.replace( SPREAD_VAR_PATTERN, '' ) as string, memo )
            if( typeof spreads !== 'object' )
              throw new Error(`Invalid spread operator ${key}`)

            for( const _key in spreads )
              extracted[ _key ] = {
                value: spreads[ _key ],
                type: 'let'
              }

            macrowire.renderer.update( extracted )
          }
          
          if( self.__isReactive__( key as string, scope ) ){
            const deps = self.__extractExpressionDeps__( key as string, scope )

            deps.forEach( dep => self.__trackDep__( dependencies, dep, {
              $fragment: null,
              boundaries,
              path: `${macroPath}.${key}`,
              update: spreadvalues,
              syntax: isSyntax,
              memo: scope,
              batch: true
            }) )
          }
        }
        else {
          const evalue = ( memo: VariableScope ) => {
            macrowire.renderer.update({
              [key]: {
                value: value ? self.__evaluate__( value as string, memo ) : true,
                type: 'let'
              }
            })
          }
          
          if( self.__isReactive__( value as string, scope ) ){
            const deps = self.__extractExpressionDeps__( value as string, scope )
            
            deps.forEach( dep => self.__trackDep__( dependencies, dep, {
              $fragment: null,
              boundaries,
              path: `${macroPath}.${key}`,
              update: evalue,
              syntax: isSyntax,
              memo: scope,
              batch: true
            }) )
          }
        }
      })

      $fragment = $fragment.add( boundaries.end )

      /**
       * BENCHMARK: Tracking total elements rendered
       */
      self.benchmark.inc('elementCount')
      
      return $fragment
    }
    function execElement( $node: Cash ): Cash {
      if( !$node.length || !$node.prop('tagName') ) return $node

      const elementPath = self.__generatePath__('element')

      const
      $fragment = $(`<${$node.prop('tagName').toLowerCase()}/>`),
      $contents = $node.contents()

      // Process contents recursively if they exist
      $contents.length
      && $fragment.append( self.__withPath__( elementPath, () => self.render( $contents, scope, dependencies ).$log ) )

      const { attrs, events } = self.__getAttributes__( $node )
      /**
       * Literal value attributes
       */
      attrs.literals && Object
      .entries( attrs.literals )
      .forEach( ([ attr, value ]) => $fragment.attr( attr, value ) )

      const assignAttrs = ( list: SyntaxAttributes['expressions'], track: boolean = false ) => {
        list && Object
        .entries( list )
        .forEach( ([ attr, value ]) => {
          switch( attr ){
            // Inject inner html into the element
            case 'html': {
              const updateHTML = ( memo: VariableScope ) => {
                $fragment.html( self.__evaluate__( value as string, memo ) )
              }

              updateHTML( scope )

              if( track && self.__isReactive__( value as string, scope ) ){
                const deps = self.__extractExpressionDeps__( value as string, scope )

                deps.forEach( dep => self.__trackDep__( dependencies, dep, {
                  $fragment,
                  path: `${elementPath}.${attr}`,
                  update: updateHTML,
                  memo: scope,
                  batch: true
                }) )
              }
            } break

            // Inject text into the element
            case 'text': {
              const updateText = ( memo: VariableScope ) => {
                let text = self.__evaluate__( value as string, memo )

                // Apply translation
                if( !$node.is('[no-translate]') ){
                  const { text: _text } = self.lips.i18n.translate( text )
                  text = _text
                }

                $fragment.text( text )
              }

              updateText( scope )
              
              if( track && self.__isReactive__( value as string, scope ) ){
                const deps = self.__extractExpressionDeps__( value as string, scope )

                deps.forEach( dep => self.__trackDep__( dependencies, dep, {
                  $fragment,
                  path: `${elementPath}.${attr}`,
                  update: updateText,
                  memo: scope,
                  batch: true
                }) )
              }
            } break

            // Convert object style attribute to string
            case 'style': {
              const updateStyle = ( memo: VariableScope ) => {
                const style = self.__evaluate__( value as string, memo )
                
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

              updateStyle( scope )
              
              if( track && self.__isReactive__( value as string, scope ) ){
                const deps = self.__extractExpressionDeps__( value as string, scope )

                deps.forEach( dep => self.__trackDep__( dependencies, dep, {
                  $fragment,
                  path: `${elementPath}.${attr}`,
                  update: updateStyle,
                  memo: scope,
                  batch: true
                }) )
              }
            } break

            // Inject the evaluation result of any other attributes
            default: {
              const updateAttrs = ( memo: VariableScope ) => {
                const res = value ?
                            self.__evaluate__( value as string, memo )
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

              updateAttrs( scope )
              
              if( track && self.__isReactive__( value as string, scope ) ){
                const deps = self.__extractExpressionDeps__( value as string, scope )

                deps.forEach( dep => self.__trackDep__( dependencies, dep, {
                  $fragment,
                  path: `${elementPath}.${attr}`,
                  update: updateAttrs,
                  memo: scope,
                  batch: true
                }) )
              }
            }
          }
        })
      }
      
      // Check, process & track expression attributes
      attrs.expressions && Object
      .keys( attrs.expressions )
      .forEach( key => {
        if( !SPREAD_VAR_PATTERN.test( key ) ) return

        const updateSpreadAttrs = ( memo: VariableScope ) => {
          const
          extracted: Record<string, any> = {},
          spreads = self.__evaluate__( key.replace( SPREAD_VAR_PATTERN, '' ) as string, memo )
          if( typeof spreads !== 'object' )
            throw new Error(`Invalid spread operator ${key}`)

          for( const _key in spreads )
            extracted[ _key ] = spreads[ _key ]

          assignAttrs( extracted )
        }

        delete attrs.expressions[ key ]
        updateSpreadAttrs( scope )

        if( key && self.__isReactive__( key, scope ) ){
          const deps = self.__extractExpressionDeps__( key, scope )

          deps.forEach( dep => self.__trackDep__( dependencies, dep, {
            $fragment,
            path: `${elementPath}.${key}`,
            update: updateSpreadAttrs,
            memo: scope,
            batch: true
          }) )
        }
      })
      
      assignAttrs( attrs.expressions, true )
      
      // Record attachable events to the element
      events && Object
      .entries( events )
      .forEach( ([ _event, value ]) => {
        attachableEvents.push({
          _event,
          $fragment,
          instruction: value as string,
          scope
        })
      })

      // Track DOM insertion
      self.benchmark.inc('elementCount')
      self.benchmark.inc('domInsertsCount')

      return $fragment
    }
    function execText( $node: Cash ): Cash {
      const
      textPath = self.__generatePath__('element'),
      content = $node.text(),
      // Initial rendering
      $fragment = $(document.createTextNode( self.__interpolate__( content, scope ) ) )

      // Track for update rendering
      if( content && self.__isReactive__( content, scope ) ){
        const
        deps = self.__extractTextDeps__( content, scope ),
        updateTextContent = ( memo?: VariableScope ) => {
          const text = self.__interpolate__( content, memo )
          if( !$fragment[0] ) return
          $fragment[0].textContent = text
        }
        
        deps.forEach( dep => self.__trackDep__( dependencies, dep, {
          path: textPath,
          $fragment,
          update: updateTextContent,
          memo: scope,
          batch: deps.length > 1
        }) )
      }

      // Track DOM insertion
      self.benchmark.inc('elementCount')
      self.benchmark.inc('domInsertsCount')

      return $fragment
    }

    function parse( $node: Cash ){
      if( $node.get(0)?.nodeType === Node.COMMENT_NODE )
        return $node

      if( $node.get(0)?.nodeType === Node.TEXT_NODE )
        return execText( $node )

      // Lips in-build scope variables syntax components
      if( $node.is('let') ) return execLet( $node )
      else if( $node.is('const') ) return execConst( $node )

      // Lips's empty fragment
      else if( $node.is('lips') && $node.is('[fragment]') ) 
        return execEmptyFragment( $node )

      /**
       * Lips's dynamic tags like:
       * 
       * - component
       * - dynamic-tag
       */
      else if( $node.is('lips') && $node.attr(':dtag') )
        return handleDynamic( $node )
      
      /**
       * Convenient `console.log` wired into 
       * template rendering
       */
      else if( $node.is('log') ) return execLog( $node )
      
      /**
       * Identify and render macro components
       * 
       * Note: Always check `tagname` in registered 
       * macros list before in the registered components
       * list.
       */
      else if( self.__macros.has( $node.prop('tagName')?.toLowerCase() ) )
        return execMacro( $node )
      
      /**
       * Lips in-build syntax component
       * or identify and render custom components
       */
      else if( $node.is('if, for, switch, async') || self.lips.has( $node.prop('tagName')?.toLowerCase() ) )
        return execComponent( $node )
      
      /**
       * Ignore <else-if> and <else> tags as node
       * for their should be already process by <if>
       */
      else if( $node.is('else-if, else') ) return
      
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
       * Attach extracted events listeners after
       * component get rendered.
       * 
       * This to avoid loosing binding to attached
       * DOM element's events
       */
      attachableEvents.forEach( ({ $fragment, _event, instruction, scope }) => {
        this.__attachEvent__( $fragment, _event, instruction, scope )
      })

      /**
       * BENCHMARK: Tracking total occurence of recursive rendering
       */
      self.benchmark.inc('renderCount')
    }
    catch( error ){
      console.error('Rendering Failed --', error ) 
      self.benchmark.trackError( error as Error )
    }
    finally {
      this.__renderDepth--
      
      // End benchmark measuring
      this.benchmark.endRender()
      this.benchmark.trackMemory()
      
      // Clear path when main render completes
      if( this.__renderDepth === 0 ){
        this.__path = ''
        this.__pathCounter = 0
      }
    }
    
    return {
      $log: _$,
      dependencies,
      events: attachableEvents
    }
  }
  
  private __meshwire__( setup: MeshWireSetup, TRACKABLE_ATTRS: Record<string, string> ){
    const
    self = this,
    {
      $node,
      meshPath,
      fragmentPath,
      fragmentBoundaries,
      argv,
      scope,
      declaration,
      useAttributes,
      getFragment,
      setFragment
    } = setup

    let
    PARTIAL_CONTENT: Cash | undefined,
    ITERATOR_SCOPE: VariableScope[] | undefined

    const
    PARTIAL_PATHS: string[] = [],
    partialRender = ( $contents: Cash, argvalues?: VariableScope, index?: number ) => {
      // Render the partial
      const
      partialPath = `${fragmentPath}.${meshPath || 'root'}${index !== undefined ? `[${index}]` : ''}`,
      { $log, dependencies, events } = self.render( $contents, { ...scope, ...argvalues } )

      PARTIAL_PATHS.push( partialPath )

      /**
       * Share partial FGU dependenies with main component thread
       * for parallel updates (main & partial) on the meshed node.
       * 
       * 1. From main FGU dependency track
       * 2. From mesh rendering track
       */
      dependencies?.forEach( ( dependents, dep ) => {
        if( !self.__dependencies?.has( dep ) )
          self.__dependencies.set( dep, new Map() )
        
        // Add partial dependency
        dependents.forEach( ( dependent, path ) => {
          dependent.partial?.length
                  ? dependent.partial.push( partialPath )
                  : dependent.partial = [ partialPath ]
                  
          self.__dependencies.get( dep )?.set( path, dependent )
        } )
      } )
      
      self.benchmark.inc('partialCount')

      return $log
    },
    wire: MeshTemplate = {
      renderer: {
        path: meshPath,
        argv,
        mesh( argvalues?: VariableScope, clone: boolean = false ){
          PARTIAL_CONTENT = $node.contents()
          if( !PARTIAL_CONTENT?.length ) return null

          /**
           * 
           */
          if( declaration?.iterator ){
            ITERATOR_SCOPE = argvalues?.['#'].value
            if( !Array.isArray( ITERATOR_SCOPE ) )
              throw new Error('Invalid iterator argvalues')
            
            if( !ITERATOR_SCOPE.length ) return null
            
            /**
             * Render many time subsequent content in of an iterator
             * context using the same partial path to iterate 
             * on a one time rendered $log of the same content.
             */
            let $partialLog = $()
            ITERATOR_SCOPE.forEach( ( values, index ) => {
              if( !PARTIAL_CONTENT?.length ) return null
              $partialLog = $partialLog.add( partialRender( PARTIAL_CONTENT, values, index ) )
            } )

            return $partialLog
          }
          else return partialRender( PARTIAL_CONTENT, argvalues )
        },
        update( argvalues: VariableScope, boundaries?: FragmentBoundaries ){
          if( !PARTIAL_PATHS.length ) return
          
          boundaries = boundaries || fragmentBoundaries

          /**
           * Re-render iterator nodes
           */
          if( declaration?.iterator
              && Array.isArray( ITERATOR_SCOPE )
              && Array.isArray( argvalues?.['#'].value )
              && ITERATOR_SCOPE.length !== argvalues?.['#'].value.length ){
            if( !PARTIAL_CONTENT?.length ) return

            ITERATOR_SCOPE = argvalues?.['#'].value
            if( !Array.isArray( ITERATOR_SCOPE ) )
              throw new Error('Invalid iterator argvalues')
            
            let $partialLog = $()
            if( ITERATOR_SCOPE.length ){
              // Clear existing partial mesh deps
              self.__dependencies.forEach( ( dependents, dep ) => {
                dependents.forEach( ( dependent ) => {
                  // Process only dependents of this partial
                  dependent.partial 
                  && PARTIAL_PATHS.find( p => dependent.partial?.find( pp => p == pp ) )
                  && dependents.delete( dependent.path )
                })

                !dependents.size && self.__dependencies.delete( dep )
              })

              // if( ITERATOR_SCOPE.length < argvalues?.['#'].value.length ){
              //   // TODO: Iterate more nodes
              //   console.log('----- add more nodes')

              // }
              // else {
              //   // TODO: Cleanup nodes && dependencies
              //   console.log('----- remove nodes')
              // }

              ITERATOR_SCOPE.forEach( ( values, index ) => {
                if( !PARTIAL_CONTENT?.length ) return null
                $partialLog = $partialLog.add( partialRender( PARTIAL_CONTENT, values, index ) )
              } )
            }

            // If we have boundary markers and they're in the DOM
            if( !document.contains( boundaries.start ) || !document.contains( boundaries.end ) )
              throw new Error('Partial mesh boundaries missing')
          
            // Collect all nodes between markers to remove
            const nodesToRemove = []
            let currentNode = boundaries.start.nextSibling
            
            while( currentNode && currentNode !== boundaries.end ){
              nodesToRemove.push( currentNode )
              currentNode = currentNode.nextSibling
            }
            
            // Remove existing content
            $(nodesToRemove).remove()
            // Insert new content between markers
            $partialLog && $(boundaries.start).after( $partialLog )
          }

          // Update dependencies
          else {
            // Start measuring
            self.benchmark.startRender()
            
            const batchUpdates = new Set<string>()
            
            // Execute partial mesh update
            self.__dependencies.forEach( ( dependents, dep ) => {
              dependents.forEach( ( dependent ) => {
                // Process only dependents of this partial
                const partialPath = PARTIAL_PATHS.find( p => dependent.partial?.find( pp => p == pp ) )
                if( !dependent.partial || !partialPath ) return
                
                if( (fragmentBoundaries?.start && !document.contains( fragmentBoundaries.start )) ){
                  console.warn(`${meshPath} -- partial boundaries missing in the DOM`)
                  dependents.delete( dependent.path )
                  return
                }
                
                if( declaration?.iterator ){
                  const
                  [ _, index ] = partialPath.match(/\[(\d+)\]$/) || [],
                  argvaluesByIndex = argvalues?.['#'].value[ Number( index ) ]
                  
                  if( argvaluesByIndex?.[ dep ]
                      && dependent.memo?.[ dep ]
                      && isEqual( dependent.memo[ dep ], argvaluesByIndex[ dep ] ) ) return

                  dependent.memo = { ...scope, ...dependent.memo, ...argvaluesByIndex }
                }
                else {
                  if( dependent.memo?.[ dep ]
                      && argvalues?.[ dep ]
                      && isEqual( dependent.memo[ dep ], argvalues[ dep ] ) ) return

                  dependent.memo = { ...scope, ...dependent.memo, ...argvalues }
                }
                
                if( dependent.batch ) batchUpdates.add( dependent.path )
                else {
                  const sync = dependent.update( dependent.memo, 'mesh-updator' )
                  if( sync ){
                    // Adopt new $fragment
                    typeof sync.$fragment === 'object'
                    && sync.$fragment.length
                    && dependents.set( dependent.path, { ...dependent, $fragment: sync.$fragment } )

                    // Cleanup callback
                    typeof sync.cleanup === 'function' && sync.cleanup()
                  }
                }

                self.benchmark.inc('dependencyUpdateCount')
              })

              /**
               * Clean up if no more dependents
               */
              !dependents.size && self.__dependencies.delete( dep )
            })

            // Execute batch updates
            if( batchUpdates.size ){
              self.benchmark.trackBatch( batchUpdates.size )
              self.UQS.enqueue( self.__dependencies, batchUpdates )
            }

            // Track update
            self.benchmark.inc('partialUpdateCount')
            // Finish measuring
            self.benchmark.endRender()
          }
        }
      }
    }

    /**
     * Allow attributes consumption as input/props.
     */
    if( useAttributes && meshPath ){
      const { attrs } = self.__getAttributes__( $node )
      
      attrs.literals && Object
      .entries( attrs.literals )
      .forEach( ([ key, value ]) => wire[ key ] = value )
      
      attrs.expressions && Object
      .entries( attrs.expressions )
      .forEach( ([ key, value ]) => {
        if( SPREAD_VAR_PATTERN.test( key ) ){
          const
          spreads = self.__evaluate__( key.replace( SPREAD_VAR_PATTERN, '' ) as string, scope )
          if( typeof spreads !== 'object' )
            throw new Error(`Invalid spread operator ${key}`)

          for( const _key in spreads )
            wire[ _key ] = spreads[ _key ]
          
          TRACKABLE_ATTRS[`${declaration?.syntax ? SYNCTAX_VAR_FLAG : ''}${meshPath}.${key}`] = value
        }
        else {
          wire[ key ] = value ? self.__evaluate__( value as string, scope ) : true
          // Record attribute to be tracked as FGU dependency
          TRACKABLE_ATTRS[`${declaration?.syntax ? SYNCTAX_VAR_FLAG : ''}${meshPath}.${key}`] = value
        }
      })
    }

    return wire
  }
  private __createBoundaries__( path: string ): FragmentBoundaries {
    // Track DOM operations for boundary creation
    this.benchmark.inc('domOperations')
    this.benchmark.inc('domInsertsCount')

    return {
      start: document.createComment(`start:${this.prekey}.${path}`),
      end: document.createComment(`end:${this.prekey}.${path}`)
    }
  }
  private __getAttributes__( $node: Cash ){
    const 
    extracted = ($node as any).attrs(),
    events: Record<string, any> = {},
    attrs: SyntaxAttributes = {
      literals: {},
      expressions: {}
    }

    let argv: string[] = []
    
    // Process attributes including spread operator
    extracted && Object
    .entries( extracted )
    .forEach( ([ key, value ]) => {
      if( key == ':dtag' ) return

      if( key.startsWith(':')
          || /^on-/.test( key )
          || SPREAD_VAR_PATTERN.test( key )
          || ARGUMENT_VAR_PATTERN.test( key ) ){
        
        if( ARGUMENT_VAR_PATTERN.test( key ) ){
          const [ _, vars ] = key.match( ARGUMENT_VAR_PATTERN ) || []
          argv = vars.split(',')
        }
        else if( /^on-/.test( key ) )
          events[ key.replace(/^on-/, '') ] = value
        
        else {
          if( key.startsWith(':') )
            key = key.slice( 1, key.length )

          attrs.expressions[ key ] = value || ''
        }
      }
      // Literal value attribute
      else attrs.literals[ key ] = value
    })
    
    return { argv, events, attrs }
  }
  private __generatePath__( type: string ): string {
    const key = (type === 'component' ? 'c' : '')+ this.__pathCounter++

    return this.__path ? `${this.__path}/${key}` : `#${key}`
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
  private __attachEvent__( element: Cash | Component<MT>, _event: string, instruction: string, scope?: VariableScope ){
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

    this.__attachedEvents.push({ element, _event })
    
    // Track DOM operation
    this.benchmark.inc('domUpdatesCount')
    this.benchmark.inc('domRemovalsCount')
  }
  private  __detachEvent__( $element: Cash | Component<MT>, _event: string ){
    $element.off( _event )
    // Track DOM operation
    this.benchmark.inc('domOperations')
    this.benchmark.inc('domRemovalsCount')
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
    const
    /**
     * Metavars pattern
     * 
     * - state.items
     * - input.name
     * - context.action
     */
    MVP = /\b(state|input|context)(?:\.[a-zA-Z_]\w*)+(?=\[|\.|$|\s|;|,|\))/g,
    /**
     * Metacall pattern
     * 
     * - self.getStyle()
     * - self.rule
     */
    MCP = /\b(self)(?:\.[a-zA-Z_]\w*)+(?=\()/g

    let matches = [
      ...Array.from( expr.matchAll( MVP ) ),
      ...Array.from( expr.matchAll( MCP ) )
    ]

    /**
     * Extract scope interpolation expressions
     */
    if( scope && Object.keys( scope ).length ){
      const scopeRegex = new RegExp(`\\b(${Object.keys( scope ).join('|')})`, 'g')
      
      matches = [
        ...matches,
        ...Array.from( expr.matchAll( scopeRegex ) )
      ]
    }
    
    // Filter out duplicate deps
    return [ ...new Set( matches.map( m => m[0] ) ) ]
  }
  private __isReactive__( expr: string, scope?: VariableScope ): boolean {
    // Reactive component variables
    if( /(state|input|context|self)\.[\w.]+/.test( expr ) ) return true
    // Reactive internal scope
    if( scope
        && Object.keys( scope ).length
        && new RegExp( Object.keys( scope ).join('|') ).test( expr ) ) return true

    return false
  }
  private __trackDep__( dependencies: FGUDependencies, dep: string, record: FGUDependency ){
    !dependencies.has( dep ) && dependencies.set( dep, new Map() )
    dependencies.get( dep )?.set( record.path, record )
    
    // Track dependency
    this.benchmark.inc('dependencyTrackCount')
  }

  private __valueDep__( obj: any, path: string[] ): any {
    return path.reduce( ( curr, part ) => curr?.[ part ], obj )
  }
  private __shouldUpdate__( dep_scope: string, parts: string[], current: InteractiveMetavars<MT>, previous: InteractiveMetavars<MT> ): boolean {
    // Allow component's method `self.fn` call evaluation
    if( dep_scope === 'self' ) return true

    // Check metavars changes
    const
    ovalue = this.__valueDep__( previous[ dep_scope as keyof InteractiveMetavars<MT> ], parts ),
    nvalue = this.__valueDep__( current[ dep_scope as keyof InteractiveMetavars<MT> ], parts )

    /**
     * Skip if value hasn't changed
     */
    return !isEqual( ovalue, nvalue )
  }
  private __updateDepNodes__( current: InteractiveMetavars<MT>, previous: InteractiveMetavars<MT> ){
    if( !this.__dependencies?.size ) return

    // Track update
    this.benchmark.inc('componentUpdateCount')
    // Start measuring
    this.benchmark.startRender()
    
    // Temporary batched updates
    const batchUpdates = new Set<string>()
    this.__dependencies.forEach( ( dependents, dep ) => {
      const [ dep_scope, ...parts ] = dep.split('.')

      /**
       * Handle updates for each dependent node/component
       */
      if( !this.__shouldUpdate__( dep_scope, parts, current, previous ) ) return
      
      dependents.forEach( dependent => {
        const { path, batch, $fragment, boundaries, update, memo, syntax } = dependent
        try {
          /**
           * Only clean up non-syntactic dependencies 
           * or node no longer in DOM
           */
          if( !syntax
              && (boundaries?.start && !document.contains( boundaries.start ))
              || ($fragment !== null && !$fragment.closest('body').length) ){
            dependents.delete( path )
            return
          }

          /**
           * For batch updates, collect all updates first
           * and execute batch once.
           */
          if( batch ) batchUpdates.add( path )

          // Immediate update
          else {
            const sync = update( memo, 'main-updator' )
            if( sync ){
              /**
               * Replace $fragment from the dependency root
               * 
               * Required for mesh processing where replaceable
               * $fragment are not reliable after processing it
               * withing the dependency update tracking function.
               */
              typeof sync.$fragment === 'object'
              && sync.$fragment.length
              && dependents.set( path, { ...dependent, $fragment: sync.$fragment } )

              /**
               * Manual cleanup callback function after
               * dependency track adopted new changes.
               * 
               * Useful for DOM cleanup for instance of 
               * complex wired $fragment.
               */
              typeof sync.cleanup === 'function' && sync.cleanup()
            }
          }

          this.benchmark.inc('dependencyUpdateCount')
        }
        catch( error ){
          console.error('failed to update dependency nodes --', error )
          return
        }
      })

      /**
       * Clean up if no more dependents
       */
      !dependents.size && this.__dependencies?.delete( dep )
    })

    /**
     * Execute all batched updates
     */
    if( batchUpdates.size ){
      this.benchmark.trackBatch( batchUpdates.size )
      this.UQS.enqueue( this.__dependencies, batchUpdates )
    }

    // Finish measuring
    this.benchmark.endRender()
  }
  
  destroy(){
    /**
     * Dispose signal effect dependency of this
     * component.
     */
    this.ICE.dispose()
    /**
     * Clean up benchmark resources
     */
    this.benchmark.dispose()
    /**
     * Unregister this component from IUC
     */
    this.lips.IUC.unregister( this.__key__ )
    /**
     * Stop watcher when component's element get 
     * detached from the DOM
     */
    this.lips.watcher.unwatch( this as any )

    /**
     * Detached all events
     */
    this.__attachedEvents.forEach( ({ element, _event }) => this.__detachEvent__( element, _event ) )
    this.__attachedEvents = []

    /**
     * Destroy nexted components as well
     */
    for( const each in this.PCC ){
      const component = this.PCC.get( each )

      component?.destroy()
      component?.delete( each )
    }

    /**
     * Cleanup
     */
    this.$?.remove()
    this.PCC?.clear()
    this.__macros.clear()
    this.__stylesheet?.clear()
    this.__dependencies?.clear()
    this.__batchUpdates?.clear()

    // this.__previous = {}
  }

  appendTo( arg: Cash | string ){
    const $to = typeof arg == 'string' ? $(arg) : arg
    this.$?.length && $to.append( this.$ )

    // Track DOM operation
    this.benchmark.inc('domOperations')

    return this
  }
  prependTo( arg: Cash | string ){
    const $to = typeof arg == 'string' ? $(arg) : arg
    this.$?.length && $to.prepend( this.$ )
    
    // Track DOM operation
    this.benchmark.inc('domOperations')

    return this
  }
  replaceWith( arg: Cash | string ){
    const $with = typeof arg == 'string' ? $(arg) : arg
    this.$?.length && $with.replaceWith( this.$ )
    
    // Track DOM operation
    this.benchmark.inc('domOperations')

    return this
  }
}