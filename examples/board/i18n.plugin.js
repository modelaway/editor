
export default class i18n {
  name = 'i18n'
  version = '1.0.0'

  constructor( factory, config ){
    // console.log('-- config', config )
    this.lang = factory.flux.lang

    factory.flux.i18n.translate = this.translate.bind(this)
  }

  translate( text, lang ){
    // No translation required
    if( lang && this.lang.current == lang )
      return { text, lang: this.currentLang }

    /**
     * Translate displayable texts
     * 
     * - text content
     * - title attribute
     * - placeholder attribute
     */
    // const [ id, variant ] = (lang || this.currentLang).split('-')
    // if( LANGUAGE_DICTIONARIES[ id ] && text in LANGUAGE_DICTIONARIES[ id ] ){
    //   // Check by language variant or default option
    //   if( typeof LANGUAGE_DICTIONARIES[ id ][ text ] === 'object' ){
    //     const variants = LANGUAGE_DICTIONARIES[ id ][ text ]
    //     text = variants[ variant || '*' ] || variants['*']
    //   }
      
    //   // Single translation option
    //   else if( typeof LANGUAGE_DICTIONARIES[ id ][ text ] === 'string' )
    //     text = LANGUAGE_DICTIONARIES[ id ][ text ]
    // }

    return { text, lang: this.currentLang }
  }
}