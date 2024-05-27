const toolbar: ToolbarSet[] = []

const Button: ViewComponent = {
  name: 'button',
  node: 'button',
  category: 'block',
  caption: {
    icon: 'bx bx-dice-2',
    title: 'Button',
    description: 'Clickable action button view component'
  },
  attributes: {},
  toolbar(){
    return toolbar
  },
  
  render(): string {
    return `<button>Click me</button>`
  }
}

/**
 * Button view (button) 
 */
export default Button
