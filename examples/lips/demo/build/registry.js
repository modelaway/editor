var H=Object.create;var{defineProperty:A,getPrototypeOf:I,getOwnPropertyNames:J}=Object;var K=Object.prototype.hasOwnProperty;var k=(n,i,d)=>{d=n!=null?H(I(n)):{};const g=i||!n||!n.__esModule?A(d,"default",{value:n,enumerable:!0}):d;for(let M of J(n))if(!K.call(g,M))A(g,M,{get:()=>n[M],enumerable:!0});return g};var q=(n)=>{return import.meta.require(n)};var z=(n,i)=>{for(var d in i)A(n,d,{get:i[d],enumerable:!0,configurable:!0,set:(g)=>i[d]=()=>g})};var B={};z(B,{stylesheet:()=>{{return T}},state:()=>{{return O}},handler:()=>{{return Q}},default:()=>{{return U}},context:()=>{{return N}},_static:()=>{{return L}}});var L={limit:12},N=["lang"],O={count:0},Q={onInput(){this.state.count=Number(this.input.initial)},handleClick(n){if(this.state.count>=this.static.limit)return;this.state.count++,this.emit("update",this.state.count)}},T=`
  span { font: 14px arial; color: blue; }
`,U=`<div>
  <span html=this.input.__innerHtml></span>: 
  <span text="this.state.count"></span>
  <br>
  <button on-click="handleClick">
    <span text="Count"></span>
    (<span text=this.context.lang></span>)
  </button>
</div>`;var D={};z(D,{stylesheet:()=>{{return X}},default:()=>{{return Y}},context:()=>{{return W}}});var W=["getUser"],X=`
  * { font-family: helvetica }
`,Y=`
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
`;var E={};z(E,{default:()=>{{return _}},_static:()=>{{return Z}}});var Z={content:"Nexted counter component"},_=`<p>
  <small style="color:gray" text=this.static.content>...</small>
</p>`;var G={};z(G,{state:()=>{{return C}},handler:()=>{{return F}},default:()=>{{return j}},_static:()=>{{return $}}});var $={global:!1,parseQuery:(n)=>{const i={};return n.split("&").map((g)=>{const[M,w]=g.split("=");i[M]=w}),i},routes:[]},C={currentPage:null,currentRoute:null,params:{},query:{},refreshing:!1},F={onInput(){console.log(this.input)},onMount(){},loadComponent(n){if(!n.component)n.component=require(n.page);return n},navigate(n,i){!i&&history.pushState({path:n},"",n);const d=n.split("?");n=d[0];const g=d[1]?this.static.parseQuery(d[1]):{};let M=null;if(this.state.currentRoute)M={name:this.state.currentRoute.name,path:this.state.currentRoute.path,params:this.state.params},this.emit("before",{fromState:M,toState:{path:n,query:g}});const w=this.match(n);if(!w)return this.state.currentPage?this.once("update",()=>this.emit("not-found",n)):setTimeout(()=>this.emit("not-found",n),200),this.setState({currentPage:null,params:{},query:{}});const{route:P,params:v}=w;this.once("update",()=>this.emit("after",{fromState:M,toState:{name:P.name,path:P.path,params:v,query:g}})),this.setState({currentPath:n,currentPage:this.loadComponent(P).component,currentRoute:P,params:v,query:g})},match(n){const i={};let d=!1;for(let g of this.static.routes){const{pathVars:M,pathRegex:w}=g,P=n.match(w);if(P!==null&&P.index===0){for(let v=0;v+1<P.length&&v<M.length;v++)i[M[v].replaceAll(/[\/:]/g,"")]=P[v+1];d=g;break}}return d?{route:d,params:i}:!1}},j="<div>Router</div>";var R=(n)=>{n.register("counter",B),n.register("profile",D),n.register("footer",E),n.register("router",G)};export{R as default};

//# debugId=F6120FD4A245565F64756e2164756e21
