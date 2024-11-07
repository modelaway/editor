
export const _static = {
  limit: 12
}

export const context = ['lang']
export const state = {
  count: 0
}

export const handler = {
  onCreate(){ this.state.count = Number( this.input.initial ) },
  onInput(){ this.state.count = Number( this.input.initial ) },
  handleClick( e ){
    if( this.state.count >= this.static.limit )
      return

    this.state.count++
    this.emit('update', this.state.count )
  }
}

export const stylesheet = `
  span { font: 14px arial; color: blue; }
`
  
export default `<div>
  <span html=this.input.bodyHtml></span>: 
  <span text="this.state.count"></span>
  <br>
  <button on-click="handleClick">
    <span text="Count"></span>
    (<span text=this.context.lang></span>)
  </button>
</div>`