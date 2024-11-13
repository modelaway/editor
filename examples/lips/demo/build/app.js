var d=Object.create;var{defineProperty:k,getPrototypeOf:f,getOwnPropertyNames:j}=Object;var l=Object.prototype.hasOwnProperty;var v=(i,e,t)=>{t=i!=null?d(f(i)):{};const n=e||!i||!i.__esModule?k(t,"default",{value:i,enumerable:!0}):t;for(let o of j(i))if(!l.call(n,o))k(n,o,{get:()=>i[o],enumerable:!0});return n};var w=(i)=>{return import.meta.require(i)};var c=(i,e)=>{for(var t in e)k(i,t,{get:e[t],enumerable:!0,configurable:!0,set:(n)=>e[t]=()=>n})};var r={};c(r,{default:()=>{{return q}}});var q="<section>Home</section>";var b={};c(b,{default:()=>{{return s}}});var s="<section>Account</section>";var y={routes:[{path:"/",template:r,default:!0},{path:"/account",template:b}]},z={initial:3},B=["online"],C=`
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
`;export{z as state,C as default,B as context,y as _static};

//# debugId=5D085BDCD4B1B60064756e2164756e21
