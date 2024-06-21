import type { ViewComponent, ViewBridge } from '../types/view'

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
  'line-through': {
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
}

function activate( view: ViewBridge ){
  return async () => {
    await view.$?.attr('contenteditable', 'true')
  }
}
function apply( view: ViewBridge ){
  return async ( attr: string, value: any ) => {
    const viewStyle = await view.css?.style()

    switch( attr ){
      // Font weight style
      case 'bold': {
        if( value === 'BINARY_SWITCH' ){
          if( !viewStyle ) return
          const isBold = viewStyle['font-weight'] === 'bold'

          view.$.css({ 'font-weight': !isBold ? 'bold' : 'normal' })
          // Update toolbar options
          view.fn.updateToolbar({ 'bold.active': !isBold })
        }
        else {
          view.$.css({ 'font-weight': 'bold' })
          // Update toolbar options
          view.fn.updateToolbar({ 'bold.active': true })
        }
      } break

      // Font style
      case 'italic': {
        if( value === 'BINARY_SWITCH' ){
          if( !viewStyle ) return
          const isItalic = viewStyle['font-style'] === 'italic'

          view.$.css({ 'font-style': !isItalic ? 'italic' : 'normal' })
          // Update toolbar options
          view.fn.updateToolbar({ 'italic.active': !isItalic })
        }
        else {
          view.$.css({ 'font-style': 'italic' })
          // Update toolbar options
          view.fn.updateToolbar({ 'italic.active': true })
        }
      } break

      // Text decoration style
      case 'underline': 
      case 'line-through': {
        if( value === 'BINARY_SWITCH' ){
          if( !viewStyle ) return
          const isApplied = viewStyle['text-decoration'] === attr

          view.$.css({ 'text-decoration': !isApplied ? attr : 'none' })
          // Update toolbar options
          view.fn.updateToolbar({
            'underline.active': attr == 'underline' && !isApplied,
            'line-through.active': attr == 'line-through' && !isApplied
          })
        }
        else {
          view.$.css({ 'text-decoration': attr })
          // Update toolbar options
          view.fn.updateToolbar({
            'underline.active': attr == 'underline',
            'line-through.active': attr == 'line-through'
          })
        }
      } break

      case 'alignment.top':
      case 'alignment.left':
      case 'alignment.center':
      case 'alignment.justify': {
        view.$.css({ 'text-align': attr.split('.')[1] })
        // Update toolbar options
        view.fn.updateToolbar({
          'alignment.top.active': attr == 'alignment.top',
          'alignment.left.active': attr == 'alignment.left',
          'alignment.center.active': attr == 'alignment.center',
          'alignment.justify.active': attr == 'alignment.justify',
        })
      } break
    }
  }
}

const Text: ViewComponent = {
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
    // Access to style data
    console.log( await view.css?.custom() )
    console.log( await view.css?.style() )

    // Interaction events
    view.events
    .on('show.toolbar', () => {})
    .on('show.panel', () => {})

    .on('view.styles', async data => await view.$?.css( data ) )
    .on('global.styles', async data => await view.$?.css( data ) )

    .on('activate', activate( view ) )
    .on('apply', apply( view ) )
  },
  dismiss( view ){
    view.$?.removeAttr('contenteditable')
  },
  
  styles( view ){
    return {
      css: `
        min-width: 1.3rem;
        font-size: inherit;
        display: inline-block;
        content: "Loren upsum";
        
        &[contenteditable] { outline: none; }
        /* &:active { color: var(--primary-color); } */
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