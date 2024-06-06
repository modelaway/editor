import type Modela from './modela'
import type { FrameOption } from './types/frame'

import IOF from './lib/custom.iframe.io'
import { createFrame } from './block.factory'
import { MEDIA_SCREENS } from './constants'
import { generateKey, obj2Str } from './utils'
import RJInit from './lib/jquery.remote'

export default class Frame {
  private chn?: IOF
  public key: string
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
      this.chn.emit('bind', { key: this.key, settings: this.flux.settings } )

      const $$ = RJInit( this.chn )

      const 
      $code = $$('<code>ln(x) + 12</code>'),
      $box = $$('#box')

      // await $$('#box').addClass('rounded')
      // console.log('-- hasClass: ', await $$('button').hasClass('btn') )
      const $clone = await $box.clone()
      ;(await $clone.addClass('rounded')).insertBefore('button')

      console.log( await $clone.attr('mv-name') )
      await $clone.attr('mv-key', '123456789999')
      await $clone.css('height', '400px')
      await $clone.css({ 'background-color': 'red' })

      console.log( await $clone.css('background-color') )

      ;(await $box.addClass('shadow')).append( $code )

      console.log('-- is box: ', await $clone.is('div#box') )
    } )
    .on('store.component', ({ name }, fn ) => {
      // typeof fn == 'function' && fn( false, this.flux.store.getComponent( name ) )
      
      console.log( obj2Str( this.flux.store.getComponent( name ) as any ) )
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