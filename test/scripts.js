
import Modela from '../dist/modela.min.js'
import ModelaNativesLoader from '../dist/natives.loader.min.js'

const 
editor = new Modela({
  // viewOnly: true,
  hoverSelect: true
}),
// Load in-build components: view-component, toolbar options, ...
natives = ModelaNativesLoader( editor )
natives.load()

// Register custom view component
editor.store.addComponent({
  name: 'card',
  node: 'div.card',
  attributes: {
    header: true
  },

  styles(){},

  render( props, global ){
    const
    headerProps = {
      selector: '.card-header',
      /**
       * Define the caption of header to help 
       * users know how it should be used.
       */
      caption: {
        title: global.i18n('Card Header'),
        description: global.i18n('Usually contain the title of the body content'),
        posters: [
          { type: 'image', src: '...', info: global.i18n('Example of header with a title and subtitle') }
        ]
      },
      /**
       * Tells whether to add new views to this
       * block.
       */
      addView: true,
      /**
       * Define an option list of view content types that
       * could be added to this block.
       * 
       * Default: any (if `addView` param is set to true)
       */
      allowedViewTypes: ['inline', 'icon']
    },
    bodyProps = {
      selector: '.card-body',
      caption: {
        title: 'Card Body',
        description: 'Contain the main body content',
        posters: [
          { type: 'image', src: '...', info: 'Example of text body content' }
        ],
      },
      addView: true
    },
    footerProps = {
      selector: '.card-footer',
      caption: {
        title: 'Card Header',
        description: 'Usually contain the actions or additional details about the body content',
        posters: [
          { type: 'image', src: '...', info: 'Illustration of action footer style' }
        ]
      },
      addView: true,
      allowedViewTypes: ['inline', 'icon', 'button']
    },
    cardProps = {
      caption: {
        title: 'Card',
        description: 'Insert card component into your UI',
        posters: [
          { type: 'image', src: '...', info: 'Plain card design illustration' }
        ]
      }
    }

    header = `<div class="card-header">${global.defineProperties( headerProps )}</div>`,
    footer = `<div class="card-footer">${global.defineProperties( footerProps )}</div>`,

    { primaryColor, borderWidth } = global.styles

    return `<div class="card bg-primary-${primaryColor.value}">
      ${global.defineProperties( cardProps )}

      <div class="card-content">
        ${props.attributes.header ? header : ''}
        <div class="card-body">${global.defineProperties( bodyProps )}</div>
        ${props.attributes.footer ? footer : ''}
      </div>
    </div>`
  },
  
  apply( e ){
    /**
     * e.type
     * e.dataset
     * e.view
     */
    console.log( e )
  },

  activate( e ){
    /**
     * e.type
     * e.dataset
     * e.view
     */
    console.log( e )
  },

  styles(){},
  
  translation: {
    en: {
      'Card Header': 'Card Header',
      'Usually contain the title of the body content': 'Usually contain the title of the body content',
      'Example of header with a title and subtitle': 'Example of header with a title and subtitle'
    },
    fr: {
      'Card Header': 'Entête de carte',
      'Usually contain the title of the body content': 'Contient souvent le title du contenu principal',
      'Example of header with a title and subtitle': 'Exemple d\'entête avec un titre et un sous-title'
    }
  }
})

editor.mount('.editor')

// setTimeout( () => editor.propagateUpdate('global.styles', { fontSize: '20px' }), 3000 )
$('#add-card').on('click', () => editor.views.add('card', '1234567890') )

// setTimeout( () => natives.unload(), 5000 )