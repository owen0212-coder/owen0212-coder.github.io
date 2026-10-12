import test from 'node:test';
import assert from 'node:assert/strict';
import {STATIONS,PLOTS,SPAWN,walkable,findPath,stepPlayer,followPath,nearestStation,distance,frameDelta} from './island.mjs';
import {initialState,sanitize} from './economy.mjs';
import {initialBusiness,sanitizeBusiness,staffCapacity,businessRates,buyLand,hireWorker,trainWorkers,earnBusiness,collectBusiness} from './business.mjs';
test('first-frame and stale animation timestamps cannot send the camera backwards',()=>{
 assert.equal(frameDelta(100,null),0);assert.equal(frameDelta(100,2500),0);assert.equal(frameDelta(10000,0),.08);assert.equal(frameDelta(NaN,1),0);assert.equal(frameDelta(1016,1000),.016);
});
test('all five stations are reachable on the starter island, without a purchase',()=>{
 for(const from of [SPAWN,...STATIONS])for(const to of STATIONS){
  const route=findPath(from,to);assert.ok(route.length,`${from.id||'spawn'} to ${to.id}`);
  for(const p of route)assert.equal(walkable(p),true);
  assert.ok(distance(route.at(-1),to)<.001);
 }
});
test('walking follows every starter route without crossing a building or becoming stuck',()=>{
 for(const target of STATIONS){let p={...SPAWN};const route=findPath(p,target);
  for(const next of route){let attempts=0;while(distance(p,next)>.04&&attempts++<100){const dt=Math.min(1/60,distance(p,next)/5);p=stepPlayer(p,next.x-p.x,next.z-p.z,dt);assert.equal(walkable(p),true);}assert.ok(attempts<100,target.id);}
  assert.equal(nearestStation(p)?.id,target.id);
 }
});
test('character cannot walk through walls, into the sea or onto unpurchased plots',()=>{
 assert.equal(walkable({x:5,z:-5}),false);assert.equal(walkable({x:30,z:30}),false);assert.equal(walkable({x:14,z:6}),false);
 let p={x:0,z:5};for(let i=0;i<1000;i++)p=stepPlayer(p,1,0,.1);assert.ok(p.x<10);assert.equal(walkable(p),true);
 assert.deepEqual(findPath(SPAWN,{x:14,z:6}),[]);assert.equal(nearestStation(SPAWN),null);
});
test('frame remainders cannot falsely block a route when a waypoint is reached',()=>{
 for(const from of STATIONS)for(const to of STATIONS){let p={x:from.x,z:from.z},path=findPath(p,to),i=0;
  while(path.length&&i<1500){const r=followPath(p,path,[.0167,.08,1/60,.000000001][i++%4]);assert.equal(r.blocked,false,from.id+' to '+to.id);p=r.position;path=r.path;assert.equal(walkable(p),true);}
  assert.ok(i<1500);assert.equal(nearestStation(p)?.id,to.id);
 }
});
test('purchased parcels open connected walkable space while workbenches remain solid',()=>{
 for(const plot of PLOTS){const target={x:plot.work.x,z:plot.work.z+2};assert.equal(walkable(target),false);assert.equal(walkable(target,[plot.id]),true);assert.equal(walkable(plot.work,[plot.id]),false);assert.ok(findPath(SPAWN,target,[plot.id]).length);}
});
test('invalid movement inputs cannot create NaN or teleport across the island',()=>{
 assert.deepEqual(stepPlayer(SPAWN,Infinity,0,1),SPAWN);assert.deepEqual(stepPlayer(SPAWN,0,0,1),SPAWN);assert.deepEqual(stepPlayer(SPAWN,1,0,-1),SPAWN);
 assert.ok(distance(SPAWN,stepPlayer(SPAWN,1,0,999))<=.501);
});
test('land is bought once, costs cash, and increases staff capacity only',()=>{
 const s=initialState();s.coins=1000;assert.equal(staffCapacity(s.business),1);assert.equal(buyLand(s,'bad'),false);
 assert.equal(buyLand(s,'east'),true);assert.equal(s.coins,750);assert.equal(staffCapacity(s.business),3);assert.equal(s.business.capitalSpent,250);assert.equal(buyLand(s,'east'),false);assert.equal(buyLand(s,'northeast'),false);assert.equal(businessRates(s.business).net,0);
});
test('hiring requires cash and real capacity; training raises productive output',()=>{
 const s=initialState();assert.equal(hireWorker(s),false);s.coins=500;
 assert.equal(trainWorkers(s),false);assert.equal(hireWorker(s),true);assert.equal(s.coins,380);assert.equal(hireWorker(s),false);
 assert.deepEqual(businessRates(s.business),{gross:18,wages:6,net:12});assert.equal(trainWorkers(s),true);assert.equal(s.coins,200);assert.deepEqual(businessRates(s.business),{gross:24,wages:6,net:18});assert.equal(trainWorkers(s),false);
 s.coins=10000;buyLand(s,'east');hireWorker(s);hireWorker(s);assert.equal(hireWorker(s),false);trainWorkers(s);trainWorkers(s);assert.equal(trainWorkers(s),false);
 assert.equal(s.business.workers,3);assert.equal(s.business.training,3);assert.deepEqual(businessRates(s.business),{gross:108,wages:18,net:90});
});
test('crew accounts reconcile gross revenue, wages, bank and collection without wallet debt',()=>{
 const s=initialState();s.coins=120;hireWorker(s);earnBusiness(s,60);
 assert.equal(s.coins,0);assert.equal(s.business.bank,12);assert.equal(s.business.grossEarned,18);assert.equal(s.business.wagesPaid,6);
 assert.equal(collectBusiness(s),12);assert.equal(collectBusiness(s),0);assert.equal(s.coins,12);assert.equal(s.revenue,12);
 for(const dt of [-1,NaN,Infinity])earnBusiness(s,dt);assert.equal(s.business.bank,0);
});
test('out-of-order land purchases retain exact saves and all seven staff spaces',()=>{
 const s=initialState();s.coins=10000;for(const id of ['northeast','east','northwest'])assert.equal(buyLand(s,id),true);
 for(let i=0;i<7;i++)assert.equal(hireWorker(s),true);assert.equal(hireWorker(s),false);assert.equal(staffCapacity(s.business),7);
 assert.deepEqual(sanitize(JSON.parse(JSON.stringify(s))),s);
 for(const p of PLOTS)assert.ok(findPath(SPAWN,{x:p.work.x,z:p.work.z+2},s.business.plots).length);
});
test('legacy saves retain fishing and shares while receiving safe island defaults',()=>{
 const old=initialState();old.coins=432;old.rod=2;old.boats=3;old.market.holdings.TUNA={shares:2,basis:5600};old.market.grantClaimed=true;delete old.business;
 const s=sanitize(old);assert.equal(s.coins,432);assert.equal(s.rod,2);assert.equal(s.boats,3);assert.deepEqual(s.market,old.market);assert.deepEqual(s.business,initialBusiness());
});
test('corrupt land, payroll and water positions are sanitized; valid saves survive',()=>{
 const b=sanitizeBusiness({plots:['east','east','bad'],workers:999,training:999,bank:-1,grossEarned:Infinity,position:{x:50,z:50}});
 assert.deepEqual(b.plots,['east']);assert.equal(b.workers,3);assert.equal(b.training,3);assert.equal(b.bank,0);assert.deepEqual(b.position,SPAWN);
 const s=initialState();s.coins=2000;buyLand(s,'east');hireWorker(s);trainWorkers(s);earnBusiness(s,12);s.business.position={x:14,z:6};assert.deepEqual(sanitize(JSON.parse(JSON.stringify(s))),s);
});
