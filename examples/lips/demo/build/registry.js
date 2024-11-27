var q=Object.create;var{defineProperty:v,getPrototypeOf:r,getOwnPropertyNames:t}=Object;var u=Object.prototype.hasOwnProperty;var J=(a,d,b)=>{b=a!=null?q(r(a)):{};const e=d||!a||!a.__esModule?v(b,"default",{value:a,enumerable:!0}):b;for(let g of t(a))if(!u.call(e,g))v(e,g,{get:()=>a[g],enumerable:!0});return e};var K=(a)=>{return import.meta.require(a)};var x=(a,d)=>{for(var b in d)v(a,b,{get:d[b],enumerable:!0,configurable:!0,set:(e)=>d[b]=()=>e})};var h={};x(h,{stylesheet:()=>{{return B}},state:()=>{{return z}},handler:()=>{{return A}},default:()=>{{return D}},context:()=>{{return y}},_static:()=>{{return w}}});var w={limit:12},y=["lang"],z={count:0},A={onInput(){this.state.count=Number(this.input.initial)},handleClick(a){if(this.state.count>=this.static.limit)return;this.state.count++,this.emit("update",this.state.count)}},B=`
  span { font: 14px arial; color: blue; }
`,D=`<div>
  <span html=input.__innerHtml></span>: 
  <span text="state.count"></span>
  <br>
  <button on-click="handleClick">
    <span text="Count"></span>
    (<span text=context.lang></span>)
  </button>
</div>`;var j={};x(j,{stylesheet:()=>{{return F}},default:()=>{{return G}},context:()=>{{return E}}});var E=["getUser"],F=`
  * { font-family: helvetica }
`,G=`
<async await="context.getUser, 'Peter Giligous'">
  <preload>Preloading...</preload>
  <resolve>
    <div>
      <ul style="{ border: '1px solid black', padding: '15px' }">
        <li text=response.name></li>
        <li text=response.email></li>
      </ul>

      <counter initial=5 on-update="value => console.log('procount --', value )">By</counter>
    </div>
  </resolve>
  <catch><span text=error></span></catch>
</async>
`;var k={};x(k,{default:()=>{{return I}},_static:()=>{{return H}}});var H={content:"Nexted counter component"},I=`<p>
  <small style="color:gray" text=static.content>...</small>
</p>`;var M=(a)=>{a.register("counter",h),a.register("profile",j),a.register("footer",k)};export{M as default};

//# debugId=FD48C591CCE16F0564756e2164756e21
