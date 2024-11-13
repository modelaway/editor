import Lips from '../../../../dist/component.min'
import registry from './registry'
import english from '../../../../src/languages/en.json'
import french from '../../../../src/languages/fr.json'

import app, { state, context } from './app'

type Context = {
  lang: string
  online: boolean
  getUser: ( name ) => Promise<{ name: string, email: string }>
}

const lips = new Lips()

lips.setContext({
  lang: 'en-US',
  online: true,
  getUser( name ){
    return new Promise( ( resolve, reject ) => {
      setTimeout( () => resolve({ name, email: 'g.peter@mail.com' }), 3000 )
      // setTimeout( () => reject('Unexpected error occured'), 1000 )
    })
  }
})

lips.i18n.setDictionary('en', english )
lips.i18n.setDictionary('fr', french )

registry( lips )

const component = lips.root( app, { state, context })

component.appendTo('body')

// Change detault translation language
setTimeout( () => {
  // lips.language('fr-FR')
  lips.setContext('online', false )
}, 5000 )