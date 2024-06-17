import Modela from '../exports/modela'
import * as bx from '../modules/block.factory'
import * as constants from '../modules/constants'

export interface PluginFactory {
  constants: typeof constants
  flux: Modela
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