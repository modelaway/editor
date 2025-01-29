import type I18N from '../modules/i18n'
import type Assets from '../modules/assets'
import type Functions from '../modules/functions'

export type FrameOption = {
  source?: string
  content?: string
  title?: string
  device?: string
  rounded?: boolean
  transparent?: boolean
  coordinates?: { 
    x: string
    y: string
  }
  size?: { 
    width: string
    height: string
  }
}
export type FrameSpecs = {
  key: string
  title: string
  content?: string
}
export interface FrameFlux {
  i18n: I18N
  fn: Functions
  assets: Assets
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