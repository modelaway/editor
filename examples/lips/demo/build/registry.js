var M=Object.create;var{defineProperty:G,getPrototypeOf:N,getOwnPropertyNames:O}=Object;var T=Object.prototype.hasOwnProperty;var S=(i,n,v)=>{v=i!=null?M(N(i)):{};const A=n||!i||!i.__esModule?G(v,"default",{value:i,enumerable:!0}):v;for(let w of O(i))if(!T.call(A,w))G(A,w,{get:()=>i[w],enumerable:!0});return A};var V=(i)=>{return import.meta.require(i)};var E=(i,n)=>{for(var v in n)G(i,v,{get:n[v],enumerable:!0,configurable:!0,set:(A)=>n[v]=()=>A})};var H={};E(H,{stylesheet:()=>{{return Z}},state:()=>{{return X}},handler:()=>{{return Y}},default:()=>{{return $}},context:()=>{{return W}},_static:()=>{{return U}}});var U={limit:12},W=["lang"],X={count:0},Y={onInput(){this.state.count=Number(this.input.initial)},handleClick(i){if(console.log(i),this.state.count>=this.static.limit)return;this.state.count++,this.emit("update",this.state.count)}},Z=`
  span { font: 14px arial; color: blue; }
`,$=`<div>
  <span html=this.input.__innerHtml></span>: 
  <span text="this.state.count"></span>
  <br>
  <button on-click="handleClick">
    <span text="Count"></span>
    (<span text=this.context.lang></span>)
  </button>
</div>`;var I={};E(I,{stylesheet:()=>{{return F}},default:()=>{{return Q}},context:()=>{{return C}}});var C=["getUser"],F=`
  * { font-family: helvetica }
`,Q=`
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
`;var J={};E(J,{default:()=>{{return b}},_static:()=>{{return j}}});var j={content:"Nexted counter component"},b=`<p>
  <small style="color:gray" text=this.static.content>...</small>
</p>`;var K={};E(K,{handler:()=>{{return q}},default:()=>{{return R}},_static:()=>{{return g}}});var k=function(i){const n={};return i.split("&").map((A)=>{const[w,D]=A.split("=");n[w]=D}),n},g={global:!1,routes:[],currentPath:"/",currentRoute:null,params:{},query:{}},q={onInput(){if(!this.input.routes)return;if(this.input.global)this.static.global=this.input.global;let i;if(this.static.routes=this.input.routes.map(({path:n,template:v,default:A})=>{if(A)i=n;const w=n.match(/:[^\/]*(\/|$)/gi)||[],D=n.replaceAll("/","\\/").replaceAll(/:[^\/]*(\/|$)/gi,"([^\\/]+)(?:\\/|$)");return{path:n,template:v,default:A,pathVars:w,pathRegex:new RegExp(`${D}\$`,"i")}}),this.input.global){const n=window.location.pathname;i=i&&n=="/"&&n!==i?i:n?n+window.location.search:this.static.routes[0].path}this.navigate(i)},onMount(){if(this.input.global)window.navigate=this.navigate.bind(this),window.addEventListener("popstate",(i)=>i.state&&this.navigate(i.state.path,!0))},navigate(i,n){!n&&this.static.global&&history.pushState({path:i},"",i);const v=i.split("?");i=v[0];const A=v[1]?k(v[1]):{};let w=null;if(this.static.currentRoute)w={path:this.static.currentRoute.path,params:this.static.params},this.emit("before",{fromState:w,toState:{path:i,query:A}});const D=this.match(i);if(!D){this.static.currentRoute=null,this.static.params={},this.static.query={},this.emit("not-found",i);return}const{route:z,params:B}=D;this.emit("after",{fromState:w,toState:{path:z.path,params:B,query:A}}),this.static.currentPath=i,this.static.currentRoute=z,this.static.params=B,this.static.query=A,z.template.input={params:B,query:A};const L=this.lips?.render(i,z.template);if(!L){this.emit("not-found",i);return}this.getEl().empty().append(L.getEl())},match(i){const n={};let v=!1;for(let A of this.static.routes){const{pathVars:w,pathRegex:D}=A,z=i.match(D);if(z!==null&&z.index===0){for(let B=0;B+1<z.length&&B<w.length;B++)n[w[B].replaceAll(/[\/:]/g,"")]=z[B+1];v=A;break}}return v?{route:v,params:n}:!1}},R="<wrapper></wrapper>";var y=(i)=>{i.register("counter",H),i.register("profile",I),i.register("footer",J),i.register("router",K)};export{y as default};

//# debugId=B9715FAE83C680A664756e2164756e21
