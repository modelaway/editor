import type Modela from '../exports/modela'
import type { FrameOption } from '../types/frame'

import IOF from '../lib/custom.iframe.io'
import { generateKey } from './utils'
import { createFrame } from './block.factory'
import { MEDIA_SCREENS } from './constants'
import RJInit, { RJQuery } from '../lib/jquery.remote'

export default class Frame {
  private chn?: IOF
  public key: string
  public $$?: RJQuery
  private flux: Modela
  private $frame: JQuery<HTMLElement>

  constructor( flux: Modela, options: FrameOption ){
    this.flux = flux

    // Generate new key for the new frame
    this.key = generateKey()
    this.$frame = $(createFrame( this.key, options ))
    
    this.$frame.find('iframe').on('load', ( e: Event ) => {
      const target = e.target as HTMLIFrameElement
      if( !target )
        throw new Error('Unexpected error occured')

      this.chn = new IOF({ type: 'WINDOW' })
      this.chn.initiate( target.contentWindow as Window, new URL( options.source ).origin )

      this.events()
    })

    // Use default frame screen resolution
    this.resize( options.device || 'default')
    // Add frame to the board
    flux.controls.$board?.append( this.$frame )
  }

  events(){
    if( !this.chn ) return

    // Remove all previous listeners when iframe reloaded
    this.chn.removeListeners()

    this.chn
    .once('connect', async () => {
      if( !this.chn ) return

      // Initialize remote JQuery connection & controls
      this.$$ = RJInit( this.chn )
      this.chn.emit('bind', { key: this.key, settings: this.flux.settings } )
    } )
  }

  resize( device: string ){
    if( device === 'default' ){
      const 
      screenWidth = $(window).width(),
      screenHeight = $(window).height()
      
      this.$frame.find('iframe').css({ width: `${screenWidth}px`, height: `${screenHeight}px` })
      return
    }

    const mediaScrean = MEDIA_SCREENS[ device ] || Object.values( MEDIA_SCREENS ).filter( each => (each.type == device) )[0]
    if( !mediaScrean ) return 

    const { width, height } = mediaScrean
    this.$frame.find('iframe').css({ width, height })
  }
  delete(){
    this.$frame.remove()
  }
  edit(){
    this.$frame.attr('active', 'true')
    this.$frame.parent().attr('active', 'true')
  }
  dismiss(){
    this.$frame.removeAttr('active')
    this.$frame.parent().removeAttr('active')
  }
}