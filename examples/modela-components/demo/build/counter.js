var u=Object.create;var{defineProperty:s,getPrototypeOf:b,getOwnPropertyNames:d}=Object;var e=Object.prototype.hasOwnProperty;var k=(i,a,t)=>{t=i!=null?u(b(i)):{};const c=a||!i||!i.__esModule?s(t,"default",{value:i,enumerable:!0}):t;for(let n of d(i))if(!e.call(c,n))s(c,n,{get:()=>i[n],enumerable:!0});return c};var l=(i)=>{return import.meta.require(i)};var o=(i,a)=>{for(var t in a)s(i,t,{get:a[t],enumerable:!0,configurable:!0,set:(c)=>a[t]=()=>c})};var j={};o(j,{stylesheet:()=>{{return g}},state:()=>{{return H}},handler:()=>{{return f}},default:()=>{{return h}},context:()=>{{return v}},_static:()=>{{return p}}});var p={limit:12},v=["lang"],H={count:0},f={onCreate(){this.state.count=Number(this.input.initial)},onInput(){this.state.count=Number(this.input.initial)},handleClick(i){if(this.state.count>=this.static.limit)return;this.state.count++,this.emit("update",this.state.count)}},g=`
  span { font: 14px arial; color: blue; }
`,h=`<div>
  <span html=this.input.bodyHtml></span>: 
  <span text="this.state.count"></span>
  <br>
  <button on-click="handleClick">
    <span text="Count"></span>
    (<span text=this.context.lang></span>)
  </button>
</div>`;export{g as stylesheet,H as state,f as handler,h as default,v as context,p as _static};

//# debugId=59BE85B2D6F32B1164756e2164756e21
