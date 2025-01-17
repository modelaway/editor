type ClipBoard = {
  type: string
  key?: string | null
  value?: any
}

type Origin = {
  x: number
  y: number
}
type Position = {
  left?: string
  top?: string
  right?: string
  bottom?: string
  center?: string
}

type InputOptions = {
  type: 'text' | 'number' | 'checkbox' | 'radio' | 'select' | 'search'
  name: string
  label?: string
  value?: string | number | boolean
  placeholder?: string
  pattern?: RegExp
  options?: { 
    value: string | number | boolean
    label?: string
  }[]
  range?: {
    min?: number
    max?: number
  }
  disabled?: boolean
  autofocus?: boolean
}
type SelectFileOptions = {
  id: string
  accepts?: string
  multiple?: boolean
}
type InputFiles = {
  file: File
  src: string
}
type SeperatorOptions = {
  label?: string
}
type ListItem = {
  icon: string
  title: string
  value?: string | number | boolean
  shortcut?: string
  sub?: MenuSection[]
  disabled?: boolean
}

type AssetData = {
  type: 'image' | 'video' | 'font'
  name: string
  source: string
  size?: string // 
  bytes?: number
}

type StyleSettings = {
  sheet?: string
  meta?: boolean
  custom?: {
    enabled: boolean
    allowedRules: string[]
    allowedProperties: string[]
  }
}
type CSSRuleValue = string | number | boolean
type CSSRuleOption = {
  group: string
  label: string
  name: string
  value: Record<string, CSSRuleValue> | CSSRuleValue
  applyOnly?: string
  display?: string
  customizable?: boolean
}

type ToolbarOption = {
  title: string
  icon?: string
  tool?: string
  parent?: string
  shortcut?: string
  active?: boolean
  hidden?: boolean
  selected?: string
  disabled?: boolean
  instructions?: string
  variants?: Record<string, ToolbarOption>
}

type QuicksetOption = {
  icon: string
  label?: string
  title: string
  shortcut?: string
  sub?: Record<string, QuicksetOption>
  meta?: boolean
  extra?: boolean
  super?: boolean
  detached?: boolean
  disabled?: boolean
  hidden?: boolean
  active?: boolean
}
type QuicksetSettings = {
  visible?: boolean
  editing?: boolean
  detached?: boolean
}
type Fieldset = {
  label?: string
  seperate?: boolean
  fields: InputOptions[]
}
type Listset = {
  label?: string
  seperate?: boolean
  items: ListItem[]
}

type MenuSection = {
  icon: string
  title?: string
  fieldsets?: Fieldset[]
  listsets?: Listset[]
  more?: boolean
  active?: boolean
}
type MenuSections = Record<string, MenuSection>

interface GlobalSet {
  css: Modela['css']
  assets: Modela['assets']
  i18n: ( text: string ) => string
  defineProperties: ( props: ViewBlockProperties ) => string
}

type ModelaLanguage = {
  default: string
  current: string
}
type ModelaLanguageDictionary = Record<string, Record<string, string> | string>
declare interface Window {
  msass: any
  mlang: ModelaLanguage
}


type ModelaPluginOption = { 
  name: string,
  config: Record<string, any>
}
type ModelaSettings = {
  lang?: string

  // Elements' manipulation settings
  hoverSelect?: boolean
  enableAlleys?: boolean
  autoPropagate?: boolean

  plugins?: (string | ModelaPluginOption)[]

  // Workspace view preferences
  viewControls?: boolean
  viewToolbar?: boolean
  viewLayers?: boolean
}