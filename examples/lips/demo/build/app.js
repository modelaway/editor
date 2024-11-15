var j=Object.create;var{defineProperty:R,getPrototypeOf:o,getOwnPropertyNames:q}=Object;var t=Object.prototype.hasOwnProperty;var F=(e,i,n)=>{n=e!=null?j(o(e)):{};const l=i||!e||!e.__esModule?R(n,"default",{value:e,enumerable:!0}):n;for(let k of q(e))if(!t.call(l,k))R(l,k,{get:()=>e[k],enumerable:!0});return l};var G=(e)=>{return import.meta.require(e)};var b=(e,i)=>{for(var n in i)R(e,n,{get:i[n],enumerable:!0,configurable:!0,set:(l)=>i[n]=()=>l})};var E={};b(E,{state:()=>{{return z}},handler:()=>{{return C}},default:()=>{{return D}},context:()=>{{return B}},_static:()=>{{return y}}});var $={};b($,{default:()=>{{return v}}});var v=`
<section>
  Home
  <footer></footer>
</section>
`;var d={};b(d,{default:()=>{{return w}}});var w=`
<section>
  User Account ID: <span text=this.input.query.userid></span>
</section>
`;var f={};b(f,{default:()=>{{return x}}});var x=`
<section>
  <p>Product ID: <span text=this.input.params.id></span></p>
  <p>Product Category: <span text=this.input.query.category></span></p>
</section>
`;var y={routes:[{path:"/",template:$,default:!0},{path:"/account",template:d},{path:"/product/:id",template:f}]},z={initial:3},B=["online"],C={onRouteChange(...e){console.log("Route changed -- ",...e)},onPageNotFound(e){console.log(`<${e}> page not found`)}},D=`
<main>
  <router routes=this.static.routes
          global
          on-after="onRouteChange, 'after'"
          on-before="onRouteChange, 'before'"
          on-not-found="onPageNotFound"></router>

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
`;export{z as state,C as handler,D as default,B as context,y as _static};

//# debugId=7D1497D3197BE99E64756e2164756e21
