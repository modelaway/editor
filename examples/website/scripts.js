
import Modela from '../../dist/modela.min.js'
import ModelaNativesLoader from '../../dist/natives.loader.min.js'
import i18n from './i18n.plugin.js'
import cardView from './card.view.js'

const
settings = {
  // viewOnly: true,
  hoverSelect: true
},
editor = new Modela( settings )

// Load in-build components: view-component, toolbar options, ...
const natives = ModelaNativesLoader( editor )
natives.load()

// Register custom view component
editor.store.addComponent( cardView )

// Register a plugin
const i18nConfig = {
  ai: true
}
editor.plugins.register( i18n, i18nConfig )

// Then mount editor
editor.mount('.editor')