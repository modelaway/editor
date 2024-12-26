import type { Component } from './lips'

export type TObject<T> = { [index: string]: T }
export type LanguageDictionary = ObjectType<ObjectType<string> | string>
export type VariableScope = TObject<{ value: any, type: 'let' | 'const' }>

export interface Handler<Input = void, State = void, Static = void, Context = void> {
  [index: string]: ( this: Component<Input, State, Static, Context>, ...args: any[] ) => void
}
export type Template<Input = void, State = void, Static = void, Context = void> = {
  state?: any
  _static?: any
  context?: any
  handler?: Handler<Input, State, Static, Context>
  stylesheet?: string
  default: string
}
export type ComponentScope<Input = void, State = void, Static = void, Context = void> = {
  input?: any
  state?: any
  context?: string[]
  _static?: Static
  handler?: Handler<Input, State, Static, Context>
  stylesheet?: string
  macros?: TObject<string>
}
export type ComponentOptions = {
  debug?: boolean
  prekey?: string
  lips?: Lips
}
export type LipsConfig = {
  context?: any
  debug?: boolean
}
export type StyleSettings = {
  css?: string
  meta?: boolean
  custom?: {
    enabled: boolean
    allowedRules: string[]
    allowedProperties: string[]
  }
}
export type EventListener = ( ...args: any[] ) => void
