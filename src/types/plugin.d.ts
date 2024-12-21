import Editor from '../modules/editor'
import * as bx from '../modules/factory'
import * as constants from '../modules/constants'

export interface PluginFactory {
  constants: typeof constants
  editor: Editor
  bx: typeof bx
}
export type PluginConfig = ObjectType<any>
export interface Plugin {
  name: string
  version: string
  discard: () => void
}
export interface PluginInstance {
  new( factory: PluginFactory, config?: PluginConfig ): Plugin
}