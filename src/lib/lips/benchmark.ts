import { uniqueObject } from './utils'

export default class Benchmark {
  private debug: boolean
  private initialStats: ObjectType<number> = {
    elementCount: 0,
    renderCount: 0
  }
  public stats: ObjectType<number> = this.reset()

  constructor( debug = false ){
    this.debug = debug
  }
  
  inc( trace: string ){
    if( !this.debug ) return
    this.stats[ trace ]++
  }
  dev( trace: string ){
    if( !this.debug ) return
    this.stats[ trace ]--
  }

  record( trace: string, value: number ){
    if( !this.debug ) return
    this.stats[ trace ] = value
  }
  reset(){
    return this.stats = uniqueObject( this.initialStats )
  }
  log(){
    this.debug && console.table( this.stats )
  }
}
