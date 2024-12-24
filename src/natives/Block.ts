import type { ViewComponent } from '../types/view'

const 
toolbar: ObjectType<ToolbarOption> = {},

Block: ViewComponent = {
  name: 'block',
  node: 'div.block',
  category: 'block',
  caption: {
    icon: 'bx bx-rectangle',
    title: 'Custom Block',
    description: 'Custom HTML block as native tag'
  },
  attributes: {},
  
  render(){
    return `<block></block>`
  },
  takeover( view ){
    view.events
    .on('toolbar.show', () => {})
    .on('panel.show', () => {})
  },
  dismiss( view ){},

  toolbar(){
    return toolbar
  }
}

/**
 * Block view (div) 
 */
export default Block
