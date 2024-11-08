var j=Object.create;var{defineProperty:v,getPrototypeOf:k,getOwnPropertyNames:q}=Object;var t=Object.prototype.hasOwnProperty;var K=(a,i,c)=>{c=a!=null?j(k(a)):{};const b=i||!a||!a.__esModule?v(c,"default",{value:a,enumerable:!0}):c;for(let d of q(a))if(!t.call(b,d))v(b,d,{get:()=>a[d],enumerable:!0});return b};var L=(a)=>{return import.meta.require(a)};var y=(a,i)=>{for(var c in i)v(a,c,{get:i[c],enumerable:!0,configurable:!0,set:(b)=>i[c]=()=>b})};var H={};y(H,{stylesheet:()=>{{return A}},state:()=>{{return x}},handler:()=>{{return z}},default:()=>{{return B}},context:()=>{{return w}},_static:()=>{{return u}}});var u={limit:12},w=["lang"],x={count:0},z={onCreate(){this.state.count=Number(this.input.initial)},onInput(){this.state.count=Number(this.input.initial)},handleClick(a){if(this.state.count>=this.static.limit)return;this.state.count++,this.emit("update",this.state.count)}},A=`
  span { font: 14px arial; color: blue; }
`,B=`<div>
  <span html=this.input.bodyHtml></span>: 
  <span text="this.state.count"></span>
  <br>
  <button on-click="handleClick">
    <span text="Count"></span>
    (<span text=this.context.lang></span>)
  </button>
</div>`;var g={};y(g,{stylesheet:()=>{{return E}},default:()=>{{return G}},context:()=>{{return D}}});var D=["getUser"],E=`
  * { font-family: helvetica }
`,G=`
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
`;var h={};y(h,{default:()=>{{return J}},_static:()=>{{return I}}});var I={content:"Nexted counter component"},J=`<p>
  <small style="color:gray" text=this.static.content>...</small>
</p>`;var N=(a)=>{a.register("counter",H),a.register("profile",g),a.register("footer",h)};export{N as default};

//# debugId=6539382030E10CE164756e2164756e21
