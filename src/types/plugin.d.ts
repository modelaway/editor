import Editor from '../modules/editor'
import * as constants from '../modules/constants'

export interface PluginFactory {
  constants: typeof constants
  editor: Editor
}
export type PluginConfig = Record<string, any>
export interface Plugin {
  name: string
  version: string
  discard: () => void
}
export interface PluginInstance {
  new( factory: PluginFactory, config?: PluginConfig ): Plugin
}