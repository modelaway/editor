var s=Object.create;var{defineProperty:r,getPrototypeOf:y,getOwnPropertyNames:b}=Object;var d=Object.prototype.hasOwnProperty;var l=(i,e,c)=>{c=i!=null?s(y(i)):{};const a=e||!i||!i.__esModule?r(c,"default",{value:i,enumerable:!0}):c;for(let n of b(i))if(!d.call(a,n))r(a,n,{get:()=>i[n],enumerable:!0});return a};var m=(i)=>{return import.meta.require(i)};var f=(i,e)=>{for(var c in e)r(i,c,{get:e[c],enumerable:!0,configurable:!0,set:(a)=>e[c]=()=>a})};var k={};f(k,{stylesheet:()=>{{return h}},default:()=>{{return j}},context:()=>{{return g}}});var g=["getUser"],h=`
  * { font-family: helvetica }
`,j=`
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
`;export{h as stylesheet,j as default,g as context};

//# debugId=E66EDFE81AFAE0A564756e2164756e21
