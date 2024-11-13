
import type Lips from '../../../../dist/component.min'

import * as Counter from '../components/counter'
import * as Profile from '../components/profile'
import * as Footer from '../components/footer'

import * as Router from '../components/router'

export default ( lips: Lips ) => {
  lips.register('counter', Counter )
  lips.register('profile', Profile )
  lips.register('footer', Footer )

  lips.register('router', Router )
}