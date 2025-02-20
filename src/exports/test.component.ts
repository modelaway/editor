import type { Template, Handler } from '../lips'

import Lips from '../lips/lips'
import Component from '../lips/component'
import english from '../languages/en.json'
import french from '../languages/fr.json'
import Layers from '../factory/layers'

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

      <div>
        <for from="0" to="2">
          <if( state.time == 'morning' )>
            <switch( state.speech )>
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
      </div>

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
  }, 2000 )
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
        <const country="Ghana"></const>
        <!-- <const country="Kenya"></const> -->

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
    limit: number
  }
  type TemplateState = {
    count: number
  }

  const easyCount: Template<TemplateInput, TemplateState> = {
    state: {
      count: 0
    },
    handler: {
      onInput(){ this.state.count = Number( this.input.initial ) },
      handleClick( e: Event ){
        if( this.state.count >= this.input.limit )
          return

        this.state.count++
      }
    },
    default: `
      <div>
        <span text=state.count></span>
        <br>
        <button on-click( handleClick )>Count</button>
      </div>
    `
  }

  const lips = new Lips({ debug: true })
  lips.register('easycount', easyCount )

  const
  _static = {
    vars: { type: 'UI Framework', name: 'Lips', version: '1.0.0' }
  },
  handler: Handler = {
    initcount(){
      // Do something ...

      return {
        initial: 5,
        limit: 10
      }
    }
  },
  template = `
    <div>
      <easycount ...self.initcount()></easycount>

      <const ...static.vars></const>
      <ul>
        <li>Type: {type}</li>
        <li>Name: {name}</li>
        <li>Version: {version}</li>
      </ul>
    </div>
  `

  lips.root({ default: template, _static, handler }, 'body')
}

function Demo6(){
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
      <span text=state.count></span>
      <br>
      <button on-click(handleClick)>Count</button>
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
                on-update="value => console.log('--', value )">
        Count till 12
      </counter>

      <counter initial=1>Number</counter>

      <log( context.online )></log>
      <p>I'm <span text="context.online ? 'Online' : 'Offline'"></span></p>
      
      <br><br>
      <button on-click(() => state.initial = 10)>Reinitialize</button>
      <button style="background: black;color: white"
              on-click(() => self.destroy())>Destroy</button>

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

function DemoCart(){
  type CartItem = {
    id: number
    name: string
    price: number
    quantity: number
  }

  type CartInput = {
    key: string
  }

  type CartState = {
    items: CartItem[]
  }

  const state: CartState = {
    items: [
      { id: 1, name: "Apple", price: 0.5, quantity: 1 },
      { id: 2, name: "Banana", price: 0.3, quantity: 2 },
      { id: 3, name: "Orange", price: 0.6, quantity: 1 }
    ]
  }

  const handler: Handler<CartInput, CartState> = {
    onIncrementQuantity(itemId: number) {
      this.state.items = this.state.items.map(item =>
        item.id === itemId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    },

    onDecrementQuantity(itemId: number) {
      this.state.items = this.state.items.map(item =>
        item.id === itemId && item.quantity > 0
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    },

    getTotalItems() {
      return this.state.items.reduce((sum, item) => sum + item.quantity, 0)
    },

    getSubtotal() {
      return this.state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    },

    getTax() {
      return this.getSubtotal() * 0.1
    },

    getTotal() {
      return this.getSubtotal() + this.getTax()
    }
  }

  const template = `
    <div class="cart-container">
      <h2 class="cart-title">Shopping Cart</h2>
      
      <div class="cart-items">
        <for in=state.items>
          <div key=each.id class="cart-item">
            <div class="item-info">
              <h3>{each.name}</h3>
              <p class="item-price">{each.price.toFixed(2)} each</p>
            </div>
            
            <div class="quantity-controls">
              <mbutton 
                class="quantity-btn"
                on-click(onDecrementQuantity, each.id)
              >-</mbutton>
              <span class="quantity-value">{each.quantity}</span>
              <mbutton 
                class="quantity-btn"
                on-click(onIncrementQuantity, each.id)
              >+</mbutton>
            </div>
          </div>
        </for>
      </div>
      
      <div class="cart-summary">
        <div class="summary-row">
          <span>Total Items:</span>
          <span>{self.getTotalItems()}</span>
        </div>
        <div class="summary-row">
          <span>Subtotal:</span>
          <span>{self.getSubtotal().toFixed(2)}</span>
        </div>
        <div class="summary-row">
          <span>Tax (10%):</span>
          <span>{self.getTax().toFixed(2)}</span>
        </div>
        <div class="summary-row summary-total">
          <span>Total:</span>
          <span>{self.getTotal().toFixed(2)}</span>
        </div>
      </div>
    </div>
  `

  const stylesheet = `
    .cart-container {
      padding: 1rem;
      max-width: 28rem;
      margin: 0 auto;
      background-color: white;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .cart-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }

    .cart-items {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .cart-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 0.5rem;
    }

    .item-info h3 {
      font-weight: 500;
      margin: 0;
    }

    .item-price {
      color: #4b5563;
    }

    .quantity-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .quantity-btn {
      padding: 0.25rem 0.5rem;
      background-color: #e5e7eb;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .quantity-btn:hover {
      background-color: #d1d5db;
    }

    .quantity-value {
      width: 2rem;
      text-align: center;
    }

    .cart-summary {
      margin-top: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
    }

    .summary-total {
      font-weight: 700;
      padding-top: 0.5rem;
      margin-top: 0.5rem;
      border-top: 2px solid #e5e7eb;
    }

    /* Responsive adjustments */
    @media (max-width: 640px) {
      .cart-container {
        margin: 1rem;
        width: auto;
      }
    }
  `

  const
  input = {},
  component = new Component<CartInput, CartState>('shopping-cart', template, { input, state, handler, stylesheet }, { debug: true })

  component.appendTo('body')
}

function DemoLayers(){
  const
  context = {},
  lips = new Lips({ context }),
  content = `
    <section class="header-block">
      <div class="container-fluid">
        <div class="row">
          <div class="col-xl-4 col-lg-4 col-md-4 logo">
            <a href="/" title="Angular, React, Sass"><img src="https://www.webrecto.com/common/images/logo.png"
                alt="Angular, React, Sass" title="Angular, React, Sass" /></a>
          </div>
          <div class="col-xl-8 col-lg-8 col-md-8 text-right">
            <div class="header-menu">
              <ul>
                <li>Angular</li>
                <li>React</li>
                <li>NextJs</li>
                <li>Sass</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
    <div class="container-fluid">
      <div class="mainBlock">
        <div class="row">
          <div class="col-md-2 leftPart">
            <div class="leftBlock">
              <h5>Tutorials</h5>
              <div class="leftSection">
                <ul>
                  <li><a href="/react/how-to-pass-and-access-data-from-one-route-to-another-in-the-reactjs"
                      title="How to Pass and Access Data From One Route to Another in the ReactJs">How to Pass and Access
                      Data From One Route to Another in the ReactJs</a></li>
                  <li><a href="/react/navigate-to-another-page-on-button-click-in-react"
                      title="Navigate to Another Page on Button Click in React">Navigate to Another Page on Button Click in
                      React</a></li>
                  <li><a href="/react/installing-the-react-router-dom-and-use-in-react-application"
                      title="Install the React Router Dom and Use in React">Install the React Router Dom and Use in
                      React</a></li>
                  <li><a href="/react/nested-components-in-react" title="Nested Components in React">Nested Components in
                      React</a></li>
                  <li><a href="/react/change-page-title-dynamically-in-react"
                      title="Change Page Title Dynamically in React">Change Page Title Dynamically in React</a></li>
                  <li><a href="/react/implement-lazy-loading-in-react" title="Implement Lazy Loading in React">Implement
                      Lazy Loading in React</a></li>
                  <li><a href="/react/react-suspense-example" title="React Suspense Example">React Suspense Example</a></li>
                  <li><a href="/react/automatic-batching-in-react" title="Automatic Batching in React 18">Automatic Batching
                      in React 18</a></li>
                  <li><a href="/angular/angular-signals-example" title="Angular Signals Example">Angular Signals Example</a>
                  </li>
                  <li><a href="/angular/output-decorator-in-angular" title="@Output Decorator in Angular">@Output Decorator
                      in Angular</a></li>
                  <li><a href="/angular/how-to-use-input-decorator-in-angular"
                      title="How to Use Input Decorator in Angular">How to Use Input Decorator in Angular</a></li>
                  <li><a href="/angular/angular-async-validator-in-template-driven-form"
                      title="Angular Async Validator in Template Driven Form">Angular Async Validator in Template Driven
                      Form</a></li>
                  <li><a href="/angular/angular-httpclient-get-example" title="Angular HttpClient get Example">Angular
                      HttpClient get Example</a></li>
                  <li><a href="/angular/angular-observable-vs-promise" title="Angular Observable vs Promise">Angular
                      Observable vs Promise</a></li>
                  <li><a href="/angular/use-candeactivate-in-angular" title="How to use canDeactivate in Angular">How to use
                      canDeactivate in Angular</a></li>
                  <li><a href="/angular/angular-canactivatechild" title="How to use canActivateChild in Angular">How to use
                      canActivateChild in Angular</a></li>
                  <li><a href="/angular/angular-markaspristine" title="Angular markAsPristine() Example">Angular
                      markAsPristine() Example</a></li>
                  <li><a href="/angular/angular-markasuntouched" title="Angular markAsUntouched() Example">Angular
                      markAsUntouched() Example</a></li>
                  <li><a href="/angular/angular-markastouched" title="Angular markAsTouched() Example">Angular
                      markAsTouched() Example</a></li>
                  <li><a href="/angular/implement-canActivate-in-angular"
                      title="How to Implement Lazy Loading in Angular">How to Implement canActivate in Angular</a></li>
                  <li><a href="/angular/implement-lazy-loading-in-angular"
                      title="How to Implement Lazy Loading in Angular">How to Implement Lazy Loading in Angular</a></li>
                  <li><a href="/css/adjust-background-image-size-in-css"
                      title="How to Adjust Background Image Size in CSS">How to Adjust Background Image Size in CSS</a></li>
                  <li><a href="/css/set-background-attachment-in-css" title="How to Set Background Attachment in CSS">How to
                      Set Background Attachment in CSS</a></li>
                  <li><a href="/css/set-background-color-in-css" title="How to Set Background color in CSS">How to Set
                      Background color in CSS</a></li>
                  <li><a href="/css/css-background-repeat-property" title="CSS background-repeat Property">CSS
                      background-repeat Property</a></li>
                  <li><a href="/css/css-background-position-y" title="CSS background-position-y Property">CSS
                      background-position-y Property</a></li>
                  <li><a href="/css/css-background-position-x" title="CSS background-position-x Property">CSS
                      background-position-x Property</a></li>
                  <li><a href="/css/set-background-image-position-in-css"
                      title="How to Set Background Image Position in CSS">How to Set Background Image Position in CSS</a>
                  </li>
                  <li><a href="/css/add-background-image-in-css" title="How to Add Background Image in CSS">How to Add
                      Background Image in CSS</a></li>
                  <li><a href="/angular/angular-uppercase-and-lowercase-pipe"
                      title="Angular uppercase and lowercase Pipe Example"
                      alt="Angular uppercase and lowercase Pipe Example">Angular uppercase and lowercase Pipe Example</a>
                  </li>
                  <li><a href="/angular/angular-async-pipe-example" title="Angular Async Pipe Example">Angular Async Pipe
                      Example</a></li>
                  <li><a href="/react/react-interview-questions" title="Top ReactJS Interview Questions and Answers">Top
                      ReactJS Interview Questions and Answers</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div class="col-md-7 midPart">
            <div class="content">
              <div class="contentHd">

                <h1>How to Adjust Background Image Size in CSS</h1>
                <div class="date">By Webrecto, <span>August 24, 2023</span></div>
              </div>
              <div class="contentText">
                <! -- start content -->
                  <p>The <code>background-size</code> is a specific property of the CSS and it specifies the size of the
                    background image. It is used to adjust the background image size in html elements with the help of
                    different types of values. It allows multiple values to control the dimension of the multiple background
                    image in a single element.</p>

                  <p>The <code>background-size</code> accepts multiple values like <b>length</b>, <b>cover</b>,
                    <b>contain</b> and <b>inherit</b> for resizing the background image in html container. If we use these
                    CSS properties, the background image can be stretched or cropped to fit into the available element
                    space.</p>
                  <h2>CSS background-size Syntax:</h2>
                  <p>We can follow the below syntax to use CSS to adjust the element background image size.</p>
                  <div class="codeSection">
                    <div class="codeBlock">
                      <pre class="pre">background-size: auto | contain | cover | length | initial | inherit;</pre>
                    </div>
                  </div>

                  <p>In the below syntax, If an element have multiple background images, we can use the comma-separated
                    values to define the different sizes of each one. In CSS code we can define <b>cover</b> and
                    <b>contain</b> values for set image dimensions. If we set a single value in background-size, then it
                    will set only the image width and the image height will be set auto. </p>
                  <div class="codeSection">
                    <div class="codeBlock">
                      <pre class="pre">#multipleImage1 {
      background-image: url(firstImg.gif), url(secondImg.gif); // comma separated multiple image url
      background-size: cover, contain; // comma separated size properties
    }</pre>
                    </div>
                  </div>

                  <div class="codeSection">
                    <div class="codeBlock">
                      <pre class="pre">#multipleImage2 {
      background-image: url(firstImg.gif);
      background-size: 400px; // 400px is width value and height will set auto
    }</pre>
                    </div>
                  </div>


                  <h2>Property Values:</h2>
                  <p><b>auto: </b>This is default values, the background image is displayed in its original size, It doesn't
                    change anything.</p>
                  <div class="codeSection">
                    <div class="codeBlock">
                      <pre class="pre">background-size: auto;</pre>
                    </div>
                  </div>


                  <p><b>contain: </b>The contain value sets the background image fully visible without stretching or
                    cropping.</p>
                  <div class="codeSection">
                    <div class="codeBlock">
                      <pre class="pre">background-size: contain;</pre>
                    </div>
                  </div>


                  <p><b>cover: </b>This value is used to resize the background image to cover the entire container. It can
                    be stretched or cropped to fit into the element.</p>
                  <div class="codeSection">
                    <div class="codeBlock">
                      <pre class="pre">background-size: cover;</pre>
                    </div>
                  </div>


                  <p><b>length: </b>This value sets the width and height of the background image in the container. According
                    to syntax, the first value sets the image width and the second value sets the height. If we give only
                    one value then, it will set the element width, and height will set auto in the container.</p>
                  <div class="codeSection">
                    <div class="codeBlock">
                      <pre class="pre">background-size: 400px 300px; // first value is width and second value is height
    background-size: 400px // first value is width and height is auto </pre>
                    </div>
                  </div>

                  <p>In the above syntax, the first value represents horizontal size and the second value represents
                    vertical size.</p>
                  <P><b>inherit: </b>This value inherits the property from the parent element.</P>

                  <h2>Example 1: contain</h2>
                  <p>In the below example, I have set the background image in html DIV element. The width and height of the
                    <b>DIV</b> container are <br /><code>400 X 400</code>. I used the <code>contain</code> value in the
                    background size.</p>
                  <div class="codeSection">
                    <div class="codeBlock">
                      <pre class="pre">&lt;!DOCTYPE html&gt;
    &lt;html&gt;
    &lt;head&gt;
        &lt;title&gt;How to Adjust Background Image Size in CSS&lt;/title&gt;
        &lt;style&gt;
          .myImg {
            background-image: url("https://www.webrecto.com/css/images/webrecto.jpg");
            width: 400px;
            height: 400px;
            border: 2px solid #000;
            background-repeat: no-repeat; 
            background-size: contain;
          }
      &lt;/style&gt;
    &lt;/head&gt;
    &lt;body style="text-align:center"&gt;
        &lt;h1&gt;WebRecto.com&lt;/h1&gt;
        &lt;h2&gt;background-size: contain;&lt;/h2&gt;
        &lt;div class="myImg"&gt;
            We can add content here
        &lt;/div&gt;
    &lt;/body&gt;
    &lt;/html&gt;</pre>
                    </div>
                  </div>

                  <h3>Output:</h3>
                  <p class="imgcenter"><img src="images/bg-contain.jpg" title="How to Adjust Background Image Size in CSS"
                      alt="How to Adjust Background Image Size in CSS" /></p>

                  <h2>Example 2: cover</h2>
                  <P>In the below example, I have used the background-size: cover to set the dimensions of the background
                    image.</P>
                  <div class="codeSection">
                    <div class="codeBlock">
                      <pre class="pre">&lt;!DOCTYPE html&gt;
    &lt;html&gt;
    &lt;head&gt;
        &lt;title&gt;How to Adjust Background Image Size in CSS&lt;/title&gt;
        &lt;style&gt;
          .myImg {
            background-image: url("https://www.webrecto.com/css/images/webrecto.jpg");
            width: 400px;
            height: 400px;
            border: 2px solid #000;
            background-repeat: no-repeat; 
            background-size: cover;
          }
      &lt;/style&gt;
    &lt;/head&gt;
    &lt;body style="text-align:center"&gt;
        &lt;h1&gt;WebRecto.com&lt;/h1&gt;
        &lt;h2&gt;background-size: contain;&lt;/h2&gt;
        &lt;div class="myImg"&gt;
            We can add content here
        &lt;/div&gt;
    &lt;/body&gt;
    &lt;/html&gt;</pre>
                    </div>
                  </div>

                  <h3>Output:</h3>
                  <p class="imgcenter"><img src="images/bg-cover.jpg" title="How to Adjust Background Image Size in CSS"
                      alt="How to Adjust Background Image Size in CSS" /></p>

                  <h2>Example 3: length</h2>
                  <p>In the below example, I have set the background image for the HTML div element. The width and height of
                    the div element are 400 X 400 and the background-size property is 250 X 200.</p>
                  <div class="codeSection">
                    <div class="codeBlock">
                      <pre class="pre">&lt;!DOCTYPE html&gt;
    &lt;html&gt;
    &lt;head&gt;
        &lt;title&gt;How to Adjust Background Image Size in CSS&lt;/title&gt;
        &lt;style&gt;
          .myImg {
            background-image: url("https://www.webrecto.com/css/images/webrecto.jpg");
            width: 400px;
            height: 400px;
            border: 2px solid #000;
            background-repeat: no-repeat; 
            background-size: 250px 200px;
          }
      &lt;/style&gt;
    &lt;/head&gt;
    &lt;body style="text-align:center"&gt;
        &lt;h1&gt;WebRecto.com&lt;/h1&gt;
        &lt;h2&gt;background-size: contain;&lt;/h2&gt;
        &lt;div class="myImg"&gt;
            We can add content here
        &lt;/div&gt;
    &lt;/body&gt;
    &lt;/html&gt;</pre>
                    </div>
                  </div>


                  <! -- end content -->
              </div>
            </div>
          </div>
          <div class="col-md-3 rightPart">
            <div class="rightBlock">
              <div class="rightHead">Useful Links</div>
              <div class="rightSection">
                <ul>
                  <li><a href="/react/how-to-pass-and-access-data-from-one-route-to-another-in-the-reactjs"
                      title="How to Pass and Access Data From One Route to Another in the ReactJs">How to Pass and Access
                      Data From One Route to Another in the ReactJs</a></li>
                  <li><a href="/react/navigate-to-another-page-on-button-click-in-react"
                      title="Navigate to Another Page on Button Click in React">Navigate to Another Page on Button Click in
                      React</a></li>
                  <li><a href="/react/installing-the-react-router-dom-and-use-in-react-application"
                      title="Install the React Router Dom and Use in React">Install the React Router Dom and Use in
                      React</a></li>
                  <li><a href="/react/nested-components-in-react" title="Nested Components in React">Nested Components in
                      React</a></li>
                  <li><a href="/react/change-page-title-dynamically-in-react"
                      title="Change Page Title Dynamically in React">Change Page Title Dynamically in React</a></li>
                  <li><a href="/react/implement-lazy-loading-in-react" title="Implement Lazy Loading in React">Implement
                      Lazy Loading in React</a></li>
                  <li><a href="/react/react-suspense-example" title="React Suspense Example">React Suspense Example</a></li>
                  <li><a href="/react/automatic-batching-in-react" title="Automatic Batching in React 18">Automatic Batching
                      in React 18</a></li>
                  <li><a href="/angular/angular-signals-example" title="Angular Signals Example">Angular Signals Example</a>
                  </li>
                  <li><a href="/angular/output-decorator-in-angular" title="@Output Decorator in Angular">@Output Decorator
                      in Angular</a></li>
                  <li><a href="/angular/how-to-use-input-decorator-in-angular"
                      title="How to Use Input Decorator in Angular">How to Use Input Decorator in Angular</a></li>
                  <li><a href="/angular/angular-async-validator-in-template-driven-form"
                      title="Angular Async Validator in Template Driven Form">Angular Async Validator in Template Driven
                      Form</a></li>
                  <li><a href="/angular/angular-httpclient-get-example" title="Angular HttpClient get Example">Angular
                      HttpClient get Example</a></li>
                  <li><a href="/angular/angular-observable-vs-promise" title="Angular Observable vs Promise">Angular
                      Observable vs Promise</a></li>
                  <li><a href="/angular/use-candeactivate-in-angular" title="How to use canDeactivate in Angular">How to use
                      canDeactivate in Angular</a></li>
                  <li><a href="/angular/angular-canactivatechild" title="How to use canActivateChild in Angular">How to use
                      canActivateChild in Angular</a></li>
                  <li><a href="/angular/angular-markaspristine" title="Angular markAsPristine() Example">Angular
                      markAsPristine() Example</a></li>
                  <li><a href="/angular/angular-markasuntouched" title="Angular markAsUntouched() Example">Angular
                      markAsUntouched() Example</a></li>
                  <li><a href="/angular/angular-markastouched" title="Angular markAsTouched() Example">Angular
                      markAsTouched() Example</a></li>
                  <li><a href="/angular/implement-canActivate-in-angular"
                      title="How to Implement Lazy Loading in Angular">How to Implement canActivate in Angular</a></li>
                  <li><a href="/angular/implement-lazy-loading-in-angular"
                      title="How to Implement Lazy Loading in Angular">How to Implement Lazy Loading in Angular</a></li>
                  <li><a href="/css/adjust-background-image-size-in-css"
                      title="How to Adjust Background Image Size in CSS">How to Adjust Background Image Size in CSS</a></li>
                  <li><a href="/css/set-background-attachment-in-css" title="How to Set Background Attachment in CSS">How to
                      Set Background Attachment in CSS</a></li>
                  <li><a href="/css/set-background-color-in-css" title="How to Set Background color in CSS">How to Set
                      Background color in CSS</a></li>
                  <li><a href="/css/css-background-repeat-property" title="CSS background-repeat Property">CSS
                      background-repeat Property</a></li>
                  <li><a href="/css/css-background-position-y" title="CSS background-position-y Property">CSS
                      background-position-y Property</a></li>
                  <li><a href="/css/css-background-position-x" title="CSS background-position-x Property">CSS
                      background-position-x Property</a></li>
                  <li><a href="/css/set-background-image-position-in-css"
                      title="How to Set Background Image Position in CSS">How to Set Background Image Position in CSS</a>
                  </li>
                  <li><a href="/css/add-background-image-in-css" title="How to Add Background Image in CSS">How to Add
                      Background Image in CSS</a></li>
                  <li><a href="/angular/angular-uppercase-and-lowercase-pipe"
                      title="Angular uppercase and lowercase Pipe Example"
                      alt="Angular uppercase and lowercase Pipe Example">Angular uppercase and lowercase Pipe Example</a>
                  </li>
                  <li><a href="/angular/angular-async-pipe-example" title="Angular Async Pipe Example">Angular Async Pipe
                      Example</a></li>
                  <li><a href="/react/react-interview-questions" title="Top ReactJS Interview Questions and Answers">Top
                      ReactJS Interview Questions and Answers</a></li>
                </ul>
              </div>
            </div>
          </div>



        </div>
      </div>
    </div>
    <!-- footer -->
    <div class="container-fluid footerBlock">
      <div class="container">
        <div class="row footer">
          <div class="col-md-5">
            <h4>About Us</h4>
            <div style="padding-right: 60px">
              We are a group of front-end developers. We are enthusiastic to learn and share technologies. To improve our
              website's content, your valuable suggestions are most welcome. Thanks</br>
              Email: mywebrecto@gmail.com
            </div>
          </div>
          <div class="col-md-3">
            <h4>Resources</h4>
            <ul>
              <li><a href="https://angular.io/" target="_blank" title="Angular">Angular</a></li>
              <li><a href="https://react.dev/" target="_blank" title="React">React</a></li>
              <li><a href="https://redux.js.org/" target="_blank" title="React">Redux</a></li>
              <li><a href="https://www.w3.org/Style/CSS/Overview.en.html" target="_blank" title="CSS">CSS</a></li>
              <li><a href="https://developer.mozilla.org/en-US/docs/Web/CSS" target="blank" title="MDN">MDN</a></li>
              <li><a href="https://tailwindcss.com/" target="blank" title="Tailwind">Tailwind</a></li>
              <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank"
                  title="JavaScript">JavaScript</a></li>
            </ul>
          </div>
          <div class="col-md-4 social">
            <h4>Social Media</h4>
            <ul>
              <li><a href="https://twitter.com/webrecto" title="Twitter" target="_blank"><i class="fa fa-twitter"></i></a>
              </li>
              <li><a href="https://www.facebook.com/mywebrecto" title="Facebook" target="_blank"><i
                    class="fa fa-facebook"></i></a></li>
              <li><i class="fa fa-linkedin"></i></li>
              <li><i class="fa fa-youtube-play"></i></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div class="container-fluid copyrightBlock">
      <div class="container">
        <div class="row">
          <div class="col-md-12 copyright">
            <ul>
              <li>©2023 webrecto.com</li>
              <li><a href="/privacy-policy.php" title="Privacy Policy">Privacy Policy</a></li>
              <li><a href="/contact-us.php" title="Contact Us">Contact Us</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `,
  host = {
    key: '0',
    type: 'frame' as 'frame',
    title: 'Frame 1',
    content
  },
  component = Layers( lips, { host }).appendTo('body')
}

function DemoInput(){
  type TemplateInput = {
    initial: number
    limit: number
  }
  type TemplateState = {
    count: number
  }

  const easyCount: Template<TemplateInput, TemplateState> = {
    state: {
      count: 0
    },
    handler: {
      onInput(){ this.state.count = Number( this.input.initial ) },
      handleClick( e: Event ){
        if( this.state.count >= this.input.limit )
          return

        this.state.count++
      }
    },
    default: `
      <div>
        <div>In component count: {state.count}</div>
        <{input.render} count=state.count/>
        <br>
        <button on-click( handleClick )>Count</button>
      </div>
    `
  }

  const lips = new Lips({ debug: true })
  lips.register('easycount', easyCount )

  type State = {
    value: string
    initial: number
    attrs: {
      hidden: boolean
      title: string
    }
    numbers: number[]
    speech: string
  }

  const
  state: State = {
    value: 'dupont',
    initial: 5,
    attrs: {
      hidden: true,
      title: 'Spread'
    },
    numbers: [],
    speech: 'hi'
  },
  template = `
    <div style="{ border: '1px solid '+(state.value.length > 5 ? 'red' : 'gray') }">
      <input value=state.value
              on-input(handleInput)/>

      <br>
      <div html=state.value style="color: green"></div>
      <p ...state.attrs checked on-click(() => console.log('I got clicked'))>
        <span>Major word in speech is: {state.speech} <span> - {state.value +'-plus'}</span></span>
        <br><br>
        <small>Initial count: {state.initial}</small>
      </p>

      <easycount [count] initial=state.initial>
        <span>{state.value}: {count}</span>
      </easycount>

      <button on-click(() => self.state.initial = 2 )>Change initial</button>

      <if( state.value.includes('b') )>
        <p><b>{state.value}</b></p>
      </if>
      <else-if( state.value.includes('i') )>
        <p><i>{state.value}</i></p>
      </else-if>
      <else>
        <p>{state.value}</p>
      </else>
    </div>
  `,
  handler: Handler<any, State> = {
    handleInput( e ){
      this.state.value = e.target.value
      this.state.attrs.hidden = e.target.value.length == 2

      if( e.target.value.length == 2 ){
        this.state.speech = 'hello'
        this.state.numbers = [0,5,3,6,2,3,6,7,4]
      }

      if( e.target.value.length === 4 ){
        this.state.numbers = [4,3,2,3,3,32]
        this.state.speech = 'buuuu'
      }
    }
  }

  lips
  .render('DemoInput', { default: template, state, handler }, {})
  .appendTo('body')
}

// Demo1()
// Demo2()
// Demo3()
// Demo4()
// Demo5()
// Demo6()
// DemoCart()
// DemoLayers()
DemoInput()