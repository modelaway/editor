
import { Editor, Natives } from '../../dist/modela.min.js'
// import ModelaNativesLoader from '../../dist/natives.loader.min.js'
import i18n from './i18n.plugin.js'
import cardView from './card.view.js'

const dummyFrameContent = `<div class="th--dark" id="root">
    <main class="position-relative w-100 vh-100 theme-bg">
      <div class="row m-0 position-relative top-0 vh-100">
        <div class="col-8 theme-bg-secondary d-md-block d-none"></div>
        <div class="col p-0">
          <div class="w-100 h-100 theme-bg">
            <section
              style="height:50%;background-image:url(./bg-circles.3c284014.png);background-size:contain">
            </section>
            <section style="height:50%" class="position-absolute bottom-0 w-100 d-flex align-items-center px-md-2">
              <div style="padding-bottom:6rem" class="w-100 px-3"><img width="120px"
                  src="./small.png"><br><br>
                <p class="font-medium-2 font-weight-300 py-50"><span data-lang="en-US"
                    style="color:inherit;"></span>Mobile money, Bank, e-Wallet, and international transfers just like
                  you want.</p>
              </div>
              <div class="position-absolute bottom-0 p-3"><button
                  class="btn btn-primary btn-xl btn-block round px-4"><span data-lang="en-US" style="color:inherit;">Get
                    Started</span></button></div>
            </section>
          </div>
        </div>
      </div>
    </main>
  </div>`

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
editor.mount('body')

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