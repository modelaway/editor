import { connect } from '../../dist/modela.client.min.js'

try {
  await connect()
  console.debug('-- connected --')
}
catch( error ){
  console.debug('Failed to connect to modela:', error )
}