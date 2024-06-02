import type { ViewComponent } from '../types/view'

const
toolbar: ObjectType<ToolbarOption> = {},

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
    return `<button>Click me</button>`
  },
  takeover( view ){
    view.events
    .on('show.toolbar', () => {})
    .on('show.panel', () => {})
  },
  dismiss( view ){}
}

/**
 * Button view (button) 
 */
export default Button
