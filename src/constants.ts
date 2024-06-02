
export const CONTROL_ROOT = '#modela'

/**
 * Common selector use to identify view elements
 * in the DOM.
 * 
 * Could be `classname` or `tagname` or `data-*`
 */
export const VIEW_IDENTIFIER = '.view'

export const VIEW_KEY_SELECTOR = 'mv-key'
export const VIEW_REF_SELECTOR = 'mv-ref'
export const VIEW_NAME_SELECTOR = 'mv-name'
export const VIEW_STYLE_SELECTOR = 'mv-style'
export const VIEW_ACTIVE_SELECTOR = 'mv-active'
export const VIEW_CAPTION_SELECTOR = 'mv-caption'
export const VIEW_PLACEHOLDER_SELECTOR = 'mv-placeholder'
export const VIEW_TYPES_ALLOWED_SELECTOR = 'mv-types-allowed'

/**
 * Control layer element selector
 * 
 * NOTE: Only custom attributes
 */
export const CONTROL_PANEL_SELECTOR = 'mv-panel'
export const CONTROL_TOOLBAR_SELECTOR = 'mv-toolbar'
export const CONTROL_DISCRET_SELECTOR = 'mv-discret'
export const CONTROL_FLOATING_SELECTOR = 'mv-floating'
export const CONTROL_BLOCK_SELECTOR = 'mv-control-block'

export const CONTROL_EDGE_MARGIN = 15
export const CONTROL_PANEL_MARGIN = 20
export const CONTROL_TOOLBAR_MARGIN = 6
export const CONTROL_ADDPOINT_MARGIN = 10

export const FORM_INPUT_SELECTOR = 'mv-form-input'
export const FORM_SEPERATOR_SELECTOR = 'mv-form-seperator'

/**
 * View control options
 * 
 * - meta
 * - detached
 */
export const VIEW_CONTROL_OPTIONS: ObjectType<ToolbarOption> = {
  view: {
    meta: true,
    icon: 'bx bx-square-rounded',
    title: 'View',
    sub: {
      copy: { 
        icon: 'bx bx-copy',
        title: 'Copy',
        event: {
          type: 'action',
          params: 'view',
          shortcut: 'command + c'
        }
      },
      'move-up': { 
        icon: 'bx bx-upvote',
        title: 'Move up',
        event: {
          type: 'action',
          params: 'view',
          shortcut: 'command + up'
        }
      },
      'move-down': { 
        icon: 'bx bx-downvote',
        title: 'Move down',
        event: {
          type: 'action',
          params: 'view',
          shortcut: 'command + down'
        }
      },
      move: { 
        icon: 'bx bx-move',
        title: 'Move',
        event: {
          type: 'action',
          params: 'view'
        }
      },
      duplicate: { 
        icon: 'bx bx-duplicate',
        title: 'Duplicate',
        event: {
          type: 'action',
          params: 'view',
          shortcut: 'command + shift + d'
        }
      },
      delete: { 
        icon: 'bx bx-trash',
        title: 'Delete',
        event: {
          type: 'action',
          params: 'view',
          shortcut: 'command + alt + d'
        }
      }
    }
  },
  panel: { 
    icon: 'bx bx-grid-alt',
    title: 'Attributes',
    event: {
      type: 'show',
      params: 'BINARY_SWITCH',
      shortcut: 'command + alt + a'
    },
    detached: true,
    disabled: false
  }
}

/**
 * Global control options
 */
export const GLOBAL_CONTROL_OPTIONS: ObjectType<ToolbarOption> = {
  undo: { 
    icon: 'bx bx-undo',
    title: 'Undo',
    event: {
      type: 'action',
      params: true,
      shortcut: 'command + z'
    },
    disabled: true
  },
  redo: { 
    icon: 'bx bx-redo',
    title: 'Redo',
    event: {
      type: 'action',
      params: true,
      shortcut: 'command + y'
    },
    disabled: true
  },
  'screen-mode': {
    icon: 'bx bx-devices',
    title: 'Device Screens',
    disabled: false,
    sub: {
      mobile: { 
        icon: 'bx bx-mobile-alt',
        title: 'Mobile',
        event: {
          type: 'action',
          params: true
        },
        disabled: false
      },
      tablet: { 
        icon: 'bx bx-tab',
        title: 'Tablet',
        event: {
          type: 'action',
          params: true
        },
        disabled: false
      },
      desktop: { 
        icon: 'bx bx-desktop',
        title: 'Desktop',
        event: {
          type: 'action',
          params: true
        },
        disabled: false
      },
      tv: { 
        icon: 'bx bx-tv',
        title: 'Tv',
        event: {
          type: 'action',
          params: true
        },
        disabled: false
      }
    }
  },
  settings: {
    icon: 'bx bx-cog',
    title: 'Settings',
    event: {
      type: 'show',
      params: 'global',
      shortcut: 'command + shift + s'
    },
    disabled: false
  },
  styles: { 
    icon: 'bx bxs-brush',
    title: 'Styles',
    event: {
      type: 'show',
      params: 'global',
      shortcut: 'command + shift + c'
    },
    disabled: false,
    extra: true
  },
  assets: { 
    icon: 'bx bx-landscape',
    title: 'Assets',
    event: {
      type: 'show',
      params: 'global',
      shortcut: 'command + shift + a'
    },
    disabled: false,
    extra: true
  }
}

/**
 * Default CSS custom properties variables
 */
export const CSS_CUSTOM_VARIABLES: ObjectType<CSSRuleOption> = {
  primaryColor: {
    group: 'palette',
    label: 'Primary Color',
    name: '--primary-color',
    value: '#ff7028',
    display: 'inline',
    customizable: true
  },
  secondaryColor: {
    group: 'palette',
    label: 'Secondary Color',
    name: '--secondary-color',
    value: '#116b1a',
    display: 'inline',
    customizable: true
  },
  accentColor: {
    group: 'palette',
    label: 'Accent Color',
    name: '--accent-color',
    value: '#696969',
    display: 'inline',
    customizable: true
  },
  ambiantColor: {
    group: 'palette',
    label: 'Ambiant Color',
    name: '--ambiant-color',
    value: '#696969',
    display: 'inline',
    customizable: true
  },

  fontFamily: {
    group: 'font',
    label: 'Font Family',
    name: '--font-family',
    value: 'Lexend, Lexend+Deca, Lato, Rubik, sans-serif',
    display: 'dropdown',
    customizable: true
  },
  fontSize: {
    group: 'font',
    label: 'Font Size',
    name: '--font-size',
    values: {
      '*': 'inherit',
      'XXL': 'inherit',
      'XL': 'inherit',
      'LG': 'inherit',
      'MD': 'inherit',
      'SM': 'inherit',
      'XS': 'inherit'
    },
    // options: [
    //   { value: 'inherit', label: 'Auto' },
    //   { value: 'font-lg', label: 'LG' },
    //   { value: 'font-md', label: 'MD' },
    //   { value: 'font-sm', label: 'SM' }
    // ],
    display: 'inline',
    customizable: true
  },
  fontWeight: {
    group: 'font',
    label: 'Font Weight',
    name: '--font-weight',
    value: '400',
    // options: [
    //   { value: '100', hint: 'Thin' },
    //   { value: '200', hint: 'Extra Light' },
    //   { value: '300', hint: 'Light' },
    //   { value: '400', hint: 'Regular' },
    //   { value: '500', hint: 'Medium' },
    //   { value: '600', hint: 'Semi Bold' },
    //   { value: '700', hint: 'Bold' },
    //   { value: '800', hint: 'Extra Bold' },
    //   { value: '900', hint: 'Black' }
    // ],
    // featuredOptions: [ 0, 2, 3, 4, 6 ],
    display: 'inline',
    customizable: true
  },
  lineHeight: {
    group: 'font',
    label: 'Line Spacement (line-height)',
    name: '--line-height',
    value: 1,
    // options: [
    //   { value: 0, hint: 'None' },
    //   { value: 1, hint: '1' },
    //   { value: 2, hint: '1.2' },
    //   { value: 3, hint: '1.3' },
    //   { value: 4, hint: '1.4' },
    //   { value: 5, hint: '1.5' },
    // ],
    display: 'inline',
    customizable: true
  },

  padding: {
    group: 'spacement',
    label: 'Padding',
    name: '--padding',
    values: {
      '*': 0,
      'XXL': 0,
      'XL': 0,
      'LG': 0,
      'MD': 0,
      'SM': 0,
      'XS': 0
    },
    // options: [
    //   { value: 0, hint: 'None' },
    //   { value: 1, hint: '1rem' },
    //   { value: 2, hint: '1.5rem' },
    //   { value: 3, hint: '3rem' },
    //   { value: 4, hint: '3.5rem' },
    //   { value: 5, hint: '4rem' },
    // ],
    display: 'inline',
    customizable: true
  },
  margin: {
    group: 'spacement',
    label: 'Margin',
    name: '--margin',
    values: {
      '*': 0,
      'XXL': 0,
      'XL': 0,
      'LG': 0,
      'MD': 0,
      'SM': 0,
      'XS': 0
    },
    // options: [
    //   { value: 0, hint: 'None' },
    //   { value: 1, hint: '1rem' },
    //   { value: 2, hint: '1.5rem' },
    //   { value: 3, hint: '3rem' },
    //   { value: 4, hint: '3.5rem' },
    //   { value: 5, hint: '4rem' },
    // ],
    display: 'inline',
    customizable: true
  },

  borderColor: {
    group: 'border',
    label: 'Border Color',
    value: '#2e2e2e',
    name: '--border-color',
    // palette: [
    //   { value: 'none', hint: 'None' },
    //   { value: '#2e2e2e', hint: '#2e2e2e' },
    //   { value: '#656565', hint: '#656565' },
    //   { value: '#a9a9a9', hint: '#a9a9a9' }
    // ],
    display: 'inline',
    customizable: true
  },
  borderWidth: {
    group: 'border',
    label: 'Border Width',
    name: '--border-width',
    value: 0,
    // options: [
    //   { value: 0, hint: 'None' },
    //   { value: 1, hint: '1px' },
    //   { value: 2, hint: '2px' },
    //   { value: 3, hint: '3px' }
    // ],
    display: 'inline',
    customizable: true
  },
  borderRadius: {
    group: 'border',
    label: 'Rounded Corner (Border Radius)',
    name: '--border-radius',
    value: 0,
    // options: [
    //   { value: 'none', hint: 'None' },
    //   { value: 'circle', hint: '50%' },
    //   { value: 'rounded', hint: '4px' },
    //   { value: 'rounded-sm', hint: '2px' },
    //   { value: 'rounded-lg', hint: '10px' },
    //   { value: 'rounded-xl', hint: '15px' }
    // ],
    // featuredOptions: [ 0, 1, 2, 3, 4 ],
    display: 'inline',
    customizable: true
  }
}
