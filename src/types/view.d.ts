import type { EventEmitter } from 'events'
import type CSS from '../css'
import type Assets from '../assets'
import type Controls from '../controls'
import type Functions from '../functions'

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

type ViewSelf = {
  view: JQuery
  state: ObjectType<any>
}
type ViewEvent = {
  view: JQuery
  state: ObjectType<any>
}
interface ViewComponentBridge {
  $: JQuery<HTMLElement> | null
  events: EventEmitter
  fn: Functions
  state: State
  assets: Assets
  css: CSS
}
interface ViewComponent {
  name: string
  node: string
  category: string
  caption: ViewCaption
  attributes: {}

  render: ( view: ViewComponentBridge ) => string
  takeover: ( view: ViewComponentBridge ) => void
  dismiss: ( view: ViewComponentBridge ) => void

  styles?: ( view: ViewComponentBridge ) => StyleSheetProps
  toolbar?: ( view: ViewComponentBridge ) => ObjectType<ToolbarSet>
  panel?: ( view: ViewComponentBridge ) => PanelSections
}