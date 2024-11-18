import type I18N from '../modules/i18n'
import type Assets from '../modules/assets'
import type Functions from '../modules/functions'
import type { RJQuery } from '../lib/frame.window'

export type FrameOption = {
  source: string
  title?: string
  device?: string
  position: { 
    left: string
    top: string
  }
}

export interface FrameFlux {
  i18n: I18N
  fn: Functions
  assets: Assets
  $$?: RJQuery
}
export type MediaScreen = {
  device: string
  type: {
    id: 'ss' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'sl'
    label: string
  }
  width: string
  height: string
  rotate?: boolean
}