import type { ViewDefinition } from '../types/view'

const
options: Record<string, QuicksetOption> = {},

Fonticon: ViewDefinition = {
  type: 'media',
  name: 'fonticon',
  tagname: 'icon',
  caption: {
    icon: 'bx bx-dice-2',
    title: 'Button',
    description: 'Clickable action button view definition'
  },
  attributes: {},
  
  render(){
    return `<icon class="<class-def>"></icon>`
  },
  takeover( view ){}
}

/**
 * Button view (button) 
 */
export default Fonticon
