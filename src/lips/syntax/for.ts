import type { Declaration, Handler, MeshRenderer, VariableScope } from '..'
import $, { type Cash } from 'cash-dom'

export interface Input {
  in: Record<string, any> | any[]
  from?: number
  to?: number
  renderer?: MeshRenderer
}
export interface Static {
  isAttached: boolean
}
export interface State {
  isMounted: boolean
}

export const declaration: Declaration = {
  name: 'for',
  syntax: true
}
export const _static: Static = {
  isAttached: false
}
export const state: State = {
  isMounted: false
}

export const handler: Handler<Input, State, Static> = {
  onInput(){
    if( !this.input.renderer )
      throw new Error('Undefined mesh renderer')

    let
    $list = $(),
    { in: _in, from: _from, to: _to } = this.input

    if( _in === undefined && _from === undefined )
      throw new Error('Invalid <for> arguments')

    if( _from !== undefined ){
      _from = parseFloat( String( _from ) )

      if( _to == undefined )
        throw new Error('Expected <from> <to> attributes of the for loop to be defined')

      _to = parseFloat( String( _to ) )

      for( let i = _from; i <= _to; i++ ){
        const
        argvalues: VariableScope = {},
        [ivar] = this.input.renderer.argv

        if( ivar ) argvalues[ ivar ] = { value: i, type: 'const' }
        
        $list = $list.add( this.input.renderer?.mesh( argvalues ) )
      }
    }

    else if( Array.isArray( _in ) ){
      let index = 0
      for( const each of _in ){
        const 
        argvalues: VariableScope = {},
        [evar, ivar] = this.input.renderer.argv

        if( evar ) argvalues[ evar ] = { value: each, type: 'const' }
        if( ivar ) argvalues[ ivar ] = { value: index, type: 'const' }

        $list = $list.add( this.input.renderer?.mesh( argvalues ) )
        index++
      }
    }

    else if( _in instanceof Map ){
      let index = 0
      for( const [ key, value ] of _in ){
        const 
        argvalues: VariableScope = {},
        [kvar, vvar, ivar] = this.input.renderer.argv

        if( kvar ) argvalues[ kvar ] = { value: key, type: 'const' } // key
        if( vvar ) argvalues[ vvar ] = { value: value, type: 'const' } // value
        if( ivar ) argvalues[ ivar ] = { value: index, type: 'const' } // index

        $list = $list.add( this.input.renderer?.mesh( argvalues ) )
        index++
      }
    }

    else if( typeof _in == 'object' ){
      let index = 0
      for( const key in _in ){
        const 
        argvalues: VariableScope = {},
        [kvar, vvar, ivar] = this.input.renderer.argv

        if( kvar ) argvalues[ kvar ] = { value: key, type: 'const' } // key
        if( vvar ) argvalues[ vvar ] = { value: _in[ key ], type: 'const' } // value
        if( ivar ) argvalues[ ivar ] = { value: index, type: 'const' } // index

        $list = $list.add( this.input.renderer?.mesh( argvalues ) )
        index++
      }
    }

    $list.length && this.handleRender( $list )
  },
  handleRender( $list ){
    if( !$list?.length ) return

    this.static.isAttached
            ? this.input.renderer?.replaceWith( $list )
            : this.once('component:attached', () => {
              this.input.renderer?.replaceWith( $list )
              this.static.isAttached = true
            } )
  }
}

export default `<!---[EFLP]--->`