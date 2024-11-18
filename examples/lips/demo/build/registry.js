var h=Object.create;var{defineProperty:d,getPrototypeOf:j,getOwnPropertyNames:k}=Object;var q=Object.prototype.hasOwnProperty;var I=(a,b,t)=>{t=a!=null?h(j(a)):{};const e=b||!a||!a.__esModule?d(t,"default",{value:a,enumerable:!0}):t;for(let c of k(a))if(!q.call(e,c))d(e,c,{get:()=>a[c],enumerable:!0});return e};var J=(a)=>{return import.meta.require(a)};var g=(a,b)=>{for(var t in b)d(a,t,{get:b[t],enumerable:!0,configurable:!0,set:(e)=>b[t]=()=>e})};var i={};g(i,{stylesheet:()=>{{return A}},state:()=>{{return x}},handler:()=>{{return z}},default:()=>{{return B}},context:()=>{{return w}},_static:()=>{{return r}}});var r={limit:12},w=["lang"],x={count:0},z={onInput(){this.state.count=Number(this.input.initial)},handleClick(a){if(this.state.count>=this.static.limit)return;this.state.count++,this.emit("update",this.state.count)}},A=`
  span { font: 14px arial; color: blue; }
`,B=`<div>
  <span html=this.input.__innerHtml></span>: 
  <span text="this.state.count"></span>
  <br>
  <button on-click="handleClick">
    <span text="Count"></span>
    (<span text=this.context.lang></span>)
  </button>
</div>`;var v={};g(v,{stylesheet:()=>{{return E}},default:()=>{{return F}},context:()=>{{return D}}});var D=["getUser"],E=`
  * { font-family: helvetica }
`,F=`
<async await="this.context.getUser, 'Peter Giligous'">
  <preload>Preloading...</preload>
  <resolve>
    <div>
      <ul style="{ border: '1px solid black', padding: '15px' }">
        <li text=this.async.response.name></li>
        <li text=this.async.response.email></li>
      </ul>

      <counter initial=5 on-update="value => console.log('procount --', value )">By</counter>
    </div>
  </resolve>
  <catch><span text=this.async.error></span></catch>
</async>
`;var y={};g(y,{default:()=>{{return H}},_static:()=>{{return G}}});var G={content:"Nexted counter component"},H=`<p>
  <small style="color:gray" text=this.static.content>...</small>
</p>`;var L=(a)=>{a.register("counter",i),a.register("profile",v),a.register("footer",y)};export{L as default};

//# debugId=1D52F88A8A6345C364756e2164756e21
