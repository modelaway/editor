import type Lips from './lips'
import type Component from './component'

export type LanguageDictionary = Record<string, Record<string, string> | string>
export type VariableScopeSet = {
  value: any
  type: 'let' | 'const'
}
export type VariableScope = Record<string, VariableScopeSet>

export type DeclarationTagType = 'nexted' | 'child'
export type DeclarationTag = {
  type: DeclarationTagType
  many?: boolean
}
export type Declaration = {
  name: string
  syntax?: boolean
  iterator?: boolean
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
  default?: string
  state?: any
  _static?: any
  context?: any
  macros?: string
  handler?: Handler<Input, State, Static, Context>
  stylesheet?: string
  declaration?: Declaration
}
export type ComponentScope<Input = void, State = void, Static = void, Context = void> = {
  input?: any
  state?: any
  context?: string[]
  _static?: Static
  macros?: string
  handler?: Handler<Input, State, Static, Context>
  stylesheet?: string
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

export type Metavars<I, S, C> = { 
  state: S,
  input: I,
  context: C
}

export type Macro = {
  argv: string[]
  $node: Cash
}

export type VirtualEvent = {
  $fragment: Cash
  _event: string
  instruction: string
  scope?: Record<string, any>
}
export type VirtualEventRecord<T> = {
  element: Cash | T
  _event: string
}
/**
 * (FGU) Fine-Grain Update Dependencies
 */
export interface FGUSync {
  $fragment?: Cash
  cleanup?: () => void
}
export interface FGUDependency {
  path: string
  $fragment: Cash | null
  batch?: boolean
  syntax?: boolean
  partial?: string[]
  memo: VariableScope
  update: ( memo: VariableScope, by?: string ) => FGUSync | void
}
export type FGUDependencies = Map<string, Map<string, FGUDependency>>

export type RenderedNode = {
  $log: Cash
  dependencies: FGUDependencies
  events?: VirtualEvent[]
}
export type FragmentBoundaries = {
  start: Comment
  end: Comment
}
export interface MeshRenderer {
  path: string | null
  argv: string[]
  mesh( argv?: VariableScope ): Cash
  update( argv: VariableScope ): Cash
  // replaceWith( $fragment: Cash ): void
}
export type MeshTemplate = Record<string, any> & {
  renderer: MeshRenderer
}
export interface MeshWireSetup {
  argv: string[] = []
  scope: VariableScope = {}
  declaration?: Declaration
  useAttributes: boolean
  
  $node: Cash
  meshPath: string | null

  getFragment(): Cash
  setFragment( $frag ): void
  fragmentPath: string
  fragmentBoundaries: FragmentBoundaries
}