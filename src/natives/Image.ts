import type { ViewComponent } from '../types/view'

const toolbar: ObjectType<ToolbarOption> = {
  upload: {
    icon: 'bx bx-image-add',
    title: 'Add image',
    event: {
      type: 'on',
      params: 'image'
    }
  }
}

const Image: ViewComponent = {
  name: 'image',
  node: 'img',
  category: 'media',
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
    .on('show.toolbar', () => console.log('-- event: show.toolbar') )
    .on('show.panel', () => {})

    .on('upload', async param => {
      const files = await view.fn.selectFile({ id: '1234' })
      view.fn.debug('-- async: ', files )

      view.$?.attr('src', files[0].src )
    })
  },
  dismiss( view ){},

  toolbar(){
    return toolbar
  }
}

/**
 * Block view (div) 
 */
export default Image
