import {PLOTS,SPAWN,walkable} from './island.mjs';
export const HIRE_COST=120,WAGE=6,TRAINING_COSTS=[180,400,800];
export function initialBusiness(){return {plots:[],workers:0,training:0,bank:0,grossEarned:0,wagesPaid:0,capitalSpent:0,position:{...SPAWN}};}
export function staffCapacity(b){return 1+PLOTS.filter(p=>b.plots.includes(p.id)).reduce((n,p)=>n+p.slots,0);}
export function businessRates(b){const gross=b.workers*(18+6*b.training),wages=b.workers*WAGE;return {gross,wages,net:gross-wages};}
export function sanitizeBusiness(raw){
 const b=initialBusiness();if(!raw||typeof raw!=='object')return b;
 b.plots=PLOTS.filter(p=>Array.isArray(raw.plots)&&raw.plots.includes(p.id)).map(p=>p.id);
 if(Number.isInteger(raw.workers))b.workers=Math.max(0,Math.min(staffCapacity(b),raw.workers));
 if(Number.isInteger(raw.training))b.training=Math.max(0,Math.min(3,raw.training));
 for(const k of ['bank','grossEarned','wagesPaid','capitalSpent'])if(Number.isFinite(raw[k])&&raw[k]>=0)b[k]=Math.min(1e9,raw[k]);
 if(walkable(raw.position,b.plots))b.position={x:raw.position.x,z:raw.position.z};return b;
}
export function buyLand(s,id){const p=PLOTS.find(p=>p.id===id),b=s.business;if(!p||b.plots.includes(id)||s.coins<p.price)return false;s.coins-=p.price;b.capitalSpent+=p.price;b.plots=PLOTS.filter(plot=>plot.id===id||b.plots.includes(plot.id)).map(plot=>plot.id);return true;}
export function hireWorker(s){const b=s.business;if(b.workers>=staffCapacity(b)||s.coins<HIRE_COST)return false;s.coins-=HIRE_COST;b.capitalSpent+=HIRE_COST;b.workers++;return true;}
export function trainWorkers(s){const b=s.business,cost=TRAINING_COSTS[b.training];if(b.workers===0||b.training>=3||s.coins<cost)return false;s.coins-=cost;b.capitalSpent+=cost;b.training++;return true;}
export function earnBusiness(s,seconds){
 if(!Number.isFinite(seconds)||seconds<=0)return;const b=s.business,r=businessRates(b),dt=Math.min(seconds,60)/60;
 // Wages are deducted from crew revenue, never the shared wallet; no hidden debt.
 const room=Math.max(0,1e9-b.bank),scale=r.net?Math.min(1,room/(r.net*dt)):0;
 b.bank+=r.net*dt*scale;b.grossEarned=Math.min(1e9,b.grossEarned+r.gross*dt*scale);b.wagesPaid=Math.min(1e9,b.wagesPaid+r.wages*dt*scale);
}
export function collectBusiness(s){const n=Math.min(Math.floor(s.business.bank),Math.max(0,1e9-s.coins));s.business.bank-=n;s.coins+=n;s.revenue+=n;return n;}
