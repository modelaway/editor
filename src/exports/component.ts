
import $ from 'jquery'
// import I18N from '../modules/i18n'
import { deepAssign } from '../modules/utils'
import { effect, signal } from '../modules/reactive'

// import * as Sass from 'sass'
import { CompileResult } from 'sass'

let Sass: any

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

type LanguageDictionary = ObjectType<ObjectType<string> | string>

class I18N {
  private default = window.navigator.language
  private LANGUAGE_DICTIONARIES: ObjectType<LanguageDictionary> = {}

  setLang( lang: string ): boolean {
    if( this.default !== lang ){
      this.default = lang
      return true
    }

    return false
  }

  setDictionary( id: string, dico: LanguageDictionary ){
    this.LANGUAGE_DICTIONARIES[ id ] = dico
  }

  /**
   * 
   */
  translate( text: string, lang?: string ){
    // No translation required
    if( lang && this.default == lang )
      return { text, lang: this.default }

    lang = lang || this.default

    /**
     * Translate displayable texts
     * 
     * - text content
     * - title attribute
     * - placeholder attribute
     */
    const [ id, variant ]: string[] = lang.split('-')
    if( this.LANGUAGE_DICTIONARIES[ id ] && text in this.LANGUAGE_DICTIONARIES[ id ] ){
      // Check by language variant or default option
      if( typeof this.LANGUAGE_DICTIONARIES[ id ][ text ] === 'object' ){
        const variants = this.LANGUAGE_DICTIONARIES[ id ][ text ] as ObjectType<string>
        text = variants[ variant || '*' ] || variants['*']
      }
      
      // Single translation option
      else if( typeof this.LANGUAGE_DICTIONARIES[ id ][ text ] === 'string' )
        text = this.LANGUAGE_DICTIONARIES[ id ][ text ] as string
    }

    return { text, lang }
  }

  propagate( $node: JQuery<HTMLElement> ){
    const self = this
    function apply( this: HTMLElement ){
      const
      $this = $(this),
      _content = $this.html(),
      _title = $this.attr('title'),
      _placeholder = $this.attr('placeholder')

      let _lang

      if( !/<\//.test( _content ) && $this.text() ){
        const { text, lang } = self.translate( $this.text() )

        $this.text( text )
        _lang = lang
      }
      if( _title ){
        const { text, lang } = self.translate( _title )

        $this.attr('title', text )
        _lang = lang
      }
      if( _placeholder ){
        const { text, lang } = self.translate( _placeholder )
        
        $this.attr('placeholder', text )
        _lang = lang
      }

      _lang && $this.attr('lang', _lang )
    }

    $node.children().each( apply )

    return $node
  }
}

export type Template = {
  state?: any
  static?: any
  handler?: Handler
  stylesheet?: string
  default: string
}
export type ComponentScope = {
  input?: any
  state?: any
  context?: string[]
  _static?: ObjectType<any>
  _handler?: Handler
  stylesheet?: string
}
export type MetaConfig = {
  context?: any
  debug?: boolean
}

export class Meta<Context = any> {
  private debug = false
  private context?: Context
  private store: ObjectType<Template> = {}
  private __root?: Component

  public i18n = new I18N()

  private _setContext: ( ctx: Context ) => void
  private _getContext: () => Context

  constructor( config?: MetaConfig ){
    if( config?.debug ) 
      this.debug = config.debug
    
    const [ getContext, setContext ] = signal<Context>( config?.context || {} )

    this._setContext = setContext
    this._getContext = getContext
  }

  async register( ref: string, template: Template ){
    /**
     * TODO: Register component by providing file path.
     */
    // if( typeof template == 'string' ){
    //   try { this.store[ ref ] = await import( template ) as Template }
    //   catch( error ){ throw new Error(`Component <${ref}> template not found at ${template}`) }

    //   return
    // }

    this.store[ ref ] = template
  }

  unregister( ref: string ){
    delete this.store[ ref ]
  }

  use( ref: string ){
    if( !this.store[ ref ] )
      throw new Error(`No <${ref}> component found`)

    if( !this.store[ ref ].default )
      throw new Error(`Invalid <${ref}> component`)

    return this.store[ ref ]
  }

  root( template: string, scope: ComponentScope ){
    this.__root = new Component('__ROOT__', template, scope, this.debug, this )
    return this.__root
  }

  language( lang: string ){
    this.i18n.setLang( lang )
    /**
     * Rerender root component when language changed
     */
    && this.__root?.rerender()
  }

  setContext( key: string, value: any ){
    this._setContext({ ...this.context, [key]: value } as Context )
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

type StyleSettings = {
  css?: string
  meta?: boolean
  custom?: {
    enabled: boolean
    allowedRules: string[]
    allowedProperties: string[]
  }
}
export class Stylesheet {
  private nsp: string
  private settings: StyleSettings
  private $head: JQuery<HTMLElement>

  constructor( nsp: string, settings?: StyleSettings ){
    if( typeof nsp !== 'string' ) 
      throw new Error('Undefined or invalid styles attachement element(s) namespace')
    
    // @ts-ignore
    !Sass && import('https://jspm.dev/sass').then( lib => Sass = lib )

    /**
     * Unique namespace identifier of targeted 
     * views/elements
     */
    this.nsp = nsp

    /**
     * Head element of the DOM from where CSS
     * operation will be done.
     */
    this.$head = $('head')

    /**
     * Styles settings
     * 
     * - css
     * - custom
     */
    this.settings = settings || {}

    // Auto-load defined css rules
    this.settings && this.load( this.settings )
  }

  /**
   * Compile Sass style string to CSS string
   */
  compile( str: string ): Promise<CompileResult>{
    return new Promise( ( resolve, reject ) => {
      if( !Sass ){
        let 
        waiter: any,
        max = 1
        
        const exec = () => {
          /**
           * TEMP: Wait 8 seconds for Sass libary to load
           */
          if( !Sass ){
            if( max == 8 ){
              clearInterval( waiter )
              reject('Undefined Sass compiler')
            }
            else max++
            
            return
          }

          clearInterval( waiter )
          resolve( Sass.compileString( str ) )
        }

        waiter = setInterval( exec, 1000 )
      }
      else resolve( Sass.compileString( str ) )
    } )
  }

  /**
   * Compile and inject a style chunk in the DOM
   * using `<style mv-style="*">...</style>` tag
   */
  private async inject( str: string ){
    if( !str )
      throw new Error('Invalid injection arguments')

    const selector = `rel="${this.settings.meta ? '@' : ''}${this.nsp}"`
    /**
     * Defined meta css properties or css by view 
     * elements by wrapping in a closure using the 
     * namespaces selector.
     * 
     * :root {
     *    --font-size: 12px;
     *    line-height: 1.5;
     * }
     * 
     * [rel="<namespace>"] {
     *    font-size: 12px;
     *    &:hover {
     *      color: #000; 
     *    }
     * }
     */
    str = this.settings.meta ? str : `[rel="${this.nsp}"] { ${str} }`

    const result = await this.compile( str )
    if( !result?.css )
      throw new Error(`<component:${this.nsp}> css injection failed`)
    
    const $existStyle = await this.$head.find(`style[${selector}]`)
    $existStyle.length ?
          // Replace existing content
          await $existStyle.html( result.css )
          // Inject new style
          : await (this.$head as any)[ this.settings.meta ? 'prepend' : 'append' ](`<style ${selector}>${result.css}</style>`)
  }

  /**
   * Load/inject predefined CSS to the document
   */
  async load( settings: StyleSettings ){
    this.settings = settings
    if( typeof this.settings !== 'object' )
      throw new Error('Undefined styles settings')
    
    this.settings.css && await this.inject( this.settings.css )
  }

  /**
   * Retreive this view's main node styles including natively 
   * defined ones.
   */
  get(){
    
  }

  /**
   * Remove all injected styles from the DOM
   */
  async clear(){
    (await this.$head.find(`style[rel="${this.settings.meta ? '@' : ''}${this.nsp}"]`)).remove()
  }

  /**
   * Return css custom properties
   */
  async custom(): Promise<ObjectType<string>> {
    return {}
  }

  /**
   * Overridable function to return an element 
   * style attribute value as JSON object.
   */
  async style(): Promise<ObjectType<string>> {
    return {}
  }
}

type EventListener = ( ...args: any[] ) => void

export default class Component<Input = void, State = void, Static = void, Context = void> {
  public template: string
  public $: JQuery
  private input: Input
  private state: State
  private context: Context
  private static: ObjectType<any>
  private handler: Handler = {}

  private __ref: string
  private __state?: State // Partial state
  private __stylesheet?: Stylesheet
  private __components: ObjectType<Component> = {}
  private __events: ObjectType<EventListener[]> = {}

  private debug = false
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

  private meta?: Meta
  private benchmark: Benchmark

  constructor( ref: string, template: string, { input, state, context, _static, _handler, stylesheet }: ComponentScope, debug = false, meta?: Meta ){
    this.meta = meta
    this.debug = debug
    this.template = template
    this.$ = $(this.template)

    this.__ref = ref
    this.__stylesheet = new Stylesheet( this.__ref, {
      css: stylesheet,
      /**
       * Inject root component styles into global meta
       * style tag.
       */
      meta: this.__ref === '__ROOT__'
    })
    
    this.input = input || {} as Input
    this.state = state || {} as State
    this.context = {} as Context
    this.static = _static || {}
    this.benchmark = new Benchmark( debug )

    _handler && this.setHandler( _handler )

    const
    [ getInput, setInput ] = signal<Input>( this.input ),
    [ getState, setState ] = signal<State>( this.state ),
    [ getContext, setContext ] = signal<Context>( this.context )

    this._setInput = setInput
    this._setState = setState
    this._getState = getState

    effect( () => {
      this.input = getInput()
      this.state = getState()
      this.context = getContext()

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
       * Render/Rerender component
       */
      this.isRendered ? this.rerender() : this.render()

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

    Array.isArray( context )
    && context.length
    && this.meta?.useContext( context, ctx => {
      /**
       * Apply update only when a new change 
       * occured on the context.
       */
      if( isEquals( this.context as ObjectType<any>, ctx ) )
        return
      
      // Merge with initial/active context.
      setContext( ctx )
    } )
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
        // script = script.replace(/\{([^}]*)\}/g, ( _, match ) => ('${'+ match +'}') )

        const fn = new Function(`return ${script}`)
        return fn.bind( self )()
      }
      catch( error ){ return script }
    }
    
    function attachEvent( element: JQuery | Component, _event: string, instruction: string ){
      /**
       * Execute function script directly attach 
       * as the listener.
       * 
       * Eg. 
       *  `on-click="() => console.log('Hello world')"`
       *  `on-change="e => this.handler.onChange(e)"`
       */
      if( /(\s*\w+|\s*\([^)]*\)|\s*)\s*=>\s*(\s*\{[^}]*\}|\s*[^\n;"]+)/g.test( instruction ) )
        element.on( _event, evaluate( instruction ) )

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
        if( typeof self.handler[ fn ] !== 'function' ) return
          // throw new Error(`Undefined <${fn}> ${_event} event method`)

        element.on( _event, ( ...params: any[] ) => {
          const _fn = self.handler[ fn ]
          let _args = args.map( each => (evaluate( each )) )

          if( params.length )
            _args = [ ...params, ..._args ]

          _fn( ..._args, ...params )
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
      .entries( attributes )
      .forEach( ([ attr, value ]) => {
        // Attach event to the element
        if( /^on-/.test( attr ) ){
          const _event = attr.replace(/^on-/, '')

          $el.attr(`on-${_event}`) && attachEvent( $el, _event, value as string )
          return
        }

        switch( attr ){
          // Inject inner html into the element
          case 'html': $el.html( evaluate( value as string ) ); break

          // Inject text into the element
          case 'text': {
            let text = evaluate( value as string )

            // Apply translation
            if( self.meta && !$el.is('[no-translate]') ){
              const { text: _text } = self.meta.i18n.translate( text )
              text = _text
            }

            $el.text( text )
          } break

          // Convert object style attribute to string
          case 'style': {
            const style = evaluate( value as string )
            
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
            const res = evaluate( value as string )
            
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
      self.meta?.i18n.propagate( $el )
    }

    function execComponent( $component: JQuery ){
      try {
        const ref = $component.attr('ref') as string
        if( !ref )
          throw new Error('Undefined component <ref> attribute')

        if( !self.meta )
          throw new Error('Nexted component manager is disable')

        /**
         * Parse assigned attributes to be injected into
         * the component as input.
         */
        const
        input: any = {},
        attrs = ($component as any).attrs(),
        events: ObjectType<any> = {}

        Object
        .entries( attrs )
        .forEach( ([ key, value ]) => {
          if( key == 'ref' || value == undefined )
            return

          // Component events
          if( /^on-/.test( key ) ){
            events[ key.replace(/^on-/, '') ] = value
            return
          }

          input[ key ] = evaluate( value as string )
        } )

        /**
         * Also inject component body into inputs
         * as `bodyHtml`
         */
        const
        nextedHtml = $component.html()
        if( nextedHtml ){
          const $el = self.render( wrap( nextedHtml ) )
          input.bodyHtml = $el.html() || $el.text()
        }

        const
        { state, static: _static, handler: _handler, default: _default, stylesheet } = self.meta.use( ref ),
        component = new Component( ref, _default, {
          state,
          input,
          _static,
          _handler,
          stylesheet
        }, self.debug, self.meta )

        self.__components[ ref ] = component

        $component.replaceWith( component.$ )
        
        // Listen to this nexted component's events
        Object
        .entries( events )
        .forEach( ([ _event, instruction ]) => attachEvent( component, _event, instruction ) )
      }
      catch( error ){
        // TODO: Transfer error to global try - catch component define in the UI
        console.warn('Error - ', error )
      }
    }

    function react( $el: JQuery ){
      // Render in-build syntax components
      if( $el.is('let') ) execLet( $el )
      else if( $el.is('for') ) execLoop( $el )
      else if( $el.is('if') ) execCondition( $el )
      else if( $el.is('switch') ) execSwitch( $el )
      else if( $el.is('async') ) execAsync( $el )
      else if( $el.is('component') ) execComponent( $el )

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

      /**
       * Component relationship attribute with other 
       * resources like `style tags`, `script tags`, ...
       */
      _$.attr('rel', this.__ref )

      // Object
      // .values( self.__components )
      // .forEach( each => each.render() )

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
  off( _event: string ){
    delete this.__events[ _event ]
  }
  emit( _event: string, ...params: any[] ){
    this.__events[ _event ]?.forEach( fn => fn( ...params ) )
  }
}