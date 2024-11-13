var h=Object.create;var{defineProperty:e,getPrototypeOf:k,getOwnPropertyNames:m}=Object;var o=Object.prototype.hasOwnProperty;var s=(i,l,a)=>{a=i!=null?h(k(i)):{};const n=l||!i||!i.__esModule?e(a,"default",{value:i,enumerable:!0}):a;for(let d of m(i))if(!o.call(n,d))e(n,d,{get:()=>i[d],enumerable:!0});return n};var t=(i)=>{return import.meta.require(i)};var r=(i,l)=>{for(var a in l)e(i,a,{get:l[a],enumerable:!0,configurable:!0,set:(n)=>l[a]=()=>n})};var q={};r(q,{stylesheet:()=>{{return j}},state:()=>{{return f}},handler:()=>{{return g}},default:()=>{{return p}},context:()=>{{return c}},_static:()=>{{return b}}});var b={limit:12},c=["lang"],f={count:0},g={onInput(){this.state.count=Number(this.input.initial)},handleClick(i){if(this.state.count>=this.static.limit)return;this.state.count++,this.emit("update",this.state.count)}},j=`
  span { font: 14px arial; color: blue; }
`,p=`<div>
  <span html=this.input.__innerHtml></span>: 
  <span text="this.state.count"></span>
  <br>
  <button on-click="handleClick">
    <span text="Count"></span>
    (<span text=this.context.lang></span>)
  </button>
</div>`;export{j as stylesheet,f as state,g as handler,p as default,c as context,b as _static};

//# debugId=5F879205C3B37F2A64756e2164756e21
