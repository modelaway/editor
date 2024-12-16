import $, { type Cash } from 'cash-dom'
import { LANGUAGE_DICTIONARIES } from './constants'

export default class I18N {
  private defaultLang: string
  private currentLang: string

  constructor(){
    this.defaultLang = window.mlang?.default
    this.currentLang = window.mlang?.current
  }

  /**
   * 
   */
  translate( text: string, lang?: string | null ){
    // No translation required
    if( lang && this.currentLang == lang )
      return { text, lang: this.currentLang }

    /**
     * Translate displayable texts
     * 
     * - text content
     * - title attribute
     * - placeholder attribute
     */
    const [ id, variant ]: string[] = (lang || this.currentLang).split('-')
    if( LANGUAGE_DICTIONARIES[ id ] && text in LANGUAGE_DICTIONARIES[ id ] ){
      // Check by language variant or default option
      if( typeof LANGUAGE_DICTIONARIES[ id ][ text ] === 'object' ){
        const variants = LANGUAGE_DICTIONARIES[ id ][ text ] as ObjectType<string>
        text = variants[ variant || '*' ] || variants['*']
      }
      
      // Single translation option
      else if( typeof LANGUAGE_DICTIONARIES[ id ][ text ] === 'string' )
        text = LANGUAGE_DICTIONARIES[ id ][ text ] as string
    }

    return { text, lang: this.currentLang }
  }

  propagate( $node: Cash, attribute: 'mlang' | 'lang' = 'mlang' ){
    const self = this
    function apply( this: HTMLElement ){
      const
      $this = $(this),
      _content = $this.html(),
      _title = $this.attr('title'),
      _placeholder = $this.attr('placeholder')

      let _lang = $this.attr( attribute )

      if( !/<\//.test( _content ) && $this.text() ){
        const { text, lang } = self.translate( $this.text(), _lang )

        $this.text( text )
        _lang = lang
      }
      if( _title ){
        const { text, lang } = self.translate( _title, _lang )

        $this.attr('title', text )
        _lang = lang
      }
      if( _placeholder ){
        const { text, lang } = self.translate( _placeholder, _lang )
        
        $this.attr('placeholder', text )
        _lang = lang
      }

      _lang && $this.attr( attribute, _lang )
    }

    $node.find(`[${attribute}]`).each( apply )

    return $node
  }
}