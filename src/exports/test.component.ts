import type { Template, Handler } from '../component'

import Lips, { Component } from '../component/lips'
import english from '../languages/en.json'
import french from '../languages/fr.json'

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
  type Static = {
    [index: string]: any
  }

  const
  template = `<div component="Greet" style="!state.online && 'color: red'">
      <span text=input.person>me</span>:
      (<span text="state.online ? 'Online' : 'Offline'"></span>)
      <span text=static.verb>...</span>
      <for from="0" to="2">
        <if( state.time == 'morning' )>
          <switch by=state.speech>
            <case is="hi">
              <span on-click="handleConnect, !state.online">Hi - </span>
              <span text=index></span>
            </case>
            <case is="hello"><span>Hello - <span text=index></span></span></case>
            <case is="bonjour"><span>Bonjour - </span><span text=index></span></case>
            <default>Salut</default>
          </switch>
        </if>
        <else-if( state.time == 'afternoon' )>
          <span>Good afternoon - </span>
          <span text=index></span>
        </else-if>
        <else>
          <span text=input.default></span>
          <span html="<b>Everyone</b>"></span>
        </else>
      </for>

      <br>
      <ul>
        <for in=static.users>
          <li key=index>
            <span text=key>Frederic Dupont</span>:
            <ul>
              <for in=each>
                <li key=index>
                  <span text=each.name>Frederic Dupont</span> - 
                  <span text=each.location>Nice, Belogre</span>
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
  _static: Static = {
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
  handler: Handler<Input, State, Static> = {
    handleConnect( online: boolean, e: Event ){
      console.log('Connected: ', online, e )

      this.state.online = online
      this.state.time = 'evening'
      
      // this.setState({ online, time: 'evening' })
      // console.log('Updated to: ', this.state.online )
    }
  }

  const component = new Component<Input, State, Static>('Demo1', template, { input, state, _static, handler }, { debug: true })

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
    <span text=state.count></span>
    <br>
    <button on-click="handleClick">Count</button>
    <button on-click="() => self.destroy()">Destroy</button>
  </div>`,
  state: State = {
    count: 0
  },
  handler: Handler<any, State> = {
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
  },
  stylesheet = `
    span, button { font: 14px arial; color: rgba(50, 50, 70); }
  `

  const component = new Component<any, State>('Demo2', template, { state, handler, stylesheet }, { debug: true })

  component.appendTo('body')
}

function Demo3(){
  type Static = {

  }
  const
  template = `<async await="getUser, static.name">
    <preload>Preloading...</preload>
    <resolve>
      <ul>
        <li text=response.name></li>
        <li text=response.email></li>
      </ul>
    </resolve>
    <catch><span text=error></span></catch>
  </async>`,
  _static = {
    name: 'Peter Gibson'
  },
  handler: Handler<any, any, Static> = {
    getUser( name ){
      return new Promise( ( resolve, reject ) => {
        setTimeout( () => resolve({ name, email: 'g.peter@mail.com' }), 3000 )
        // setTimeout( () => reject('Unexpected error occured'), 1000 )
      })
    }
  }

  const component = new Component('Demo3', template, { _static, handler }, { debug: true })

  component.appendTo('body')
}

function Demo4(){
  const
  template = `
    <let country="Togo" capital="Lomè"></let>
    <div>
      <p>
        My country is {country}, 
        The capital of {country} is {capital}
      </p>

      <p>
        <let country="Ghana"></let>

        It borderd at west by <span text=country></span>
      </p>

      <p>
        I'd love to go back to <span text=capital></span> in December {new Date().getFullYear() + 1}
      </p>
    </div>`

  const component = new Component('Demo4', template, {}, { debug: true })

  component.appendTo('body')
}

function Demo5(){
  type TemplateInput = {
    initial: number
  }
  type TemplateState = {
    count: number
  }
  type TemplateStatic = {
    limit: number
  }

  const cp: Template<TemplateInput, TemplateState, TemplateStatic> = {
    state: {
      count: 0
    },
    handler: {
      onInput(){ this.state.count = Number( this.input.initial ) },
      handleClick( e: Event ){
        if( this.state.count >= this.static.limit )
          return

        this.state.count++
        this.emit('update', this.state.count )
      }
    },
    _static: {
      limit: 12
    },
    stylesheet: `
      span { font: 14px arial; color: blue; }
    `,
    
    default: `<div>
      <span html=input.__slot__></span>: 
      <span text="state.count"></span>
      <br>
      <button on-click="handleClick">Count</button>
    </div>`
  }

  const 
  config = {
    context: {
      lang: 'en-US',
      online: true
    },
    debug: true
  },
  lips = new Lips( config )

  lips.register('counter', cp )
  // await lips.register('caption', '../../examples/active-modela/components/caption')

  lips.i18n.setDictionary('en', english )
  lips.i18n.setDictionary('fr', french )

  type State = {
    initial: number
  }

  const
  state: State = {
    initial: 3
  },
  handler: Handler<any, State> = {
    onMount(){
      this.getNode().css({ color: 'green' })
      
      console.log('State: ', this.state.initial )
    }
  },
  template = `<main>
    <section style="{ border: '2px solid gray', margin: '3rem', padding: '15px' }">
      <counter initial=state.initial
                on-update="value => console.log( value )">
        Count till 12
      </counter>

      <counter initial=1>Number</counter>

      <p>I'm <span text="context.online ? 'Online' : 'Offline'"></span></p>

      <br><br>
      <button on-click="() => state.initial = 10">Reinitialize</button>
      <button title="Undo"
              style="background: black;color: white" 
              on-click="() => self.destroy()">Destroy</button>

      <caption></caption>
    </section>
  </main>`

  const component = lips.root({ default: template, state, context: ['online'] }, 'body')

  // Change detault translation language
  setTimeout( () => {
    // lips.language('fr-FR')
    lips.setContext('online', false )
  }, 5000 )
}

// Demo1()
// Demo2()
// Demo3()
// Demo4()
Demo5()