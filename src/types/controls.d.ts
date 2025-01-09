import type Editor from '../modules/editor'

export interface HandlerHook {
  editor?: Editor
  events?: EventEmitter
  metacall?: ( key: string, data?: any ) => void
}