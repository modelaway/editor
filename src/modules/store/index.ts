import type Editor from '../editor'
import ViewStore from './views'
import ToolStore from './tools'

export default class Store {
  public tools: ToolStore
  public views: ViewStore

  constructor( editor: Editor ){
    /**
     * General settings inherited from Modela
     */

    this.tools = new ToolStore( editor )

    this.views = new ViewStore( editor )
  }

  /**
   * Reset store to initial state
   */
  drop(){
    this.views.clear()
  }
}
