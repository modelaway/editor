import Component, { Meta, type Template, type Handler } from './component'

function Demo1(){
  type Input = {
    person: string
    default?: string
  }
  type State = {
    time: string
    speech: string
    online: boolean
  }

  const
  template = `<div component="Greet" style="!this.state.online && 'color: red'">
        <span text=this.input.person>me</span>:
        (<span text="this.state.online ? 'Online' : 'Offline'"></span>)
        <span text=this.static.verb>...</span>
        <for from="0" to="2">
          <if by="this.state.time == 'morning'">
            <switch by=this.state.speech>
              <case is="hi">
                <span on-click="handleConnect, !this.state.online">Hi - </span>
                <span text=this.for.index></span>
              </case>
              <case is="hello"><span>Hello - <span text=this.for.index></span></span></case>
              <case is="bonjour"><span>Bonjour - </span><span text=this.for.index></span></case>
              <default>Salut</default>
            </switch>
          </if>
          <else-if by="this.state.time == 'afternoon'">
            <span>Good afternoon - </span>
            <span text=this.for.index></span>
          </else-if>
          <else>
            <span text=this.input.default></span>
            <span html="<b>Everyone</b>"></span>
          </else>
        </for>

        <br>
        <ul>
          <for in=this.static.users>
            <li key=this.for.index>
              <span text=this.for.key>Frederic Dupont</span>:
              <ul>
                <for in=this.for.each>
                  <li key=this.for.index>
                    <span text=this.for.each.name>Frederic Dupont</span> - 
                    <span text=this.for.each.location>Nice, Belogre</span>
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

      this.state.online = online
      this.state.time = 'evening'
      
      // this.setState({ online, time: 'evening' })
      // console.log('Updated to: ', this.state.online )
    }
  }

  const component = new Component<Input, State>( template, { input, state, _static, _handler }, true )

  component.appendTo('body')

  setTimeout( () => {
    component.setState({ time: 'afternoon' })
    component.setInput({ person: 'Brigit' })
  }, 5000 )

}

function Demo2(){
  type State = {
    count: number
  }

  const
  template = `<div>
    <span text=this.state.count></span>
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

  component.appendTo('body')
}

function Demo3(){
  const
  template = `<async await="getUser, this.static.name">
    <preload>Preloading...</preload>
    <resolve>
      <ul>
        <li text=this.async.response.name></li>
        <li text=this.async.response.email></li>
      </ul>
    </resolve>
    <catch><span text=this.async.error></span></catch>
  </async>`,
  _static = {
    name: 'Peter Gibson'
  },
  _handler: Handler = {
    getUser( name ){
      return new Promise( ( resolve, reject ) => {
        // setTimeout( () => resolve({ name, email: 'g.peter@mail.com' }), 3000 )
        setTimeout( () => reject('Unexpected error occured'), 1000 )
      })
    }
  }

  const component = new Component( template, { _static, _handler }, true )

  component.appendTo('body')
}

function Demo4(){
  const
  template = `<let country="Togo" capital="Lomè"></let>
    <div>
      <p>
        My country is <span text=this.let.country></span>, 
        its capital is <span text=this.let.capital></span>
      </p>

      <p>
        <let country="Ghana"></let>

        It borderd at west by <span text=this.let.country></span>
      </p>

      <p>
        I'd love to go back to <span text=this.let.capital></span> sometime
      </p>
    </div>`

  const component = new Component( template, {}, true )

  component.appendTo('body')
}

function Demo5(){
  const
  template = `<section>
      <p>
        <component ref="103" text=this.let.text/>
      </p>

      <button on-click="changeLang, 'french'">Français</button>
      <button on-click="changeLang, 'english'">English</button>
    </section>`

  const component = new Component( template, {}, true )

  component.appendTo('body')
}

function Demo6(){
  const cp: Template = {
    state: {
      count: 0
    },
    handler: {
      onMount(){ this.state.count = Number( this.input.initial ) },
      handleClick( e: Event ){
        if( this.state.count >= this.static.limit )
          return

        this.state.count++
      }
    },
    static: {
      limit: 12
    },
    
    default: `<div>
      <span html=this.input.bodyHtml></span>: 
      <span text="this.state.count"></span>
      <br>
      <button on-click="handleClick">Count</button>
    </div>`
  }

  const meta = new Meta()
  meta.register('counter', cp )
  // await meta.register('caption', '../../examples/active-modela/components/caption')

  const
  state = {
    initial: 3
  },
  template = `<section>
      <component name="counter" initial=this.state.initial>
        Count till 12
      </component>

      <br><br>
      <button on-click="() => this.state.initial = 10">Reinitialize</button>
      <button on-click="() => this.destroy()">Destroy</button>

      <component name="caption"></component>
    </section>`

  const component = new Component( template, { state }, true, meta )

  component.appendTo('body')
}

// Demo1()
// Demo2()
// Demo3()
// Demo4()
// Demo5()
Demo6()