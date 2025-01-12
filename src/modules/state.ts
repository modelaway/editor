
export default class State {
  private state: Record<string, any> = {}

  set( field: string, value: any ){
    this.state[ field ] = value

    // Call lifecyle event functions
  }
  get( field?: string ){
    return field ? this.state[ field ] : this.state 
  }
  delete( field: string ) {
    delete this.state[ field ]

    // Call lifecyle event functions
  }
  clear(){
    this.state = {}

    // Call lifecyle event functions
  }
  json(){
    return JSON.parse( JSON.stringify( this.state ) )
  }
}