import type { ViewComponent } from '../types/view'

const
quicksetOptions: Record<string, QuicksetOption> = {
  bold: { 
    icon: 'bx bx-bold',
    title: 'Bold',
    shortcut: 'command + alt + b'
  },
  italic: { 
    icon: 'bx bx-italic',
    title: 'Italic'
  },
  underline: { 
    icon: 'bx bx-underline',
    title: 'Underline'
  },
  strikethrough: {
    icon: 'bx bx-strikethrough',
    title: 'Stike'
  },
  'font-color': {
    icon: 'bx bx-font-color',
    title: 'Font Color'
  },
  alignment: { 
    icon: 'bx bx-align-justify',
    title: 'Alignment',
    sub: {
      left: {
        icon: 'bx bx-align-left',
        title: 'Align Left',
        active: true
      },
      center: {
        icon: 'bx bx-align-middle',
        title: 'Align Center'
      },
      right: {
        icon: 'bx bx-align-right',
        title: 'Align Right'
      },
      justify: {
        icon: 'bx bx-align-justify',
        title: 'Align Justify'
      }
    }
  }
},
menuOptions: MenuSections = {
  attributes: {
    icon: 'bx bx-edit-alt',
    title: 'Properties',
    active: true,
    fieldsets: [
      {
        label: 'Link',
        fields: [
          { type: 'text', name: 'title', label: 'External link or existing page', placeholder: 'http://example.com/to/page' },
          { type: 'text', name: 'info', label: 'Title' },
          { type: 'checkbox', name: 'target', label: 'Open in new tab' },
          { type: 'checkbox', name: 'animation', label: 'Animation', value: true, disabled: true }
        ]
      }
    ],
    listsets: [
      {
        label: 'More options',
        items: [
          {
            icon: 'bx bx-text',
            title: 'Text style',
            value: '14px bold',
            shortcut: 'alt + b',
            sub: [],
            disabled: false
          },
          { 
            icon: 'bx bx-align-justify',
            title: 'Alignment',
            shortcut: 'alt + b',
            value: 'Center',
            disabled: true
          }
        ]
      }
    ]
  },
  styles: {
    icon: 'bx bxs-brush',
    title: 'Styles',
    fieldsets: []
  },
  actions: {
    icon: 'bx bxs-zap',
    title: 'Actions',
    fieldsets: []
  },
  info: {
    icon: 'bx bx-info-circle',
    title: 'Information',
    fieldsets: []
  },
  more: {
    icon: 'bx bx-dots-horizontal-rounded',
    title: 'More Options',
    fieldsets: [],
    more: true
  }
},

Paragraph: ViewComponent = {
  name: 'paragraph',
  node: 'p',
  category: 'text',
  caption: {
    icon: 'bx bx-paragraph',
    title: 'Paragraph',
    description: 'Paragraph text area view component'
  },
  attributes: {},

  render( view ){
    return `<p lang>Loren upsum</p>`
  },
  async takeover( view ){
    view.events
    .on('quickset.show', () => {})
    .on('quickset.handle', ( key, option ) => {
      console.log('p -- handle option --', key, option )

      /**
       * Sync quickset with applied changes status
       */
      view.fn.syncQuickset({ [`${key}.active`]: !option.active }, () => {
        quicksetOptions[ key ].active = !option.active
      })
      /**
       * Push history stack for reversable actions
       */
      view.fn.pushHistoryStack()
    })
    .on('menu.show', () => {})

    .on('view.styles', data => view.$?.css( data ) )
    .on('global.styles', data => view.$?.css( data ) )

    .on('activate', data => view.$?.attr('contenteditable', 'true') )

    console.log( view.css?.custom() )
    console.log( view.css?.style() )
  },
  dismiss( view ){
    view.$?.removeAttr('contenteditable')
  },

  styles( view ){
    
    return {
      sheet: `
        /* width: 100%; */
        font-size: inherit;
        content: "Loren upsum";
        color: var(--primary-color);
        
        &[contenteditable] { outline: none; }
      `,
      custom: {
        enabled: true,
        allowedRules: [],
        allowedProperties: []
      }
    }
  },
  quickset( view ){
    return quicksetOptions
  },
  menu( view ){
    return menuOptions
  }
}

/**
 * Paragraph view (p) 
 */
export default Paragraph