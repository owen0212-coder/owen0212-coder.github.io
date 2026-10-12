import test from 'node:test';
import assert from 'node:assert/strict';
import {createBite,biteCue,advanceBite,setHook,createFight,fightCue,tugStep} from './fishing.mjs';
import {SPECIES} from './economy.mjs';

test('every cast has readable nibbles before the committed bite',()=>{
 for(const difficulty of [.65,1.45,2.6])for(const seed of [0,.4,.999]){
  const b=createBite(difficulty,0,()=>seed);
  assert.ok(b.nibbles.length>=2&&b.nibbles.length<=4);
  assert.equal(biteCue(b).phase,'waiting');
  for(const t of b.nibbles){b.time=t+.2;assert.equal(biteCue(b).phase,'nibble');assert.ok(biteCue(b).dip>.4);}
  b.time=b.biteAt;assert.equal(biteCue(b).phase,'bite');assert.equal(biteCue(b).ready,false);
 }
});
test('early pulls, nibbles, late strikes and ignored bites lose without setting a hook',()=>{
 for(const position of ['waiting','nibble','early','late','timeout']){
  const b=createBite(1,0,()=>.5);
  b.time=position==='waiting'?0:position==='nibble'?b.nibbles[0]+.2:b.biteAt+b.duration*(position==='early'?b.start-.001:position==='late'?b.end+.001:1);
  const expected=['waiting','nibble','early'].includes(position)?'early':'late';
  if(position==='timeout')assert.equal(advanceBite(b,.01),'late');
  assert.equal(setHook(b),expected);assert.equal(setHook(b),expected,'resolved attempts cannot be retried');
 }
});
test('green sets the hook; a centered strike earns stronger grip and a head start',()=>{
 const b=createBite(1,0,()=>.5);b.time=b.biteAt+b.duration*(b.start+.01);assert.equal(setHook(b),'hooked');
 const perfect=createBite(1,0,()=>.5);perfect.time=perfect.biteAt+perfect.duration*(perfect.start+perfect.end)/2;assert.equal(setHook(perfect),'perfect');
 const normalFight=createFight(1,0),perfectFight=createFight(1,0,true);
 assert.ok(perfectFight.hook>normalFight.hook);assert.ok(perfectFight.progress>normalFight.progress);
});
test('rarity tightens hook timing; bait shortens the wait without changing the window',()=>{
 let previous=Infinity;
 for(const s of SPECIES){const b=createBite(s.difficulty,0,()=>.5),width=(b.end-b.start)*b.duration;assert.ok(width<previous);previous=width;}
 const bread=createBite(1,0,()=>.5),lure=createBite(1,3,()=>.5);
 assert.ok(lure.biteAt<bread.biteAt);assert.equal(lure.duration,bread.duration);assert.equal(lure.start,bread.start);
});
function play(species,seed,dt,policy='read',rod=species.rod){
 const f=createFight(species.difficulty,rod,false,()=>seed);let holding=true;
 for(let n=0;n<20000&&f.result==='fighting';n++){
  const {stage}=fightCue(f);
  if(policy==='hold')holding=true;else if(policy==='release')holding=false;
  else if(stage==='warning'||stage==='surge')holding=f.tension<22&&stage!=='surge';
  else if(f.tension>72)holding=false;else if(f.tension<40)holding=true;
  tugStep(f,holding,typeof dt==='function'?dt(n):dt);
 }
 return f;
}
test('all seven species are catchable by reading surges on different frame rates',()=>{
 for(const s of SPECIES)for(const seed of [0,.2,.5,.8,.99])for(const dt of [1/60,1/30,.08,n=>n%2?.011:.052]){
  const f=play(s,seed,dt);assert.equal(f.result,'caught',`${s.id}, seed ${seed}, dt ${dt}: ${f.reason}`);assert.ok(f.time<60);
 }
});
test('holding blindly snaps the line, while doing nothing lets the hook slip',()=>{
 for(const s of SPECIES){const hold=play(s,.5,1/60,'hold'),release=play(s,.5,1/60,'release');assert.equal(hold.reason,'snap');assert.equal(release.reason,'slack');}
});
test('every surge is telegraphed and followed by a productive recovery',()=>{
 const f=createFight(2.6,3);const stages=[];
 for(let i=0;i<1800;i++){f.time=i/60;const stage=fightCue(f).stage;if(stage!==stages.at(-1))stages.push(stage);}
 assert.deepEqual(stages.slice(0,9),['steady','warning','surge','recovery','steady','warning','surge','recovery','steady']);
 const steady=createFight(1,0),recovery=createFight(1,0);
 while(fightCue(recovery).stage!=='recovery')recovery.time+=.01;
 tugStep(steady,true,.08);tugStep(recovery,true,.08);assert.ok(recovery.progress>steady.progress);
});
test('surges punish fighting the fish; releasing gives ground but protects the hook',()=>{
 const f=createFight(2,2);while(fightCue(f).stage!=='surge')f.time+=.01;f.progress=50;
 const reel=structuredClone(f),release=structuredClone(f);tugStep(reel,true,.08);tugStep(release,false,.08);
 assert.ok(reel.hook<release.hook);assert.ok(reel.tension>release.tension);assert.ok(release.progress<50);
});
test('rare fish take more work; better rods help without making blind reeling safe',()=>{
 const common=play(SPECIES[0],.5,1/60),legendary=play(SPECIES.at(-1),.5,1/60);
 assert.ok(legendary.time>common.time*1.5);
 const upgraded=play(SPECIES[0],.5,1/60,'read',3);assert.ok(upgraded.time<common.time);
 assert.equal(play(SPECIES.at(-1),.5,1/60,'hold',3).result,'lost');
});
test('invalid time is ignored, background-sized deltas capped, resolved fights immutable',()=>{
 const f=createFight(1),b=createBite(1);const original=structuredClone(f);
 for(const dt of [0,-1,NaN,Infinity]){tugStep(f,true,dt);advanceBite(b,dt);}
 assert.deepEqual(f,original);assert.equal(b.time,0);tugStep(f,true,100);advanceBite(b,100);assert.ok(f.time<.081);assert.equal(b.time,.08);
 const lost=play(SPECIES[0],.5,1/60,'hold'),snapshot=structuredClone(lost);tugStep(lost,false,.08);assert.deepEqual(lost,snapshot);
});
