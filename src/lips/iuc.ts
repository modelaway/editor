/**
 * Internal Update Clock: Single global timer 
 * that updates all components.
 */
export default class IUC {
  private HEARTBEAT = 5 // ms
  private subscriptions = new Map<string, () => void>()
  private timer?: NodeJS.Timeout | null = null
  
  register( ref: string, ticker: () => void ){
    this.subscriptions.set( ref, ticker )
    if( !this.timer ) this.startTimer()
  }
  unregister( ref: string ){
    this.subscriptions.delete( ref )
    if( this.subscriptions.size === 0 ) this.stopTimer()
  }
  
  private tick(){ this.subscriptions.forEach( ticker => ticker() ) }
  private startTimer(){ this.timer = setInterval( () => this.tick(), this.HEARTBEAT ) }
  private stopTimer(){
    if( !this.timer ) return

    clearInterval( this.timer )
    this.timer = null
  }
}