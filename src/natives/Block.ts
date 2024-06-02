import type { ViewComponent } from '../types/view'

const 
toolbar: ObjectType<ToolbarOption> = {},

Block: ViewComponent = {
  name: 'block',
  node: 'div',
  category: 'block',
  caption: {
    icon: 'bx bx-rectangle',
    title: 'Div',
    description: 'Division block HTML native tag'
  },
  attributes: {},
  
  render(){
    return `<div></div>`
  },
  takeover( view ){
    view.events
    .on('show.toolbar', () => {})
    .on('show.panel', () => {})
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
