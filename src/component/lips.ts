import type { 
  TObject,
  LipsConfig,
  Template,
  EventListener,
  Handler,
  ComponentScope,
  ComponentOptions
} from '.'

import $ from 'jquery'
import I18N from './i18n'
import Benchmark from './benchmark'
import Stylesheet from './stylesheet'
import { deepAssign } from '../modules/utils'
import { isEquals, uniqueObject } from './utils'
import { effect, signal } from './signal'

import * as Router from './router'

function wrap( arg: string ): JQuery<any> {
  return $('<wrap/>').html( arg ).contents()
}

$.fn.extend({
  attrs: function(){
    const 
    obj: any = {},
    elem = (this as any)[0]

    elem && $.each( elem.attributes, function(){ obj[ this.name ] = this.value })

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
  async import( pathname: string ): Promise<Template>{
    // Fetch from registered component
    if( this.has( pathname ) ){
      if( !this.store[ pathname ].default )
        throw new Error(`Invalid <${pathname}> component`)
      
      return this.store[ pathname ]
    }
    
    /**
     * Import component directly from a file
     */
    try {
      const template = await import( pathname ) as Template
      if( !template?.default )
        throw null

      this.register( pathname, template )
      return template
    }
    catch( error ){ throw new Error(`No <${pathname}> component found`) }
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
  private $: JQuery
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
  private __attachableEvents: { $el: JQuery, _event: string, instruction: string }[] = []

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

  private let: TObject<any> = {}
  private async: TObject<any> = {}
  private for?: {
    index: number
    key?: string
    each?: any
  }

  public lips?: Lips
  private benchmark: Benchmark

  /**
   * Allow methods of `handler` to be dynamically
   * added to `this` component object.
   */
  [key: string]: any

  constructor( name: string, template: string, { input, state, context, _static, handler, stylesheet }: ComponentScope<Input, State, Static, Context>, options?: ComponentOptions ){
    this.template = template
    this.$ = $(this.template)

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
    && this.onInput.bind(this)()

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

        this.render()
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

    /**
     * Component's state `update` event broadcast
     */
    this.emit('update')
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
    && this.onInput.bind(this)()
  }
  /**
   * Inject grain/partial input to current component 
   * instead of sending a whole updated input
   */
  subInput( data: TObject<any> ){
    if( typeof data !== 'object' ) 
      return this.getEl()
    
    this.setInput( deepAssign( this.input as TObject<any>, data ) )
  }
  setHandler( list: Handler<Input, State, Static, Context> ){
    Object
    .entries( list )
    .map( ([ method, fn ]) => this[ method ] = fn.bind(this) )
  }

  getEl(){
    if( !this.$ )
      throw new Error('Component is not rendered')

    return this.$
  }
  find( selector: string ){
    return this.$.find( selector )
  }

  render( $component?: JQuery ){
    const self = this
    let
    _$: JQuery,
    asRoot = true

    if( $component ){
      if( !$component.length )
        throw new Error('Undefined component element to render')

      _$ = $component 
      asRoot = false
    }
    else _$ = this.$

    function showContent( $el: JQuery, html?: string ){
      const nextedHtml = html || $el.html()

      $el.empty()
          .html( self.render( wrap( nextedHtml ) ) as any )
          .show()
    }

    function execLet( $let: JQuery ){
      try {
        const attributes = ($let as any).attrs()
        if( !attributes ) return 
        
        Object
        .entries( attributes )
        .forEach( ([ key, assign ]) => {
          if( !assign ) return
          self.let[ key ] = self.__evaluate__( assign as string )
        } )

        $let.remove()
      }
      catch( error ){
        // TODO: Transfer error to global try - catch component define in the UI
        console.warn('Error - ', error )
      }
        
      /**
       * BENCHMARK: Tracking total elements rendered
       */
      self.benchmark.inc('elementCount')

      return $let
    }

    function execLoop( $loop: JQuery ){
      try {
        const
        _from = $loop.attr('from') ? Number( $loop.attr('from') ) : undefined,
        _to = $loop.attr('to') ? Number( $loop.attr('to') ) : undefined,
        _in = self.__evaluate__( $loop.attr('in') as string ),
        nextedHtml = $loop.html(),
        $items = []
        
        if( _from !== undefined ){
          if( _to == undefined )
            throw new Error('Expected <from> <to> attributes of the for loop to be defined')

          $loop.empty()
          for( let x = _from; x < _to; x++ ){
            self.for = { index: x }
            
            $items.push( self.render( wrap( nextedHtml ) ) )
            // $loop.append( self.render( wrap( nextedHtml ) ) )
          }
        }

        else if( Array.isArray( _in ) ){
          $loop.empty()

          let index = 0
          for( const each of _in ){
            self.for = { index, each }
            $items.push( self.render( wrap( nextedHtml ) ) )

            index++
          }
        }

        else if( typeof _in == 'object' ){
          $loop.empty()

          let index = 0
          for( const key in _in ){
            self.for = {
              index,
              key,
              each: _in[ key ]
            }
            $items.push( self.render( wrap( nextedHtml ) ) )

            index++
          }
        }
        
        $loop.append( $items )
      }
      catch( error ){
        // TODO: Transfer error to global try - catch component define in the UI
        console.warn('Error - ', error )
      }
        
      /**
       * BENCHMARK: Tracking total elements rendered
       */
      self.benchmark.inc('elementCount')

      return $loop
    }

    function execSwitch( $switch: JQuery ){
      try {
        const by = $switch.attr('by')
        if( !by )
          throw new Error('Undefined switch <by> attribute')
        
        const
        _by = self.__evaluate__( by ),
        $cases = $switch.find('case'),
        $default = $switch.find('default')

        $switch.empty()

        let 
        validCases: string[] = [],
        $validCase: JQuery | null = null
        
        $cases.each(function(){
          const 
          $case = $(this),
          options = $case.attr('is')

          if( !options )
            throw new Error('Undefined switch case <is> attribute')
        
          const _options = options.split(',')
          
          // Validate string or array case value
          if( Array.isArray( _options ) && _options.includes( _by ) ){
            validCases = [...(new Set([ ...validCases, ..._options ]) )]

            $validCase = self.render( $case.contents() as JQuery )
          }
        })

        if( $default.length && !validCases.includes( _by ) )
          $validCase = self.render( $default.contents() as JQuery )
        
        $validCase?.length
        && $switch.append( $validCase )
      }
      catch( error ){
        // TODO: Transfer error to global try - catch component define in the UI
        console.warn('Error - ', error )
      }
        
      /**
       * BENCHMARK: Tracking total elements rendered
       */
      self.benchmark.inc('elementCount')

      return $switch
    }

    function execCondition( $cond: JQuery, elseFlag = false ){
      try {
        let res: boolean
        /**
         * Nothing to evaluate for `else` statement
         */
        if( elseFlag ) res = elseFlag

        /**
         * Evaluate `if/else-if` statements
         */
        else {
          const by = $cond.attr('by')
          if( !by )
            throw new Error('Undefined if/else-if <by> attribute')

          $cond.is('if') && $cond.nextAll('else-if, else').hide()
          res = self.__evaluate__( by ) as boolean
        }

        if( res ) showContent( $cond )
        else {
          $cond.hide()
          
          if( $cond.next('else-if').length ) return execCondition( $cond.next('else-if') )
          else if( $cond.next('else').length ) return execCondition( $cond.next('else'), true )
        }

        return res
      }
      catch( error ){
        // TODO: Transfer error to global try - catch component define in the UI
        console.warn('Error - ', error )
      }
        
      /**
       * BENCHMARK: Tracking total elements rendered
       */
      self.benchmark.inc('elementCount')
    }

    function execAsync( $async: JQuery ){
      try {
        const attr = $async.attr('await') as string
        if( !attr )
          throw new Error('Undefined async <await> attribute')

        const
        $preload = $async.find('preload'),
        preloadHtml = $preload.html()

        $preload.empty()

        const
        $resolve = $async.find('resolve'),
        resolvedHtml = $resolve.hide().html()
        
        $resolve.empty()

        const
        $catch = $async.find('catch'),
        catchHtml = $catch.hide().html()
        
        $catch.empty()
        
        const
        [ fn, ...args ] = attr.split(/\s*,\s*/),
        _await = (self[ fn ] || self.__evaluate__( fn )).bind(self) as any
        
        if( typeof _await !== 'function' )
          throw new Error(`Undefined <${fn}> handler method`)

        const _args = args.map( each => (self.__evaluate__( each )) )

        /**
         * Render preload content
         */
        $preload.length && showContent( $preload, preloadHtml )

        _await( ..._args )
        .then( ( response: any ) => {
          self.async.response = response
          
          /**
           * Render response content
           */
          if( $resolve.length ){
            const $res = self.render( $(resolvedHtml) as JQuery )

            $async.replaceWith( $res )
            $async = $res
          }
        })
        .catch( ( error: unknown ) => {
          self.async.error = error
          
          /**
           * Render error catch content
           */
          $catch.length
          && $async.replaceWith( self.render( $(catchHtml) as JQuery ) )
        })
      }
      catch( error ){
        // TODO: Transfer error to global try - catch component define in the UI
        console.warn('Error - ', error )
      }
        
      /**
       * BENCHMARK: Tracking total elements rendered
       */
      self.benchmark.inc('elementCount')

      return $async
    }

    function execElement( $el: JQuery ){
      // Process attributes
      const attributes = ($el as any).attrs()
      
      attributes && Object
      .entries( attributes )
      .forEach( ([ attr, value ]) => {
        // Record attachable events to the element
        if( /^on-/.test( attr ) ){
          self.__attachableEvents.push({
            $el,
            _event: attr.replace(/^on-/, ''),
            instruction: value as string
          })

          return
        }

        switch( attr ){
          // Inject inner html into the element
          case 'html': $el.html( self.__evaluate__( value as string ) ); break

          // Inject text into the element
          case 'text': {
            let text = self.__evaluate__( value as string )

            // Apply translation
            if( self.lips && !$el.is('[no-translate]') ){
              const { text: _text } = self.lips.i18n.translate( text )
              text = _text
            }

            $el.text( text )
          } break

          // Convert object style attribute to string
          case 'style': {
            const style = self.__evaluate__( value as string )
            
            // Defined in object format
            if( typeof style === 'object' ){
              let str = ''

              Object
              .entries( style )
              .forEach( ([ k, v ]) => str += `${k}:${v};` )
              
              str.length && $el.attr('style', str )
            }
            // Defined in string format
            else $el.attr('style', style )
          } break

          // Inject the evaulation result of any other attributes
          default: {
            const res = value ?
                          self.__evaluate__( value as string )
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
            res != '?' ?
                $el.attr( attr, res )
                : $el.removeAttr( attr )
          }
        }
      })

      if( $el.get(0)?.nodeType !== Node.TEXT_NODE ){
        if( !asRoot  ){
          const $nexted = $el.contents()
          
          $nexted.length
          && $el.has(':not([key])')
          && $el.html( self.render( $nexted as any ) as any )
        }
          
        /**
         * BENCHMARK: Tracking total elements rendered
         */
        self.benchmark.inc('elementCount')
      }

      // Apply translation to component's text contents
      self.lips?.i18n.propagate( $el )

      return $el
    }

    async function execComponent( $component: JQuery ){
      try {
        const name = $component.prop('tagName')?.toLowerCase() as string
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
        attrs = ($component as any).attrs(),
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
                          self.__evaluate__( value as string )
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
        } )

        /**
         * Also inject component body into inputs
         * as `__innerHtml`
         */
        const
        nextedHtml = $component.html()
        if( nextedHtml ){
          const $el = self.render( wrap( nextedHtml ) )
          input.__innerHtml = $el.html() || $el.text()
        }
        
        /**
         * Update previously rendered component by
         * injecting updated inputs
         */
        if( self.__components[ __key__ ] ){
          $component
          .empty()
          .attr('rel', name )
          .append( self.__components[ __key__ ].$ )

          self.__components[ __key__ ].setInput( uniqueObject( input ) )

          /**
           * Reattach all events binding after DOM
           * replacement of the entire component.
           */
          self.__components[ __key__ ].attachEvents()
        }
        /**
         * Render the whole component for first time
         */
        else {
          const
          { state, _static, handler, context, default: _default, stylesheet } = await self.lips.import( name ),
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

          /**
           * Specify component relationship with other 
           * resources like `style tags`, `script tags`, 
           * etc, using [rel] attribute
           */
          $component
          .empty()
          .attr('rel', name )
          .append( component.$ )

          // component.$ = $component
          self.__components[ __key__ ] = component

          // Listen to this nexted component's events
          Object
          .entries( events )
          .forEach( ([ _event, instruction ]) => self.__attachEvent__( component, _event, instruction ) )
        }
        
        return $component
      }
      catch( error ){
        // TODO: Transfer error to global try - catch component define in the UI
        console.warn('Error - ', error )
      }
    }

    function react( $el: JQuery ){
      // Render in-build syntax components
      if( $el.is('let') ) return execLet( $el )
      else if( $el.is('for') ) return execLoop( $el )
      else if( $el.is('if') ) return execCondition( $el )
      else if( $el.is('switch') ) return execSwitch( $el )
      else if( $el.is('async') ) return execAsync( $el )
      
      // Identify and render custom components
      else if( self.lips && self.lips.has( $el.prop('tagName')?.toLowerCase() ) )
        return execComponent( $el )

      // Render normal body content
      else return execElement( $el )
    }

    /**
     * IMPORTANT: Register nexted contents before processing
     *            the element.
     */
    const $els = _$.length > 1 ?
                      // Create fake div to wrap contents
                      wrap( _$ as any )
                      /**
                       * Process root element's children or single 
                       * nexted child element.
                       */
                      : asRoot ? _$.children() : _$

    // Process root element
    if( asRoot ){
      react( _$ )
      asRoot = false
    }

    // Process nexted contents
    $els.each( function(){ react( $(this) as JQuery ) } )
    
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

    const $clone = $(this.template)
    this.$.replaceWith( $clone )

    this.$ = $clone
    this.render()
  }

  private __evaluate__( script: string ){
    try {
      // script = script.replace(/\{([^}]*)\}/g, ( _, match ) => ('${'+ match +'}') )

      const fn = new Function(`return ${script}`)
      return fn.bind( this )()
    }
    catch( error ){ return script }
  }
  private __attachEvent__( element: JQuery | Component, _event: string, instruction: string ){
    /**
     * Execute function script directly attach 
     * as the listener.
     * 
     * Eg. 
     *  `on-click="() => console.log('Hello world')"`
     *  `on-change="e => this.onChange(e)"`
     */
    if( /(\s*\w+|\s*\([^)]*\)|\s*)\s*=>\s*(\s*\{[^}]*\}|\s*[^\n;"]+)/g.test( instruction ) )
      element.on( _event, this.__evaluate__( instruction ) )

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
      const [ fn, ...args ] = instruction.split(/\s*,\s*/)
      if( typeof this[ fn ] !== 'function' ) return
        // throw new Error(`Undefined <${fn}> ${_event} event method`)

      element.on( _event, ( ...params: any[] ) => {
        const _fn = this[ fn ].bind(this)
        let _args = args.map( each => (this.__evaluate__( each )) )

        if( params.length )
          _args = [ ..._args, ...params ]

        _fn( ..._args )
      })
    }
  }
  private __detachEvent__( element: JQuery | Component, _event: string ){
    element.off( _event )
  }

  attachEvents(){
    this.__attachableEvents.forEach( ({ $el, _event, instruction }) => {
      $el.attr(`on-${_event}`)
      && $el.off( _event )
      && this.__attachEvent__( $el, _event, instruction )
    } )

    /**
     * Also propagate to nexted component
     */
    Object
    .values( this.__components )
    .forEach( component => component.attachEvents() )
  }
  detachEvents(){
    this.__attachableEvents.forEach( ({ $el, _event }) => this.__detachEvent__( $el, _event ) )

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

    this.$.off().remove()
    this.__stylesheet?.clear()

    // Turn off IUC
    clearInterval( this.IUC )
  }

  appendTo( selector: string ){
    $(selector).append( this.$ )
  }
  prependTo( selector: string ){
    $(selector).prepend( this.$ )
  }
  replaceWith( selector: string ){
    $(selector).replaceWith( this.$ )
  }

  on( _event: string, fn: EventListener ){
    if( !Array.isArray( this.__events[ _event ] ) )
      this.__events[ _event ] = []

    this.__events[ _event ].push( fn )
  }
  once( _event: string, fn: EventListener ){
    if( !Array.isArray( this.__once_events[ _event ] ) )
      this.__once_events[ _event ] = []

    this.__once_events[ _event ].push( fn )
  }
  off( _event: string ){
    delete this.__events[ _event ]
  }
  emit( _event: string, ...params: any[] ){
    this.__events[ _event ]?.forEach( fn => fn( ...params ) )

    // Once listeners
    this.__once_events[ _event ]?.forEach( fn => fn( ...params ) )
    delete this.__once_events[ _event ]
  }
}