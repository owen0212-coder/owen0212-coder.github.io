import * as T from './vendor/three.module.min.js';
import {STATIONS,PLOTS,TREES} from './island.mjs';
import {createSwimmingFish,animateSwimmingFish} from './swimming-fish.mjs?v=swim-depth-3';

export function createIslandWorld(container,onGround){
 const scene=new T.Scene();scene.background=new T.Color('#a9d1c9');scene.fog=new T.Fog('#a9d1c9',60,140);
 const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;container.appendChild(renderer.domElement);
 const camera=new T.OrthographicCamera(-25,25,16,-16,.1,150),focus=new T.Vector3(0,0,2),offset=new T.Vector3(20,28,30);
 scene.add(new T.HemisphereLight('#fff3d7','#426e72',2.7));const sun=new T.DirectionalLight('#fff1d1',3.1);sun.position.set(-18,32,16);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:1,far:85});sun.shadow.bias=-.001;scene.add(sun);
 const mats=new Map(),geometries=[];const mat=c=>{if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,roughness:.9,flatShading:true}));return mats.get(c);};
 function mesh(g,c,x,y,z,parent=scene){geometries.push(g);const m=new T.Mesh(g,mat(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const box=(w,h,d,c,x,y,z,p)=>mesh(new T.BoxGeometry(w,h,d),c,x,y,z,p);
 const cyl=(r,r2,h,c,x,y,z,n=10,p)=>mesh(new T.CylinderGeometry(r,r2,h,n),c,x,y,z,p);
 const cone=(r,h,c,x,y,z,n=7,p)=>mesh(new T.ConeGeometry(r,h,n),c,x,y,z,p);
 const ball=(r,c,x,y,z,p)=>mesh(new T.IcosahedronGeometry(r,1),c,x,y,z,p);
 const water=new T.Mesh(new T.PlaneGeometry(180,180,55,55).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:'#4d969a',roughness:.4,metalness:.13,transparent:true,opacity:.67,depthWrite:false,flatShading:true}));water.receiveShadow=true;scene.add(water);const waterBase=Float32Array.from(water.geometry.attributes.position.array);
 function terrain(bounds,parent=scene){const w=bounds.x2-bounds.x1,d=bounds.z2-bounds.z1,x=(bounds.x1+bounds.x2)/2,z=(bounds.z1+bounds.z2)/2;box(w+.35,.75,d+.35,'#c6b587',x,.15,z,parent);box(w,.6,d,'#94ae74',x,.78,z,parent);box(w+.55,.17,d+.55,'#e2cd98',x,.42,z,parent);}
 terrain({x1:-10,x2:10,z1:-8,z2:8});
 // A connected promenade, with physical buildings rather than floating services.
 box(3.6,.025,15.8,'#d8cc9f',0,1.095,0);box(18.8,.028,2.25,'#d8cc9f',0,1.1,3.6);box(18.8,.028,1.8,'#d8cc9f',0,1.1,-2.3);
 for(let z=-7;z<8;z+=1)box(.045,.03,.45,'#c1b58d',0,1.12,z);
 for(let i=0;i<14;i++)box(3.6,.22,.46,i%3?'#bd996a':'#d2af7a',0,1.04,7.5+i*.48);
 for(const x of [-1.65,1.65])for(const z of [8.3,11,13.6]){cyl(.12,.18,2,'#7c664b',x,.65,z);cyl(.18,.18,.14,'#e2cb98',x,1.72,z);}
 function board(text,width,height,x,y,z,parent=scene,bg='#224c42',fg='#f5e7bf'){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=192;const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,192);ctx.strokeStyle=fg;ctx.lineWidth=5;ctx.strokeRect(12,12,488,168);ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 42px Georgia';ctx.fillText(text,256,99,450);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}));m.position.set(x,y,z);parent.add(m);return m;
 }
 function person(shirt='#d6a65e',hat=true){
  const g=new T.Group(),legs=[],arms=[];scene.add(g);
  for(const x of [-.18,.18]){const leg=new T.Group();leg.position.set(x,.6,0);g.add(leg);box(.24,.48,.25,'#3d615d',0,-.24,0,leg);box(.27,.16,.42,'#394b42',0,-.49,.09,leg);legs.push(leg);}
  cyl(.34,.29,.6,shirt,0,.87,0,7,g);box(.46,.35,.4,'#507e74',0,.67,.025,g);ball(.27,'#e2b78c',0,1.37,0,g);
  for(const x of [-.4,.4]){const arm=new T.Group();arm.position.set(x,1.1,0);g.add(arm);box(.18,.46,.19,shirt,0,-.2,0,arm);ball(.105,'#e2b78c',0,-.46,0,arm);arms.push(arm);}
  if(hat){cyl(.53,.52,.075,'#e1c48b',0,1.58,0,12,g);cyl(.32,.36,.23,'#d9b579',0,1.7,0,10,g);cyl(.345,.355,.07,'#697c5e',0,1.62,0,10,g);}else{ball(.275,'#685747',0,1.49,-.02,g);}
  return {group:g,legs,arms};
 }
 const clerks=[];
 for(const s of STATIONS.filter(s=>s.building.w)){
  const b=s.building,g=new T.Group();g.position.set(b.x,1.08,b.z);scene.add(g);
  box(b.w,.22,b.d,'#8d8061',0,.08,0,g);box(b.w-.25,2.6,b.d-.25,'#ead8ae',0,1.45,0,g);
  const roof=cone(Math.max(b.w,b.d)*.76,1.4,s.color,0,3.35,0,4,g);roof.rotation.y=Math.PI/4;roof.scale.z=b.d/b.w;
  box(1.15,1.7,.1,'#355d55',0,1, b.d/2,g);
  for(const x of [-b.w*.32,b.w*.32]){box(.8,.88,.09,'#699b95',x,1.7,b.d/2,g);box(.84,.06,.13,'#fff0cd',x,1.7,b.d/2+.06,g);box(.055,.9,.13,'#fff0cd',x,1.7,b.d/2+.06,g);}
  board(s.id==='exchange'?'FISH EXCHANGE':s.id==='shop'?'TACKLE & CO.':s.id==='office'?'HARBOR OFFICE':'FRESH CATCH',b.w-.3,.72,0,2.65,b.d/2+.1,g);
  if(s.id==='exchange'){
   for(const x of [-1.75,1.75]){cyl(.18,.2,2.3,'#f2e6c8',x,1.15,b.d/2+.22,10,g);box(.5,.16,.5,'#d7c79d',x,2.3,b.d/2+.22,g);}
   board('BUY  •  SELL',1.3,.65,-1.35,1,b.d/2+.35,g,'#223e36','#e1d496');
  }
  if(s.id==='market'){
   for(let i=0;i<8;i++){const awning=box(b.w/8,.1,1.15,i%2?'#f6e8ba':s.color,-b.w/2+b.w/16+i*b.w/8,2.1,b.d/2+.4,g);awning.rotation.x=.16;}
   box(3.5,.7,.6,'#aa8458',0,.5,b.d/2+.45,g);
   for(let i=0;i<5;i++){const f=ball(.22,['#aec7bd','#d0a56a','#b8ced0'][i%3],-1.35+i*.65,.93,b.d/2+.5,g);f.scale.set(1.4,.35,.7);}
  }
  if(s.id==='shop'){for(const x of [-1.5,1.4]){cyl(.35,.4,.7,'#a68355',x,.5,b.d/2+.4,8,g);for(let i=0;i<3;i++)cyl(.025,.035,1.7,'#79664a',x+i*.1-.1,1.3,b.d/2+.4,6,g);}}
  const clerk=person(s.id==='exchange'?'#586960':s.color,false);clerk.group.position.set(b.x+.8,1.1,b.z+b.d/2-.2);clerks.push(clerk);
 }
 for(const p of TREES){cyl(.2,.28,1.5,'#89704b',p.x,1.75,p.z);cone(1.1,2.4,'#4e8263',p.x,3,p.z);cone(.8,1.9,'#709565',p.x,4,p.z);}
 for(const [x,z] of [[-9,0],[9,-5],[2,7],[-3,-7]]){cyl(.35,.45,.5,'#bc9064',x,1.3,z);ball(.45,'#759450',x,1.8,z);}
 const parcelGroups=new Map();
 for(const p of PLOTS){
  const owned=new T.Group(),unowned=new T.Group();scene.add(owned,unowned);terrain(p.bounds,owned);
  const {x,z}=p.work;box(3.3,.85,1.5,'#b69663',x,1.5,z,owned);box(3.5,.15,1.6,'#d5b885',x,2,z,owned);
  for(const dx of [-1.6,1.6]){cyl(.06,.08,2.9,'#826b4a',x+dx,2.4,z,8,owned);}
  const awning=box(4,.1,2.4,p.id==='east'?'#648c77':p.id==='northwest'?'#b08b5c':'#6c8b97',x,3.8,z,owned);awning.rotation.x=.08;
  for(let i=0;i<4;i++)box(.55,.35,.65,'#ddd1a1',x-1.2+i*.8,2.22,z,owned);
  const center={x:(p.bounds.x1+p.bounds.x2)/2,z:(p.bounds.z1+p.bounds.z2)/2};
  for(const px of [p.bounds.x1+.2,p.bounds.x2-.2])for(const pz of [p.bounds.z1+.2,p.bounds.z2-.2]){cyl(.07,.1,1.5,'#ae9a72',px,.55,pz,8,unowned);}
  const outline=new T.Line(new T.BufferGeometry().setFromPoints([[p.bounds.x1,.2,p.bounds.z1],[p.bounds.x2,.2,p.bounds.z1],[p.bounds.x2,.2,p.bounds.z2],[p.bounds.x1,.2,p.bounds.z2],[p.bounds.x1,.2,p.bounds.z1]].map(v=>new T.Vector3(...v))),new T.LineDashedMaterial({color:'#e9dca8',dashSize:.4,gapSize:.3}));outline.computeLineDistances();unowned.add(outline);
  board(`EXPAND · $${p.price}`,4,1.2,center.x,1.1,center.z,unowned,'#617d70','#fff0ca');owned.visible=false;parcelGroups.set(p.id,{owned,unowned});
 }
 const employees=Array.from({length:7},(_,i)=>person(['#bf975e','#7d9b6c','#a87b67'][i%3]));
 box(1.1,.7,.65,'#b79663',8.2,1.46,2);box(1.2,.1,.75,'#d9bc8c',8.2,1.86,2);
 const player=person(),footRing=new T.Mesh(new T.RingGeometry(.48,.57,32).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:'#fff0b9',transparent:true,opacity:.9,side:T.DoubleSide}));scene.add(footRing);
 const rod=new T.Group();player.group.add(rod);rod.position.set(.38,.95,.22);rod.rotation.x=.7;cyl(.022,.045,3,'#6c6040',0,1.5,0,7,rod);rod.visible=false;
 const bobber=ball(.12,'#eab775',0,.15,16),lineGeometry=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),line=new T.Line(lineGeometry,new T.LineBasicMaterial({color:'#fff1c9'}));scene.add(line);bobber.visible=false;line.visible=false;
 const targetRing=new T.Mesh(new T.RingGeometry(.3,.38,32).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:'#ffe9ac',side:T.DoubleSide}));scene.add(targetRing);targetRing.visible=false;
 const pathLine=new T.Line(new T.BufferGeometry(),new T.LineDashedMaterial({color:'#f8ecc3',dashSize:.3,gapSize:.2,transparent:true,opacity:.8}));scene.add(pathLine);
 const swimmers=[];for(let i=0;i<10;i++){const fish=createSwimmingFish(i);scene.add(fish);swimmers.push(fish);}
 const boats=[];for(let i=0;i<3;i++){const g=new T.Group();scene.add(g);g.position.set(4+i*3,.4,11+i*.6);box(1.5,.5,3,'#47776d',0,0,0,g);const prow=cone(.9,1.1,'#47776d',0,0,-1.7,3,g);prow.rotation.x=-Math.PI/2;box(1.25,.12,2.8,'#d1b685',0,.3,0,g);box(.9,.9,1.1,'#efdeb5',0,.8,.2,g);box(1.1,.1,1.3,'#ce975d',0,1.3,.2,g);boats.push(g);}
 for(let i=0;i<9;i++){const x=-45+i*12;cone(9,12+i%3*3,i%2?'#81aaa0':'#9abbb0',x,0,-40-i%2*8,5);}
 const raycaster=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),-1.1);
 function pointer(event){if(event.button!==0)return;const r=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new T.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),camera);const p=raycaster.ray.intersectPlane(plane,new T.Vector3());if(p)onGround({x:p.x,z:p.z});}
 renderer.domElement.addEventListener('pointerdown',pointer);
 let time=0,animation=0;const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 function resize(){const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h);const height=w<600?28:30;camera.left=-height*w/h/2;camera.right=height*w/h/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();}resize();addEventListener('resize',resize);
 function setPath(points){pathLine.geometry.dispose();pathLine.geometry=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(p.x,1.15,p.z)));pathLine.computeLineDistances();targetRing.visible=points.length>0;if(points.length){const p=points.at(-1);targetRing.position.set(p.x,1.16,p.z);}}
 function project(p){const v=new T.Vector3(p.x,p.y,p.z).project(camera);return {x:(v.x+1)/2*container.clientWidth,y:(1-v.y)/2*container.clientHeight};}
 function render(dt,state,moving,phase,holding){
  time+=dt;const motion=reduced?0:time,p=state.business.position;player.group.position.set(p.x,1.11,p.z);
  if(moving){animation+=dt*10;player.group.rotation.y=moving.angle;}
  player.legs.forEach((l,i)=>l.rotation.x=moving?Math.sin(animation+i*Math.PI)*.52:0);player.arms.forEach((a,i)=>a.rotation.x=moving?Math.sin(animation+i*Math.PI)*-.45:0);
  const active=['waiting','bite','fighting'].includes(phase);rod.visible=active;bobber.visible=active;line.visible=active;
  if(active){player.group.rotation.y=0;player.arms[1].rotation.x=-.8;rod.rotation.x=.7-(holding?.15:0);const tip=new T.Vector3(0,3,0);rod.localToWorld(tip);bobber.position.set(p.x,.16+Math.sin(motion*4)*.06+(phase==='bite'?Math.sin(time*20)*.1:0),16);lineGeometry.setFromPoints([tip,bobber.position]);}
  footRing.position.set(p.x,1.135,p.z);targetRing.rotation.z=motion*.5;
  const target=container.clientWidth<600?new T.Vector3(p.x,0,p.z-1):new T.Vector3(p.x*.22+1,0,p.z*.2-1);
  focus.lerp(target,reduced?1:1-Math.exp(-dt*4));camera.position.copy(focus).add(offset);camera.lookAt(focus);camera.updateMatrixWorld();
  const pos=water.geometry.attributes.position;for(let i=0;i<pos.count;i++)pos.array[i*3+1]=Math.sin(waterBase[i*3]*.4+motion)*Math.cos(waterBase[i*3+2]*.35+motion*.5)*.065;pos.needsUpdate=true;
  for(const fish of swimmers)animateSwimmingFish(fish,time,reduced);
  for(const [id,g] of parcelGroups){g.owned.visible=state.business.plots.includes(id);g.unowned.visible=!g.owned.visible;}
  const workplaces=[{x:8.2,z:3},...PLOTS.filter(q=>state.business.plots.includes(q.id)).flatMap(q=>[{x:q.work.x-1,z:q.work.z+1.3},{x:q.work.x+1,z:q.work.z+1.3}])];
  employees.forEach((e,i)=>{e.group.visible=i<state.business.workers;if(e.group.visible){e.group.position.set(workplaces[i].x,1.1,workplaces[i].z);e.group.rotation.y=Math.PI;e.arms[0].rotation.x=-.4+Math.sin(motion*2+i)*.2;}});
  clerks.forEach((c,i)=>c.group.rotation.y=Math.sin(motion*.5+i)*.1);
  boats.forEach((b,i)=>{b.visible=i<state.boats;b.position.y=.45+Math.sin(motion+i)*.06;b.rotation.z=Math.sin(motion+i)*.025;});
  renderer.render(scene,camera);
  return [...STATIONS.map(s=>({id:s.id,...project({x:s.building.x,z:s.building.z,y:s.id==='dock'?2.7:5.2})})),{id:'player',...project({x:p.x,y:3.3,z:p.z})}];
 }
 return {render,setPath,dispose(){renderer.domElement.removeEventListener('pointerdown',pointer);removeEventListener('resize',resize);scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose();}}});renderer.dispose();}};
}
