var h=Object.create;var{defineProperty:f,getPrototypeOf:l,getOwnPropertyNames:r}=Object;var a=Object.prototype.hasOwnProperty;var i=(o,e,t)=>{t=o!=null?h(l(o)):{};const n=e||!o||!o.__esModule?f(t,"default",{value:o,enumerable:!0}):t;for(let c of r(o))if(!a.call(n,c))f(n,c,{get:()=>o[c],enumerable:!0});return n};var s=(o)=>{return import.meta.require(o)};var u=(o,e)=>{for(var t in e)f(o,t,{get:e[t],enumerable:!0,configurable:!0,set:(n)=>e[t]=()=>n})};var d={initial:3},g=["online"],j=`
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
`;export{d as state,j as default,g as context};

//# debugId=0B05B27D8DDD1D6C64756e2164756e21
