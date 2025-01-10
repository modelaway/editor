import type { ViewComponent } from '../types/view'

const 
options: ObjectType<QuicksetOption> = {},

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
    .on('quickset.show', () => {})
    .on('menu.show', () => {})
  },
  dismiss( view ){},

  quickset(){
    return options
  }
}

/**
 * Block view (div) 
 */
export default Block
