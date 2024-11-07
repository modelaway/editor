
export const state = {
  initial: 3
}

export const context = ['online']

export default `
<section style="{ border: '2px solid gray', margin: '3rem', padding: '15px' }">
  <component ref="counter"
              initial=this.state.initial
              on-update="value => console.log( value )">
    Count till 12
  </component>

  <component ref="counter" initial=1>
    Note: 10
  </component>

  <p>I'm <span text="this.context.online ? 'Online' : 'Offline'"></span></p>

  <br><br>
  <button on-click="() => this.state.initial = 10">Reinitialize</button>
  <button title="Undo"
          style="background: black;color: white" 
          on-click="() => this.destroy()">Destroy</button>

  <component ref="caption"></component>
  <br>
  <component ref="profile"></component>
</section>
`