
import type { Lips } from '../../../../dist/component.min.js'

import * as Counter from '../components/counter'
import * as Caption from '../components/caption'
import * as Profile from '../components/profile'

export default ( lips: Lips ) => {
  lips.register('counter', Counter )
  lips.register('caption', Caption )
  lips.register('profile', Profile )
}