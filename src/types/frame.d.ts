import type I18N from '../modules/i18n'
import type Assets from '../modules/assets'
import type Functions from '../modules/functions'
import type { RJQuery } from '../lib/frame.window'

export type FrameOption = {
  source: string
  title?: string
  device?: string
}

export interface FrameFlux {
  i18n: I18N
  fn: Functions
  assets: Assets
  $$?: RJQuery
}
export type MediaScreen = {
  type: string
  width: string
  height: string
}