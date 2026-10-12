import {STOCKS,EVENTS,TICK_SECONDS,STARTER_GRANT,claimGrant,tradeStock,portfolio} from './market.mjs';
const cash=n=>'$'+n.toLocaleString('en-US',{maximumFractionDigits:0});
const exact=n=>'$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const signed=n=>(n<0?'−':'+')+exact(Math.abs(n));
const direction=n=>n<0?'down':n>0?'up':'flat';
function chart(values,large=false){
  const width=large?540:90,height=large?155:30,pad=large?12:2;
  const lo=Math.min(...values),hi=Math.max(...values),range=hi-lo||1;
  const points=values.map((p,i)=>`${pad+i/Math.max(1,values.length-1)*(width-pad*2)},${hi===lo?height/2:pad+(hi-p)/range*(height-pad*2)}`);
  if(points.length===1)points.push(`${width-pad},${height/2}`);
  return `<svg viewBox="0 0 ${width} ${height}" ${large?'role="img" aria-label="Recent simulated share prices; values labelled above the chart"':'aria-hidden="true"'} preserveAspectRatio="none"><path d="M${pad} ${height/2}H${width-pad}" class="chart-grid"/><polyline points="${points.join(' ')}" fill="none" stroke="currentColor" stroke-width="${large?2.5:1.8}" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
export function createExchange({getState,onChange,onOpen,onClose,canTrade=()=>true}){
  const dialog=document.getElementById('exchange-dialog'),body=document.getElementById('exchange-body');
  const status=document.getElementById('exchange-status');
  let selected='TUNA',quantity='1';
  function render(){
    if(!dialog.open)return;
    const state=getState(),m=state.market,p=portfolio(state),s=STOCKS.find(s=>s.id===selected),q=m.quotes[selected],h=m.holdings[selected];
    const change=q.price-q.previous,percent=change/q.previous*100;
    const event=m.event<0?{title:'Opening bell at Willow Bay',detail:'Six local businesses. One shared wallet. Cast a line, take a position, build your empire.'}:EVENTS[m.event];
    const active=document.activeElement?.id;
    const focusedStock=document.activeElement?.dataset.stock;
    const scroll=body.querySelector('.exchange-watchlist')?.scrollTop||0;
    body.innerHTML=`${!m.grantClaimed?`<div class="exchange-grant"><div><strong>Your first investment is on the harbor.</strong><span>Claim ${cash(STARTER_GRANT)} once. Trade now, or put it towards your fishing empire.</span></div><button id="claim-grant" class="primary">Claim ${cash(STARTER_GRANT)}</button></div>`:''}
      <div class="exchange-metrics"><div><span>AVAILABLE CASH</span><strong>${cash(state.coins)}</strong></div><div><span>STOCK HOLDINGS</span><strong>${cash(p.value)}</strong></div><div><span>UNREALIZED P/L</span><strong class="${direction(p.unrealized)}">${signed(p.unrealized)}</strong></div><div><span>REALIZED P/L</span><strong class="${direction(p.realized)}">${signed(p.realized)}</strong></div></div>
      <div class="exchange-news"><span class="news-tag">BAY WIRE <b>SIMULATED</b></span><div><strong>${event.title}</strong><p>${event.detail}</p></div><span class="news-round">${m.event<0?'WELCOME':'ROUND '+m.eventTick}</span></div>
      <div class="exchange-grid"><section class="exchange-watchlist" aria-label="Choose a company"><div class="exchange-section-label"><span>THE LOCAL LISTINGS</span><span>LAST / CHANGE</span></div>${STOCKS.map(stock=>{const quote=m.quotes[stock.id],delta=quote.price-quote.previous;return `<button class="stock-row ${stock.id===selected?'selected':''}" data-stock="${stock.id}" aria-pressed="${stock.id===selected}"><span class="stock-monogram" style="--stock-color:${stock.color}">${stock.mark}</span><span class="stock-identity"><strong>${stock.id}</strong><small>${stock.name}</small></span><span class="stock-spark ${direction(delta)}">${chart(quote.history)}</span><span class="stock-quote"><strong>${cash(quote.price)}</strong><small class="${direction(delta)}">${delta>=0?'+':''}${(delta/quote.previous*100).toFixed(1)}%</small></span></button>`;}).join('')}<p class="exchange-caption">Changes compare the latest two rounds, not a trading day. Quotes move every ${TICK_SECONDS}s of active play.</p></section>
      <section class="exchange-detail" aria-label="Selected stock and trade ticket"><div class="stock-detail-heading"><div><span class="eyebrow">${s.sector} · ${s.id}</span><h3>${s.name}</h3></div><span class="risk-tag">${s.volatility>=.09?'HIGHER':s.volatility>=.05?'MEDIUM':'LOWER'} VOLATILITY</span></div>
      <div class="stock-detail-price"><strong>${cash(q.price)}</strong><span class="${direction(change)}">${change<0?'−':'+'}${cash(Math.abs(change))} (${percent>=0?'+':''}${percent.toFixed(1)}%)</span><small>per share · game dollars</small></div>
      <div class="stock-chart ${direction(q.price-q.history[0])}">${chart(q.history,true)}</div><div class="chart-axis"><span>${q.history.length===1?'Opening quote · chart builds as you play':`${q.history.length} quotes · low ${cash(Math.min(...q.history))} / high ${cash(Math.max(...q.history))}`}</span><span>ROUND ${m.tick}</span></div>
      <p class="stock-description">${s.description}</p><div class="position-summary"><span>You own <b>${h.shares.toLocaleString()} ${h.shares===1?'share':'shares'}</b></span><span>Avg. cost <b>${h.shares?exact(h.basis/100/h.shares):'—'}</b></span></div>
      <div class="trade-ticket"><label for="trade-quantity">Shares <input id="trade-quantity" type="number" min="1" max="100000" step="1" inputmode="numeric" value="${quantity}" autocomplete="off"></label><div class="trade-estimate"><span>ORDER VALUE</span><strong id="trade-total"></strong><small>Executes at the current quote</small></div><div class="trade-buttons"><button id="trade-buy" class="primary">Buy shares</button><button id="trade-sell" class="primary secondary">Sell shares</button></div><p id="trade-hint"></p></div></section></div>
      <section class="holdings-section"><div class="holdings-heading"><h3>Your portfolio</h3><span>Cash + stocks <b>${cash(p.liquidWealth)}</b></span></div>${p.value?`<div class="holdings-table-wrap"><table class="holdings-table"><thead><tr><th>STOCK</th><th>SHARES</th><th>VALUE</th><th>UNREALIZED P/L</th></tr></thead><tbody>${STOCKS.filter(stock=>m.holdings[stock.id].shares).map(stock=>{const holding=m.holdings[stock.id],value=holding.shares*m.quotes[stock.id].price;return `<tr><th scope="row">${stock.id}</th><td>${holding.shares.toLocaleString()}</td><td>${cash(value)}</td><td class="${direction(value-holding.basis/100)}">${signed(value-holding.basis/100)}</td></tr>`;}).join('')}</tbody></table></div>`:'<p class="portfolio-empty">No positions yet. Choose a business above and buy your first share. Your fishing cash funds your investments—and selling shares funds your next boat.</p>'}</section>`;
    body.querySelector('.exchange-watchlist').scrollTop=scroll;
    if(active)body.querySelector(`#${active}`)?.focus({preventScroll:true});
    if(focusedStock)body.querySelector(`[data-stock="${focusedStock}"]`)?.focus({preventScroll:true});
    updateTicket();updateClock();
  }
  function updateTicket(){
    const state=getState(),q=state.market.quotes[selected],h=state.market.holdings[selected],n=Number(quantity);
    const valid=Number.isSafeInteger(n)&&n>0&&n<=100000;
    document.getElementById('trade-total').textContent=valid?cash(n*q.price):'—';
    document.getElementById('trade-buy').disabled=!valid||n*q.price>state.coins||h.shares+n>100000;
    document.getElementById('trade-sell').disabled=!valid||n>h.shares||state.coins+n*q.price>1e9;
    document.getElementById('trade-hint').textContent=!valid?'Enter 1–100,000 whole shares.':`Can afford ${Math.min(100000-h.shares,Math.floor(state.coins/q.price)).toLocaleString()} · Own ${h.shares.toLocaleString()} · No fees or borrowing`;
  }
  function updateClock(){if(dialog.open)document.getElementById('exchange-clock').textContent=`NEXT QUOTE ${Math.max(1,Math.ceil(TICK_SECONDS-getState().market.elapsed))}s`;}
  body.addEventListener('input',event=>{if(event.target.id==='trade-quantity'){quantity=event.target.value;updateTicket();}});
  body.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||button.disabled)return;
    if(!canTrade()){status.textContent='Visit the stockbroker’s counter to trade or claim starter capital.';return;}
    if(button.dataset.stock){selected=button.dataset.stock;status.textContent='';render();return;}
    if(button.id==='claim-grant'){
      if(claimGrant(getState())){status.textContent=`${cash(STARTER_GRANT)} starter capital added to your shared wallet. This grant can only be claimed once per save.`;onChange();render();}return;
    }
    if(button.id==='trade-buy'||button.id==='trade-sell'){
      const result=tradeStock(getState(),selected,button.id==='trade-buy'?'buy':'sell',Number(quantity));
      status.textContent=result.ok?`${result.side==='buy'?'Bought':'Sold'} ${result.quantity} ${selected} ${result.quantity===1?'share':'shares'} at ${cash(result.price)} each · ${cash(result.total)} total.`:result.message;
      if(result.ok){onChange();render();}
    }
  });
  document.getElementById('exchange-close').addEventListener('click',()=>dialog.close());
  document.getElementById('exchange-back').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',onClose);
  return {open(){if(!canTrade())return false;onOpen();dialog.showModal();status.textContent='';render();return true;},render,updateClock,isOpen:()=>dialog.open};
}
