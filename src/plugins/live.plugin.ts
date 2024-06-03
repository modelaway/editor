import type { Plugin, PluginConfig, PluginFactory } from '../types/plugin'

export default class Fonts implements Plugin {
  public readonly name = 'Live'
  public readonly version = '1.0.0'
  
  constructor( factory: PluginFactory, config?: PluginConfig ){
    
  }
  
  discard(){
    /**
     * Do something before to get discarded
     */
  }
}