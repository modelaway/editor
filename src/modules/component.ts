
import $ from 'jquery'
import I18N from './i18n'
import { deepAssign } from './utils'
import { effect, signal } from './reactive'

$.fn.extend({
  attrs: function(){
    const obj: any = {}
    $.each( (this as any)[0].attributes, function(){ obj[ this.name ] = this.value })

    return obj
  }
})

export type Handler = ObjectType<( ...args: any[] ) => void>

function wrap( html: string ): any {
  return $('<div/>').html( html ).contents()
}
function inputEquals( aObject: ObjectType<any>, bObject: ObjectType<any> ){
  const
  aKeys = Object.keys( aObject ).sort(),
  bKeys = Object.keys( bObject ).sort()

  if( aKeys.length !== bKeys.length ) return false //not the same nr of keys
  if( aKeys.join('') !== bKeys.join('') ) return false //different keys

  for( let x = 0; x < aKeys.length; ++x ){
    // Array object
    if( aObject[ aKeys[x] ] instanceof Array ){
      if( !( bObject[ aKeys[x] ] instanceof Array ) ) return false
      if( !inputEquals( aObject[ aKeys[x] ], bObject[ aKeys[x] ] ) ) return false
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
      else if( !inputEquals( aObject[ aKeys[x] ], bObject[ aKeys[x] ] ) ) return false
    }
    // Change !== to != for loose comparison: not the same value
    else if( aObject[ aKeys[x] ] !== bObject[ aKeys[x] ] ) return false
  }

  return true
}

export default class Component<Input = void, State = void, Static = void> {
  public template: string
  public $: JQuery
  private input: Input
  private state: State
  private static: ObjectType<any>
  private handler: Handler = {}

  private isRendered = false

  private _setInput: ( input: Input ) => void

  private _setState: ( state: State ) => void
  private _getState: () => State | undefined

  private for?: {
    index: number
    key?: string
    each?: any
  }

  /**
   * Initialize history manager
   */
  private i18n = new I18N()

  constructor( template: string, { input, state, _static, _handler }: { input?: Input, state?: State, _static?: ObjectType<any>, _handler?: Handler }){
    this.template = template
    this.$ = $(template)
    
    this.input = input || {} as Input
    this.state = state || {} as State
    this.static = _static || {}

    _handler && this.defineHandler( _handler )

    const
    [ getInput, setInput ] = signal<Input>( this.input ),
    [ getState, setState ] = signal( state || {} as State )

    this._setInput = setInput
    this._setState = setState
    this._getState = getState

    effect( () => {
      this.input = getInput()
      this.state = getState()
      
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
       * Flag to know when element is initially or force
       * to render.
       */
      this.isRendered = true
    })
  }

  getState( key: string ){
    const state = this._getState() as ObjectType<any>
    
    return state && typeof state == 'object' && state[ key ]
  }
  setState( data: any ){
    const state = this._getState() as ObjectType<keyof State>

    this._setState({ ...state, ...data })
  }
  setInput( input: Input ){
    /**
     * Apply update only when new input is different 
     * from the incoming input
     */
    if( inputEquals( this.input as ObjectType<any>, input as ObjectType<any> ) )
      return
    
    // Merge with initial/active input.
    this._setInput({ ...this.input, ...input })
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
  destroy(){
    this.$.off().remove()
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
    const
    _$ = $component || this.$,
    self = this

    function evaluate( script: string ){
      const fn = new Function(`return ${script}`)
      return fn.bind( self )()
    }

    function execSwitch( $switch: JQuery ){
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

          const nextedHtml = $case.html()
          $case.empty()
                .html( self.render( wrap( nextedHtml ) ) as any )
                .show()
        }
        else $case.hide()
      })

      if( $default.length && !validCases.includes( _by ) ){
        const nextedHtml = $default.html()
        
        $default.empty()
                .html( self.render( wrap( nextedHtml ) ) as any )
                .show()
      }
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

        if( res ){
          const nextedHtml = $cond.html()
          
          $cond.empty()
              .append( self.render( wrap( nextedHtml ) ) )
              .show()
        }
        else {
          $cond.hide()
          
          if( $cond.next('else-if').length ) return execCondition( $cond.next('else-if') )
          else if( $cond.next('else').length ) return execCondition( $cond.next('else'), true )
        }

        return res
      }
      catch( error ){
        // TODO: Transfer error to global try - catch component define in the UI
        console.log('Error - ', error )
      }
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
        console.log('Error - ', error )
      }
    }
    
    function attachEvent( $el: JQuery, _event: string ){
      const [ fn, ...args ] = ($el.attr(`on-${_event}`) as string).split(/\s*,\s*/)

      if( typeof self.handler[ fn ] !== 'function' )
        throw new Error(`Undefined <${fn}> ${_event} event method`)

      $el.on( _event, e => {
        const 
        _fn = self.handler[ fn ],
        _args = args.map( each => (evaluate( each )) )

        _fn( ..._args, e )
      })
    }

    function react( $el: JQuery ){
      // Render in-build syntax components
      if( $el.is('switch') ) execSwitch( $el )
      else if( $el.is('if') ) execCondition( $el )
      else if( $el.is('for') ) execLoop( $el )
      // Render normal body content
      else {
        const nextedHtml = $el.html()

        nextedHtml 
        && $el.has(':not([key])')
        && $el.html( self.render( wrap( nextedHtml ) ) as any )
      }

      // Process attributes
      Object
      .keys( ($el as any).attrs() )
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
        }
      })

      // Apply translation to component's text contents
      self.i18n.propagate( $el )
    }

    const $els = _$.length > 1 ?
                      // Create fake div to wrap contents
                      $('<div/>').html( _$ as any ).contents()
                      : _$.children()

    $els.each( function(){ react( $(this) as JQuery ) })

    return _$
  }
  inject( method: string, $node: any ){
    $node[ method ]( this.$ )

    return this.$
  }
  emit(){

  }

  defineHandler( list: Handler ){
    Object
    .entries( list )
    .map( ([ method, fn ]) => this.handler[ method ] = fn.bind(this) )
  }
}