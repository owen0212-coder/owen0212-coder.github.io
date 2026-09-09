export const SPECIES = [
  {id:'minnow',name:'Silver minnow',rarity:'Common',color:'#afccce',base:12,min:.2,max:.6,difficulty:.65,weight:36,rod:0},
  {id:'perch',name:'Golden perch',rarity:'Common',color:'#d9ad53',base:22,min:.6,max:1.8,difficulty:.9,weight:28,rod:0},
  {id:'trout',name:'Rainbow trout',rarity:'Uncommon',color:'#d58f84',base:36,min:1,max:3.2,difficulty:1.15,weight:20,rod:0},
  {id:'bass',name:'Emerald bass',rarity:'Uncommon',color:'#70a87b',base:54,min:1.8,max:4.5,difficulty:1.45,weight:12,rod:1},
  {id:'koi',name:'Sunset koi',rarity:'Rare',color:'#e78e4d',base:85,min:2,max:5.5,difficulty:1.8,weight:6,rod:1},
  {id:'salmon',name:'Royal salmon',rarity:'Rare',color:'#b28aa6',base:120,min:3,max:8,difficulty:2.1,weight:4,rod:2},
  {id:'sturgeon',name:'Moon sturgeon',rarity:'Legendary',color:'#96b1c1',base:210,min:7,max:16,difficulty:2.6,weight:1.4,rod:3}
];
export const GEAR = {
  rod:{name:'Fishing rod',description:'Reel faster with less strain. Unlock stronger fish.',costs:[75,190,420],names:['Willow rod','Oak rod','Carbon rod','Master rod']},
  bait:{name:'Bait box',description:'Shorter waits. Better odds of a rare catch.',costs:[55,150,320],names:['Bread crumbs','River worms','Lure mix','Golden lures']},
  cooler:{name:'Cooler',description:'Carry more fish between visits to the market.',costs:[65,160,300],names:['Canvas basket','Small cooler','Large cooler','Ice chest']}
};
export const BOAT_COST=450, BOAT_RATE=18, MAX_BOATS=3;
export function initialState(){return {version:1,coins:0,rod:0,bait:0,cooler:0,fish:[],collection:{},caught:0,revenue:0,boats:0,boatBank:0,best:0,sound:false};}
export function capacity(s){return 5+s.cooler*4;}
export function boatCost(s){return BOAT_COST+s.boats*300;}
export function sanitize(raw){
 const s=initialState(); if(!raw||raw.version!==1)return s;
 for(const k of ['coins','caught','revenue','boatBank','best'])if(Number.isFinite(raw[k])&&raw[k]>=0)s[k]=Math.min(raw[k],1e9);
 for(const k of ['rod','bait','cooler','boats'])if(Number.isInteger(raw[k]))s[k]=Math.max(0,Math.min(3,raw[k]));
 s.coins=Math.floor(s.coins);s.caught=Math.floor(s.caught);
 s.fish=Array.isArray(raw.fish)?raw.fish.filter(f=>f&&SPECIES.some(p=>p.id===f.id)&&Number.isFinite(f.kg)&&f.kg>0&&f.kg<=20&&Number.isInteger(f.value)&&f.value>0&&f.value<=1000).slice(0,capacity(s)).map(f=>({id:f.id,kg:f.kg,value:f.value})):[];
 for(const p of SPECIES){const v=raw.collection?.[p.id];if(Number.isFinite(v)&&v>0)s.collection[p.id]=Math.min(1e9,Math.floor(v));}
 s.sound=raw.sound===true;return s;
}
export function rollFish(s,rng=Math.random){
 const choices=SPECIES.filter(p=>p.rod<=s.rod);const weights=choices.map(p=>p.weight*(1+s.bait*(p.rarity==='Common'?-.13:.38)));
 let roll=rng()*weights.reduce((a,b)=>a+b,0),chosen=choices[choices.length-1];
 for(let i=0;i<choices.length;i++){roll-=weights[i];if(roll<=0){chosen=choices[i];break;}}
 const kg=Math.round((chosen.min+rng()*(chosen.max-chosen.min))*100)/100;
 return {id:chosen.id,kg,value:Math.round(chosen.base*(.8+.4*(kg-chosen.min)/(chosen.max-chosen.min)))};
}
export function landFish(s,fish){if(s.fish.length>=capacity(s))return false;s.fish.push(fish);s.caught++;s.collection[fish.id]=(s.collection[fish.id]||0)+1;s.best=Math.max(s.best,fish.kg);return true;}
export function sellFish(s){const value=s.fish.reduce((n,f)=>n+f.value,0);s.coins+=value;s.revenue+=value;s.fish=[];return value;}
export function upgrade(s,key){const gear=GEAR[key];if(!gear||s[key]>=3)return false;const price=gear.costs[s[key]];if(s.coins<price)return false;s.coins-=price;s[key]++;return true;}
export function buyBoat(s){if(s.boats>=MAX_BOATS||s.coins<boatCost(s))return false;s.coins-=boatCost(s);s.boats++;return true;}
export function earnBoat(s,seconds){if(Number.isFinite(seconds)&&seconds>0)s.boatBank=Math.min(1e9,s.boatBank+s.boats*BOAT_RATE/60*seconds);}
export function collectBoat(s){const earned=Math.floor(s.boatBank);s.boatBank-=earned;s.coins+=earned;s.revenue+=earned;return earned;}
export function fightStep(f,holding,dt,difficulty,rod){
 const pull=.75+Math.sin(f.time*2.1)*.22;
 f.time+=dt;
 f.tension=Math.max(4,Math.min(100,f.tension+dt*(holding?(15+difficulty*5-rod*2)*pull:-30)));
 f.progress=Math.max(0,Math.min(100,f.progress+dt*(holding?15+rod*3-difficulty*1.5:-1.6)));
 if(f.tension>=100)return 'lost';if(f.progress>=100)return 'caught';if(f.time>=45)return 'lost';return 'fighting';
}
