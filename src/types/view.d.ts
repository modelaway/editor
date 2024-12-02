import type { EventEmitter } from 'events'
import type I18N from '../modules/i18n'
import type Assets from '../modules/assets'
import type Controls from '../modules/viewport'
import type Functions from '../modules/functions'
import type Stylesheet from '../modules/stylesheet'
import type { RJQuery, RJQueryStatic } from '../lib/frame.window'

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

interface ViewBridge {
  state: State
  i18n: I18N
  fn: Functions
  assets: Assets
  events: EventEmitter
  $?: RJQueryStatic
  css?: Stylesheet
}
interface ViewComponent {
  name: string
  node: string
  category: string
  caption: ViewCaption
  attributes: ObjectType<any>

  render: ( view: ViewBridge ) => string
  takeover: ( view: ViewBridge ) => void
  dismiss: ( view: ViewBridge ) => void

  styles?: ( view: ViewBridge ) => StyleSettings
  toolbar?: ( view: ViewBridge ) => ObjectType<ToolbarSet>
  panel?: ( view: ViewBridge ) => PanelSections
}

type AddViewTriggerType = 'alley' | 'discret' | 'self'