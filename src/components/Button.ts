const toolbar: ToolbarSet[] = []

const Button: ViewComponent = {
  name: 'button',
  node: 'button',
  caption: {
    icon: 'bx bx-paragraph',
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
