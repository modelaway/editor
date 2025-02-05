import type { Component } from './lips'
import type Lips from './lips'

export type LanguageDictionary = Record<string, Record<string, string> | string>
export type VariableScope = Record<string, { value: any, type: 'let' | 'const' }>

export interface Handler<Input = void, State = void, Static = void, Context = void> {
  onCreate?: ( this: Component<Input, State, Static, Context> ) => void
  onInput?: ( this: Component<Input, State, Static, Context>, input: Input ) => void
  onMount?: ( this: Component<Input, State, Static, Context> ) => void
  onRender?: ( this: Component<Input, State, Static, Context> ) => void
  onUpdate?: ( this: Component<Input, State, Static, Context> ) => void

  [index: string]: ( this: Component<Input, State, Static, Context>, ...args: any[] ) => void
}
export type Template<Input = void, State = void, Static = void, Context = void> = {
  state?: any
  _static?: any
  context?: any
  handler?: Handler<Input, State, Static, Context>
  stylesheet?: string
  macros?: Record<string, string>
  default: string
}
export type ComponentScope<Input = void, State = void, Static = void, Context = void> = {
  input?: any
  state?: any
  context?: string[]
  _static?: Static
  handler?: Handler<Input, State, Static, Context>
  stylesheet?: string
  macros?: Record<string, string>
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
