import IOF from '../lib/custom.iframe.io'
import RJQueryInit from '../lib/jquery.remote'

type BindingConfig = {
  key: string
  settings: ModelaSettings
}

export const connect = async (): Promise<void> => {
  return new Promise( ( resolve, reject ) => {
    const chn = new IOF({ type: 'IFRAME' })
    let timeout: any

    chn
    .listen()
    .once('bind', ({ key, settings }: BindingConfig, callback ) => {
      clearTimeout( timeout )
      if( !key || !settings ){
        const errmess = 'Invalid binding settings'

        typeof callback == 'function' && callback( true, errmess )
        return resolve()
      }

      RJQueryInit( chn )
      resolve()
    } )
    .once('dismiss', () => {
      // dismiss
    } )

    // Set 8 second connection timeout
    timeout = setTimeout( () => reject('Connection timeout'), 8000 )
  } )
}