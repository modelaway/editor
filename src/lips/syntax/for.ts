import type { Declaration, Handler, MeshRenderer } from '..'

export interface Input {
  in: Record<string, any> | any[]
  from?: number
  to?: number
  renderer?: MeshRenderer
}
export interface State {
  argvlist: Record<string, any>[] | null
}

export const declaration: Declaration = {
  name: 'for',
  syntax: true,
  iterator: true
}
export const state: State = {
  argvlist: null
}

export const handler: Handler<Input, State> = {
  onInput(){
    // console.log('for loop input --', this.input )
    if( !this.input.renderer )
      throw new Error('Undefined mesh renderer')

    let { in: _in, from: _from, to: _to } = this.input

    if( _in === undefined && _from === undefined )
      throw new Error('Invalid <for> arguments')

    if( _from !== undefined ){
      _from = parseFloat( String( _from ) )

      if( _to == undefined )
        throw new Error('Expected <from> <to> attributes of the for loop to be defined')

      _to = parseFloat( String( _to ) )

      if( _from === _to )
        throw new Error('<from> and <to> attribute cannot have the same value')
      
      const argvlist = []
      for( let i = _from; i <= _to; _from < _to ? i++ : i-- ){
        const
        argvalues: Record<string, any> = {},
        [ivar] = this.input.renderer.argv

        if( ivar ) argvalues[ ivar ] = { value: i, type: 'let' }

        argvlist.push( argvalues )
      }

      this.state.argvlist = argvlist
    }

    else if( Array.isArray( _in ) ){
      if( !_in.length ){
        console.warn('empty for loop <in> attribute Array value')
        return
      }

      const argvlist = []
      let index = 0

      for( const each of _in ){
        const 
        argvalues: Record<string, any> = {},
        [evar, ivar] = this.input.renderer.argv

        if( evar ) argvalues[ evar ] = { value: each, type: 'let' }
        if( ivar ) argvalues[ ivar ] = { value: index, type: 'let' }

        argvlist.push( argvalues )
        index++
      }

      this.state.argvlist = argvlist
    }

    else if( _in instanceof Map ){
      if( !_in.size ){
        console.warn('empty for loop <in> attribute Map value')
        return
      }

      const argvlist = []
      let index = 0

      for( const [ key, value ] of _in ){
        const 
        argvalues: Record<string, any> = {},
        [kvar, vvar, ivar] = this.input.renderer.argv

        if( kvar ) argvalues[ kvar ] = { value: key, type: 'let' } // key
        if( vvar ) argvalues[ vvar ] = { value: value, type: 'let' } // value
        if( ivar ) argvalues[ ivar ] = { value: index, type: 'let' } // index
        
        argvlist.push( argvalues )
        index++
      }

      this.state.argvlist = argvlist
    }

    else if( typeof _in == 'object' ){
      if( !Object.keys( _in ).length ){
        console.warn('empty for loop <in> attribute Object value')
        return
      }

      const argvlist = []
      let index = 0

      for( const key in _in ){
        const 
        argvalues: Record<string, any> = {},
        [kvar, vvar, ivar] = this.input.renderer.argv

        if( kvar ) argvalues[ kvar ] = { value: key, type: 'let' } // key
        if( vvar ) argvalues[ vvar ] = { value: _in[ key ], type: 'let' } // value
        if( ivar ) argvalues[ ivar ] = { value: index, type: 'let' } // index
        
        argvlist.push( argvalues )
        index++
      }

      this.state.argvlist = argvlist
    }
  }
}

export default `<{input.renderer} $$=state.argvlist/>`