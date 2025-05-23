import type { ViewDefinition } from '../types/view'

const options: Record<string, QuicksetOption> = {
  upload: {
    icon: 'bx bx-image-add',
    title: 'Add image'
  }
}

const Image: ViewDefinition = {
  type: 'media',
  name: 'image',
  tagname: 'img',
  caption: {
    icon: 'bx bx-image',
    title: 'Image',
    description: 'Picture HTML native tag'
  },
  attributes: {},
  
  render(){
    return `<picture>
      <!-- Low-resolution image for small screens -->
      <!-- <source media="(max-width: 600px)" srcset="image-small.jpg"> -->
      <!-- High-resolution image for larger screens -->
      <!-- <source media="(min-width: 601px)" srcset="image-large.jpg"> -->
      <!-- Default fallback image -->
      <img src="image-default.jpg" alt="Responsive Image">
    </picture>`
  },
  takeover( view ){
    view.events
    .on('quickset.show', () => console.log('-- event: quickset.show') )
    .on('menu.show', () => {})

    // .on('upload', async param => {
    //   const files = await view.fn.selectFile({ id: '1234' })
    //   view.fn.debug('-- async: ', files )

    //   await view.$?.attr('src', files[0].src )
    //   view.fn.pushHistoryStack()
    // })
  },

  quickset(){
    return options
  }
}

/**
 * Block view (div) 
 */
export default Image
