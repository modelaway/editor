import type Lips from './lips'
import type Component from './component'

export type LanguageDictionary = Record<string, Record<string, string> | string>
export type VariableScope = Record<string, { value: any, type: 'let' | 'const' }>

export type DeclarationTagType = 'sibling' | 'child'
export type DeclarationTag = {
  type: DeclarationTagType
  many?: boolean
}
export type Declaration = {
  name: string
  contents?: boolean
  tags?: Record<string, DeclarationTag>
}
export interface Handler<Input = void, State = void, Static = void, Context = void> {
  onCreate?: ( this: Component<Input, State, Static, Context> ) => void
  onInput?: ( this: Component<Input, State, Static, Context>, input: Input ) => void
  onMount?: ( this: Component<Input, State, Static, Context> ) => void
  onRender?: ( this: Component<Input, State, Static, Context> ) => void
  onUpdate?: ( this: Component<Input, State, Static, Context> ) => void

  [index: string]: ( this: Component<Input, State, Static, Context>, ...args: any[] ) => void
}
export type Template<Input = void, State = void, Static = void, Context = void> = {
  default: string
  state?: any
  _static?: any
  context?: any
  handler?: Handler<Input, State, Static, Context>
  stylesheet?: string
  macros?: Record<string, string>
  declaration?: Declaration
}
export type ComponentScope<Input = void, State = void, Static = void, Context = void> = {
  input?: any
  state?: any
  context?: string[]
  _static?: Static
  handler?: Handler<Input, State, Static, Context>
  stylesheet?: string
  macros?: Record<string, string>
  declaration?: Declaration
}
export type ComponentOptions = {
  debug?: boolean
  prekey?: string
  lips?: Lips
  enableTemplateCache?: boolean
  enableSmartDiff?: boolean
}
export type LipsConfig = {
  context?: any
  debug?: boolean
  watchdom?: boolean
}
export type StyleSettings = {
  sheet?: string
  meta?: boolean
  custom?: {
    enabled: boolean
    allowedRules: string[]
    allowedProperties: string[]
  }
}
export type EventListener = ( ...args: any[] ) => void

/**
 * (FGU) Fine-Grain Update Dependencies
 */
export type FGUDependency = {
  $node: Cash,
  update: ( scope?: VariableScope ) => void
}
export type FGUDependencies = Map<string, Set<FGUDependency>>

export type RenderedNode = {
  _$: Cash
  dependencies: FGUDependencies
}
export interface MeshRender {
  argv: string[]
  partial?: RenderedNode
  mesh( argv?: VariableScope ): Cash
  update( argv: VariableScope ): Cash
}
export type MeshTemplate = Record<string, any> & {
  render: MeshRender
}
