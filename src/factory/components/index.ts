import type Lips from '../../lips/lips'

import inputs from './inputs'
import styles from './styles'
import assets from './assets'
import palette from './palette'
import plugins from './plugins'
import settings from './settings'
import layerlist from './layerlist'
import layeritem from './layeritem'
import tecaptions from './tecaptions'
import mediascreens from './mediascreens'

const modules = {
  inputs,
  styles,
  assets,
  palette,
  plugins,
  settings,
  layerlist,
  layeritem,
  tecaptions,
  mediascreens
} as const

export {
  inputs,
  styles,
  assets,
  palette,
  plugins,
  settings,
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