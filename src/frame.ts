import type Modela from './modela'
import type { FrameOption } from './types/frame'

import IOF from './iof'
import { createFrame } from './block.factory'
import { MEDIA_SCREENS } from './constants'
import { generateKey } from './utils'

export default class Frame {
  private $frame: JQuery<HTMLElement>
  private chn?: IOF
  public key: string

  constructor( flux: Modela, options: FrameOption ){
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
    .once('connect', () => {
      this.chn?.emit('command')
      
      // this.chn.emit('auth:info', ( error, merchant ) => {

      //   if( error ){
      //     if( typeof this.errorCallback == 'function' )
      //       return this.errorCallback( error )
      //     else throw new Error( error.message )
      //   }

      //   this.isConnected = true

      //   // Set initial payment payload
      //   this.payload && this.setPayload( this.payload )

      //   typeof this.readyCallback == 'function'
      //   && this.readyCallback( merchant )
      // })
    } )
    .on('payment:failed', error => {
      
    })
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