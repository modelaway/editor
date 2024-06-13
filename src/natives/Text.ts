import type { ViewComponent } from '../types/view'

const
toolbarOptions: ObjectType<ToolbarOption> = {
  bold: { 
    icon: 'bx bx-bold',
    title: 'Bold',
    event: {
      type: 'apply',
      params: 'BINARY_SWITCH',
      shortcut: 'command + alt + b'
    }
  },
  italic: { 
    icon: 'bx bx-italic',
    title: 'Italic',
    event: {
      type: 'apply',
      params: 'BINARY_SWITCH',
      shortcut: 'command + alt + i'
    }
  },
  underline: { 
    icon: 'bx bx-underline',
    title: 'Underline',
    event: {
      type: 'apply',
      params: 'BINARY_SWITCH',
      shortcut: 'command + alt + u'
    }
  },
  strikethrough: {
    icon: 'bx bx-strikethrough',
    title: 'Stike',
    event: {
      type: 'apply',
      params: 'BINARY_SWITCH',
      shortcut: 'command + alt + s'
    }
  },
  'font-color': {
    icon: 'bx bx-font-color',
    title: 'Font Color',
    event: {
      type: 'apply',
      params: 'BINARY_SWITCH',
      shortcut: 'command + alt + c'
    }
  },
  alignment: { 
    icon: 'bx bx-align-justify',
    title: 'Alignment',
    sub: {
      left: {
        icon: 'bx bx-align-left',
        title: 'Align Left',
        event: {
          type: 'apply',
          params: true
        },
        active: true
      },
      center: {
        icon: 'bx bx-align-middle',
        title: 'Align Center',
        event: {
          type: 'apply',
          params: true
        }
      },
      right: {
        icon: 'bx bx-align-right',
        title: 'Align Right',
        event: {
          type: 'apply',
          params: true
        }
      },
      justify: {
        icon: 'bx bx-align-justify',
        title: 'Align Justify',
        event: {
          type: 'apply',
          params: true
        }
      }
    }
  }
},
panelOptions: PanelSections = {
  attributes: {
    icon: 'bx bx-edit-alt',
    title: 'Properties',
    active: true,
    fieldsets: [
      {
        label: 'Link',
        seperate: true,
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
            event: {
              type: 'show',
              attr: 'panel',
              params: 'sub',
              shortcut: 'alt + b'
            },
            sub: [],
            disabled: false
          },
          { 
            icon: 'bx bx-align-justify',
            title: 'Alignment',
            event: {
              type: 'show',
              attr: 'panel',
              params: 'sub',
              shortcut: 'alt + b'
            },
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

Text: ViewComponent = {
  name: 'text',
  node: 'span',
  category: 'text',
  caption: {
    icon: 'bx bx-text',
    title: 'Inline Text',
    description: 'Short inline text view component'
  },
  attributes: {},

  render( view ){
    return `<span lang>Loren upsum</span>`
  },
  async takeover( view ){
    view.events
    .on('show.toolbar', () => {})
    .on('show.panel', () => {})

    .on('view.styles', async data => await view.$?.css( data ) )
    .on('global.styles', async data => await view.$?.css( data ) )

    .on('activate', async data => await view.$?.attr('contenteditable', 'true') )

    console.log( await view.css?.custom() )
    console.log( await view.css?.style() )
  },
  dismiss( view ){
    view.$?.removeAttr('contenteditable')
  },
  
  styles( view ){

    return {
      css: `
        --active-bg-color: rgba(100, 100, 100, 0.2);
        --active-border-radius: 3px;
        --active-transition: 200ms;

        min-width: 1.3rem;
        font-size: inherit;
        display: inline-block;
        content: "Loren upsum";
        
        &[contenteditable] { outline: none; }
        &:active { color: var(--primary-color); }
      `,
      custom: {
        enabled: true,
        allowedRules: [],
        allowedProperties: []
      }
    }
  },
  toolbar( view ){

    return toolbarOptions
  },
  panel( view ){

    return panelOptions
  }
}

/**
 * Text view (span) 
 */
export default Text