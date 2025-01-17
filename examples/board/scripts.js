
import { Editor, Natives } from '../../dist/modela.min.js'
import i18n from './i18n.plugin.js'
import cardView from './card.view.js'

const dummyFrameContent = `
  <img src="http://127.0.0.1:3000/publications/@modela/examples/test/images/twins.jpeg" style="position: absolute;top:400px;left:200px;">

  <p style="position: absolute; top: 15vh; left: 40vw">I'm a paragraph text <span>Hello there</span></p>
  <span style="position: absolute; top: 55vh; left: 80vw; display: inline">Check me here</span>
  
  <div style="position: absolute;display:block;top:100px;width:100px;height:100px;background-color:aquamarine;"></div>
  <div style="position: absolute;display:block;top:200px;width:100px;height:100px;background-color:black;"></div>
`

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
editor = new Editor( settings )

// Load in-build components: view-component, toolbar options, ...
const natives = Natives.Loader( editor )
natives.load()

// Register custom view component
editor.store.addView( cardView )

// Register custom plugin
const i18nConfig = {
  ai: true
}
editor.plugins.register( i18n, i18nConfig )

// Then mount editor
editor.mount('.editor')

// Add a desktop frame to the board
editor.canvas.addFrame({
  content: dummyFrameContent,
  title: 'Frame Test'
})
// Add a mobile frame to the board
editor.canvas.addFrame({
  content: dummyFrameContent,
  title: 'Frame Test',
  device: 'mobile'
})
// Add empty tablet frame to the board
editor.canvas.addFrame({
  // source: 'http://127.0.0.1:3000/publications/@modela/examples/wigo/index.html',
  title: 'Empty Frame Test',
  device: 'tablet'
})