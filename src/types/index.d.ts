
type ObjectType<T> = { [index: string]: T }

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

type StyleSheetProps = {
  predefined?: {
    options?: string[]
    css?: string
  }
  custom?: {
    enabled: boolean
    required: string[]
    options: string[]
    css?: string
  }
}
type StylesheetParams = { 
  nsp?: string
  key?: string
  props?: StyleSheetProps 
}

type ToolbarSet = {
  icon: string
  label?: string
  title: string
  event: {
    type: string,
    attr: string,
    params: string | boolean
    shortcut?: string
  }
  sub?: ToolbarSet[]
  meta?: boolean
  extra?: boolean
  detached?: boolean
  disabled?: boolean
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

type PanelSet = {
  icon: string
  title?: string
  fieldsets?: Fieldset[]
  listsets?: Listset[]
  more?: boolean
  active?: boolean
}
type PanelSections = ObjectType<PanelSet>

interface GlobalSet {
  css: Modela['css']
  assets: Modela['assets']
  i18n: ( text: string ) => string
  defineProperties: ( props: ViewBlockProperties ) => string
}

type ViewCaptionPoster = { 
  type: 'image' | 'video'
  src: string
  info?: string
}
type ViewCaption = {
  icon?: string
  title: string
  description: string
  posters?: ViewCaptionPoster[]
}
type ViewBlockProperties = {
  selector: string
  /**
   * Define the caption of header to help 
   * users know how it should be used.
   */
  caption?: ViewCaption
  /**
   * Tells whether to add new views to this
   * block.
   */
  addView?: boolean
  /**
   * Define an option list of view content types that
   * could be added to this block.
   * 
   * Default: any (if `addView` param is set to true)
   */
  allowedViewTypes?: string[]
}

type ViewEvent = {
  type: string
  dataset?: any
  view: JQuery
  state: ObjectType<any>
}
interface ViewComponent {
  name: string
  node: string
  category: string
  caption: ViewCaption
  attributes: {}
  render: ( e: ViewEvent, global: GlobalSet ) => string
  styles?: ( e: ViewEvent, global: GlobalSet ) => StyleSheetProps
  toolbar?: ( e: ViewEvent, global: GlobalSet ) => ToolbarSet[]
  panel?: ( e: ViewEvent, global: GlobalSet ) => PanelSections
  apply?: ( e: ViewEvent, global: GlobalSet ) => void
  activate?: ( e: ViewEvent, global: GlobalSet ) => void
  dismiss?: ( e: ViewEvent, global: GlobalSet ) => void
  actions?: ( e: ViewEvent, global: GlobalSet) => void
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