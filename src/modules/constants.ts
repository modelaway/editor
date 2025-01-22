import type { HandleType } from './handles'
import type { MediaScreen } from '../types/frame'
import english from '../languages/en.json'
import french from '../languages/fr.json'

export const EDITOR_EDGE_PADDING = 15 // Pixel

/**
 * Common selector use to identify view elements
 * in the DOM.
 * 
 * Could be `classname` or `tagname` or `data-*`
 */
export const VIEW_KEY_SELECTOR = 'vkey'
export const VIEW_NAME_SELECTOR = 'vname'
export const VIEW_STYLE_SELECTOR = 'vstyle'
export const VIEW_EMPTY_SELECTOR = 'vempty'
export const VIEW_ACTIVE_SELECTOR = 'vactive'
export const VIEW_CAPTION_SELECTOR = 'vcaption'
export const VIEW_TYPES_ALLOWED_SELECTOR = 'vtypes-allowed'

export const FRAME_MIN_WIDTH = 100 // Pixel (px)
export const FRAME_MIN_HEIGHT = 100 // Pixel (px)
export const FRAME_DEFAULT_MARGIN = 140 // Pixel (px)

/**
 * Control layer element selector
 * 
 * NOTE: Only custom attributes
 */
export const CONTROL_LANG_SELECTOR = 'mlang'
export const CONTROL_FRAME_SELECTOR = 'mv-frame'
export const CONTROL_MENU_SELECTOR = 'mv-menu'
export const CONTROL_QUICKSET_SELECTOR = 'mv-quickset'
export const CONTROL_BLOCK_SELECTOR = 'mv-control-block'

export const CONTROL_EDGE_MARGIN = 15
export const CONTROL_MENU_MARGIN = 20
export const CONTROL_QUICKSET_MARGIN = 6
export const CONTROL_ZOOM_DEFAULT_SCALE = 0.08
export const CONTROL_ZOOM_SCALE_STEP = 0.02
export const CONTROL_ZOOOM_EVEN_SCALE = 1
export const CONTROL_ZOOM_MIN_SCALE = 0.01
export const CONTROL_SNAP_GRID_SIZE = 10
export const CONTROL_SNAP_THRESHOLD = 5 // Snapping threshold: Distance within which snapping occurs

export const FORM_INPUT_SELECTOR = 'mv-form-input'
export const FORM_SEPERATOR_SELECTOR = 'mv-form-seperator'

export const ALLOWED_CANVAS_HANDLES: HandleType[] = [
  'pan',
  'zoom',
  'create:wrap',
  'wrap',
  'move:snapguide',
  'resize:snapguide'
]
export const ALLOWED_FRAME_CANVAS_HANDLES: HandleType[] = [
  'create',
  'wrap',
  'move',
  'resize',
  'select',
  'snapguide'
]

/**
 * View control options
 * 
 * - meta
 * - detached
 */
export const VIEW_CONTROL_OPTIONS: Record<string, QuicksetOption> = {
  view: {
    meta: true,
    icon: 'bx bx-square-rounded',
    title: 'View',
    sub: {
      copy: { 
        icon: 'bx bx-copy',
        title: 'Copy',
        shortcut: 'command + c',
        meta: true
      },
      'move-up': { 
        icon: 'bx bx-upvote',
        title: 'Move up',
        shortcut: 'command + up',
        meta: true
      },
      'move-down': { 
        icon: 'bx bx-downvote',
        title: 'Move down',
        shortcut: 'command + down',
        meta: true
      },
      move: { 
        icon: 'bx bx-move',
        title: 'Move',
        meta: true
      },
      duplicate: { 
        icon: 'bx bx-duplicate',
        title: 'Duplicate',
        meta: true
      },
      delete: { 
        icon: 'bx bx-trash',
        title: 'Delete',
        meta: true
      }
    }
  },
  menu: {
    icon: 'bx bx-grid-alt',
    title: 'Attributes',
    shortcut: 'command + alt + a',
    meta: true,
    detached: true,
    disabled: false
  }
}

/**
 * Global control options
 */
export const EDITOR_CONTROL_OPTIONS: Record<string, QuicksetOption> = {
  explore: {
    type: 'input',
    icon: 'bx bx-search',
    title: 'Explore',
    shortcut: 'command + z',
    // value: 'Bloc'
  },
  undo: {
    icon: 'bx bx-undo',
    title: 'Undo',
    shortcut: 'command + z',
    disabled: true
  },
  redo: {
    icon: 'bx bx-redo',
    title: 'Redo',
    shortcut: 'command + y',
    disabled: true
  },
  'frame-add': {
    icon: 'bx bx-plus',
    title: 'Add New Frame',
    shortcut: 'command + f',
    type: 'suggestion',
    helper: 'mediascreens'
  },
  'frame-layers': {
    icon: 'bx bx-list-minus',
    title: 'Show Layers',
    shortcut: 'command + l'
  },
  'screen-mode': {
    icon: 'bx bx-devices',
    title: 'Device Screens',
    disabled: false,
    // hidden: true,
    sub: {
      default: { 
        icon: 'bx bx-expand',
        title: 'Current Screen',
        active: true,
        disabled: false
      },
      mobile: { 
        icon: 'bx bx-mobile-alt',
        title: 'Mobile',
        disabled: false
      },
      tablet: { 
        icon: 'bx bx-tab',
        title: 'Tablet',
        disabled: false
      },
      desktop: { 
        icon: 'bx bx-desktop',
        title: 'Desktop',
        disabled: false
      },
      tv: { 
        icon: 'bx bx-tv',
        title: 'Tv',
        disabled: false
      }
    }
  },
  comments: {
    icon: 'bx bx-message-square-dots',
    title: 'Comments',
    shortcut: 'command + shift + s',
    disabled: false
  },
  code: {
    icon: 'bx bx-code-alt',
    title: 'Code',
    shortcut: 'command + shift + c',
    super: true,
    disabled: false
  }
}

/**
 * Global toolbar options
 */
export const GLOBAL_TOOLAR_OPTIONS: Record<string, ToolbarOption> = {
  styles: {
    icon: 'bx bx-slider-alt',
    title: 'Styles'
  },
  assets: {
    icon: 'bx bx-landscape',
    title: 'Assets'
  },
  plugins: {
    icon: 'bx bx-customize',
    title: 'Plugins'
  },
  settings: {
    icon: 'bx bx-cog',
    title: 'Settings'
  }
}

/**
 * Default tools
 */
export const TOOLS: Record<string, ToolbarOption> = {
  POINTER: {
    icon: 'bx bx-pointer',
    title: 'Pointer',
    active: true
  },
  PICKER: {
    icon: 'bx bxs-eyedropper',
    title: 'Picker'
  },
  PENCIL: {
    title: 'Pencil',
    selected: 'pen',
    variants: {
      '*': {
        icon: 'bx bx-pencil',
        title: 'Pencil',
        parent: 'PENCIL'
      },
      'pen': {
        icon: 'bx bx-pen',
        title: 'Pen',
        parent: 'PENCIL'
      }
    }
  },
  TRANSFORM: {
    icon: 'bx bx-selection',
    title: 'Transform'
  },
  VECTOR: {
    icon: 'bx bx-vector',
    title: 'Vector'
  },
  FLOW: {
    icon: 'bx bx-git-merge',
    title: 'Flow',
    disabled: true
  }
}

// TODO: temporarily remove to fetch data from store
export const VIEWS: Record<string, ToolbarOption> = {
  text: {
    title: 'Text',
    selected: '*',
    variants: {
      '*': {
        icon: 'bx bx-text',
        title: 'Inline text',
        shortcut: 'command + y',
        tool: 'TEXT',
        parent: 'text'
      },
      'circle': {
        icon: 'bx bx-paragraph',
        title: 'Paragraph text',
        shortcut: 'command + y',
        tool: 'TEXT',
        parent: 'text'
      },
      'blockquote': {
        icon: 'bx bxs-quote-alt-left',
        title: 'Blockquote',
        shortcut: 'command + y',
        tool: 'TEXT',
        parent: 'text'
      }
    }
  },
  shape: {
    title: 'Shape',
    selected: '*',
    variants: {
      '*': {
        icon: 'bx bx-shape-square',
        title: 'Rectangle Shape',
        shortcut: 'command + y',
        tool: 'POINTER',
        parent: 'shape',
        instructions: 'Create a rectangle-like or square-like shape, resizable and adjustable at any position'
      },
      'circle': {
        icon: 'bx bx-shape-circle',
        title: 'Circle shape',
        shortcut: 'command + y',
        tool: 'POINTER',
        parent: 'shape',
        instructions: 'Create a circle shape, resizable and adjustable at any position'
      },
      'dynamic': {
        icon: 'bx bx-shape-polygon',
        title: 'Dynamic shape',
        shortcut: 'command + y',
        tool: 'POINTER',
        parent: 'shape',
        instructions: 'Create a free form shape using svg, with curves, resizable and adjustable at any position'
      }
    }
  },
  image: {
    title: 'Image',
    selected: '*',
    variants: {
      '*': {
        icon: 'bx bx-image-alt',
        title: 'Image',
        shortcut: 'command + y',
        tool: 'POINTER',
        parent: 'image'
      },
      'icon': {
        icon: 'bx bx-home-smile',
        title: 'Font icons',
        shortcut: 'command + y',
        tool: 'POINTER',
        parent: 'image'
      }
    }
  },
  video: {
    icon: 'bx bx-movie-play',
    title: 'Video',
    shortcut: 'command + y',
    tool: 'POINTER'
  },
  audio: {
    icon: 'bx bx-equalizer',
    title: 'Audio',
    tool: 'POINTER'
  },
  board: {
    icon: 'bx bx-clipboard',
    title: 'Board',
    tool: 'PENCIL'
  }
}

/**
 * Support languages translation dictionaries
 */
export const LANGUAGE_DICTIONARIES: Record<string, ModelaLanguageDictionary> = {
  'en': english,
  'fr': french
}

/**
 * Default CSS custom properties variables
 */
export const CSS_CUSTOM_VARIABLES: Record<string, CSSRuleOption> = {
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
  ambientColor: {
    group: 'palette',
    label: 'Ambiant Color',
    name: '--ambient-color',
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
    value: {
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
    value: {
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
    value: {
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
    value: '5px',
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

/**
 * Cascade Style Sheet properties and their
 * possible value options.
 */
export const CSS_PROPERTIES: Record<string, string | string[]> = {
  'align-content': [ 'stretch', 'center', 'flex-start', 'flex-end', 'space-between', 'space-around', 'initial', 'inherit' ],
  'align-items': [ 'stretch', 'center', 'flex-start', 'flex-end', 'baseline', 'initial', 'inherit' ],
  'align-self': [ 'auto', 'stretch', 'center', 'flex-start', 'flex-end', 'baseline', 'initial', 'inherit' ],
  'animation': [ 'animation-name', 'animation-duration', 'animation-timing-function', 'animation-delay', 'animation-iteration-count', 'animation-direction', 'animation-fill-mode', 'animation-play-state', 'initial', 'inherit' ],
  'animation-delay': [ 'time', 'initial', 'inherit' ],
  'animation-direction': [ 'normal', 'reverse', 'alternate', 'alternate-reverse', 'initial', 'inherit' ],
  'animation-duration': [ 'time', 'initial', 'inherit' ],
  'animation-fill-mode': [ 'none', 'forwards', 'backwards', 'both', 'initial', 'inherit' ],
  'animation-iteration-count': [ 'number', 'infinite', 'initial', 'inherit' ],
  'animation-name': [ 'keyframename', 'none', 'initial', 'inherit' ],
  'animation-play-state': [ 'paused', 'running', 'initial', 'inherit' ],
  'animation-timing-function': [ 'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'cubic-bezier(n,n,n,n)', 'initial', 'inherit' ],
  
  'backface-visibility': [ 'visible', 'hidden', 'initial', 'inherit' ],
  
  'background': [ 'background-color', 'background-image', 'background-position', 'background-size', 'background-repeat', 'background-origin', 'background-clip', 'background-attachment', 'initial', 'inherit' ],
  'background-attachment': [ 'scroll', 'fixed', 'local', 'initial', 'inherit' ],
  'background-blend-mode': [ 'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'saturation', 'color', 'luminosity' ],
  'background-clip': [ 'border-box', 'padding-box', 'content-box', 'initial', 'inherit' ],
  'background-color': [ 'color', 'transparent', 'initial', 'inherit' ],
  'background-image': [ 'url(URL)', 'none', 'initial', 'inherit' ],
  'background-origin': [ 'padding-box', 'border-box', 'content-box', 'initial', 'inherit' ],
  'background-position': [ 'left top', 'left center', 'left bottom', 'right top', 'right center', 'right bottom', 'center top', 'center center', 'center bottom', 'x% y%', 'xpos ypos', 'initial', 'inherit' ],
  'background-repeat': [ 'repeat', 'repeat-x', 'repeat-y', 'no-repeat', 'initial', 'inherit' ],
  'background-size': [ 'auto', 'length', 'percentage', ' cover', ' contain', 'initial', 'inherit' ],

  'border': [ 'border-width', 'border-style', 'border-color', 'initial', 'inherit' ],
  'border-bottom': [ 'border-bottom-width', 'border-bottom-style', 'border-bottom-color', 'initial', 'inherit' ],
  'border-bottom-color': [ 'color', 'transparent', 'initial', 'inherit' ],
  'border-bottom-left-radius': [ 'length', '%', 'initial', 'inherit' ],
  'border-bottom-right-radius': [ 'length', '%', 'initial', 'inherit' ],
  'border-bottom-style': [ 'none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset', 'initial', 'inherit' ],
  'border-bottom-width': [ 'medium', 'thin', 'thick', 'length', 'initial', 'inherit' ],
  'border-collapse': [ 'separate', 'collapse', 'initial', 'inherit' ],
  'border-color': [ 'color', 'transparent', 'initial', 'inherit' ],
  'border-image': [ ' border-image-source', ' border-image-slice', ' border-image-width', ' border-image-outset', ' border-image-repeat', 'initial', 'inherit' ],
  'border-image-outset': [ 'length', ' number', 'initial', 'inherit' ],
  'border-image-slice': [ ' number', ' %', ' fill', 'initial', 'inherit' ],
  'border-image-source': [ ' none', ' image', 'initial', 'inherit' ],
  'border-image-repeat': [ ' stretch', ' repeat', ' round', 'space', 'initial', 'inherit' ],
  'border-image-width': [ 'length', 'number', '%', 'auto', 'initial', 'inherit' ],
  'border-left': [ 'border-left-width', 'border-left-style', 'border-left-color', 'initial', 'inherit' ],
  'border-left-color': [ 'color', 'transparent', 'initial', 'inherit' ],
  'border-left-width': [ 'medium', 'thin', 'thick', 'length', 'initial', 'inherit' ],
  'border-left-style': [ 'none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset', 'initial', 'inherit' ],
  'border-radius': [ 'length', '%', 'initial', 'inherit' ],
  'border-right': [ 'border-right-width', 'border-right-style', 'border-right-color', 'initial', 'inherit' ],
  'border-right-color': [ 'color', 'transparent', 'initial', 'inherit' ],
  'border-right-width': [ 'medium', 'thin', 'thick', 'length', 'initial', 'inherit' ],
  'border-right-style': [ 'none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset', 'initial', 'inherit' ],
  'border-spacing': [ 'length length', 'initial', 'inherit' ],
  'border-style': [ 'none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset', 'initial', 'inherit' ],
  'border-top': [ 'border-top-width', 'border-top-style', 'border-top-color', 'initial', 'inherit' ],
  'border-top-color': [ 'color', 'transparent', 'initial', 'inherit' ],
  'border-top-left-radius': [ 'length', '%', 'initial', 'inherit' ],
  'border-top-right-radius': [ 'length', '%', 'initial', 'inherit' ],
  'border-top-style': [ 'none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset', 'initial', 'inherit' ],
  'border-top-width': [ 'medium', 'thin', 'thick', 'length', 'initial', 'inherit' ],
  'border-width': [ 'medium', 'thin', 'thick', 'length', 'initial', 'inherit' ],
  'bottom': [ 'auto', 'length', '%', 'initial', 'inherit' ],

  'box-decoration-break': '',
  'box-shadow': [ 'none', 'h-shadow', 'v-shadow', 'blur', 'spread', 'color', 'inset', 'initial', 'inherit' ],
  'box-sizing': [ ' content-box', ' border-box', 'initial', 'inherit' ],

  'break-after': '',
  'break-before': '',
  'break-inside': '',

  'caption-side': [ 'top', 'bottom', 'initial', 'inherit' ],
  'clear': [ 'none', 'left', 'right', 'both', 'initial', 'inherit' ],
  'clip': [ 'auto', 'shape', 'initial', 'inherit' ],
  'color': [ 'color', 'initial', 'inherit' ],
  'column-gap': [ 'length', 'normal', 'initial', 'inherit' ],
  'column-count': [ 'number', 'auto', 'initial', 'inherit' ],
  'column-fill': [ 'balance', 'auto', 'initial', 'inherit' ],
  'column-rule': [ ' column-rule-width', ' column-rule-style', ' column-rule-color', 'initial', 'inherit' ],
  'column-rule-color': [ ' color', 'initial', 'inherit' ],
  'column-rule-style': [ ' none', ' hidden', ' dotted', ' dashed', ' solid', ' double', ' groove', ' ridge', ' inset', ' outset', 'initial', 'inherit' ],
  'column-rule-width': [ ' medium', ' thin', ' thick', ' length', 'initial', 'inherit' ],
  'column-span': [ '1', 'all', 'initial', 'inherit' ],
  'column-width': [ 'auto', 'length', 'initial', 'inherit' ],
  'columns': [ 'auto', 'column-width', 'column-count', 'initial', 'inherit' ],
  'content': [ 'normal', 'none', 'counter', 'attr(attribute)', 'string', 'open-quote', 'close-quote', 'no-open-quote', 'no-close-quote', 'url(url)', 'initial', 'inherit' ],
  'counter-increment': [ 'none', 'id number', 'initial', 'inherit' ],
  'counter-reset': [ 'none', 'name', 'number', 'initial', 'inherit' ],
  'cursor': [ 'alias', 'all-scroll', 'auto', 'cell', 'context-menu', 'col-resize', 'copy', 'crosshair', 'default', 'e-resize', 'ew-resize', 'grab', 'grabbing', 'help', 'move', 'n-resize', 'ne-resize', 'nesw-resize', 'ns-resize', 'nw-resize', 'nwse-resize', 'no-drop', 'none', 'not-allowed', 'pointer', 'progress', 'row-resize', 's-resize', 'se-resize', 'sw-resize', 'text', 'URL', 'vertical-text', 'w-resize', 'wait', 'zoom-in', 'zoom-out', 'initial', 'inherit' ],
  
  'direction': [ 'ltr', 'rtl', 'initial', 'inherit' ],
  'display': [ 'inline', 'block', 'flex', 'inline-block', 'inline-flex', 'inline-table', 'list-item', 'run-in', 'table', 'table-caption', '', 'table-column-group', 'table-header-group', 'table-footer-group', 'table-row-group', 'table-cell', 'table-column', 'table-row', 'none', 'initial', 'inherit' ],
  
  'empty-cells': [ 'show', 'hide', 'initial', 'inherit' ],

  'filter': [ 'none', 'blur(px)', 'brightness(%)', 'contrast(%)', 'drop-shadow(h-shadow v-shadow blur spread color)', 'grayscale(%)', 'hue-rotate(deg)', 'invert(%)', 'opacity(%)', 'saturate(%)', 'sepia(%)', 'url()', 'initial', 'inherit' ],
  'flex': [ 'flex-grow', 'flex-shrink', 'flex-basis', 'auto', 'initial', 'none', 'inherit' ],
  'flex-basis': [ 'number', 'auto', 'initial', 'inherit' ],
  'flex-direction': [ 'row', 'row-reverse', 'column', 'column-reverse', 'initial', 'inherit' ],
  'flex-flow': [ 'flex-direction', 'flex-wrap', 'initial', 'inherit' ],
  'flex-grow': [ 'number', 'initial', 'inherit' ],
  'flex-shrink': [ 'number', 'initial', 'inherit' ],
  'flex-wrap': [ 'nowrap', 'wrap', 'wrap-reverse', 'initial', 'inherit' ],
  'float': [ 'none', 'left', 'right', 'initial', 'inherit' ],
  'font': [ 'font-style', 'font-variant', 'font-weight', 'font-size/line-height', 'font-family', 'caption', 'icon', 'menu', 'message-box', 'small-caption', 'status-bar', 'initial', 'inherit' ],
  'font-family': [ 'family-name', 'generic-family', 'initial', 'inherit' ],
  'font-feature-settings': '',
  'font-kerning': '',
  'font-language-override': '',
  'font-style': [ 'normal', 'italic', 'oblique', 'initial', 'inherit' ],
  'font-size': [ 'medium', 'xx-small', 'x-small', 'small', 'large', 'x-large', 'xx-large', 'smaller', 'larger', 'length', '%', 'initial', 'inherit' ],
  'font-size-adjust': [ 'number', 'none', 'initial', 'inherit' ],
  'font-stretch': [ 'ultra-condensed', 'extra-condensed', 'condensed', 'semi-condensed', 'normal', 'semi-expanded', 'expanded', 'extra-expanded', 'ultra-expanded', 'initial', 'inherit' ],
  'font-synthesis': '',
  'font-variant-alternates': '',
  'font-variant': [ 'normal', 'small-caps', 'initial', 'inherit' ],
  'font-variant-caps': '',
  'font-variant-east-asian': '',
  'font-variant-ligatures': '',
  'font-variant-numeric': '',
  'font-variant-position': '',
  'font-weight': [ 'normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900', 'initial', 'inherit' ],
  
  'hanging-punctuation': [ 'none', 'first', 'last', 'allow-end', 'force-end', 'initial', 'inherit' ],
  'height': [ 'auto', 'length', '%', 'initial', 'inherit' ],
  'hyphens': '',

  'image-orientation': '',
  'image-mode': '',
  'image-rendering': '',
  'image-resolution': '',

  'justify-content': [ 'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'initial', 'inherit' ],

  'left': [ 'auto', 'length', '%', 'initial', 'inherit' ],
  'letter-spacing': [ 'normal', 'length', 'initial', 'inherit' ],
  'line-break': '',
  'line-height': [ 'normal', 'number', 'length', '%', 'initial', 'inherit' ],
  'list-style': [ 'list-style-type', 'list-style-position', 'list-style-image', 'initial', 'inherit' ],
  'list-style-image': [ 'none', 'url', 'initial', 'inherit' ],
  'list-style-position': [ 'inside', 'outside', 'initial', 'inherit' ],
  'list-style-type': [ 'disc', 'armenian', 'circle', 'cjk-ideographic', 'decimal', 'decimal-leading-zero', 'georgian', 'hebrew', 'hiragana', 'hiragana-iroha', 'katakana', 'katakana-iroha', 'lower-alpha', 'lower-greek', 'lower-latin', 'lower-roman', 'none', 'square', 'upper-alpha', 'upper-latin', 'upper-roman', 'initial', 'inherit' ],
  
  'margin': [ 'length', '%', 'auto', 'initial', 'inherit' ],
  'margin-bottom': [ 'length', '%', 'auto', 'initial', 'inherit' ],
  'margin-left': [ 'length', '%', 'auto', 'initial', 'inherit' ],
  'margin-right': [ 'length', '%', 'auto', 'initial', 'inherit' ],
  'margin-top': [ 'length', '%', 'auto', 'initial', 'inherit' ],
  'mask': '',
  'mark': '',
  'mark-after': '',
  'mark-before': '',
  'mask-type': '',
  'marks': '',
  'marquee-direction': '',
  'marquee-play-count': '',
  'marquee-speed': '',
  'marquee-style': '',
  'max-height': [ 'none', 'length', '%', 'initial', 'inherit' ],
  'max-width': [ 'none', 'length', '%', 'initial', 'inherit' ],
  'min-height': [ 'length', '%', 'initial', 'inherit' ],
  'min-width': [ 'length', '%', 'initial', 'inherit' ],

  'nav-down': [ 'auto', 'id', 'target-name', 'initial', 'inherit' ],
  'nav-index': [ 'auto', 'number', 'initial', 'inherit' ],
  'nav-left': [ 'auto', 'id', 'target-name', 'initial', 'inherit' ],
  'nav-right': [ 'auto', 'id', 'target-name', 'initial', 'inherit' ],
  'nav-up': [ 'auto', 'id', 'target-name', 'initial', 'inherit' ],
  
  'object-fit': '',
  'object-position': '',
  'opacity': [ 'number', 'initial', 'inherit' ],
  'order': [ 'number', 'initial', 'inherit' ],
  'orphans': '',
  'outline': [ 'outline-color', 'outline-style', 'outline-width', 'initial', 'inherit' ],
  'outline-color': [ 'invert', 'color', 'initial', 'inherit' ],
  'outline-offset': [ ' length', 'initial', 'inherit' ],
  'outline-style': [ 'none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset', 'initial', 'inherit' ],
  'outline-width': [ 'medium', 'thin', 'thick', 'length', 'initial', 'inherit' ],
  'overflow\r\n    ': [ 'visible', 'hidden', 'scroll', 'auto', 'initial', 'inherit' ],
  'overflow-wrap': '',
  'overflow-x': [ 'visible', 'hidden', 'scroll', 'auto', 'initial', 'inherit' ],
  'overflow-y': [ 'visible', 'hidden', 'scroll', 'auto', 'initial', 'inherit' ],

  'padding': [ 'length', '%', 'initial', 'inherit' ],
  'padding-bottom': [ 'length', '%', 'initial', 'inherit' ],
  'padding-left': [ 'length', '%', 'initial', 'inherit' ],
  'padding-right': [ 'length', '%', 'initial', 'inherit' ],
  'padding-top': [ 'length', '%', 'initial', 'inherit' ],
  'page-break-after': [ 'auto', 'always', 'avoid', 'left', 'right', 'initial', 'inherit' ],
  'page-break-before': [ 'auto', 'always', 'avoid', 'left', 'right', 'initial', 'inherit' ],
  'page-break-inside': [ 'auto', 'avoid', 'initial', 'inherit' ],
  'perspective': [ 'length', 'none', 'initial', 'inherit' ],
  'perspective-origin': [ 'x-axis', 'y-axis', 'initial', 'inherit' ],
  'phonemes': '',
  'position': [ 'static', 'absolute', 'fixed', 'relative', 'initial', 'inherit' ],

  'quotes': [ 'none', 'string string string string', 'initial', 'inherit', '', '\"', '\'', '‹', '›', '«', '»', '‘', '’', '“', '”', '„' ],

  'resize': [ ' none', ' both', ' horizontal', ' vertical', 'initial', 'inherit' ],
  'rest': '',
  'rest-after': '',
  'rest-before': '',
  'right': [ 'auto', 'length', '%', 'initial', 'inherit' ],

  'tab-size': [ 'number', 'length', 'initial', 'inherit' ],
  'table-layout': [ 'auto', 'fixed', 'initial', 'inherit' ],
  'text-align': [ 'left', 'right', 'center', 'justify', 'initial', 'inherit' ],
  'text-align-last': [ 'auto', 'left', 'right', 'center', 'justify', 'start', 'end', 'initial', 'inherit' ],
  'text-combine-upright': '',
  'text-decoration': [ 'none', 'underline', 'overline', 'line-through', 'initial', 'inherit' ],
  'text-decoration-color': [ 'color', 'initial', 'inherit' ],
  'text-decoration-line': [ 'none', 'underline', 'overline', 'line-through', 'initial', 'inherit' ],
  'text-decoration-style': [ 'solid', 'double', 'dotted', 'dashed', 'wavy', 'initial', 'inherit' ],
  'text-indent': [ 'length', '%', 'initial', 'inherit' ],
  'text-justify': [ 'auto', 'inter-word', 'inter-ideograph', 'inter-cluster', 'distribute', 'kashida', 'trim', 'none', 'initial', 'inherit' ],
  'text-orientation': '',
  'text-overflow': [ 'clip', 'ellipsis', 'string', 'initial', 'inherit' ],
  'text-shadow': [ 'h-shadow', 'v-shadow', 'blur-radius', 'color', 'none', 'initial', 'inherit' ],
  'text-transform': [ 'none', 'capitalize', 'uppercase', 'lowercase', 'initial', 'inherit' ],
  'text-underline-position': '',
  'top': [ 'auto', 'length', '%', 'initial', 'inherit' ],
  'transform': [ 'none', 'matrix(n,n,n,n,n,n)', 'matrix3d(n,n,n,n,n,n,n,n,n,n,n,n,n,n,n,n)', 'translate(x,y)', 'translate3d(x,y,z)', 'translateX(x)', 'translateY(y)', 'translateZ(z)', 'scale(x,y)', 'scale3d(x,y,z)', 'scaleX(x)', 'scaleY(y)', 'scaleZ(z)', 'rotate(angle)', 'rotate3d(x,y,z,angle)', 'rotateX(angle)', 'rotateY(angle)', 'rotateZ(angle)', 'skew(x-angle,y-angle)', 'skewX(angle)', 'skewY(angle)', 'perspective(n)', 'initial', 'inherit' ],
  'transition': [ 'transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay', 'initial', 'inherit' ],
  'transition-delay': [ 'time', 'initial', 'inherit' ],
  'transition-duration': [ 'time', 'initial', 'inherit' ],
  'transform-origin': [ 'x-axis', 'y-axis', 'z-axis', 'initial', 'inherit' ],
  'transition-property': [ 'none', 'all', 'property', 'initial', 'inherit' ],
  'transform-style': [ 'flat', 'preserve-3d', 'initial', 'inherit' ],
  'transition-timing-function': [ 'ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out', 'cubic-bezier(n,n,n,n)', 'initial', 'inherit' ],
  
  'unicode-bidi': [ 'normal', 'embed', 'bidi-override', 'initial', 'inherit' ],

  'vertical-align': [ 'baseline', 'length', '%', 'sub', 'super', 'top', 'text-top', 'middle', 'bottom', 'text-bottom', 'initial', 'inherit' ],
  'visibility': [ 'visible', 'hidden', 'collapse', 'initial', 'inherit' ],
  'voice-balance': '',
  'voice-duration': '',
  'voice-pitch': '',
  'voice-pitch-range': '',
  'voice-rate': '',
  'voice-stress': '',
  'voice-volume': '',

  'white-space': [ 'normal', 'nowrap', 'pre', 'pre-line', 'pre-wrap', 'initial', 'inherit' ],
  'widows': '',
  'width': [ 'auto', 'length', '%', 'initial', 'inherit' ],
  'word-break': [ 'normal', 'break-all', 'keep-all', 'initial', 'inherit' ],
  'word-wrap': [ 'normal', 'break-word', 'initial', 'inherit' ],
  'word-spacing': [ 'normal', 'length', 'initial', 'inherit' ],
  'writing-mode': '',

  'z-index': [ 'auto', 'number', 'initial', 'inherit' ],

  '@font-face': [ 'font-family', 'src', 'font-stretch', 'font-style', 'font-weight', 'unicode-range' ],
  '@font-feature-values': '',
  '@keyframes': [ 'animationname', 'keyframes-selector', 'css-styles' ],
}

/**
 * Window action events
 */
export const ON_ACTION_EVENTS: string[] = [ 
  'abort',
  'animationend',
  'animationiteration',
  'animationstart',
  'auxclick',
  'beforecopy',
  'beforecut',
  'beforeinput',
  'beforematch',
  'beforepaste',
  'beforetoggle',
  'beforexrselect',
  'blur',
  'cancel',
  'canplay',
  'canplaythrough',
  'change',
  'click',
  'close',
  'contentvisibilityautostatechange',
  'contextlost',
  'contextmenu',
  'contextrestored',
  'copy',
  'cuechange',
  'cut',
  'dblclick',
  'drag',
  'dragend',
  'dragenter',
  'dragleave',
  'dragover',
  'dragstart',
  'drop',
  'durationchange',
  'emptied',
  'ended',
  'error',
  'focus',
  'formdata',
  'freeze',
  'fullscreenchange',
  'fullscreenerror',
  'gotpointercapture',
  'input',
  'invalid',
  'keydown',
  'keypress',
  'keyup',
  'load',
  'loadeddata',
  'loadedmetadata',
  'loadstart',
  'lostpointercapture',
  'mousedown',
  'mouseenter',
  'mouseleave',
  'mousemove',
  'mouseout',
  'mouseover',
  'mouseup',
  'mousewheel',
  'paste',
  'pause',
  'play',
  'playing',
  'pointercancel',
  'pointerdown',
  'pointerenter',
  'pointerleave',
  'pointerlockchange',
  'pointerlockerror',
  'pointermove',
  'pointerout',
  'pointerover',
  'pointerrawupdate',
  'pointerup',
  'prerenderingchange',
  'progress',
  'ratechange',
  'readystatechange',
  'reset',
  'resize',
  'resume',
  'scroll',
  'scrollend',
  'search',
  'securitypolicyviolation',
  'seeked',
  'seeking',
  'select',
  'selectionchange',
  'selectstart',
  'slotchange',
  'stalled',
  'submit',
  'suspend',
  'timeupdate',
  'toggle',
  'transitioncancel',
  'transitionend',
  'transitionrun',
  'transitionstart',
  'visibilitychange',
  'volumechange',
  'waiting',
  'webkitanimationend',
  'webkitanimationiteration',
  'webkitanimationstart',
  'webkitfullscreenchange',
  'webkitfullscreenerror',
  'webkittransitionend',
  'wheel'
]

/**
 * Device media screen resolutions
 */
export const MEDIA_SCREENS: Record<string, MediaScreen> = {
  'iPhone SE': { 
    device: 'mobile',
    type: { id: 'xs', label: 'Extra Small' }, 
    width: '375px',
    height: '667px',
    rotate: true
  },
  'iPad Mini': { 
    device: 'tablet',
    type: { id: 'sm', label: 'Small' }, 
    width: '768px',
    height: '1024px',
    rotate: true
  },
  'Dell': { 
    device: 'desktop',
    type: { id: 'md', label: 'Medium' }, 
    width: '1024px',
    height: '768px'
  },
  'HP Desktop': {
    device: 'desktop',
    type: { id: 'lg', label: 'Large' }, 
    width: '1368px',
    height: '912px'
  },
  'Android TV': { 
    device: 'tv',
    type: { id: 'xl', label: 'Extra Large' }, 
    width: '2648px',
    height: '1368px'
  },
  'LG 55"': { 
    device: 'tv',
    type: { id: 'sl', label: 'Super Large' }, 
    width: '4048px',
    height: '3368px'
  }
}