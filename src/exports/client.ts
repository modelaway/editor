import IOF from '../lib/custom.iframe.io'
import FrameWindow from '../lib/frame.window'

type BindingConfig = {
  key: string
  settings: ModelaSettings
}

export const connect = async (): Promise<void> => {
  return new Promise( ( resolve, reject ) => {
    const chn = new IOF({})
    let timeout: any

    chn
    .listen()
    .on('bind', ({ key, settings }: BindingConfig, callback ) => {
      clearTimeout( timeout )
      
      if( !key || !settings ){
        const errmess = 'Invalid binding settings'

        typeof callback == 'function' && callback( true, errmess )
        return reject( errmess )
      }

      /**
       * Initialize frame's window controls
       */
      FrameWindow( chn )
      
      typeof callback == 'function' && callback( false )
      resolve()
    } )
    .once('dismiss', () => {
      // dismiss
    } )

    // Set 8 second connection timeout
    timeout = setTimeout( () => reject('Connection timeout'), 8000 )
  } )
}