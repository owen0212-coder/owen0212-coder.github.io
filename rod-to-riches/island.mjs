// Shared physical layout: rendering and interaction use the same coordinates.
export const STATIONS = [
 {id:'dock',name:'Fishing dock',short:'DOCK',action:'Go fishing',x:0,z:11.5,building:{x:0,z:11.5,w:0,d:0},color:'#bc9150',number:1},
 {id:'market',name:'Fish market',short:'FISH MARKET',action:'Sell your catch',x:-6,z:3.6,building:{x:-6,z:1,w:4.2,d:2.7},color:'#528976',number:2},
 {id:'exchange',name:'Fish Exchange',short:'EXCHANGE',action:'Visit the stockbroker',x:5,z:-2.3,building:{x:5,z:-5,w:4.6,d:3.1},color:'#466b65',number:3},
 {id:'shop',name:'Tackle & Co.',short:'TACKLE SHOP',action:'Buy upgrades',x:-6,z:-2.3,building:{x:-6,z:-5,w:4.2,d:3.1},color:'#b27c52',number:4},
 {id:'office',name:'Harbormaster',short:'LAND & CREW',action:'Manage your business',x:5,z:3.6,building:{x:5,z:1,w:3.8,d:2.7},color:'#7b8658',number:5}
];
export const PLOTS = [
 {id:'east',name:'East wharf',price:250,slots:2,bounds:{x1:10,x2:18,z1:0,z2:8},work:{x:14,z:3},description:'Reclaim a working wharf with two crew spaces.'},
 {id:'northwest',name:'Net-makers’ yard',price:650,slots:2,bounds:{x1:-10,x2:0,z1:-15,z2:-8},work:{x:-5,z:-12},description:'Extend the north shore with drying racks and two crew spaces.'},
 {id:'northeast',name:'Packing quay',price:1200,slots:2,bounds:{x1:0,x2:10,z1:-15,z2:-8},work:{x:5,z:-12},description:'Build a packing yard and add two more crew spaces.'}
];
export const SPAWN={x:0,z:5};
export const TREES=[{x:-9,z:-6},{x:-9,z:6},{x:9,z:6},{x:0,z:-6.5}];
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function frameDelta(now,previous){return previous===null||!Number.isFinite(now)||!Number.isFinite(previous)?0:Math.max(0,Math.min((now-previous)/1000,.08));}
export function nearestStation(position){return STATIONS.find(s=>distance(position,s)<=1.65)||null;}
export function obstacles(plots=[]){return [
 ...STATIONS.filter(s=>s.building.w).map(s=>({x:s.building.x,z:s.building.z,w:s.building.w,d:s.building.d})),
 ...TREES.map(t=>({...t,w:.8,d:.8})),
 {x:8.2,z:2,w:1.2,d:.75},
 ...PLOTS.filter(p=>plots.includes(p.id)).map(p=>({...p.work,w:3.3,d:1.5}))
 ];}
export function walkable(p,plots=[]){
 if(!Number.isFinite(p?.x)||!Number.isFinite(p?.z))return false;
 const rectangles=[{x1:-10,x2:10,z1:-8,z2:8},{x1:-1.8,x2:1.8,z1:7.5,z2:14},...PLOTS.filter(q=>plots.includes(q.id)).map(q=>q.bounds)];
 // Adjacent plots share an open seam; sample the character's footprint, not each parcel independently.
 const inside=(x,z)=>rectangles.some(r=>x>=r.x1&&x<=r.x2&&z>=r.z1&&z<=r.z2);
 if(![[0,0],[.28,0],[-.28,0],[0,.28],[0,-.28]].every(([x,z])=>inside(p.x+x,p.z+z)))return false;
 return !obstacles(plots).some(o=>Math.abs(p.x-o.x)<o.w/2+.3&&Math.abs(p.z-o.z)<o.d/2+.3);
}
const key=p=>`${p.x},${p.z}`;
function snapped(p,plots){
 let best=null,d=Infinity;
 for(let x=Math.round(p.x*2)-2;x<=Math.round(p.x*2)+2;x++)for(let z=Math.round(p.z*2)-2;z<=Math.round(p.z*2)+2;z++){
  const q={x:x/2,z:z/2},n=distance(p,q);if(n<d&&walkable(q,plots)){d=n;best=q;}
 }return best;
}
export function findPath(start,end,plots=[]){
 if(!walkable(start,plots)||!walkable(end,plots))return [];
 const a=snapped(start,plots),b=snapped(end,plots);if(!a||!b)return [];
 const queue=[a],visited=new Map([[key(a),null]]);let found=false;
 for(let i=0;i<queue.length;i++){
  const p=queue[i];if(key(p)===key(b)){found=true;break;}
  for(const [dx,dz] of [[0,.5],[.5,0],[0,-.5],[-.5,0],[.5,.5],[-.5,.5],[.5,-.5],[-.5,-.5]]){
   const q={x:p.x+dx,z:p.z+dz};if(visited.has(key(q))||!walkable(q,plots))continue;
   if(dx&&dz&&(!walkable({x:p.x+dx,z:p.z},plots)||!walkable({x:p.x,z:p.z+dz},plots)))continue;
   visited.set(key(q),p);queue.push(q);
  }
 }
 if(!found)return [];
 const path=[];let p=b;while(p){path.unshift(p);p=visited.get(key(p));}
 path.push({...end});return path;
}
export function stepPlayer(position,dx,dz,seconds,plots=[]){
 if(![dx,dz,seconds].every(Number.isFinite)||seconds<=0)return {...position};
 const length=Math.hypot(dx,dz);if(!length)return {...position};
 const amount=5*Math.min(seconds,.1),steps=Math.ceil(amount/.12);let p={...position};
 for(let i=0;i<steps;i++){
  const sx=dx/length*amount/steps,sz=dz/length*amount/steps;
  if(walkable({x:p.x+sx,z:p.z+sz},plots))p={x:p.x+sx,z:p.z+sz};
  else {if(walkable({x:p.x+sx,z:p.z},plots))p.x+=sx;if(walkable({x:p.x,z:p.z+sz},plots))p.z+=sz;}
 }return p;
}
export function followPath(position,route,seconds,plots=[]){
 const path=[...route];let p={...position},remaining=Number.isFinite(seconds)?Math.max(0,Math.min(seconds,.1)):0,blocked=false;
 while(path.length&&remaining>1e-6){
  const target=path[0],d=distance(p,target);if(d<.04){path.shift();continue;}
  const dt=Math.min(remaining,d/5),next=stepPlayer(p,target.x-p.x,target.z-p.z,dt,plots);remaining-=dt;
  if(dt>1e-5&&distance(next,p)<.000001){blocked=true;break;}
  p=next;if(distance(p,target)<.04)path.shift();
 }
 return {position:p,path,blocked};
}
