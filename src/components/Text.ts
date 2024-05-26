
const
toolbarOptions: ToolbarSet[] = [
  { 
    icon: 'bx bx-bold',
    title: 'Bold',
    event: {
      type: 'action',
      attr: 'apply',
      params: 'bold',
      shortcut: 'command + alt + b'
    }
  },
  { 
    icon: 'bx bx-italic',
    title: 'Italic',
    event: {
      type: 'action',
      attr: 'apply',
      params: 'italic',
      shortcut: 'command + alt + i'
    }
  },
  { 
    icon: 'bx bx-underline',
    title: 'Underline',
    event: {
      type: 'action',
      attr: 'apply',
      params: 'underline',
      shortcut: 'command + alt + u'
    }
  },
  {
    icon: 'bx bx-strikethrough',
    title: 'Stike',
    event: {
      type: 'action',
      attr: 'apply',
      params: 'strikethrough',
      shortcut: 'command + alt + s'
    }
  },
  {
    icon: 'bx bx-font-color',
    title: 'Font Color',
    event: {
      type: 'action',
      attr: 'apply',
      params: 'font-color',
      shortcut: 'command + alt + c'
    }
  },
  { 
    icon: 'bx bx-align-justify',
    title: 'Alignment',
    event: {
      type: 'toggle',
      attr: 'sub',
      params: 'alignment'
    },
    sub: [
      {
        icon: 'bx bx-align-left',
        title: 'Align Left',
        event: {
          type: 'action',
          attr: 'align',
          params: 'left'
        }
      },
      {
        icon: 'bx bx-align-middle',
        title: 'Align Center',
        event: {
          type: 'action',
          attr: 'align',
          params: 'center'
        }
      },
      {
        icon: 'bx bx-align-right',
        title: 'Align Right',
        event: {
          type: 'action',
          attr: 'align',
          params: 'right'
        }
      },
      {
        icon: 'bx bx-align-justify',
        title: 'Align Justify',
        event: {
          type: 'action',
          attr: 'align',
          params: 'justify'
        }
      }
    ]
  }
]

const panelOptions: PanelSections = {
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
}

const Text: ViewComponent = {
  name: 'text',
  node: 'span',
  caption: {
    icon: 'bx bx-text',
    title: 'Text',
    description: 'Short text view component'
  },
  attributes: {},
  
  styles( e, global ){
    return {
      predefined: {
        options: [],
        css: `
          min-width: 1.3rem;
          font-size: inherit;
          display: inline-block;
          content: "Loren upsum";
          
          &[mv-active="true"]:not([mv-placeholder]) {
            border-radius: var(--me-placeholder-radius);
            background: var(--me-primary-color-fade);
            transition: var(--me-active-transition);
          }
          &[contenteditable] { outline: none; }
        `
      },
      custom: {
        enabled: true,
        required: [],
        options: [],
        css: `
          font-weight: bold;

          &:active { color: green; }
        `
      }
    }
  },

  render( e, global ){
    return `<span>Loren upsum</span>`
  },

  toolbar( e, global ){

    return toolbarOptions
  },

  panel( e, global ){

    return panelOptions
  },

  /**
   * e.type
   * e.dataset
   * e.view
   */
  apply( e ){
    switch( e.type ){
      case 'view.styles': {
        e.view.css( e.dataset )
      } break

      case 'global.styles': {
        e.view.css( e.dataset )
      } break


    }
    
  },

  activate( e, global ){ 
    e.view.attr('contenteditable', 'true')
  },

  dismiss( e, global ){
    e.view.removeAttr('contenteditable')
  },

  actions( e ){}
}

/**
 * Text view (span) 
 */
export default Text