const toolbar: ToolbarSet[] = []

const Div: ViewComponent = {
  name: 'block',
  node: 'div',
  category: 'block',
  caption: {
    icon: 'bx bx-rectangle',
    title: 'Div',
    description: 'Division block HTML native tag'
  },
  attributes: {},
  toolbar(){
    return toolbar
  },
  
  render(): string {
    return `<div></div>`
  }
}

/**
 * Block view (div) 
 */
export default Div
