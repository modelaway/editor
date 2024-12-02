
import Modela from '../../dist/modela.min.js'
import ModelaNativesLoader from '../../dist/natives.loader.min.js'
import i18n from './i18n.plugin.js'
import cardView from './card.view.js'

// In-build `Fonts` plugin configuration
const fontPluginConfig = {
  autoload: true,
  googlefonts: [
    { name: 'Lexend' },
    { name: 'Urbanist', weights: [300, 500, 700] }
  ],
  custom: [
    { name: 'Alata', url: 'https://fonts.googleapis.com/css2?family=Alata:wght@100;200;300;400;500&display=swap' }, 
  ],
  cssrule: {
    fontFamily: 'Urbanist, Lexend, helvetica, Sans serif',
    fontWeight: 500,
    fontSize: '90%'
  } 
}

const settings = {
  // viewOnly: true,
  hoverSelect: true,
  plugins: [
    // Active in-build `Live` ollaboration plugin
    'Live',
    // Active in-build `Fonts` plugin
    { name: 'Fonts', config: fontPluginConfig }
  ],
  // autoPropagate: true
},
editor = new Modela( settings )

// Load in-build components: view-component, toolbar options, ...
const natives = ModelaNativesLoader( editor )
natives.load()

// Register custom view component
editor.store.addView( cardView )

// Register custom plugin
const i18nConfig = {
  ai: true
}
editor.plugins.register( i18n, i18nConfig )

// Then mount editor
editor.mount('body')

// Add a desktop frame to the board
editor.frames.add({
  source: 'http://127.0.0.1:3000/publications/@modela/examples/test/index.html',
  title: 'Frame Test',
  // position: { top: 'calc(50% - 50vh)', left: 'calc(50% - 50vw)' }
})
// Add a tablet frame to the board
editor.frames.add({
  source: 'http://127.0.0.1:3000/publications/@modela/examples/wigo/index.html',
  title: 'Frame Test',
  device: 'tablet'
})
// Add a mobile frame to the board
editor.frames.add({
  source: 'http://127.0.0.1:3000/publications/@modela/examples/wigo/index.html',
  title: 'Frame Test',
  device: 'mobile',
  // position: { top: 'calc(50% - 50vh)', left: 'calc(50% + 60vw)' }
})
// Add empty tablet frame to the board
editor.frames.add({
  // source: 'http://127.0.0.1:3000/publications/@modela/examples/wigo/index.html',
  title: 'Empty Frame Test',
  device: 'tablet'
})