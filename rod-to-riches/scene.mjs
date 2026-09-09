import * as T from './vendor/three.module.min.js';
export function createWorld(container){
 const scene=new T.Scene();scene.background=new T.Color('#c6ded3');scene.fog=new T.Fog('#c6ded3',40,110);
 const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;container.appendChild(renderer.domElement);
 const camera=new T.PerspectiveCamera(39,1,.1,160);camera.position.set(24,24,34);camera.lookAt(0,0,-2);
 scene.add(new T.HemisphereLight('#fff3d7','#336b72',2.5));const sun=new T.DirectionalLight('#fff0cb',3.4);sun.position.set(-15,30,12);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-28,right:28,top:28,bottom:-28,near:1,far:80});sun.shadow.bias=-.0005;scene.add(sun);
 const materials=new Map();function mat(c){if(!materials.has(c))materials.set(c,new T.MeshStandardMaterial({color:c,roughness:.88,flatShading:true}));return materials.get(c);}
 function mesh(geo,c,x,y,z,parent=scene){const o=new T.Mesh(geo,mat(c));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 const box=(w,h,d,c,x,y,z,p)=>mesh(new T.BoxGeometry(w,h,d),c,x,y,z,p);
 const cone=(r,h,c,x,y,z,n=7,p)=>mesh(new T.ConeGeometry(r,h,n),c,x,y,z,p);
 const cyl=(r1,r2,h,c,x,y,z,n=8,p)=>mesh(new T.CylinderGeometry(r1,r2,h,n),c,x,y,z,p);
 function sphere(r,c,x,y,z,p){return mesh(new T.IcosahedronGeometry(r,1),c,x,y,z,p);}
 let seed=731;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
 const waterGeo=new T.PlaneGeometry(230,230,85,85);waterGeo.rotateX(-Math.PI/2);const waterMat=new T.MeshStandardMaterial({color:'#438e92',roughness:.35,metalness:.22,flatShading:true});const water=new T.Mesh(waterGeo,waterMat);water.receiveShadow=true;scene.add(water);const original=Float32Array.from(waterGeo.attributes.position.array);
 // An irregular island, tapering into stone and a sandy shoreline.
 const land=new T.Group();scene.add(land);land.position.set(-14,-.2,-5);
 const shore=cyl(13,12.6,1.5,'#d8c596',0,0,0,11,land);shore.scale.set(1,1,1.3);
 const grass=cyl(12.2,12.8,1,'#829f65',0,.8,0,11,land);grass.scale.set(1,1,1.3);
 for(let i=0;i<32;i++){let x=-25+random()*22,z=-22+random()*25;if(x>-9&&z>-11)continue;const r=.35+random()*.8;const rock=sphere(r,'#b1b49c',x,.5,z);rock.scale.y=.6;}
 function tree(x,z,h){cyl(.16,.23,h*.45,'#816447',x,1+h*.2,z);cone(h*.3,h*.75,'#3c7862',x,1+h*.7,z);cone(h*.23,h*.6,'#58906a',x,1+h*.98,z);cone(h*.16,h*.48,'#729e70',x,1+h*1.23,z);}
 for(let i=0;i<35;i++){const x=-26+random()*20,z=-23+random()*21;if(x>-17&&z>-12)continue;tree(x,z,2.1+random()*3.1);}
 // Distant wooded headlands and layered mountains.
 for(let i=0;i<12;i++){const x=-48+i*9,z=-40-random()*12;cone(7+random()*7,9+random()*13,i%2?'#6f9c91':'#91b0a1',x,2,z,5);}
 for(const [x,z,r] of [[14,-25,5],[30,-13,6],[42,8,4]]){cyl(r,r*1.07,1.1,'#b8b397',x,-.2,z,9);cyl(r*.87,r,1,'#809b6c',x,.55,z,9);for(let i=0;i<5;i++)tree(x+(random()-.5)*r,z+(random()-.5)*r,2+random()*2);}
 // Harbor cabin, a striped awning and roadside details.
 box(4.6,3.6,4.3,'#e1c9a0',-10,2.9,-8);box(4.9,.3,4.6,'#745d49',-10,1.2,-8);
 const roof=cone(3.9,1.9,'#6c8078',-10,5.55,-8,4);roof.rotation.y=Math.PI/4;roof.scale.z=.96;
 box(.85,1.8,.1,'#446663',-9.8,2.2,-5.82);box(.11,1.95,.16,'#f3e7c9',-10.29,2.2,-5.74);box(.11,1.95,.16,'#f3e7c9',-9.31,2.2,-5.74);
 for(const x of [-11.4,-8.5]){box(.83,.9,.12,'#527d78',x,3.3,-5.78);box(.07,.93,.15,'#f6dfb7',x,3.3,-5.68);box(.87,.07,.15,'#f6dfb7',x,3.3,-5.68);}
 for(let i=0;i<8;i++){const a=box(.6,.1,2,'#efe4bc',-12.1+i*.6,3.65,-4.95);a.rotation.x=.17;if(i%2===0)a.material=mat('#698d7b');}
 for(const x of [-12.2,-7.8])cyl(.07,.07,2.8,'#775f47',x,2.5,-4.05);
 box(2.8,.7,.8,'#b18c57',-10,1.55,-4.1);for(let i=0;i<3;i++){const c=box(.68,.2,.55,['#e9b24e','#bb856a','#8aa185'][i],-10.9+i*.9,2,-4.1);c.rotation.y=.1;}
 cyl(.45,.5,.85,'#9e805b',-7.1,1.8,-6.2);cyl(.46,.46,.06,'#53685c',-7.1,2.05,-6.2);cyl(.46,.46,.06,'#53685c',-7.1,1.57,-6.2);
 // Long timber jetty pointing toward open water.
 const dock=new T.Group();scene.add(dock);
 for(let i=0;i<18;i++)box(2.9,.19,.49,i%3===0?'#c3a475':'#b79664',-3.5,1.15,-2+i*.52,dock);
 for(const x of [-4.7,-2.3])for(const z of [-1,2.3,6.5]){cyl(.16,.2,2.5,'#806347',x,.75,z,8,dock);cyl(.21,.21,.14,'#dec397',x,2.04,z,8,dock);}
 box(.14,.15,5.3,'#b49263',-4.7,1.85,1,dock);
 box(4.3,.2,2.4,'#b89a6e',-6.8,1.1,-1.8);
 const cooler=box(.86,.62,.65,'#5c8c80',-4.05,1.58,4.7);box(.94,.13,.73,'#eee4bd',-4.05,1.96,4.7);box(.14,.12,.1,'#59675a',-4.05,1.76,5.04);
 const bucket=cyl(.32,.24,.47,'#c8bd9a',-2.7,1.52,5.6);cyl(.27,.27,.03,'#3e7073',-2.7,1.77,5.6);
 // A little angler with boots, overalls and a straw hat.
 const person=new T.Group();person.position.set(-3.4,1.3,6.1);scene.add(person);
 for(const x of [-.18,.18]){box(.25,.45,.28,'#3c5659',x,.27,0,person);box(.28,.16,.43,'#354a46',x,.08,.09,person);}
 cyl(.37,.32,.62,'#d3a15e',0,.79,0,7,person);box(.49,.35,.39,'#507c79',0,.61,.03,person);sphere(.29,'#e7bd91',0,1.31,0,person);cyl(.6,.58,.075,'#dac088',0,1.52,0,12,person);cyl(.34,.39,.25,'#d5b478',0,1.66,0,10,person);cyl(.365,.375,.075,'#687b64',0,1.57,0,10,person);
 const arm=box(.18,.59,.2,'#d3a15e',.34,.91,.16,person);arm.rotation.x=-.9;
 const rod=new T.Group();rod.position.set(-3.1,2.4,6.5);scene.add(rod);const shaft=cyl(.025,.055,3.9,'#635c3c',0,1.95,0,8,rod);rod.rotation.x=.7;rod.rotation.z=-.25;cyl(.12,.12,.08,'#d9bd75',0,.5,0,10,rod);
 const bobber=new T.Group();scene.add(bobber);sphere(.1,'#f0e6bc',0,0,0,bobber);sphere(.074,'#d88555',0,.12,0,bobber);cyl(.013,.013,.2,'#504d3d',0,.24,0,6,bobber);bobber.position.set(-1,.23,11);bobber.visible=false;
 const lineGeo=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]);const line=new T.Line(lineGeo,new T.LineBasicMaterial({color:'#ecedce',transparent:true,opacity:.8}));scene.add(line);line.visible=false;
 const rings=[];for(let i=0;i<4;i++){const ring=new T.Mesh(new T.RingGeometry(.47,.49,48),new T.MeshBasicMaterial({color:'#ddf0d9',transparent:true,opacity:.3,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;scene.add(ring);rings.push(ring);}
 // Low-poly fish silhouettes moving beneath the surface.
 const swimmers=[];for(let i=0;i<10;i++){const g=new T.Group();const body=sphere(.35,'#377677',0,0,0,g);body.scale.set(.4,.16,1);const tail=cone(.2,.4,'#377677',0,0,.45,3,g);tail.rotation.x=Math.PI/2;g.position.set(random()*18-4,-.08,random()*20-9);scene.add(g);swimmers.push(g);}
 const boats=[];function boat(x,z,index){const g=new T.Group();g.position.set(x,.25,z);scene.add(g);const hull=box(1.45,.55,3,'#426c66',0,0,0,g);const prow=cone(.88,1.2,'#426c66',0,0,-1.65,3,g);prow.rotation.x=-Math.PI/2;box(1.18,.12,2.7,'#c3ac7c',0,.32,0,g);box(.95,.8,1,'#f1dbaf',0,.74,.3,g);box(1.2,.12,1.25,'#d89862',0,1.18,.3,g);box(.61,.32,.04,'#537e7a',0,.85,-.22,g);cyl(.04,.04,2.1,'#74644a',.4,1.3,.1,7,g);box(.45,.32,.04,'#ddb259',.61,2.15,.1,g);g.rotation.y=.2+index*.3;boats.push(g);return g;}
 for(let i=0;i<3;i++){boat(4+i*3,-4-i*2,i);boats[i].visible=false;}
 // Buoys and reeds give a sense of scale without downloaded assets.
 for(let i=0;i<10;i++){const x=-7-random()*4,z=5+random()*4;for(let j=0;j<3;j++){const stem=cyl(.025,.025,.8+random()*.8,'#6c8c56',x+j*.12,1.1,z,5);stem.rotation.z=(random()-.5)*.25;}}
 const birds=[];for(let i=0;i<5;i++){const geometry=new T.BufferGeometry().setFromPoints([new T.Vector3(-.4,0,.12),new T.Vector3(0,-.12,0),new T.Vector3(.4,0,.12)]);const bird=new T.Line(geometry,new T.LineBasicMaterial({color:'#526f67'}));bird.position.set(-15+i*7,10+random()*4,-15-random()*10);scene.add(bird);birds.push(bird);}
 let t=0,castTime=-10,boatCount=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function resize(){const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;if(w<600){camera.position.set(27,31,42);camera.fov=46;camera.lookAt(-2,0,0);}else{camera.position.set(24,24,34);camera.fov=39;camera.lookAt(1,0,-2);}camera.updateProjectionMatrix();}resize();addEventListener('resize',resize);
 function render(dt,phase,holding,count){t+=dt;if(phase==='waiting'&&castTime<0)castTime=t;if(phase==='idle'||phase==='caught'||phase==='lost')castTime=-10;
 const active=['waiting','bite','fighting'].includes(phase);bobber.visible=active;line.visible=active;
 const motion=reduced?0:t;const pos=waterGeo.attributes.position;for(let i=0;i<pos.count;i++){const x=original[i*3],z=original[i*3+2];pos.array[i*3+1]=Math.sin(x*.4+motion*.8)*Math.cos(z*.3+motion*.5)*.09;}pos.needsUpdate=true;
 bobber.position.y=.14+Math.sin(motion*3)*.055+(phase==='bite'?Math.sin(t*20)*.14:0);rod.rotation.x=.7+(holding?Math.sin(t*14)*.018-.16:0);
 const tip=new T.Vector3(0,3.9,0);rod.localToWorld(tip);lineGeo.setFromPoints([tip,bobber.position]);
 for(let i=0;i<rings.length;i++){const s=((t*.5+i/4)%1)*2+.2;rings[i].position.set(bobber.position.x,.18,bobber.position.z);rings[i].scale.setScalar(s);rings[i].material.opacity=(1-(s-.2)/2)*.35;rings[i].visible=active;}
 for(let i=0;i<swimmers.length;i++){swimmers[i].position.x+=Math.sin(motion*.15+i)*dt*.18;swimmers[i].rotation.y=motion*.15+i;}
 for(let i=0;i<boats.length;i++){boats[i].visible=i<count;boats[i].position.y=.32+Math.sin(motion*1.2+i)*.06;boats[i].rotation.z=Math.sin(motion+i)*.025;}
 for(let i=0;i<birds.length;i++){birds[i].position.x=-20+((motion*.5+i*9)%60);birds[i].position.y=12+Math.sin(motion*.4+i);}
 renderer.render(scene,camera);
 }
 return {render,dispose(){renderer.dispose();removeEventListener('resize',resize);}};
}
