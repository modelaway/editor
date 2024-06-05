import IOF from '../iof'

export default class Client {
  private chn?: IOF

  constructor(){
    const chn = new IOF({ type: 'IFRAME' }).listen()

		chn.once('bind', () => {
			// if( !metadata ) return reject('Invalid Configuration')
			// if( !metadata.accessToken ) return reject('Undefined Access Token')

			// // Create request handler
			// request = createRequest( metadata )

			// // Get access application's configuration
			// request('/access/config')
			// 		.then( ({ error, message, config }) => error ? reject( message ) : resolve({ metadata, config }) )
			// 		.catch( reject )
		})
    chn.on('command', () => console.log('-- Received command') )
  }
}