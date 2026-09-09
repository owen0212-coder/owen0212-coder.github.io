import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,sanitize,capacity,rollFish,landFish,sellFish,upgrade,buyBoat,earnBoat,collectBoat,fightStep,SPECIES} from './economy.mjs';
test('a fresh player can catch, sell and reinvest without losing fish or money',()=>{
 const s=initialState();assert.equal(upgrade(s,'rod'),false);
 for(let i=0;i<5;i++)assert.equal(landFish(s,{id:'trout',kg:2,value:36}),true);
 assert.equal(landFish(s,{id:'trout',kg:2,value:36}),false);
 assert.equal(s.caught,5);assert.equal(sellFish(s),180);assert.equal(sellFish(s),0);
 assert.equal(upgrade(s,'rod'),true);assert.equal(s.coins,105);assert.equal(upgrade(s,'rod'),false);assert.equal(upgrade(s,'unknown'),false);
 assert.equal(upgrade(s,'cooler'),true);assert.equal(capacity(s),9);assert.equal(s.coins,40);
});
test('fleet purchases, income and collection cannot duplicate earnings',()=>{
 const s=initialState();s.coins=450;assert.equal(buyBoat(s),true);assert.equal(s.coins,0);assert.equal(buyBoat(s),false);
 earnBoat(s,60);assert.equal(collectBoat(s),18);assert.equal(collectBoat(s),0);assert.equal(s.coins,18);
 earnBoat(s,-100);assert.equal(s.boatBank,0);s.coins=10000;buyBoat(s);buyBoat(s);assert.equal(buyBoat(s),false);assert.equal(s.boats,3);
});
test('all unlocked species can be landed by managing tension; constant reeling loses',()=>{
 for(const species of SPECIES){const f={time:0,tension:20,progress:0};let holding=true,result;
 for(let i=0;i<2700;i++){if(f.tension>68)holding=false;if(f.tension<24)holding=true;result=fightStep(f,holding,1/60,species.difficulty,species.rod);if(result!=='fighting')break;}
 assert.equal(result,'caught',species.name);
 }
 const f={time:0,tension:20,progress:0};let result;for(let i=0;i<1000;i++){result=fightStep(f,true,1/60,1.15,0);if(result!=='fighting')break;}assert.equal(result,'lost');
});
test('save validation rejects malformed values and preserves valid progression',()=>{
 const s=initialState();s.coins=170;s.rod=1;s.fish=[{id:'perch',kg:1.1,value:20}];s.collection.perch=1;assert.deepEqual(sanitize(JSON.parse(JSON.stringify(s))),s);
 const bad=sanitize({version:1,coins:-99,rod:99,boats:-4,fish:[{id:'injected',kg:1,value:1}],collection:{injected:9,minnow:-2}});
 assert.equal(bad.coins,0);assert.equal(bad.rod,3);assert.equal(bad.boats,0);assert.deepEqual(bad.fish,[]);assert.deepEqual(bad.collection,{});
});
test('starter gear never rolls locked fish and every generated fish has valid value',()=>{
 const s=initialState();for(let i=0;i<2000;i++){const f=rollFish(s);assert.ok(SPECIES.find(p=>p.id===f.id).rod<=s.rod);assert.ok(f.kg>0&&f.value>0);}
});
