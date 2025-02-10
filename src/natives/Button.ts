import type { ViewDefinition } from '../types/view'

const
options: Record<string, QuicksetOption> = {},

Button: ViewDefinition = {
  type: 'block',
  name: 'button',
  tagname: 'button',
  caption: {
    icon: 'bx bx-dice-2',
    title: 'Button',
    description: 'Clickable action button view definition'
  },
  attributes: {},
  
  render(){
    return `<button><span lang>Click me</span></button>`
  },
  takeover( view ){
    view.events
    .on('quickset.show', () => {})
    .on('menu.show', () => {})
  }
}

/**
 * Button view (button) 
 */
export default Button
