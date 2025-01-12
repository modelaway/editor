import type { ViewComponent } from '../types/view'

const
options: Record<string, QuicksetOption> = {},

Button: ViewComponent = {
  name: 'button',
  node: 'button',
  category: 'block',
  caption: {
    icon: 'bx bx-dice-2',
    title: 'Button',
    description: 'Clickable action button view component'
  },
  attributes: {},
  
  render(){
    return `<button><span lang>Click me</span></button>`
  },
  takeover( view ){
    view.events
    .on('quickset.show', () => {})
    .on('menu.show', () => {})
  },
  dismiss( view ){}
}

/**
 * Button view (button) 
 */
export default Button
