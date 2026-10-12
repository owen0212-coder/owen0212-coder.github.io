// Fictional, local-only market. Whole-dollar execution keeps the fishing wallet exact.
export const TICK_SECONDS = 8, HISTORY_LIMIT = 48, STARTER_GRANT = 100;
export const STOCKS = [
  {id:'BAIT',name:'Bait & Tackle Co.',sector:'Fishing essentials',base:12,volatility:.035,color:'#b67d35',mark:'B',description:'The picks-and-shovels business of the bay. Rods, lures, and the worms doing the real work.'},
  {id:'TUNA',name:'Bluefin Foods',sector:'Seafood & exports',base:28,volatility:.065,color:'#28757c',mark:'T',description:'Premium seafood with global ambitions. Catch volumes and restaurant demand move the story.'},
  {id:'DOCK',name:'Willow Harbor',sector:'Ports & logistics',base:40,volatility:.03,color:'#637a54',mark:'D',description:'Berths, storage, and a toll on almost everything leaving the harbor. Steadier, not risk-free.'},
  {id:'KELP',name:'Kelp Tomorrow',sector:'Ocean farming',base:18,volatility:.095,color:'#438a67',mark:'K',description:'Growing the next big thing underwater. A small aquaculture business with very big promises.'},
  {id:'ICE',name:'Polar Current',sector:'Cold-chain transport',base:24,volatility:.045,color:'#527d9c',mark:'I',description:'Keeping the catch fresh from boat to buyer. Energy costs can put its margins on thin ice.'},
  {id:'DEEP',name:'Deep Blue Ventures',sector:'Offshore exploration',base:55,volatility:.12,color:'#81759a',mark:'D',description:'New fishing grounds, expensive vessels, uncertain payoffs. The bay’s most adventurous listing.'}
];
export const EVENTS = [
  {title:'Restaurants reel in a busy weekend',detail:'Seafood demand improves; exporters and refrigerated transport get a tailwind.',effects:{TUNA:.09,ICE:.05}},
  {title:'Storm clouds over the shipping lanes',detail:'Offshore trips and port schedules face delays. Weather risk reaches the exchange.',effects:{DEEP:-.12,DOCK:-.05,TUNA:-.04}},
  {title:'A breakthrough beneath the surface',detail:'An ocean-farming trial reports stronger yields. Enthusiasm builds around aquaculture.',effects:{KELP:.14}},
  {title:'Fuel costs take a bite',detail:'Running boats and cold storage gets more expensive. Operators face a margin squeeze.',effects:{ICE:-.08,DEEP:-.07,TUNA:-.04}},
  {title:'Fishing festival fills the boardwalk',detail:'Visitors stock up on tackle and rent berths. The local harbor economy gets a lift.',effects:{BAIT:.1,DOCK:.05}},
  {title:'A bumper catch floods the fish stalls',detail:'More supply pressures seafood prices, while storage and freight demand improve.',effects:{TUNA:-.09,ICE:.06,DOCK:.03}},
  {title:'Ocean-farming permit hits a snag',detail:'A delayed permit pushes back expansion plans. Speculative growers lose some shine.',effects:{KELP:-.14}},
  {title:'Deep-water survey finds new grounds',detail:'Explorers report promising fishing grounds. Commercial success is still unproven.',effects:{DEEP:.15}},
  {title:'A quiet tide at the exchange',detail:'No major company announcement this round. Prices still move as buyers and sellers disagree.',effects:{}}
];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const validInt=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
export function initialMarket(seed=Math.floor(Math.random()*4294967295)||1){
  return {version:1,seed:seed>>>0||1,tick:0,elapsed:0,grantClaimed:false,realized:0,event:-1,eventTick:0,
    quotes:Object.fromEntries(STOCKS.map(s=>[s.id,{price:s.base,previous:s.base,history:[s.base]}])),
    holdings:Object.fromEntries(STOCKS.map(s=>[s.id,{shares:0,basis:0}]))};
}
export function sanitizeMarket(raw){
  const m=initialMarket();if(!raw||raw.version!==1)return m;
  if(validInt(raw.seed,1,4294967295))m.seed=raw.seed;
  if(validInt(raw.tick,0,1e9))m.tick=raw.tick;
  if(Number.isFinite(raw.elapsed)&&raw.elapsed>=0&&raw.elapsed<TICK_SECONDS)m.elapsed=raw.elapsed;
  m.grantClaimed=raw.grantClaimed===true;
  if(validInt(raw.realized,-1e14,1e14))m.realized=raw.realized;
  if(validInt(raw.event,-1,EVENTS.length-1))m.event=raw.event;
  if(validInt(raw.eventTick,0,m.tick))m.eventTick=raw.eventTick;
  for(const s of STOCKS){
    const q=raw.quotes?.[s.id],h=raw.holdings?.[s.id];
    if(validInt(q?.price,1,1000)){
      const history=Array.isArray(q.history)?q.history.filter(p=>validInt(p,1,1000)).slice(-HISTORY_LIMIT):[];
      if(history.at(-1)!==q.price)history.push(q.price);
      m.quotes[s.id]={price:q.price,previous:validInt(q.previous,1,1000)?q.previous:q.price,history:history.slice(-HISTORY_LIMIT)};
    }
    if(validInt(h?.shares,0,100000)&&validInt(h?.basis,0,1e10)&&(h.shares===0?h.basis===0:h.basis>0))m.holdings[s.id]={shares:h.shares,basis:h.basis};
  }
  return m;
}
function random(m){let x=m.seed;x^=x<<13;x^=x>>>17;x^=x<<5;m.seed=x>>>0;return m.seed/4294967296;}
export function advanceMarket(m,seconds){
  if(!Number.isFinite(seconds)||seconds<=0)return false;
  // Never catch up on wall-clock time or simulate offline trading.
  m.elapsed+=Math.min(seconds,1);if(m.elapsed<TICK_SECONDS)return false;m.elapsed-=TICK_SECONDS;m.tick++;
  let effects={};
  if(m.tick%4===1){m.event=Math.floor(random(m)*EVENTS.length);m.eventTick=m.tick;effects=EVENTS[m.event].effects;}
  const tide=(random(m)-.5)*.025;
  for(const s of STOCKS){const q=m.quotes[s.id];q.previous=q.price;
    const move=(random(m)-.5)*2*s.volatility+tide+(effects[s.id]||0)+Math.log(s.base/q.price)*.004;
    // Stochastic rounding avoids low-priced shares getting stuck at one dollar.
    const target=q.price*(1+move),floor=Math.floor(target);
    q.price=clamp(floor+(random(m)<target-floor?1:0),1,1000);q.history.push(q.price);if(q.history.length>HISTORY_LIMIT)q.history.shift();
  }
  return true;
}
export function claimGrant(state){
  if(state.market.grantClaimed||state.coins>1e9-STARTER_GRANT)return false;
  state.coins+=STARTER_GRANT;state.market.grantClaimed=true;return true;
}
export function tradeStock(state,id,side,quantity){
  if(!STOCKS.some(s=>s.id===id)||!['buy','sell'].includes(side)||!validInt(quantity,1,100000))return {ok:false,message:'Choose a valid whole number of shares.'};
  const m=state.market,q=m.quotes[id],h=m.holdings[id],total=q.price*quantity;
  if(side==='buy'){
    if(total>state.coins)return {ok:false,message:'Not enough cash. Sell a catch or a holding to fund this trade.'};
    if(h.shares+quantity>100000)return {ok:false,message:'Maximum position: 100,000 shares.'};
    state.coins-=total;h.shares+=quantity;h.basis+=total*100;
  }else{
    if(quantity>h.shares)return {ok:false,message:'You cannot sell more shares than you own.'};
    if(state.coins+total>1e9)return {ok:false,message:'This sale would exceed the game’s cash limit.'};
    const basis=quantity===h.shares?h.basis:Math.round(h.basis*quantity/h.shares);
    h.shares-=quantity;h.basis-=basis;m.realized+=total*100-basis;state.coins+=total;
  }
  return {ok:true,total,price:q.price,quantity,side,id};
}
export function portfolio(state){
  let value=0,basis=0;for(const s of STOCKS){const h=state.market.holdings[s.id];value+=h.shares*state.market.quotes[s.id].price;basis+=h.basis/100;}
  return {value,basis,unrealized:value-basis,realized:state.market.realized/100,liquidWealth:state.coins+value};
}
