
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
export const CONTROL_TOOLBAR_MARGIN = 2
export const CONTROL_ADDPOINT_MARGIN = 10

export const FORM_INPUT_SELECTOR = 'mv-form-input'
export const FORM_SEPERATOR_SELECTOR = 'mv-form-seperator'
/**
 * View control options
 * 
 * - meta
 * - detached
 */
export const VIEW_CONTROL_OPTIONS: ToolbarSet[] = [
  {
    meta: true,
    icon: 'bx bx-square-rounded',
    title: 'View',
    event: {
      type: 'show',
      attr: 'sub-toolbar',
      params: 'view'
    },
    sub: [
      { 
        icon: 'bx bx-copy',
        title: 'Copy',
        event: {
          type: 'action',
          attr: 'copy',
          params: 'view',
          shortcut: 'command + c'
        }
      },
      { 
        icon: 'bx bx-upvote',
        title: 'Move up',
        event: {
          type: 'action',
          attr: 'move',
          params: 'up',
          shortcut: 'command + up'
        }
      },
      { 
        icon: 'bx bx-downvote',
        title: 'Move down',
        event: {
          type: 'action',
          attr: 'move',
          params: 'down',
          shortcut: 'command + down'
        }
      },
      { 
        icon: 'bx bx-move',
        title: 'Move',
        event: {
          type: 'action',
          attr: 'move',
          params: 'any'
        }
      },
      { 
        icon: 'bx bx-duplicate',
        title: 'Duplicate',
        event: {
          type: 'action',
          attr: 'duplicate',
          params: 'view',
          shortcut: 'command + shift + d'
        }
      },
      { 
        icon: 'bx bx-trash',
        title: 'Delete',
        event: {
          type: 'action',
          attr: 'delete',
          params: 'view',
          shortcut: 'command + alt + d'
        }
      }
    ]
  },
  { 
    icon: 'bx bx-grid-alt',
    title: 'Attributes',
    event: {
      type: 'show',
      attr: 'panel',
      params: false,
      shortcut: 'command + alt + a'
    },
    detached: true,
    disabled: false
  }
]

/**
 * Global control options
 */
export const GLOBAL_CONTROL_OPTIONS = [
  { 
    icon: 'bx bx-undo',
    title: 'Undo',
    event: {
      type: 'action',
      attr: 'undo',
      params: false,
      shortcut: 'command + z'
    },
    disabled: true
  },
  { 
    icon: 'bx bx-redo',
    title: 'Redo',
    event: {
      type: 'action',
      attr: 'redo',
      params: false,
      shortcut: 'command + y'
    },
    disabled: true
  },
  { 
    icon: 'bx bx-devices',
    title: 'Device Screens',
    event: {
      type: 'show',
      attr: 'sub-toolbar',
      params: 'screen-mode'
    },
    disabled: false,
    sub: [
      { 
        icon: 'bx bx-mobile-alt',
        title: 'Mobile',
        event: {
          type: 'action',
          attr: 'screen-mode',
          params: 'mobile'
        },
        disabled: false
      },
      { 
        icon: 'bx bx-tab',
        title: 'Tablet',
        event: {
          type: 'action',
          attr: 'screen-mode',
          params: 'tablet'
        },
        disabled: false
      },
      { 
        icon: 'bx bx-desktop',
        title: 'Desktop',
        event: {
          type: 'action',
          attr: 'screen-mode',
          params: 'desktop'
        },
        disabled: false
      },
      { 
        icon: 'bx bx-tv',
        title: 'Tv',
        event: {
          type: 'action',
          attr: 'screen-mode',
          params: 'tv'
        },
        disabled: false
      }
    ]
  },
  { 
    icon: 'bx bx-cog',
    title: 'Settings',
    event: {
      type: 'show',
      attr: 'global',
      params: 'settings',
      shortcut: 'command + shift + s'
    },
    disabled: false
  },
  { 
    icon: 'bx bxs-brush',
    title: 'Styles',
    event: {
      type: 'show',
      attr: 'global',
      params: 'styles',
      shortcut: 'command + shift + c'
    },
    disabled: false,
    extra: true
  },
  { 
    icon: 'bx bx-landscape',
    title: 'Assets',
    event: {
      type: 'show',
      attr: 'global',
      params: 'assets',
      shortcut: 'command + shift + a'
    },
    disabled: false,
    extra: true
  }
]