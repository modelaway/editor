import type { Declaration, Handler, MeshRender, MeshTemplate } from '..'

export const declaration: Declaration = {
  name: 'if',
  contents: true,
  tags: {
    'else-if': { type: 'sibling', many: true },
    'else': { type: 'sibling' }
  }
}

export interface Input {
  by: boolean
  render?: MeshRender
  'else-if'?: MeshTemplate[]
  'else'?: MeshTemplate
}
export interface State {
  render?: MeshRender | null
}

export const state = {
  render: null
}

export const handler: Handler<Input, State> = {
  onInput(){
    // Render -- if
    if( this.input.by )
      this.state.render = this.input.render
    
    else {
      let elseifMatch = false
      
      // Render -- else-if
      if( Array.isArray( this.input['else-if'] ) && this.input['else-if'].length )
        this.input['else-if'].forEach( each => {
          if( !each.by ) return
          
          this.state.render = each.render
          elseifMatch = true
        } )
      
      // Render -- else or No fallback
      if( !elseifMatch  )
        this.state.render = this.input.else ? this.input.else.render : null
    }

    console.log( this.state.render )
  }
}

export default `<div><{state.render}/></div>`