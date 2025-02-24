import type { Declaration, Handler, MeshRenderer, MeshTemplate } from '..'
import $, { type Cash } from 'cash-dom'

export interface Input {
  by: boolean
  renderer?: MeshRenderer
  'else-if'?: MeshTemplate[]
  'else'?: MeshTemplate
}
export interface Static {
  $contents?: Cash | null
}

export const declaration: Declaration = {
  name: 'if',
  syntax: true,
  contents: true,
  tags: {
    'else-if': { type: 'sibling', many: true },
    'else': { type: 'sibling' }
  }
}

export const _static = {
  $contents: null
}

export const handler: Handler<Input, any, Static> = {
  onInput(){
    // Render -- if
    console.log( this.input )
    if( this.input.by )
      this.static.$contents = this.input.renderer?.mesh({})
    
    else {
      let elseifMatch = false
      
      // Render -- else-if
      if( Array.isArray( this.input['else-if'] ) && this.input['else-if'].length )
        this.input['else-if'].forEach( each => {
          if( !each.by ) return
          
          this.static.$contents = each.renderer.mesh({})
          elseifMatch = true
        } )
      
      // Render -- else or No fallback
      if( !elseifMatch  )
        this.static.$contents = this.input.else ? this.input.else.renderer.mesh({}) : $('<!---[EIEP]--->')
    }

    this.input.renderer?.replaceWith( this.static.$contents )
  },
  onAttach(){
    this.static.$contents?.length && this.input.renderer?.replaceWith( this.static.$contents )
  }
}

export default `<!---[EIEP]--->`