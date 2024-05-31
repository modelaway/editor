
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
export const VIEW_CONTROL_OPTIONS: ObjectType<ToolbarSet> = {
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
export const GLOBAL_CONTROL_OPTIONS: ObjectType<ToolbarSet> = {
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