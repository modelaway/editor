
export const state = {
  initial: 3
}

export const context = ['online']

export default `
<section style="{ border: '2px solid gray', margin: '3rem', padding: '15px' }">
  <counter initial=this.state.initial
            on-update="value => console.log( value )">
    Count till 12
  </counter>

  <counter initial=1>
    Note: 10
  </counter>

  <p>I'm <span text="this.context.online ? 'Online' : 'Offline'"></span></p>

  <br><br>
  <button on-click="() => this.state.initial = 10">Reinitialize</button>
  <button title="Undo"
          style="background: black;color: white" 
          on-click="() => this.destroy()">Destroy</button>

  <caption></caption>
  <br>
  <profile></profile>
</section>
`