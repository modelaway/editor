import type { Declaration, Handler, MeshRenderer, MeshTemplate } from '..'
import $, { type Cash } from 'cash-dom'

export const declaration: Declaration = {
  name: 'switch',
  syntax: true,
  contents: true,
  tags: {
    'case': { type: 'child', many: true },
    'default': { type: 'child' }
  }
}

export interface Input {
  by: string
  case: (MeshTemplate & { is: string | string[] })[]
  renderer: MeshRenderer
  default?: MeshTemplate
}
export interface Static {
  $case: Cash | null
}

export const _static: Static = {
  $case: null
}

export const handler: Handler<Input, void, Static> = {
  onInput(){
    let validCases: string[] = []

    for( const _case of this.input.case ){
      if( _case.is == this.input.by || ( Array.isArray( _case.is ) && _case.is.includes( this.input.by ) ) ){
        Array.isArray( _case.is ) ? 
                // Array case value: Merge with valid cases
                validCases = [ ...(new Set([ ...validCases, ..._case.is ]) )]
                // String case value
                : validCases.push( _case.is )

        this.static.$case = _case.renderer.mesh({})
      }
    }

    if( !validCases.includes( this.input.by )  )
      this.static.$case = this.input.default ? this.input.default.renderer.mesh({}) : $('<!--[ESCP]-->')

    this.input.renderer?.replaceWith( this.static.$case )
  },
  onAttach(){
    this.static.$case?.length && this.input.renderer?.replaceWith( this.static.$case )
  }
}

export default `<!---[ESCP]--->`