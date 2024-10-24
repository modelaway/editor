
import $ from 'jquery'
import I18N from './i18n'
import { deepAssign } from './utils'
import { effect, signal } from './reactive'

$.fn.extend({
  attrs: function(){
    const 
    obj: any = {},
    elem = (this as any)[0]

    elem && $.each( elem.attributes, function(){ obj[ this.name ] = this.value })

    return obj
  }
})

export type Handler = ObjectType<( ...args: any[] ) => any>

function wrap( html: string ): any {
  return $('<div/>').html( html ).contents()
}
function isEquals( aObject: ObjectType<any>, bObject: ObjectType<any> ){
  const
  aKeys = Object.keys( aObject ).sort(),
  bKeys = Object.keys( bObject ).sort()

  if( aKeys.length !== bKeys.length ) return false //not the same nr of keys
  if( aKeys.join('') !== bKeys.join('') ) return false //different keys

  for( let x = 0; x < aKeys.length; ++x ){
    // Array object
    if( aObject[ aKeys[x] ] instanceof Array ){
      if( !( bObject[ aKeys[x] ] instanceof Array ) ) return false
      if( !isEquals( aObject[ aKeys[x] ], bObject[ aKeys[x] ] ) ) return false
    }

    // Date object
    else if( aObject[ aKeys[x] ] instanceof Date ){
      if( !( bObject[ aKeys[x] ] instanceof Date ) ) return false
      if( String( aObject[ aKeys[x] ] ) !== String( bObject[ aKeys[x] ] ) ) return false
    }

    // Object containing functions
    else if( aObject[ aKeys[x] ] instanceof Function ){
      if( !( bObject[ aKeys[x] ] instanceof Function ) ) return false
      
      // Ignore functions, or check them regardless?
    }

    // Object instance
    else if( aObject[ aKeys[x] ] instanceof Object ){
      if( !( bObject[ aKeys[x] ] instanceof Object ) ) return false

      // Self reference?
      if( aObject[ aKeys[x] ] === aObject ){
        if( bObject[ aKeys[x] ] !== bObject ) return false
      }
      // WARNING: Doesn't deal with circular refs other than ^^
      else if( !isEquals( aObject[ aKeys[x] ], bObject[ aKeys[x] ] ) ) return false
    }
    // Change !== to != for loose comparison: not the same value
    else if( aObject[ aKeys[x] ] !== bObject[ aKeys[x] ] ) return false
  }

  return true
}

class Benchmark {
  private debug: boolean
  private initialStats: ObjectType<number> = {
    elementCount: 0,
    renderCount: 0
  }
  public stats: ObjectType<number> = this.reset()

  constructor( debug = false ){
    this.debug = debug
  }
  
  inc( trace: string ){
    if( !this.debug ) return
    this.stats[ trace ]++
  }
  dev( trace: string ){
    if( !this.debug ) return
    this.stats[ trace ]--
  }

  record( trace: string, value: number ){
    if( !this.debug ) return
    this.stats[ trace ] = value
  }

  reset(){
    return this.stats = JSON.parse( JSON.stringify( this.initialStats ) )
  }

  log(){
    this.debug && console.table( this.stats )
  }
}

export default class Component<Input = void, State = void, Static = void> {
  public template: string
  public $: JQuery
  private input: Input
  private state: State
  private __state?: State // Partial state
  private static: ObjectType<any>
  private handler: Handler = {}

  private isRendered = false

  private _setInput: ( input: Input ) => void

  private _setState: ( state: State ) => void
  private _getState: () => State | undefined

  private IUC: NodeJS.Timeout
  private IUC_BEAT = 5 // ms

  private let: ObjectType<any> = {}
  private async: ObjectType<any> = {}
  private for?: {
    index: number
    key?: string
    each?: any
  }

  private benchmark: Benchmark

  /**
   * Initialize history manager
   */
  private i18n = new I18N()

  constructor( template: string, { input, state, _static, _handler }: { input?: Input, state?: State, _static?: ObjectType<any>, _handler?: Handler }, debug = false ){
    this.template = template
    this.$ = $(template)
    
    this.input = input || {} as Input
    this.state = state || {} as State
    this.static = _static || {}
    this.benchmark = new Benchmark( debug )

    _handler && this.setHandler( _handler )

    const
    [ getInput, setInput ] = signal<Input>( this.input ),
    [ getState, setState ] = signal<State>( this.state )

    this._setInput = setInput
    this._setState = setState
    this._getState = getState

    effect( () => {
      this.input = getInput()
      this.state = getState()

      // Reset the benchmark
      this.benchmark.reset()

      /**
       * Hold state value since last signal update.
       * 
       * IMPORTANT: Required to check changes on the state
       *            during IUC processes.
       */
      this.__state = JSON.parse( JSON.stringify( this.state ) )
      
      /**
       * Use original content of the component to
       * during rerendering
       */
      if( this.isRendered ){
        if( !template )
          throw new Error('Component template is empty')

        const $clone = $(template)
        this.$.replaceWith( $clone )

        this.$ = $clone
      }
      
      /**
       * Render/Rerender component
       */
      this.render()

      /**
       * Log benchmark table
       * 
       * NOTE: Only show in debugging mode
       */
      this.benchmark.log()
      
      /**
       * Triggered after component get mounted for
       * the first time.
       */
      !this.isRendered
      && typeof this.handler.onMount == 'function'
      && this.handler.onMount()

      /**
       * Flag to know when element is initially or force
       * to render.
       */
      this.isRendered = true
      
      /**
       * Triggered anytime component gets rendered
       */
      typeof this.handler.onRender == 'function'
      && this.handler.onRender()
    })

    this.IUC = setInterval( () => {
      /**
       * Apply update only when a new change 
       * occured on the state.
       */
      if( isEquals( this.__state as ObjectType<any>, this.state as ObjectType<any> ) )
        return
      
      // Merge with initial/active state.
      this.setState( this.state )
    }, this.IUC_BEAT )
  }

  getState( key: string ){
    const state = this._getState() as ObjectType<any>
    
    return state && typeof state == 'object' && state[ key ]
  }
  setState( data: any ){
    const state = this._getState() as ObjectType<keyof State>

    this._setState({ ...state, ...data })
    
    /**
     * Triggered anytime component state gets updated
     */
    typeof this.handler.onUpdate == 'function'
    && this.handler.onUpdate()
  }
  setInput( input: Input ){
    /**
     * Apply update only when new input is different 
     * from the incoming input
     */
    if( isEquals( this.input as ObjectType<any>, input as ObjectType<any> ) )
      return
    
    // Merge with initial/active input.
    this._setInput({ ...this.input, ...input })
    
    /**
     * Triggered anytime component recieve new input
     */
    typeof this.handler.onInput == 'function'
    && this.handler.onInput()
  }
  /**
   * Inject grain/partial input to current component 
   * instead of sending a whole updated input
   */
  subInput( data: ObjectType<any> ){
    if( typeof data !== 'object' ) 
      return this.getEl()
    
    this.setInput( deepAssign( this.input as ObjectType<any>, data ) )
  }
  setHandler( list: Handler ){
    Object
    .entries( list )
    .map( ([ method, fn ]) => this.handler[ method ] = fn.bind(this) )
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

    function evaluate( script: string ){
      try {
        const fn = new Function(`return ${script}`)
        return fn.bind( self )()
      }
      catch( error ){ return script }
    }
    
    function attachEvent( $el: JQuery, _event: string ){
      const instruction = $el.attr(`on-${_event}`) as string

      /**
       * Execute function script directly attach 
       * as the listener.
       * 
       * Eg. 
       *  `on-click="() => console.log('Hello world')"`
       *  `on-change="e => this.handler.onChange(e)"`
       */
      if( /(\s*\w+|\s*\([^)]*\)|\s*)\s*=>\s*(\s*\{[^}]*\}|\s*[^\n;"]+)/g.test( instruction ) )
        $el.on( _event, evaluate( instruction ) )

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
        if( typeof self.handler[ fn ] !== 'function' )
          throw new Error(`Undefined <${fn}> ${_event} event method`)

        $el.on( _event, e => {
          const 
          _fn = self.handler[ fn ],
          _args = args.map( each => (evaluate( each )) )

          _fn( ..._args, e )
        })
      }
    }

    function showContent( $el: JQuery ){
      const nextedHtml = $el.html()

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
          self.let[ key ] = evaluate( assign as string )
        } )
        
        console.log('let attributes:', self.let )
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

    function execLoop( $loop: JQuery ){
      try {
        const
        _from = $loop.attr('from') ? Number( $loop.attr('from') ) : undefined,
        _to = $loop.attr('to') ? Number( $loop.attr('to') ) : undefined,
        _in = evaluate( $loop.attr('in') as string ),
        nextedHtml = $loop.html()
        
        if( _from !== undefined ){
          if( _to == undefined )
            throw new Error('Expected <from> <to> attributes of the for loop to be defined')

          $loop.empty()
          for( let x = _from; x < _to; x++ ){
            self.for = { index: x }
            
            $loop.append( self.render( wrap( nextedHtml ) ) )
          }
        }

        else if( Array.isArray( _in ) ){
          $loop.empty()

          let index = 0
          for( const each of _in ){
            self.for = { index, each }
            $loop.append( self.render( wrap( nextedHtml ) ) )

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
            $loop.append( self.render( wrap( nextedHtml ) ) )

            index++
          }
        }
        
        $loop.show()
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

    function execSwitch( $switch: JQuery ){
      try {
        const by = $switch.attr('by')
        if( !by )
          throw new Error('Undefined switch <by> attribute')
        
        const
        _by = evaluate( by ),
        $cases = $switch.find('case'),
        $default = $switch.find('default').hide()

        let validCases: string[] = []
        
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

            showContent( $case )
          }
          else $case.hide()
        })

        $default.length 
        && !validCases.includes( _by )
        && showContent( $default )
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
          res = evaluate( by ) as boolean
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

        const [ fn, ...args ] = attr.split(/\s*,\s*/)
        if( typeof self.handler[ fn ] !== 'function' )
          throw new Error(`Undefined <${fn}> handler method`)

        const
        $preload = $async.find('preload').hide(),
        $resolve = $async.find('resolve').hide(),
        $catch = $async.find('catch').hide(),

        _await = self.handler[ fn ],
        _args = args.map( each => (evaluate( each )) )

        /**
         * Render preload content
         */
        $preload.length && showContent( $preload )
        
        _await( ..._args )
        .then( ( response: any ) => {
          self.async.response = response
          $preload.hide()
          
          /**
           * Render response content
           */
          $resolve.length && showContent( $resolve )
        })
        .catch( ( error: unknown ) => {
          self.async.error = error
          $preload.hide()
          
          /**
           * Render error catch content
           */
          $catch.length && showContent( $catch )
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
    }

    function execElement( $el: JQuery ){
      // Process attributes
      const attributes = ($el as any).attrs()
      
      attributes && Object
      .keys( attributes )
      .forEach( each => {
        // Attach event to the element
        if( /^on-/.test( each ) ){
          const _event = each.replace(/^on-/, '')

          $el.attr(`on-${_event}`) && attachEvent( $el, _event )
          return
        }

        switch( each ){
          // Inject inner html into the element
          case 'html': $el.html( $el.attr('html') as string ); break
          // Inject text into the element
          case 'text': $el.text( evaluate( $el.attr('text') as string ) ); break
          // Inject the evaulation result of any ther attributes
          default: $el.attr( each, evaluate( $el.attr( each ) as string ) ); break
        }
      })

      if( $el.get(0)?.nodeType !== Node.TEXT_NODE ){
        if( !asRoot  ){
          const $nexted = wrap( $el.html() )

          $nexted.length 
          && $el.has(':not([key])')
          && $el.html( self.render( $nexted ) as any )
        }
          
        /**
         * BENCHMARK: Tracking total elements rendered
         */
        self.benchmark.inc('elementCount')
      }

      // Apply translation to component's text contents
      self.i18n.propagate( $el )
    }

    function react( $el: JQuery ){
      // Render in-build syntax components
      if( $el.is('let') ) execLet( $el )
      else if( $el.is('for') ) execLoop( $el )
      else if( $el.is('if') ) execCondition( $el )
      else if( $el.is('switch') ) execSwitch( $el )
      else if( $el.is('async') ) execAsync( $el )

      // Render normal body content
      else execElement( $el )
    }

    /**
     * IMPORTANT: Register nexted contents before processing
     *            the element.
     */
    const $els = _$.length > 1 ?
                      // Create fake div to wrap contents
                      $('<wrap/>').html( _$ as any ).contents()
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
    $els.each( function(){ react( $(this) as JQuery ) })
    
    /**
     * BENCHMARK: Tracking total occurence of recursive rendering
     */
    self.benchmark.inc('renderCount')

    return _$
  }
  inject( method: string, $node: any ){
    $node[ method ]( this.$ )

    return this.$
  }
  emit(){

  }
  destroy(){
    this.$.off().remove()
    clearInterval( this.IUC )
  }
}