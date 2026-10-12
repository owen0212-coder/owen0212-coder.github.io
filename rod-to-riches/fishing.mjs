// Pure fishing simulation. Timing uses active play seconds, never wall-clock time.
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function createBite(difficulty,bait=0,rng=Math.random){
 const difficultySafe=clamp(difficulty,.65,2.6),nibbles=[];
 let time=1.4+rng()*.9-clamp(bait,0,3)*.18;
 const count=2+Math.floor(rng()*3);
 for(let i=0;i<count;i++){nibbles.push(time);time+=.8+rng()*.65;}
 return {time:0,nibbles,biteAt:time+.35+rng()*.6,duration:2.65-difficultySafe*.36,
  start:.27+difficultySafe*.045,end:.85-difficultySafe*.05,result:null};
}
export function biteCue(b){
 const elapsed=b.time-b.biteAt,position=clamp(elapsed/b.duration,0,1);
 const nibble=b.nibbles.findIndex(t=>b.time>=t&&b.time<t+.42);
 return {phase:elapsed>=0?'bite':nibble>=0?'nibble':'waiting',position,
  ready:elapsed>=0&&position>=b.start&&position<=b.end,
  perfect:elapsed>=0&&Math.abs(position-(b.start+b.end)/2)<(b.end-b.start)/6,
  dip:elapsed>=0?.8:nibble>=0?Math.sin((b.time-b.nibbles[nibble])/.42*Math.PI)*.45:0};
}
export function advanceBite(b,dt){
 if(b.result)return b.result;
 if(Number.isFinite(dt)&&dt>0)b.time+=Math.min(dt,.08);
 if(b.time>b.biteAt+b.duration)b.result='late';
 return b.result;
}
export function setHook(b){
 if(b.result)return b.result;
 const cue=biteCue(b);
 b.result=cue.phase!=='bite'||cue.position<b.start?'early':cue.position>b.end?'late':cue.perfect?'perfect':'hooked';
 return b.result;
}
export function createFight(difficulty,rod=0,perfect=false,rng=Math.random){
 return {difficulty:clamp(difficulty,.65,2.6),rod:clamp(rod,0,3),style:rng()*Math.PI*2,
  time:0,tension:40,progress:perfect?8:0,hook:perfect?100:85,result:'fighting',reason:null};
}
export function fightCue(f){
 let time=f.time,cycle=0;
 for(;cycle<100;cycle++){
  const calm=2.7-f.difficulty*.25+Math.sin(f.style+cycle*1.7)*.35;
  const stages=[['steady',calm],['warning',.9-f.difficulty*.08],['surge',1.2+f.difficulty*.35+Math.sin(f.style+cycle)*.2],['recovery',1.5]];
  for(const [stage,duration] of stages){if(time<duration)return {stage,remaining:duration-time,position:time/duration,cycle};time-=duration;}
 }
 return {stage:'steady',remaining:1,position:0,cycle};
}
export function tugStep(f,holding,dt){
 if(f.result!=='fighting'||!Number.isFinite(dt)||dt<=0)return f.result;
 // Substeps make outcomes stable across slow devices and irregular RAF frames.
 let remaining=Math.min(dt,.08);
 while(remaining>1e-8&&f.result==='fighting'){
  const step=Math.min(remaining,1/120),{stage}=fightCue(f),d=f.difficulty,r=f.rod;
  const surge=stage==='surge',recovery=stage==='recovery';
  const strain=holding?(surge?32+8*d:recovery?8+2*d:14+4*d-r*1.5):(surge?2+2*d:-18);
  f.tension=clamp(f.tension+strain*step,0,100);
  const safe=f.tension>=18&&f.tension<=85;
  // Reward a clean opening more generously; keep warning times and risk unchanged.
  const gain=holding&&!surge&&safe?(26+r*1.5-d*1.9)*(recovery?1.9:1):surge?-(holding?2:3+d*.6):-.7;
  f.progress=clamp(f.progress+gain*step,0,100);
  const damage=(f.tension<18?12+3*d:0)+(f.tension>85?8+4*d:0)+(surge&&holding?12+5*d:0);
  f.hook=clamp(f.hook+(damage?-damage:recovery&&safe?2:0)*step,0,100);
  f.time+=step;remaining-=step;
  if(f.tension>=100){f.result='lost';f.reason='snap';}
  else if(f.hook<=0){f.result='lost';f.reason=f.tension<18?'slack':'hook';}
  else if(f.progress>=100)f.result='caught';
  else if(f.time>=75){f.result='lost';f.reason='escape';}
 }
 return f.result;
}
