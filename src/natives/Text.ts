import type { ViewDefinition, ViewInstance } from '../types/view'

const
quicksetOptions: Record<string, QuicksetOption> = {
  bold: { 
    icon: 'bx bx-bold',
    title: 'Bold'
  },
  italic: { 
    icon: 'bx bx-italic',
    title: 'Italic'
  },
  underline: { 
    icon: 'bx bx-underline',
    title: 'Underline'
  },
  'line-through': {
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
            sub: [],
            disabled: false
          },
          { 
            icon: 'bx bx-align-justify',
            title: 'Alignment',
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

function apply( view: ViewInstance ){
  return async ( attr: string, value: any ) => {
    const viewStyle = await view.css?.style()

    switch( attr ){
      // Font weight style
      case 'bold': {
        if( value === 'BINARY_SWITCH' ){
          if( !viewStyle ) return
          const isBold = viewStyle['font-weight'] === 'bold'

          view.$?.css({ 'font-weight': !isBold ? 'bold' : 'normal' })
          // Update quickset options
          view.fn.syncQuickset({ 'bold.active': !isBold })
        }
        else {
          view.$?.css({ 'font-weight': 'bold' })
          // Update quickset options
          view.fn.syncQuickset({ 'bold.active': true })
        }
      } break

      // Font style
      case 'italic': {
        if( value === 'BINARY_SWITCH' ){
          if( !viewStyle ) return
          const isItalic = viewStyle['font-style'] === 'italic'

          view.$?.css({ 'font-style': !isItalic ? 'italic' : 'normal' })
          // Update quickset options
          view.fn.syncQuickset({ 'italic.active': !isItalic })
        }
        else {
          view.$?.css({ 'font-style': 'italic' })
          // Update quickset options
          view.fn.syncQuickset({ 'italic.active': true })
        }
      } break

      // Text decoration style
      case 'underline': 
      case 'line-through': {
        if( value === 'BINARY_SWITCH' ){
          if( !viewStyle ) return
          const isApplied = viewStyle['text-decoration'] === attr

          view.$?.css({ 'text-decoration': !isApplied ? attr : 'none' })
          // Update quickset options
          view.fn.syncQuickset({
            'underline.active': attr == 'underline' && !isApplied,
            'line-through.active': attr == 'line-through' && !isApplied
          })
        }
        else {
          view.$?.css({ 'text-decoration': attr })
          // Update quickset options
          view.fn.syncQuickset({
            'underline.active': attr == 'underline',
            'line-through.active': attr == 'line-through'
          })
        }
      } break

      case 'alignment.top':
      case 'alignment.left':
      case 'alignment.center':
      case 'alignment.justify': {
        view.$?.css({ 'text-align': attr.split('.')[1] })
        // Update quickset options
        view.fn.syncQuickset({
          'alignment.top.active': attr == 'alignment.top',
          'alignment.left.active': attr == 'alignment.left',
          'alignment.center.active': attr == 'alignment.center',
          'alignment.justify.active': attr == 'alignment.justify',
        })
      } break
    }
  }
}

const Text: ViewDefinition = {
  type: 'text',
  name: 'text',
  tagname: 'span',
  caption: {
    icon: 'bx bx-text',
    title: 'Inline Text',
    description: 'Short inline text view definition'
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
    .on('quickset.show', () => {})
    .on('menu.show', () => {})

    .on('view.styles', async data => await view.$?.css( data ) )
    .on('global.styles', async data => await view.$?.css( data ) )

    .on('activate', () => view.$?.attr('contenteditable', 'true') )
    .on('deactivate', () => view.$?.removeAttr('contenteditable') )
    .on('apply', apply( view ) )
  },
  
  styles( view ){
    return {
      sheet: `
        min-width: 1.3rem;
        font-size: inherit;
        display: inline;
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
  quickset( view ){
    return quicksetOptions
  },
  menu( view ){
    return menuOptions
  }
}

/**
 * Text view (span) 
 */
export default Text