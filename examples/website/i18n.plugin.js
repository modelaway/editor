
export default class i18n {
  name = 'i18n'
  version = '1.0.0'

  constructor( factory, config ){

    console.log('-- config', config )
    console.log('-- lang', factory.flux.lang )
    console.log('-- css rules', factory.flux.css.rules() )
  }
}