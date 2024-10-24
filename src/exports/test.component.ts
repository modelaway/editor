import Component, { type Handler } from '../modules/component'

function Demo1(){
  type Input = {
    person: string
    default: string
  }
  type State = {
    time: string
    speech: string
    online: boolean
  }

  const
  template = `<div component="Greet" key="1a3" style="!this.state.online && 'color: red'">
        <span text="this.input.person">me</span>:
        (<span text="this.state.online ? 'Online' : 'Offline'"></span>)
        <span text="this.static.verb">...</span>
        <for from="0" to="2">
          <if by="this.state.time == 'morning'">
            <switch by="this.state.speech">
              <case is="hi">
                <span on-click="handleConnect, !this.state.online">Hi - </span>
                <span text="this.for.index"></span>
              </case>
              <case is="hello"><span>Hello - <span text="this.for.index"></span></span></case>
              <case is="bonjour"><span>Bonjour - </span><span text="this.for.index"></span></case>
              <default>Salut</default>
            </switch>
          </if>
          <else-if by="this.state.time == 'afternoon'">
            <span>Good afternoon - </span>
            <span text="this.for.index"></span>
          </else-if>
          <else>
            <span text="this.input.default"></span>
            <span html="<b>Everyone</b>"></span>
          </else>
        </for>

        <br>
        <ul>
          <for in="this.static.users">
            <li key="this.for.index">
              <span text="this.for.key">Frederic Dupont</span>:
              <ul>
                <for in="this.for.each">
                  <li key="this.for.index">
                    <span text="this.for.each.name">Frederic Dupont</span> - 
                    <span text="this.for.each.location">Nice, Belogre</span>
                  </li>
                </for>
              </ul>
            </li>
          </for>
        </ul>
      </div>`,
  state: State = {
    time: 'morning',
    speech: 'hi',
    online: true
  },
  input: Input = {
    person: 'Bob',
    default: 'Good evening'
  },
  _static: ObjectType<any> = {
    verb: 'Say',
    users: {
      Europe: [
        { name: 'Xavier des Rouseaux', location: 'Pincier, Toulouse' },
        { name: 'Frank Peterson', location: 'Greenville, London' }
      ],
      Africa: [
        { name: 'Ebu Sepegna', location: 'Keta, Volta' },
        { name: 'Gadje Ama', location: 'Ougbo, Plateaux' },
        { name: 'Albert Kefas', location: 'Gamba, Ndjamena' }
      ]
    }
  },
  _handler: Handler = {
    handleConnect( online: boolean, e: Event ){
      console.log('Connected: ', online, e )

      this.state.time = 'evening'
      
      // this.setState({ online, time: 'evening' })
      // console.log('Updated to: ', this.state.online )
    }
  }

  const component = new Component<Input, State>( template, { input, state, _static, _handler }, true )

  $('body').append( component.$ )

  // setTimeout( (function(){ 
  //   component.setState({ time: 'afternoon' })
  //   component.setInput({ person: 'Brigit' })
  // }).bind(this), 5000 )

}

function Demo2(){
  type State = {
    count: number
  }

  const
  template = `<div>
    <span text="this.state.count"></span>
    <br>
    <button on-click="handleClick">Count</button>
    <button on-click="() => this.destroy()">Destroy</button>
  </div>`,
  state: State = {
    count: 0
  },
  _handler: Handler = {
    onMount(){
      console.log('Component mounted')
    },
    onRender(){
      console.log('Component rendered')
    },
    onDestroy(){
      console.log('Component destroyed')
    },
    handleClick( e: Event ){
      this.state.count++
    }
  }

  const component = new Component( template, { state, _handler }, true )

  $('body').append( component.$ )
}

// Demo1()
Demo2()