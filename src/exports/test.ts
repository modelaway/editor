// import I18N from './i18n'
import { effect, signal } from '../modules/reactive'
import { deepAssign } from '../modules/utils'

export type ComponentFactory<Input, State = ObjectType<any>> = ( input: Input, state: State ) => string

/**
 * Regular expression to match the tag 
 * name and attributes
 */
const 
CUSTOM_TAG_REGEX = /<([\w@-]+)([^>]*)>([\s\S]*?)<\/\1>|<([\w@-]+)([^>]*)\/>/g,
ATTRIBUTE_REGEX = /([\w-]+)(?:="([^"]*)")?/g

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

export default class Component<Input, State> {
  public template?: string
  private $element?: JQuery<HTMLElement>

  private _input: Input
  private _state: State

  private _setInput: ( input: Input ) => void

  private _setState: ( state: State ) => void
  private _getState: () => State | undefined

  /**
   * Initialize history manager
   */
  // private i18n = new I18N()

  constructor( factory: ComponentFactory<Input, State>, input: Input, state?: State ){
    this._input = input
    this._state = state || {} as State

    const [ getInput, setInput ] = signal<Input>( this._input )
    const [ getState, setState ] = signal( this._state )

    effect( () => {
      this._input = JSON.parse( JSON.stringify( getInput() ) ) as Input
      this.template = factory( this._input, getState() )
      
      /**
       * Rerender the element/component if initially rendered
       */
      this.rerender()
    } )

    this._setInput = setInput
    this._setState = setState
    this._getState = getState
  }

  getState( key: string ){
    const state = this._getState() as ObjectType<any>
    
    return state && typeof state == 'object' && state[ key ]
  }
  setState( data: State ){
    const state = this._getState() as ObjectType<keyof State>

    this._setState({ ...state, ...data })
  }

  getEl(){
    if( !this.$element )
      throw new Error('Component is not rendered')

    return this.$element
  }
  find( selector: string ){
    return this.$element?.find( selector )
  }
  render( op: string, $to: JQuery<HTMLElement> ){
    if( !this.template ) return
    this.$element = $(this.template)

    // Add element to the DOM
    if( $to.length ){
      ($to as any)[ op ]( this.$element )
      // Apply translation to component's text contents
      // this.i18n.propagate( this.$element )
    }

    return this.getEl()
  }
  rerender(){
    if( !this.template || !this.$element?.length ) return

    const $replacement = $(this.template)
    
    this.$element.last().after( $replacement )
    this.$element.remove()
    this.$element = $replacement

    // Apply translation to component's text contents
    // this.i18n.propagate( this.$element )
  }
  input( input: Input ){
    console.log('Check isequals: ', this._input, input )
    /**
     * Apply update only when new input is different 
     * from the incoming input
     */
    if( inputEquals( this._input as ObjectType<any>, input as ObjectType<any> ) )
      return
    
    // Merge with initial/active input.
    this._setInput({ ...this._input, ...input })
  }
  /**
   * Inject grain/partial input to current component 
   * instead of sending a whole updated input
   */
  subInput( data: ObjectType<any> ){
    if( typeof data !== 'object' ) 
      return this.getEl()
    
    this.input( deepAssign( this._input as ObjectType<any>, data ) )
  }
  destroy(){
    this.$element?.off().remove()
  }
}

function parseHTML( htmlStr: string ){
  const tags = []
  let match

  while( ( match = CUSTOM_TAG_REGEX.exec( htmlStr )) !== null ){
    const 
    tagName = match[1] || match[4],
    attributesString = match[2] || match[5] || '',
    innerContent = match[3] || '',
    attributes: ObjectType<string> = {}

    let attrMatch
    while( ( attrMatch = ATTRIBUTE_REGEX.exec( attributesString ) ) !== null ){
      const [ _, name, value ] = attrMatch
      attributes[ name ] = value || ''
    }

    tags.push({
      tagName,
      attributes,
      children: innerContent.trim()
    })
  }

  return tags
}
function htmlMap( element: HTMLElement ){
  const map: any = {
    tagName: element.tagName,
    attributes: {},
    children: []
  }

  Array
  .from( element.attributes )
  .forEach( attr => map.attributes[ attr.name ] = attr.value )

  Array
  .from( element.childNodes )
  .forEach( child => {
    // HTML node
    if( child.nodeType === Node.ELEMENT_NODE )
      map.children.push( htmlMap( child as HTMLElement ) )
    
    else if( child.nodeType === Node.TEXT_NODE && child.textContent?.trim() ){
      const content = child.textContent?.trim()

      // Detect custom & parse tags
      if( CUSTOM_TAG_REGEX.test( content ) )
        map.children.push( parseHTML( content ) )
      
      // Text content
      else map.children.push({
        nodeType: 'TEXT_NODE',
        content: child.textContent.trim()
      })
    }
  })

  return map
}


const countFactory: ComponentFactory<{ value: number }> = ({ value }) => {
  return `<span>${value}</span>`
}

function countTest(){
  const
  input = { value: 0 },
  count = new Component( countFactory, input )

  count.render('prepend', $('body') )

  setInterval( () => {
    input.value++
    console.log( input.value )
    count.input( input )
  }, 1000 )
}

type CountInInput = {
  id: string
  countInput: { value: number }
}
type CountInState = {
  label?: string
  classname?: string
}
function countInContainer( input: CountInInput ){
  const
  counter = new Component( countFactory, input.countInput ),
  factory: ComponentFactory<CountInInput, CountInState> = ({ id }, { label }) => {
    return `<div id="12">
      <span>{label}</span>
      <@counter class="card" 
                value="1"></@counter>
    </div>`
  },
  container = new Component( factory, input, { label: 'Count: ' } )

  container.render('prepend', $('body') )
  counter.render('append', container.getEl() )

  // const
  // parser = new DOMParser(),
  // { body } = parser.parseFromString( container.template as string, 'text/html' ),
  // element = body.firstChild as HTMLElement

  // console.log( htmlMap( element ) )

  console.log( parseHTML( container.template as string ) )

  // setTimeout( () => container.setState({ label: 'Current Number' }), 5000 )

  // setInterval( () => {
  //   input.countInput.value++
  //   counter.input( input.countInput )
  // }, 1000 )
}

// countTest()
countInContainer({ id: 'block', countInput: { value: 0 } })