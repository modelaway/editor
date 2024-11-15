var c=Object.create;var{defineProperty:b,getPrototypeOf:d,getOwnPropertyNames:h}=Object;var l=Object.prototype.hasOwnProperty;var k=(i,n,a)=>{a=i!=null?c(d(i)):{};const o=n||!i||!i.__esModule?b(a,"default",{value:i,enumerable:!0}):a;for(let t of h(i))if(!l.call(o,t))b(o,t,{get:()=>i[t],enumerable:!0});return o};var p=(i)=>{return import.meta.require(i)};var m=(i,n)=>{for(var a in n)b(i,a,{get:n[a],enumerable:!0,configurable:!0,set:(o)=>n[a]=()=>o})};var j={};m(j,{stylesheet:()=>{{return f}},state:()=>{{return u}},handler:()=>{{return v}},default:()=>{{return g}},context:()=>{{return s}},_static:()=>{{return r}}});var r={limit:12},s=["lang"],u={count:0},v={onInput(){this.state.count=Number(this.input.initial)},handleClick(i){if(console.log(i),this.state.count>=this.static.limit)return;this.state.count++,this.emit("update",this.state.count)}},f=`
  span { font: 14px arial; color: blue; }
`,g=`<div>
  <span html=this.input.__innerHtml></span>: 
  <span text="this.state.count"></span>
  <br>
  <button on-click="handleClick">
    <span text="Count"></span>
    (<span text=this.context.lang></span>)
  </button>
</div>`;export{f as stylesheet,u as state,v as handler,g as default,s as context,r as _static};

//# debugId=1D9BABA5DA69487164756e2164756e21
