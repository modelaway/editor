import type Lips from './lips'
import type { 
  Handler,
  ComponentScope,
  ComponentOptions,
  VariableScope,
  MeshRenderer,
  MeshTemplate,
  RenderedNode,
  FGUDependencies,
  FGUDependency,
  Declaration,
  FragmentBoundaries,
  VirtualEvent,
  VirtualEventRecord
} from '.'

import UQS from './uqs'
import Events from './events'
import $, { Cash } from 'cash-dom'
import Benchmark from './benchmark'
import Stylesheet from '../modules/stylesheet'
import { batch, effect, EffectControl, signal } from './signal'
import { 
  isDiff,
  isEqual,
  deepClone,
  deepAssign,
  preprocessor,
  SPREAD_VAR_PATTERN,
  ARGUMENT_VAR_PATTERN,
  DYNAMIC_TAG_PLACEHOLDER,
  FRAGMENT_TAG_PLACEHOLDER,
  SYNCTAX_VAR_FLAG
} from './utils'

type Metavars<I, S, C> = { 
  state: S,
  input: I,
  context: C
}

export default class Component<Input = void, State = void, Static = void, Context = void> extends Events {
  private template: string
  private declaration: Declaration
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
  private __dependencies: FGUDependencies = new Map() // Initial FGU dependencies
  private __attachedEvents: VirtualEventRecord<Component<Input, State, Static, Context>>[] = []

  // Preserved Child Components
  private PCC: Map<string, Component> = new Map()

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

  // Update Queue System for high-frequency DOM updates
  private UQS: UQS

  // Internal Update Clock (IUC)
  private IUC: NodeJS.Timeout
  private IUC_BEAT = 5 // ms
  private ICE: EffectControl // Internal Component Effect

  public lips?: Lips
  private benchmark: Benchmark

  private __path = ''
  private __pathCounter = 0
  private __renderDepth = 0

  /**
   * Allow methods of `handler` to be dynamically
   * added to `this` component object.
   */
  ;[key: string]: any

  constructor( name: string, template: string, { input, state, context, _static, handler, stylesheet, macros, declaration }: ComponentScope<Input, State, Static, Context>, options?: ComponentOptions ){
    super()
    this.template = preprocessor( template )
    
    if( options?.lips ) this.lips = options.lips    
    if( options?.debug ) this.debug = options.debug
    if( options?.prekey ) this.prekey = options.prekey

    this.__name__ = name

    this.macros = macros || {}
    this.declaration = declaration || { name }

    this.input = input || {} as Input
    this.state = state || {} as State
    this.static = _static || {} as Static
    this.context = {} as Context
    
    handler && this.setHandler( handler )
    stylesheet && this.setStylesheet( stylesheet )

    /**
     * 
     */
    this.UQS = new UQS

    /**
     * Track rendering cycle metrics to evaluate
     * performance.
     * 
     */
    this.benchmark = new Benchmark( this.debug )
    
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
     * Initialize previous metavars to initial metavars
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
    [ getInput, setInput ] = signal<Input>( this.input ),
    [ getState, setState ] = signal<State>( this.state ),
    [ getContext, setContext ] = signal<Context>( this.context )

    this._setInput = setInput
    this._setState = setState
    this._getState = getState

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
       * Initial render - parse template and establish 
       * dependencies
       */
      if( !this.isRendered ){
        const { $log } = this.render( undefined, undefined, this.__dependencies )
        this.$ = $log
        
        // Assign CSS relationship attribute
        this.$?.attr('rel', this.__name__ )
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
        this.lips?.watcher?.watch( this as any )
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

        this.state = state
        this.input = input
        this.context = context
      }

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
    return this
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
    const
    dependencies: FGUDependencies = sharedDeps || new Map(),
    attachableEvents: VirtualEvent[] = []

    if( $nodes && !$nodes.length ){
      console.warn('Undefined node element to render')
      return { $log: $nodes, dependencies }
    }

    const self = this
    
    /**
     * Initialize an empty cash object to 
     * act like a DocumentFragment
     */
    let _$ = $()

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
          attachableEvents.push({
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
        const { $log } = self.render( $macroCached, scope, dependencies )
        $fragment = $fragment.add( $log )
      }
      
      else {
        const
        $macro = $( preprocessor( self.macros[ name ] ) ),
        { $log } = self.render( $macro, scope, dependencies )

        $fragment = $fragment.add( $log )

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
      return arg !== null
              && typeof arg === 'object'
              && typeof arg.mesh === 'function'
              && typeof arg.update === 'function'
    }

    function handleDynamic( $node: Cash ){
      if( !$node.attr('dtag') || $node.prop('tagName') !== 'LIPS' )
        throw new Error('Invalid dynamic tag name')
      
      const
      dtag = $node.attr('dtag') as string,
      result = self.__evaluate__( dtag, scope )

      /**
       * Process dynamic content rendering tag set by:
       * 
       * Syntax `<{input.render}/>`
       * processed to `<lips dtag=input.render></lips>`
       */
      if( isMesh( result ) || result === null )
        return execDynamicElement( $node, dtag, result )

      /**
      * Process dynamic tag set by:
      * 
      * Syntax `<{dynamic-name}/>`
      * processed to `<lips dtag="[dynamic-name]"></lips>`
      */
      else execComponent( $node, result )
    }

    function execLet( $node: Cash ){
      const
      attributes = ($node as any).attrs()
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
      const
      attributes = ($node as any).attrs()
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
    function execEmptyFragment( $node: Cash ){
      const
      elementPath = self.__generatePath__('element'),
      $contents = $node.contents()
      let $fragment = $()

      // Process contents recursively if they exist
      if( $contents.length )
        $fragment = $fragment.add( self.__withPath__( `${elementPath}/content`, () => self.render( $contents, scope, dependencies ).$log ) )

      return $fragment
    }
    function execDynamicElement( $node: Cash, dtag: string, renderer: MeshRenderer | null ){
      let 
      $fragment = $(),
      // Keep track of the latest mesh scope
      argvalues: VariableScope = {},
      activeRenderer = renderer

      const
      { attrs } = self.__getAttributes__( $node ),
      elementPath = self.__generatePath__('element'),
      boundaries = self.__createBoundaries__( elementPath )
      
      if( renderer ){
        attrs && Object
        .entries( attrs )
        .forEach( ([ key, value ]) => {
          /**
           * Only consume declared arguments' value
           */
          if( !renderer.argv.includes( key ) ) return

          argvalues[ key ] = {
            type: 'const',
            value: value ? self.__evaluate__( value, scope ) : true
          }
        })

        const $log = renderer.mesh( argvalues )
        $fragment = $fragment.add( $log && $log.length ? $log : DYNAMIC_TAG_PLACEHOLDER )

        // Add boundaries to the initial fragment when it's added to DOM
        self.once('component:attached', () => {
          if( !$fragment.first()[0]?.isConnected ) return

          $fragment.first().before( boundaries.start )
          $fragment.last().after( boundaries.end )
        })

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
          if( !renderer.argv.includes( key ) ) return

          const partialUpdate = ( memo: VariableScope, by?: string ) => {
            if( !activeRenderer ) return
            
            activeRenderer.update({
              [key]: {
                type: 'const',
                value: value ? self.__evaluate__( value, memo ) : true
              }
            })

            return { $fragment }
          }

          if( self.__isReactive__( value as string, scope ) ){
            const deps = self.__extractExpressionDeps__( value as string, scope )

            deps.forEach( dep => self.__trackDep__( dependencies, dep, {
              $fragment,
              path: `${elementPath}.${key}`,
              update: partialUpdate,
              memo: scope,
              batch: true
            }) )
          }
        } )
      }
      else $fragment = $fragment.add( DYNAMIC_TAG_PLACEHOLDER )
      
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
          
          if( isMesh( newRenderer ) ){
            // Check if boundaries are in DOM
            if( document.contains( boundaries.start ) && document.contains( boundaries.end ) ){
              // Render new content
              const 
              $newContent = newRenderer ? newRenderer.mesh( argvalues ) : $(DYNAMIC_TAG_PLACEHOLDER),
              nodesToRemove = [] // Nodes between boundaries
              let currentNode = boundaries.start.nextSibling
              
              while( currentNode && currentNode !== boundaries.end ){
                nodesToRemove.push( currentNode )
                currentNode = currentNode.nextSibling
              }
              
              // Remove old content and insert new
              $(nodesToRemove).remove()
              $(boundaries.start).after( $newContent )
              
              // Update fragment reference
              $fragment = $newContent
              
              return { $fragment }
            }
            
            // New MeshRenderer object
            else {
              const $newContent = newRenderer.mesh( argvalues )
              if( !$newContent?.length ) return { $fragment }

              // Update fragment reference
              const $first = $fragment.first()
              if( !$first.length ){
                console.warn('missing stagged fragment.')
                return
              }

              $fragment.each( ( _, el ) => { _ > 0 && $(el).remove() })
              $first.after( $newContent ).remove()

              $fragment = $newContent
              
              return {
                $fragment,
                cleanup: () => {}
              }
            }
          }
                
          // Null render
          const $placeholder = $(DYNAMIC_TAG_PLACEHOLDER)
          $fragment.replaceWith( $placeholder )
          $fragment = $placeholder
      
          return { $fragment }
        },
        deps = self.__extractExpressionDeps__( dtag as string, scope )

        deps.forEach( dep => self.__trackDep__( dependencies, dep, {
          $fragment,
          path: elementPath,
          update: updateDynamicElement,
          batch: deps.length > 1,
          memo: scope
        }) )
      }

      return $fragment
    }
    function execComponent( $node: Cash, dynamicName?: string ){
      const name = dynamicName || $node.prop('tagName')?.toLowerCase() as string
      
      if( !name ) throw new Error('Invalid component')
      if( !self.lips ) throw new Error('Nexted component manager is disable')
      if( name === self.__name__ ) throw new Error('Render component within itself is forbidden')

      /**
       * Render the whole component for first time
       */
      const template = self.lips.import( name )
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
      $fragment = $(),
      component = self.PCC.get( __key__ )

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

        template.declaration?.syntax
                  ? TRACKABLE_ATTRS[`${SYNCTAX_VAR_FLAG + key}`] = value
                  : TRACKABLE_ATTRS[ key ] = value
      })

      const meshwire = ( $tagnode: Cash, path: string | null, argv: string[] = [], scope: VariableScope = {}, useAttributes = false ) => {
        let
        partial: { $log: Cash, path: string } | undefined,
        attachedEvents: VirtualEvent[] | undefined,
        wire: MeshTemplate = {
          renderer: {
            path,
            argv,
            // partial: undefined,
            mesh( argvalues?: VariableScope ){
              const $contents = $tagnode.contents()
              if( !$contents.length ) return null

              // Cleanup previous partial's attached events
              if( attachedEvents?.length )
                attachedEvents.forEach( ({ $node, _event }) => self.__detachEvent__( $node, _event ) )
              
              // Render the partial
              const { $log, dependencies, events } = self.render( $contents, { ...scope, ...argvalues } )

              partial = {
                $log,
                path: `${componentPath}.${path || 'root'}`
              }
              attachedEvents = events

              /**
               * Share partial FGU dependenies with main component thread
               * for parallel updates (main & partial) on the meshed node.
               * 
               * 1. From main FGU dependency track
               * 2. From mesh rendering track
               */
              if( !self.__dependencies ) return

              dependencies.forEach( ( dependents, dep ) => {
                if( !self.__dependencies?.has( dep ) )
                  self.__dependencies.set( dep, new Map() )
                
                // Add partial dependency
                dependents.forEach( ( dependent, path ) => self.__dependencies.get( dep )?.set( path, { ...dependent, partial: partial?.path }) )
              } )

              return $log
            },
            update( argvalues?: VariableScope ){
              if( !partial ) return
              
              const batchUpdates = new Set<string>()
              
              // Execute partial mesh update
              self.__dependencies.forEach( ( dependents, dep ) => {
                dependents.forEach( ( dependent ) => {
                  // Process only dependents of this partial
                  if( dependent.partial !== partial?.path ) return
                  
                  if( !$fragment.closest('body').length ){
                    console.warn(`${path} -- partial not found in the DOM`)
                    dependents.delete( dependent.path )
                    return
                  }

                  if( dependent.memo
                      && argvalues
                      && isEqual( dependent.memo[ dep ], argvalues[ dep ]) ) return

                  const newMemo = { ...scope, ...argvalues }
                  dependent.memo = newMemo

                  if( dependent.batch ) batchUpdates.add( dependent.path )
                  else {
                    const sync = dependent.update( newMemo, 'mesh-updator' )
                    if( sync ){
                      // Adopt new $fragment
                      typeof sync.$fragment === 'object'
                      && sync.$fragment.length
                      && dependents.set( dependent.path, { ...dependent, $fragment: sync.$fragment } )

                      // Cleanup callback
                      typeof sync.cleanup === 'function' && sync.cleanup()
                    }
                  }
                })

                /**
                 * Clean up if no more dependents
                 */
                !dependents.size && dependencies.delete( dep )
              })

              // Execute batch updates
              batchUpdates.size && self.UQS.enqueue( self.__dependencies, batchUpdates )
            },
            replaceWith( $newFragment: Cash ){
              if( !$newFragment || !$newFragment.length ) return
              
              // If we have boundary markers and they're in the DOM
              if( document.contains( boundaries.start ) && document.contains( boundaries.end ) ){
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
                $(boundaries.start).after( $newFragment )
                
                // Update fragment reference
                $fragment = $newFragment
                return
              }

              const $first = $fragment.first()
              if( !$first.length ){
                console.warn('missing stagged fragment.')
                return
              }

              $fragment.each( ( _, el ) => { _ > 0 && $(el).remove() })
              $first.after( $newFragment ).remove()

              $fragment = $newFragment
            }
          }
        }

        /**
         * Allow attributes consumption as input/props.
         */
        if( useAttributes && path ){
          const { argv, attrs: segmentAttrs, events } = self.__getAttributes__( $tagnode )
          
          segmentAttrs && Object
          .entries( segmentAttrs )
          .forEach( ([ key, value ]) => {
            if( SPREAD_VAR_PATTERN.test( key ) ){
              const
              spreads = self.__evaluate__( key.replace( SPREAD_VAR_PATTERN, '' ) as string, scope )
              if( typeof spreads !== 'object' )
                throw new Error(`Invalid spread operator ${key}`)

              for( const _key in spreads )
                wire[ _key ] = spreads[ _key ]
              
              TRACKABLE_ATTRS[`${template.declaration?.syntax ? SYNCTAX_VAR_FLAG : ''}${path}.${key}`] = value
            }
            else {
              wire[ key ] = value ? self.__evaluate__( value as string, scope ) : true
              // Record attribute to be tracked as FGU dependency
              TRACKABLE_ATTRS[`${template.declaration?.syntax ? SYNCTAX_VAR_FLAG : ''}${path}.${key}`] = value
            }
          })
        }

        return wire
      }

      /**
       * Also inject component slotted body into inputs
       */
      const $nodeContents = $node.contents()
      if( $nodeContents.length ){
        // Pass in the regular body contents
        input = {
          ...input,
          ...meshwire( $node, null, argv, scope, true )
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
                case 'sibling': {
                  const $siblings = $node.siblings( tagname )
                  if( many ){
                    input[ tagname ] = []
                    $siblings.each(function( index ){
                      input[ tagname ].push( meshwire( $(this), `${tagname}[${index}]`, argv, scope, true ) )
                    })
                  }
                  else if( $node.siblings( tagname ).first().length )
                    input[ tagname ] = meshwire( $node.siblings( tagname ).first(), tagname, argv, scope, true )
                } break

                case 'child': {
                  const $children = $node.children( tagname )
                  if( many ){
                    input[ tagname ] = []
                    $children.each(function( index ){ 
                      input[ tagname ].push( meshwire( $(this), `${tagname}[${index}]`, argv, scope, true ) )
                    })
                  }
                  else if( $node.children( tagname ).first().length )
                    input[ tagname ] = meshwire( $node.children( tagname ).first(), tagname, argv, scope, true )
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
        // Replace the original node with the fragment in the DOM
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
                $fragment,
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
                $fragment,
                path: `${componentPath}.${key}`,
                update: evalue,
                syntax: isSyntax,
                memo: scope,
                batch: true
              }) )
            }
          }
        })
      }

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
                if( self.lips && !$node.is('[no-translate]') ){
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
      
      // Record attachable events to the element
      events && Object
      .entries( events )
      .forEach( ([ _event, value ]) => {
        attachableEvents.push({
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

        const updateSpreadAttrs = ( memo: VariableScope ) => {
          const
          extracted: Record<string, any> = {},
          spreads = self.__evaluate__( key.replace( SPREAD_VAR_PATTERN, '' ) as string, memo )
          if( typeof spreads !== 'object' )
            throw new Error(`Invalid spread operator ${key}`)

          for( const _key in spreads )
            extracted[ _key ] = spreads[ _key ]

          processAttrs( extracted )
        }

        delete attrs[ key ]
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
      
      processAttrs( attrs, true )
      
      /**
       * BENCHMARK: Tracking total elements rendered
       */
      self.benchmark.inc('elementCount')
        
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

      return $fragment
    }
    function execLog( $node: Cash ){
      const args = $node.attr('args')
      if( !args ) return

      self.__evaluate__(`console.log(${args})`, scope )
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
      else if( $node.is('lips') && $node.is('[dtag]') )
        return handleDynamic( $node )
      
      /**
       * Convenient `console.log` wired into 
       * template rendering
       */
      else if( $node.is('log') ) return execLog( $node )
      
      // Identify and render macro components
      else if( $node.prop('tagName')?.toLowerCase() in self.macros )
        return execMacro( $node )
      
      /**
       * Lips in-build syntax component
       * or identify and render custom components
       */
      else if( $node.is('if, for, switch, async') || self.lips && self.lips.has( $node.prop('tagName')?.toLowerCase() ) )
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
      attachableEvents.forEach( ({ $node, _event, instruction, scope }) => {
        $node.off( _event )
        && this.__attachEvent__( $node, _event, instruction, scope )
      })

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
    
    return { 
      $log: _$,
      dependencies,
      events: attachableEvents
    }
  }
  /**
   * Rerender component using the original content 
   * of the component to during rerendering
   */
  rerender(){
    if( !this.template )
      throw new Error('Component template is empty')

    /**
     * Reinitialize NCC (Nexted Component Count) 
     * before any rendering
     */
    this.NCC = 0
    this.__attachedEvents = []
    
    const { $log: $clone } = this.render()
    
    this.$?.replaceWith( $clone )
    this.$ = $clone

    // Reassign CSS relationship attribute
    this.$?.attr('rel', this.__name__ )
  }

  private __createBoundaries__( path: string ): FragmentBoundaries {
    return {
      start: document.createComment(`start:${path}`),
      end: document.createComment(`end:${path}`)
    }
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
      if( key == 'dtag' ) return 

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

    this.__attachedEvents.push({ element, _event })
  }
  private  __detachEvent__( $element: Cash | Component, _event: string ){
    $element.off( _event )
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
  }

  private __valueDep__( obj: any, path: string[] ): any {
    return path.reduce( ( curr, part ) => curr?.[ part ], obj )
  }
  private __shouldUpdate__( dep_scope: string, parts: string[], current: Metavars<Input, State, Context>, previous?: Metavars<Input, State, Context> ): boolean {
    // Allow component's method `self.fn` call evaluation
    if( dep_scope === 'self' ) return true

    // Check metavars changes
    const
    ovalue = previous && this.__valueDep__( previous[ dep_scope as keyof Metavars<Input, State, Context>  ], parts ),
    nvalue = this.__valueDep__( current[ dep_scope as keyof Metavars<Input, State, Context> ], parts )

    /**
     * Skip if value hasn't changed
     */
    return !isEqual( ovalue, nvalue )
  }
  private __updateDepNodes__( current: Metavars<Input, State, Context>, previous?: Metavars<Input, State, Context> ){
    if( !this.__dependencies?.size ) return

    // Temporary batched updates
    const batchUpdates = new Set<string>()

    this.__dependencies.forEach( ( dependents, dep ) => {
      const [ dep_scope, ...parts ] = dep.split('.')

      /**
       * Handle updates for each dependent node/component
       */
      if( !this.__shouldUpdate__( dep_scope, parts, current, previous ) ) return
      
      dependents.forEach( dependent => {
        const { path, batch, $fragment, update, memo, syntax } = dependent
        try {
          /**
           * Only clean up non-syntactic dependencies 
           * or node no longer in DOM
           */
          if( !syntax && !$fragment.closest('body').length ){
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
    batchUpdates.size && this.UQS.enqueue( this.__dependencies, batchUpdates )
  }
  
  destroy(){
    /**
     * Dispose signal effect dependency of this
     * component.
     */
    this.ICE.dispose()
    /**
     * Stop watcher when component's element get 
     * detached from the DOM
     */
    this.lips?.watcher?.unwatch( this as any )

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

    this.__previous = undefined

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