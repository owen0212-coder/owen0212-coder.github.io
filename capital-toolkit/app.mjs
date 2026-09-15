import {defaults, valueCompany, sensitivity} from './dcf.mjs';
import {marketView} from './markets.mjs?v=20260916';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const number = (value, digits = 2) => Number.isFinite(value) ? value.toLocaleString('en-US', {minimumFractionDigits:digits, maximumFractionDigits:digits}) : '—';
const signed = (value, digits = 1) => `${value > 0 ? '+' : ''}${number(value, digits)}`;
const date = value => new Date(value.length === 10 ? value + 'T12:00:00Z' : value).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric', timeZone:'America/New_York'});
const safeUrl = value => {try {const url = new URL(value); return url.protocol === 'https:' ? esc(url.href) : '#';} catch {return '#';}};
const storage = {get(key){try{return localStorage.getItem(key);}catch{return null;}}, set(key,value){try{localStorage.setItem(key,value);return true;}catch{return false;}}};
function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], {type}));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Real links keep the selected tool bookmarkable. No network is needed for DCF.
let feedsStarted = false;
function selectTool() {
  const active = location.hash === '#dcf' ? 'dcf' : 'markets';
  $$('.tool-panel').forEach(panel => panel.hidden = panel.id !== active);
  $$('[data-tool]').forEach(link => {
    link.classList.toggle('selected', link.dataset.tool === active);
    if (link.dataset.tool === active) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
  });
  if (active === 'markets' && !feedsStarted) {feedsStarted = true; loadEquity(); loadNews();}
  if (location.hash === '#data-details') $('#data-details').open = true;
}
window.addEventListener('hashchange', selectTool);

const theme = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
const embedCleanups = new Map();
function embed(hostId, statusId, scriptName, config, title) {
  embedCleanups.get(hostId)?.();
  const host = $(hostId), status = $(statusId);
  host.replaceChildren(); status.textContent = 'Connecting to provider…';
  const container = document.createElement('div'); container.className = 'tradingview-widget-container';
  const content = document.createElement('div'); content.className = 'tradingview-widget-container__widget';
  const credit = document.createElement('div'); credit.className = 'tradingview-widget-copyright';
  const attribution = document.createElement('a'); attribution.href = 'https://www.tradingview.com/'; attribution.target = '_blank'; attribution.rel = 'noopener noreferrer'; attribution.textContent = 'Market data & news by TradingView';
  credit.append(attribution); container.append(content, credit); host.append(container);
  const observer = new MutationObserver(() => {
    const frame = container.querySelector('iframe');
    if (!frame) return;
    frame.title = title;
    status.textContent = 'External embed · if blank or unavailable, open the source link.';
    observer.disconnect();
  });
  observer.observe(container, {childList:true, subtree:true});
  const script = document.createElement('script'); script.async = true;
  script.src = `https://s3.tradingview.com/external-embedding/${scriptName}.js`;
  script.textContent = JSON.stringify(config);
  script.onerror = () => {if (container.isConnected) status.textContent = 'Provider unavailable on this connection. Try the source link.'; observer.disconnect();};
  container.append(script);
  const timeout = setTimeout(() => {
    if (!container.isConnected) {observer.disconnect(); return;}
    if (!container.querySelector('iframe')) {status.textContent = 'The provider is taking longer than expected. Try the source link.'; observer.disconnect();}
  }, 20000);
  embedCleanups.set(hostId, () => {observer.disconnect(); clearTimeout(timeout);});
}
let benchmark = 'sp', marketMode = 'intraday';
function loadEquity() {
  const view = marketView(benchmark, marketMode, theme);
  $$('[data-benchmark]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.benchmark === benchmark)));
  $$('[data-market-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.marketMode === marketMode)));
  $('#equity-title').textContent = view.title;
  $('#equity-description').textContent = view.description;
  $('#equity-source').href = view.source;
  $('#index-source').href = view.indexSource;
  embed('#equity-widget','#equity-status',view.widget, view.config, view.title + ' by TradingView');
}
$$('[data-benchmark]').forEach(button => button.addEventListener('click', () => {benchmark = button.dataset.benchmark; loadEquity();}));
$$('[data-market-mode]').forEach(button => button.addEventListener('click', () => {marketMode = button.dataset.marketMode; loadEquity();}));
$('#reload-chart').addEventListener('click', loadEquity);
$('#reload-news').addEventListener('click', loadNews);
function loadNews() {
  embed('#news-widget','#news-status','embed-widget-timeline', {feedMode:'symbol', symbol:'SP:SPX', colorTheme:theme, isTransparent:true, displayMode:'regular', width:'100%', height:'100%', locale:'en'}, 'S&P 500 news by TradingView');
}

let treasury, yieldMode = 'curve';
function lineChart(points, label, xLabels) {
  const width = 900, height = 250, left = 46, right = 30, top = 22, bottom = 40;
  const values = points.map(p => p.value), low = Math.min(...values), high = Math.max(...values);
  const spread = Math.max(high - low, .2), min = low - spread * .17, max = high + spread * .17;
  const x = i => left + i / Math.max(points.length - 1, 1) * (width - left - right);
  const y = value => top + (max - value) / (max - min) * (height - top - bottom);
  const grids = [0,1,2,3,4].map(i => {
    const v = min + (max-min)*i/4, yy = y(v);
    return `<line class="grid" x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}"/><text x="${left-9}" y="${yy+4}" text-anchor="end">${number(v,1)}</text>`;
  }).join('');
  const labels = xLabels.map(i => `<text x="${x(i)}" y="${height-12}" text-anchor="middle">${esc(points[i].label)}</text>`).join('');
  const dots = points.length < 20 ? points.map((p,i) => `<circle class="dot" cx="${x(i)}" cy="${y(p.value)}" r="4"><title>${esc(p.label)}: ${number(p.value)}%</title></circle>`).join('') : '';
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>${grids}<polyline class="plot" points="${points.map((p,i) => `${x(i)},${y(p.value)}`).join(' ')}"/>${dots}${labels}</svg>`;
}
function renderTreasury() {
  if (!treasury) return;
  const rows = treasury.rows, latest = rows.at(-1), prior = rows.at(-2);
  const spread = (latest.yields['10Y'] - latest.yields['2Y']) * 100;
  $('#treasury-date').textContent = `As of ${date(latest.date)}`;
  const age = (Date.now() - new Date(latest.date + 'T21:00:00Z')) / 86400000;
  $('#treasury-status').textContent = `${age > 4 ? 'Older snapshot — check the source for newer observations. ' : ''}Daily observation, not a live quote. Retrieved ${new Date(treasury.retrievedAt).toLocaleString('en-GB',{timeZone:'Asia/Hong_Kong',hour12:false})} HKT.`;
  $('#treasury-status').classList.toggle('notice', age > 4);
  $('#yield-stats').innerHTML = ['2Y','10Y','30Y'].map(key => `<div class="stat"><span class="label">${key.replace('Y','-year Treasury')}</span><strong class="num">${number(latest.yields[key])}%</strong><small>${signed((latest.yields[key]-prior.yields[key])*100)} bp vs ${date(prior.date)}</small></div>`).join('') + `<div class="stat"><span class="label">10Y − 2Y spread</span><strong class="num">${signed(spread,0)} <small>bp</small></strong><small>${spread < 0 ? 'Inverted at these maturities' : 'Positive at these maturities'}</small></div>`;
  const entries = Object.entries(latest.yields);
  const points = yieldMode === 'curve' ? entries.map(([label,value]) => ({label,value})) : rows.slice(-126).map(row => ({label:date(row.date),value:row.yields['10Y']}));
  const labels = yieldMode === 'curve' ? points.map((_,i) => i) : [...new Set([0, Math.floor(points.length/3), Math.floor(points.length*2/3), points.length-1])];
  $('#yield-chart').innerHTML = lineChart(points, yieldMode === 'curve' ? `Treasury yield curve, ${date(latest.date)}. Maturities are equally spaced; values in percent.` : 'Ten-year Treasury daily yield, most recent 126 available observations, in percent.', labels);
  const tableRows = yieldMode === 'curve' ? entries : rows.slice(-126).map(row => [row.date,row.yields['10Y']]).reverse();
  $('#yield-table').innerHTML = `<table><caption>${yieldMode === 'curve' ? 'Maturities are equally spaced on the chart, not proportional to years.' : 'Most recent observations first; non-trading days are omitted.'}</caption><thead><tr><th scope="col">${yieldMode === 'curve' ? 'Maturity' : 'Observation date'}</th><th scope="col">Yield (%)</th></tr></thead><tbody>${tableRows.map(([label,v]) => `<tr><th scope="row">${esc(label)}</th><td>${number(v)}</td></tr>`).join('')}</tbody></table>`;
}
async function loadTreasury() {
  try {
    const response = await fetch('data/treasury.json', {cache:'no-cache'});
    if (!response.ok) throw new Error('Feed unavailable');
    const data = await response.json();
    if (!Array.isArray(data.rows) || data.rows.length < 2 || data.rows.some(r => !['2Y','10Y','30Y'].every(k => Number.isFinite(r.yields?.[k])))) throw new Error('Invalid feed');
    treasury = data; renderTreasury();
  } catch {
    $('#treasury-status').textContent = treasury ? 'Refresh unavailable. Showing the previously loaded snapshot; check its observation date.' : 'The saved Treasury feed could not load. Please use the official source link below.';
  }
}
$$('[data-yield-chart]').forEach(button => button.addEventListener('click', () => {
  yieldMode = button.dataset.yieldChart;
  $$('[data-yield-chart]').forEach(b => b.setAttribute('aria-pressed',String(b === button)));
  renderTreasury();
}));

async function loadBrief() {
  try {
    const response = await fetch('data/brief.json', {cache:'no-cache'}); if (!response.ok) throw new Error();
    const brief = await response.json();
    const cites = ids => ids.map(id => {const s = brief.sources.find(s => s.id === id); return s ? `<a href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">[${esc(s.id)}] ${esc(s.name)} ↗</a>` : '';}).join(' · ');
    const age = (Date.now() - new Date(brief.asOf)) / 3600000;
    $('#research-brief').innerHTML = `<div class="brief-meta"><span>WRITTEN BY CODEX</span><span>·</span><span>Research cutoff: ${esc(brief.asOfLabel)}</span></div>${age > 48 ? '<p class="notice">This brief is over 48 hours old. It is a historical assessment, not a current market update.</p>' : ''}<h3>${esc(brief.title)}</h3><p class="brief-deck">${esc(brief.deck)}</p><div class="brief-facts">${brief.facts.map(f => `<div class="stat"><span class="label">${esc(f.label)}</span><strong class="num">${esc(f.value)}</strong><small>${esc(f.context)} · ${cites(f.sources)}</small></div>`).join('')}</div><div class="research-columns">${brief.sections.map(s => `<section><span class="research-label">${esc(s.kind)}</span><h4>${esc(s.title)}</h4><p>${esc(s.body)}</p><div>${cites(s.sources)}</div></section>`).join('')}</div><aside class="brief-watch"><h4>What would change this view?</h4><ul>${brief.watch.map(s => `<li>${esc(s)}</li>`).join('')}</ul></aside><p class="data-note">${esc(brief.caveat)}</p><details><summary>Sources &amp; research trail</summary><ul class="source-list">${brief.sources.map(s => `<li><a href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">[${esc(s.id)}] ${esc(s.name)} — ${esc(s.date)} ↗</a></li>`).join('')}</ul></details>`;
  } catch {$('#research-brief').innerHTML = '<p>The published brief could not load. <a href="data/brief.json">Open its source file</a> or try again later.</p>';}
  try {
    const response = await fetch('data/owen-notes.json', {cache:'no-cache'}); if (!response.ok) return;
    const notes = await response.json();
    if (notes.length) $('#owner-notes').innerHTML = notes.map(n => `<section><h4>${esc(n.title)}</h4><p class="data-note">${esc(n.date)} · Written by Owen</p><p class="muted">${esc(n.body)}</p></section>`).join('');
  } catch { /* The honest empty state stays visible. */ }
}
$('#scratchpad').value = storage.get('capital-toolkit-notes-v1') || '';
$('#scratchpad').addEventListener('input', () => {$('#notes-status').textContent = storage.set('capital-toolkit-notes-v1', $('#scratchpad').value) ? 'Saved in this browser. Not published.' : 'Browser storage unavailable. Export your notes to keep them.';});
$('#export-notes').addEventListener('click', () => download('capital-toolkit-notes.txt', $('#scratchpad').value, 'text/plain'));

const form = $('#dcf-form');
function readModel() {
  const p = {};
  for (const key of Object.keys(defaults)) {const value = form.elements.namedItem(key).value; p[key] = key === 'name' ? value.trim() : value.trim() === '' ? NaN : Number(value);}
  return p;
}
function fillModel(p) {for (const key of Object.keys(defaults)) form.elements.namedItem(key).value = p[key];}
try {const saved = JSON.parse(storage.get('capital-toolkit-dcf-v1')); if (saved) {valueCompany(saved); fillModel({...saved,name:typeof saved.name === 'string' ? saved.name.slice(0,80) : defaults.name});}} catch { /* Invalid or absent storage: keep the example. */ }
function renderDcf() {
  const p = readModel();
  let r;
  try {r = valueCompany(p);} catch (error) {$('#dcf-error').hidden=false; $('#dcf-error').textContent=error.message; $('#dcf-results').hidden=true; return;}
  $('#dcf-error').hidden=true; $('#dcf-results').hidden=false;
  $('#dcf-save-status').textContent = storage.set('capital-toolkit-dcf-v1',JSON.stringify(p)) ? 'Assumptions saved in this browser only.' : 'Browser storage unavailable. Export your model to keep it.';
  const s = sensitivity(p);
  const warnings = [r.terminalWeight > 75 ? `${number(r.terminalWeight,0)}% of enterprise value comes from the terminal assumption. Small changes can move the result substantially.` : '', p.terminal > 4 ? 'Terminal growth above 4% deserves particular scrutiny: this rate is assumed to continue forever.' : '', p.wacc-p.terminal < 1 ? 'WACC is less than 1 percentage point above terminal growth. The valuation is extremely sensitive.' : '', r.equity < 0 ? 'The model implies negative equity after senior claims. This signals assumptions or financial distress to investigate, not a literal negative share price.' : ''].filter(Boolean);
  const maxCash = Math.max(...r.forecast.map(row => row.fcf));
  const barWidth = 430 / p.years;
  const chart = `<svg viewBox="0 0 520 190" role="img" aria-label="Forecast cash flow and its present value by year. Full values are in the table below."><title>Future FCFF and discounted present value</title>${r.forecast.map((row,i) => {const x=48+i*barWidth, h=row.fcf/maxCash*135, pv=row.pv/maxCash*135;return `<rect x="${x}" y="${155-h}" width="${barWidth*.3}" height="${h}" rx="3" fill="var(--accent)"/><rect x="${x+barWidth*.34}" y="${155-pv}" width="${barWidth*.3}" height="${pv}" rx="3" fill="var(--green)"/><text x="${x+barWidth*.32}" y="177" text-anchor="middle">Y${row.year}</text>`;}).join('')}</svg>`;
  $('#dcf-results').innerHTML = `<article class="panel value-hero"><p class="eyebrow">MODEL-IMPLIED VALUE · ${esc(p.name || 'Untitled model')}</p><div class="big-value num">$${number(r.perShare)} <small>/ share</small></div><p class="data-note">${r.upside === null ? 'Enter a comparison price to estimate upside or downside.' : `<span class="${r.upside >= 0 ? 'up':'down'}">${signed(r.upside)}% implied ${r.upside >= 0 ? 'upside':'downside'}</span> versus your $${number(p.price)} input. Not a price target or recommendation.`}</p><div class="valuation-bridge"><div><span>Enterprise value ($m)</span><strong class="num">${number(r.enterprise,1)}</strong></div><div><span>+ Cash − claims ($m)</span><strong class="num">${signed(p.cash-p.debt,1)}</strong></div><div><span>Equity value ($m)</span><strong class="num">${number(r.equity,1)}</strong></div></div></article>${warnings.map(w=>`<p class="notice">${esc(w)}</p>`).join('')}<article class="panel"><div class="panel-heading"><h3>Cash flows, brought forward.</h3><button id="export-dcf" class="button">Export CSV ↓</button></div><p class="data-note"><span style="color:var(--accent)">■</span> Forecast FCFF &nbsp; <span style="color:var(--green)">■</span> Present value · USD millions</p><div class="native-chart">${chart}</div><div class="table-scroll"><table><thead><tr><th scope="col">Year</th><th scope="col">FCFF ($m)</th><th scope="col">Discount factor</th><th scope="col">PV ($m)</th></tr></thead><tbody>${r.forecast.map(row=>`<tr><th scope="row">${row.year}</th><td>${number(row.fcf)}</td><td>${number(row.factor,3)}</td><td>${number(row.pv)}</td></tr>`).join('')}<tr><th scope="row">PV of forecast</th><td></td><td></td><td>${number(r.cashFlowPV)}</td></tr><tr><th scope="row">PV of terminal value</th><td></td><td></td><td>${number(r.terminalPV)}</td></tr></tbody></table></div></article><article class="panel"><h3>How much do assumptions matter?</h3><p class="data-note">Value per share ($). Rows: WACC; columns: terminal growth. The outlined cell is your base case. Colours compare with your base-case valuation, not a trading signal. Invalid combinations show “—”.</p><div class="table-scroll"><table class="sensitivity"><thead><tr><th scope="col">WACC ↓ / g →</th>${s.growths.map(g=>`<th scope="col">${number(g,1)}%</th>`).join('')}</tr></thead><tbody>${s.rates.map((rate,i)=>`<tr><th scope="row">${number(rate,1)}%</th>${s.values[i].map((v,j)=>`<td class="${i===2&&j===2?'base-cell':v===null?'':v>=r.perShare?'high':'low'}">${v===null?'—':number(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></article>`;
  $('#export-dcf').addEventListener('click', () => {
    const safeName = /^[=+\-@\t\r\n]/.test(p.name) ? "'" + p.name : p.name;
    const rows = [['Capital Toolkit DCF',safeName],['Units','USD millions except price/share; shares in millions'],...Object.entries(p).filter(([k])=>k!=='name'),[],['Year','FCFF ($m)','Discount factor','Present value ($m)'],...r.forecast.map(row=>[row.year,row.fcf,row.factor,row.pv]),[],['Terminal value ($m)',r.terminalValue],['PV of terminal ($m)',r.terminalPV],['Enterprise value ($m)',r.enterprise],['Equity value ($m)',r.equity],['Value per share ($)',r.perShare],['Method','Unlevered FCFF, constant WACC, year-end discounting, perpetual terminal growth']];
    download('capital-toolkit-dcf.csv', rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n'), 'text/csv');
  });
}
form.addEventListener('submit', event => event.preventDefault());
let renderTimer;
form.addEventListener('input', () => {clearTimeout(renderTimer); renderTimer=setTimeout(renderDcf,150);});
form.addEventListener('change', () => {clearTimeout(renderTimer);renderDcf();});
$('#reset-dcf').addEventListener('click', () => {if (confirm('Replace your current assumptions with the fictional example?')) {fillModel(defaults);renderDcf();}});
renderDcf(); selectTool(); loadTreasury(); loadBrief();
setInterval(() => {
  if (document.hidden) return;
  loadTreasury();
  if (feedsStarted && !$('#markets').hidden) loadNews();
}, 300000);
