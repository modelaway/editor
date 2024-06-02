
type ObjectType<T> = { [index: string]: T }

type ClipBoard = {
  type: string
  key?: string
  value?: any
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
  event: {
    type: string,
    attr: string,
    params: string | boolean
    shortcut?: string
  }
  sub?: PanelSection[]
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
  css?: string
  meta?: boolean
  custom?: {
    enabled: boolean
    allowedRules: string[]
    allowedProperties: string[]
  }
}
type CSSRuleOption = {
  group: string
  label: string
  name: string
  value?: string | number | boolean
  values?: ObjectType<string | number | boolean>
  applyOnly?: string
  display?: string
  customizable?: boolean
}

type ToolbarOption = {
  icon: string
  label?: string
  title: string
  event?: {
    type: string
    // attr: string,
    params: string | boolean
    shortcut?: string
  }
  sub?: ObjectType<ToolbarOption>
  meta?: boolean
  extra?: boolean
  detached?: boolean
  disabled?: boolean
  active?: boolean
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

type PanelSection = {
  icon: string
  title?: string
  fieldsets?: Fieldset[]
  listsets?: Listset[]
  more?: boolean
  active?: boolean
}
type PanelSections = ObjectType<PanelSection>

interface GlobalSet {
  css: Modela['css']
  assets: Modela['assets']
  i18n: ( text: string ) => string
  defineProperties: ( props: ViewBlockProperties ) => string
}

type AddViewTriggerType = 'placeholder' | 'discret' | 'self'

type ModelaSettings = {
  viewOnly?: boolean
  hoverSelect?: boolean
  enablePlaceholders?: boolean
}

type Components = ObjectType<ViewComponent>

type ModelaStore = {
  components: Components,
  templates: {}
}
type ModelaGlobalStyleSet = {
  group?: string
  label: string
  value?: any
  values?: ObjectType<string | number | boolean>
  options?: { 
    value: string | number | boolean,
    hint?: string
    apply?: string[]
  }[]
  palette?: { 
    value: string | number | boolean,
    hint?: string
    apply?: string[]
  }[]
  featuredOptions?: number[]
  applyOnly?: string
  display?: string // 'inline' | 'dropdown'
  customizable?: boolean
}
type ModelaGlobalStyles = ObjectType<ModelaGlobalStyleSet>
type ModalGlobalAssets = {}