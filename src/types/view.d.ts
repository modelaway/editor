import type { Cash } from 'cash-dom'
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

interface ViewInstance {
  state: State
  i18n: I18N
  fn: Functions
  assets: Assets
  events: EventEmitter
  $?: Cash
  css?: Stylesheet
}
interface ViewDefinition {
  type: string
  name: string
  tagname: string
  caption: ViewCaption
  attributes: Record<string, any>

  render: ( view: ViewInstance ) => string
  takeover: ( view: ViewInstance ) => void
  // dismiss: ( view: ViewInstance ) => void

  styles?: ( view: ViewInstance ) => StyleSettings
  quickset?: ( view: ViewInstance ) => Record<string, QuicksetSet>
  menu?: ( view: ViewInstance ) => MenuSections
}