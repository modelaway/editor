import I18N from './i18n'
import { deepAssign } from './utils'

export type ComponentFactory<T> = ( input: T ) => string

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

export default class Component<T> {
  public template: string
  private $element?: JQuery<HTMLElement>
  private factory: ComponentFactory<T>
  private input: T

  /**
   * Initialize history manager
   */
  private i18n = new I18N()

  constructor( factory: ComponentFactory<T>, input: T ){
    this.input = input
    this.factory = factory
    this.template = this.factory( this.input )
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
    this.$element = $(this.template)

    // Add element to the DOM
    if( $to.length ){
      ($to as any)[ op ]( this.$element )
      // Apply translation to component's text contents
      this.i18n.propagate( this.$element )
    }

    return this.getEl()
  }
  update( input: T ){
    if( !this.$element?.length )
      return this.getEl()
    
    /**
     * Apply update only when new input is different 
     * from the incoming input
     */
    if( inputEquals( this.input as ObjectType<any>, input as ObjectType<any> ) )
      return this.getEl()
    
    // Merge with initial/active input.
    this.input = { ...this.input, ...input }

    // TODO: Replace this operation with fine-grain DOM update

    this.template = this.factory( this.input )
    const $replacement = $(this.template)
    
    this.$element.last().after( $replacement )
    this.$element.remove()
    this.$element = $replacement

    // Apply translation to component's text contents
    this.i18n.propagate( this.$element )

    return this.getEl()
  }

  /**
   * Apply grain/partial update to current input 
   * instead of sending a whole updated input for update
   */
  grainUpdate( data: ObjectType<any> ){
    if( typeof data !== 'object' ) 
      return this.getEl()
    
    const update = deepAssign( this.input as ObjectType<any>, data )
    console.log('--- updates:', update, this.input )
    this.update( update )
  }
  destroy(){
    this.$element?.off().remove()
  }
}