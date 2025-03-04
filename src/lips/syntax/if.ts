import type { Declaration, Handler, MeshRenderer, MeshTemplate } from '..'

export interface Input {
  by: boolean
  renderer?: MeshRenderer
  'else-if'?: MeshTemplate[]
  'else'?: MeshTemplate
}
export interface State {
  renderer: MeshRenderer | null
}

export const declaration: Declaration = {
  name: 'if',
  syntax: true,
  tags: {
    'else-if': { type: 'nexted', many: true },
    'else': { type: 'nexted' }
  }
}
export const state: State = {
  renderer: null
}

export const handler: Handler<Input, State> = {
  onInput(){
    if( !this.input.renderer ) return

    // Render -- if
    if( this.input.by )
      this.state.renderer = this.input.renderer
    
    else {
      let elseifMatch = false
      
      // Render -- else-if
      if( Array.isArray( this.input['else-if'] ) && this.input['else-if'].length ){
        this.input['else-if'].forEach( each => {
          if( elseifMatch || !each.by ) return
          
          this.state.renderer = each.renderer
          elseifMatch = true
        } )
      }
      
      // Render -- else or Null fallback
      if( !elseifMatch )
        this.state.renderer = this.input.else ? this.input.else.renderer : null
    }
  }
}

export default `<{state.renderer}/>`