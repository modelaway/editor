import type { ViewDefinition } from '../types/view'

const 
options: Record<string, QuicksetOption> = {},

Block: ViewDefinition = {
  type: 'block',
  name: 'block',
  tagname: 'div',
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
  
  quickset(){
    return options
  }
}

/**
 * Block view (div) 
 */
export default Block
