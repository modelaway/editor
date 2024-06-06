import Client from '../../dist/modela.client.min.js'

try {
  new Client()
  // await connect()
  console.debug('-- connected --')
}
catch( error ){
  console.debug('Failed to connect to modela:', error )
}