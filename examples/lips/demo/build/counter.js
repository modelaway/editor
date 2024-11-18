var o=Object.create;var{defineProperty:n,getPrototypeOf:r,getOwnPropertyNames:s}=Object;var c=Object.prototype.hasOwnProperty;var j=(a,t,i)=>{i=a!=null?o(r(a)):{};const b=t||!a||!a.__esModule?n(i,"default",{value:a,enumerable:!0}):i;for(let e of s(a))if(!c.call(b,e))n(b,e,{get:()=>a[e],enumerable:!0});return b};var k=(a)=>{return import.meta.require(a)};var d=(a,t)=>{for(var i in t)n(a,i,{get:t[i],enumerable:!0,configurable:!0,set:(b)=>t[i]=()=>b})};var h={};d(h,{stylesheet:()=>{{return f}},state:()=>{{return u}},handler:()=>{{return v}},default:()=>{{return g}},context:()=>{{return p}},_static:()=>{{return m}}});var m={limit:12},p=["lang"],u={count:0},v={onInput(){this.state.count=Number(this.input.initial)},handleClick(a){if(this.state.count>=this.static.limit)return;this.state.count++,this.emit("update",this.state.count)}},f=`
  span { font: 14px arial; color: blue; }
`,g=`<div>
  <span html=this.input.__innerHtml></span>: 
  <span text="this.state.count"></span>
  <br>
  <button on-click="handleClick">
    <span text="Count"></span>
    (<span text=this.context.lang></span>)
  </button>
</div>`;export{f as stylesheet,u as state,v as handler,g as default,p as context,m as _static};

//# debugId=334ACFE872220B8C64756e2164756e21
