import type Lips from '@lipsjs/lips'

import styles from './styles'
import assets from './assets'
import palette from './palette'
import plugins from './plugins'
import settings from './settings'
import explorer from './explorer'
import forminput from './forminput'
import layerlist from './layerlist'
import layeritem from './layeritem'
import tecaptions from './tecaptions'
import mediascreens from './mediascreens'

const modules = {
  styles,
  assets,
  palette,
  plugins,
  settings,
  explorer,
  forminput,
  layerlist,
  layeritem,
  tecaptions,
  mediascreens
} as const

export {
  styles,
  assets,
  palette,
  plugins,
  settings,
  explorer,
  forminput,
  layerlist,
  layeritem,
  tecaptions,
  mediascreens
}

export default ( lips: Lips ) => {
  Object
  .entries( modules )
  .forEach( ([ name, module ]) => lips.register( name, module() ) )
}