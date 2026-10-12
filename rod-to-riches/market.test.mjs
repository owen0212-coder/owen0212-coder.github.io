import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,sanitize,upgrade,sellFish} from './economy.mjs';
import {STOCKS,EVENTS,initialMarket,sanitizeMarket,advanceMarket,claimGrant,tradeStock,portfolio,TICK_SECONDS,HISTORY_LIMIT} from './market.mjs';
const player=()=>{const s=initialState();s.market=initialMarket(123456);return s;};
const tick=m=>{for(let i=0;i<TICK_SECONDS;i++)advanceMarket(m,1);};

test('legacy saves migrate without losing catch, cash, fleet or gear',()=>{
  const old={...initialState(),coins:230,rod:2,boats:1,fish:[{id:'trout',kg:2,value:36}]};delete old.market;
  const migrated=sanitize(old);
  assert.equal(migrated.coins,230);assert.equal(migrated.rod,2);assert.equal(migrated.boats,1);assert.deepEqual(migrated.fish,old.fish);
  assert.equal(migrated.market.grantClaimed,false);assert.equal(migrated.market.holdings.TUNA.shares,0);
});
test('starter capital is immediately available, shared with fishing, and claimable once across reloads',()=>{
  const s=player();assert.equal(claimGrant(s),true);assert.equal(s.coins,100);assert.equal(s.revenue,0);
  assert.equal(claimGrant(s),false);assert.equal(upgrade(s,'rod'),true);assert.equal(s.coins,25);
  const loaded=sanitize(JSON.parse(JSON.stringify(s)));assert.equal(claimGrant(loaded),false);assert.equal(loaded.coins,25);
});
test('fishing proceeds buy shares and liquidation funds fishing without duplicating money',()=>{
  const s=player();s.fish=[{id:'trout',kg:2,value:36}];sellFish(s);
  assert.equal(tradeStock(s,'BAIT','buy',3).ok,true);assert.equal(s.coins,0);assert.equal(portfolio(s).value,36);
  assert.equal(tradeStock(s,'BAIT','sell',3).ok,true);assert.equal(s.coins,36);assert.equal(s.revenue,36);
  assert.deepEqual(s.market.holdings.BAIT,{shares:0,basis:0});assert.equal(s.market.realized,0);
});
test('average cost, partial sales, realized and unrealized gains reconcile in cents',()=>{
  const s=player();s.coins=1000;
  tradeStock(s,'TUNA','buy',2);s.market.quotes.TUNA.price=31;tradeStock(s,'TUNA','buy',1);
  assert.deepEqual(s.market.holdings.TUNA,{shares:3,basis:8700});
  assert.equal(portfolio(s).unrealized,6);tradeStock(s,'TUNA','sell',1);
  assert.deepEqual(s.market.holdings.TUNA,{shares:2,basis:5800});assert.equal(portfolio(s).realized,2);
  s.market.quotes.TUNA.price=20;tradeStock(s,'TUNA','sell',2);
  assert.equal(s.coins,984);assert.equal(portfolio(s).realized,-16);assert.equal(portfolio(s).unrealized,0);
  assert.deepEqual(s.market.holdings.TUNA,{shares:0,basis:0});
});
test('fractional average basis has no residual cost after a complete exit',()=>{
  const s=player();s.coins=1000;tradeStock(s,'BAIT','buy',2);s.market.quotes.BAIT.price=13;tradeStock(s,'BAIT','buy',1);
  for(let i=0;i<3;i++)tradeStock(s,'BAIT','sell',1);
  assert.equal(s.market.holdings.BAIT.basis,0);assert.equal(s.market.realized,200);assert.equal(s.coins,1002);
});
test('invalid orders, insufficient cash and short selling leave state unchanged',()=>{
  const s=player();s.coins=100;const before=JSON.stringify(s);
  for(const [id,side,n] of [['TUNA','buy',0],['TUNA','buy',-1],['TUNA','buy',1.5],['TUNA','buy',NaN],['TUNA','buy',Infinity],['TUNA','buy','1'],['TUNA','buy',100001],['TUNA','buy',4],['TUNA','sell',1],['INVALID','buy',1],['__proto__','buy',1],['TUNA','short',1]]){
    assert.equal(tradeStock(s,id,side,n).ok,false);assert.equal(JSON.stringify(s),before);
  }
});
test('execution uses current quote, not the price from when the ticket opened',()=>{
  const s=player();s.coins=100;s.market.quotes.TUNA.price=35;
  assert.equal(tradeStock(s,'TUNA','buy',3).ok,false);assert.equal(tradeStock(s,'TUNA','buy',2).total,70);assert.equal(s.coins,30);
});
test('cash and share limits reject trades rather than destroying excess proceeds',()=>{
  const s=player();s.coins=1e9;assert.equal(claimGrant(s),false);assert.equal(s.market.grantClaimed,false);
  tradeStock(s,'BAIT','buy',100000);assert.equal(tradeStock(s,'BAIT','buy',1).ok,false);
  s.coins=1e9;assert.equal(tradeStock(s,'BAIT','sell',1).ok,false);assert.equal(s.market.holdings.BAIT.shares,100000);
});
test('simulation survives saving without a reroll or changed future path',()=>{
  const a=initialMarket(2468);for(let i=0;i<13;i++)tick(a);advanceMarket(a,.5);
  const b=sanitizeMarket(JSON.parse(JSON.stringify(a)));assert.deepEqual(a,b);
  for(let i=0;i<20;i++){tick(a);tick(b);assert.deepEqual(a,b);}
});
test('no offline catch-up, malformed elapsed time or tick before eight active seconds',()=>{
  const m=initialMarket(5);for(const dt of [-1,0,NaN,Infinity])advanceMarket(m,dt);assert.equal(m.elapsed,0);
  advanceMarket(m,86400);assert.equal(m.elapsed,1);assert.equal(m.tick,0);
  for(let i=0;i<7;i++)advanceMarket(m,1);assert.equal(m.tick,1);assert.equal(m.elapsed,0);
  assert.equal(m.eventTick,1);assert.ok(EVENTS[m.event]);
});
test('long runs retain bounded prices, positive cash values and a short history',()=>{
  const m=initialMarket(909);for(let i=0;i<10000;i++)tick(m);
  for(const s of STOCKS){const q=m.quotes[s.id];assert.equal(q.history.length,HISTORY_LIMIT);assert.equal(q.history.at(-1),q.price);for(const value of q.history)assert.ok(Number.isInteger(value)&&value>=1&&value<=1000);}
});
test('corrupted market fields cannot inject tickers, strings, negative shares or invalid prices',()=>{
  const m=sanitizeMarket({version:1,seed:0,tick:Infinity,elapsed:1000,grantClaimed:'yes',realized:NaN,event:999,eventTick:100,quotes:{TUNA:{price:-1},ICE:{price:24,history:[1,'<script>',NaN,24]}},holdings:{TUNA:{shares:-2,basis:1},ICE:{shares:2,basis:-5},BAIT:{shares:0,basis:99},injected:{shares:999,basis:1}}});
  assert.equal(m.tick,0);assert.equal(m.elapsed,0);assert.equal(m.grantClaimed,false);assert.equal(m.realized,0);assert.equal(m.event,-1);
  assert.equal(m.quotes.TUNA.price,28);assert.deepEqual(m.quotes.ICE.history,[1,24]);assert.deepEqual(m.holdings.TUNA,{shares:0,basis:0});assert.equal(m.holdings.injected,undefined);
});
test('low-priced shares can recover instead of becoming frozen by dollar rounding',()=>{
  const m=initialMarket(111);for(const stock of STOCKS)m.quotes[stock.id].price=1;
  const moved=new Set();for(let i=0;i<200;i++){tick(m);for(const stock of STOCKS)if(m.quotes[stock.id].price>1)moved.add(stock.id);}
  assert.equal(moved.size,STOCKS.length);
});
test('valid complete game saves preserve portfolio, grant and simulation state exactly',()=>{
  const s=player();claimGrant(s);tradeStock(s,'TUNA','buy',2);tick(s.market);tradeStock(s,'TUNA','sell',1);
  assert.deepEqual(sanitize(JSON.parse(JSON.stringify(s))),s);
});
