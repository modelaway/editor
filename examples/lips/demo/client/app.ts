
import * as Home from '../pages/home'
import * as Account from '../pages/account'

export const _static = {
  routes: [
    { path: '/', template: Home, default: true },
    { path: '/account', template: Account }
  ]
}
export const state = {
  initial: 3
}

export const context = ['online']

export default `
<main>
  <router routes=this.static.routes></router>

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
    <br>
    <profile></profile>
    <footer></footer>
  </section>
</main>
`