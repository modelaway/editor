import type Modela from './modela'
import { debug } from './utils'

export default class Assets {
  private ASSETS: ObjectType<AssetData> = {}

  // constructor(){}

  add( assets: AssetData ){
    if( !assets )
      throw new Error('Undefined assets')
    
    if( this.ASSETS[ assets.name ] )
      throw new Error(`<${assets.name}> assets already exists`)

    this.ASSETS[ assets.name ] = assets
    debug('assets added - ', assets.name )
  }
  get( name: string ){
    return this.ASSETS[ name ]
  }
  remove( name: string ){
    if( this.ASSETS[ name ] )
      throw new Error(`<${name}> assets already exists`)

    delete this.ASSETS[ name ]
    debug('assets removed - ', name )
  }

  upload( files: InputFiles[] ){
    return new Promise( ( resolve, reject ) => {
      const data = new FormData()
      files.map( ({ file }) => data.append( 'file', file ) )
      
      const
      url = '',
      headers = {}
      
      // Axios
      // .post( url, data, {
      //   headers,
      //   onUploadProgress: e => {
      //     if( !e.lengthComputable ) return

      //     // Uploaded percentage
      //     let Percent = Math.round( ( e.loaded / e.total ) * 100 )
      //   }
      // })
      // .then( ({ data }) => resolve( data ) )
      // .catch( ({ request, response, message }) => {
      //   let error

      //   if( response ) error = response.status +' > '+ message
      //   else if( request ) error = request.status +' > '+ message
      //   else error = message
        
      //   debug('[PosterPlus] Upload Failed: ', error )
        
      //   // _this.state.alert = 'Unexpected Uploading Error Occured. Try again'
      //   reject( error )
      // } )
    } )
  }

  drop(){
    // Reset store to initial state
    this.ASSETS = {}
  }
}