import {lboDefaults, modelLbo, lboSensitivity, lboCsv} from './lbo.mjs';

const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const num = (n, digits = 1) => n == null ? '—' : n.toLocaleString('en-US', {minimumFractionDigits: digits, maximumFractionDigits: digits});
const storageKey = 'capital-toolkit-lbo-v1';
const scheduleRows = [
  ['Revenue', 'revenue'], ['EBITDA', 'ebitda'], ['D&A', 'depreciation'], ['EBIT', 'ebit'],
  ['Cash interest', 'interest'], ['Cash taxes', 'tax'], ['Capex', 'capex'], ['Change in NWC', 'deltaNwc'],
  ['Cash flow before principal', 'cashFlow'], ['Opening cash', 'openingCash'], ['Opening debt', 'openingDebt'],
  ['Mandatory repayment due', 'scheduled'], ['Mandatory repayment paid', 'mandatoryPaid'],
  ['Optional cash sweep', 'sweepPaid'], ['Closing debt', 'debt'], ['Closing cash', 'cash'], ['Unfunded shortfall', 'shortfall']
];

function debtChart(p, r) {
  const points = [{year: 0, debt: r.initialDebt, ebitda: r.entryEbitda}, ...r.forecast];
  const max = Math.max(...points.flatMap(row => [row.debt, row.ebitda]), 1) * 1.1;
  const x = i => 48 + i / (points.length - 1) * 460;
  const y = n => 174 - n / max * 150;
  const series = (key, css) => `<polyline class="${css}" points="${points.map((row, i) => `${x(i)},${y(row[key])}`).join(' ')}"/>${points.map((row, i) => `<circle class="${css}-dot" cx="${x(i)}" cy="${y(row[key])}" r="3"><title>Year ${row.year}: ${key === 'debt' ? 'debt' : 'EBITDA'} $${num(row[key])}m</title></circle>`).join('')}`;
  return `<svg viewBox="0 0 540 205" role="img" aria-label="Debt and EBITDA in USD millions, from entry through the forecast. Values are available in the schedule."><title>Debt paydown and EBITDA growth</title>${[0, .5, 1].map(f => `<line class="grid" x1="48" x2="508" y1="${y(max * f)}" y2="${y(max * f)}"/><text x="40" y="${y(max * f) + 4}" text-anchor="end">${num(max * f, 0)}</text>`).join('')}${series('debt', 'lbo-debt-line')}${series('ebitda', 'lbo-ebitda-line')}${points.map((row, i) => `<text x="${x(i)}" y="197" text-anchor="middle">Y${row.year}</text>`).join('')}</svg>`;
}

export function initLbo() {
  const form = document.querySelector('#lbo-form');
  const output = document.querySelector('#lbo-results');
  const error = document.querySelector('#lbo-error');
  const fill = p => Object.keys(lboDefaults).forEach(key => {form.elements.namedItem(key).value = p[key];});
  const read = () => Object.fromEntries(Object.keys(lboDefaults).map(key => {
    const value = form.elements.namedItem(key).value.trim();
    return [key, key === 'name' ? value : value === '' ? NaN : Number(value)];
  }));
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved) {modelLbo(saved); fill({...saved, name: typeof saved.name === 'string' ? saved.name.slice(0, 80) : lboDefaults.name});}
  } catch { /* Unavailable or invalid storage: retain the visible fictional example. */ }

  function render() {
    const p = read();
    let r;
    try {r = modelLbo(p);} catch (e) {error.hidden = false; error.textContent = e.message; output.hidden = true; return;}
    error.hidden = true; output.hidden = false;
    try {
      localStorage.setItem(storageKey, JSON.stringify(p));
      document.querySelector('#lbo-save-status').textContent = 'Assumptions saved in this browser only.';
    } catch {document.querySelector('#lbo-save-status').textContent = 'Browser storage unavailable. Export your model to keep it.';}
    const s = lboSensitivity(p);
    const flags = [];
    if (r.fundingGap) flags.push(`Year ${r.fundingGap.year} has a $${num(r.fundingGap.amount, 2)}m funding shortfall after operating cash flow and mandatory debt service. The forecast stops here. Returns are unavailable without a new financing plan.`);
    if (r.residualEquity !== null && r.residualEquity < 0) flags.push(`Net exit assets fall $${num(-r.residualEquity, 2)}m short of debt. Sponsor proceeds are zero (limited liability); creditor recovery and restructuring are not modeled.`);
    if (p.exitMultiple > p.entryMultiple) flags.push('Your exit multiple exceeds your entry multiple. Part of this case relies on multiple expansion, not operating improvement.');
    if (r.forecast.some(row => row.ebit < row.interest)) flags.push('EBIT is below cash interest in at least one projected year. Review interest coverage even if retained cash or working-capital release prevents a funding shortfall.');
    const bridge = r.fundingGap ? '' : `<article class="panel"><h3>From exit value to your proceeds.</h3><div class="table-scroll"><table><caption>Year ${p.years} exit bridge · USD millions</caption><tbody>${[
      ['Exit enterprise value', r.exitEV], ['Less exit fees', -r.exitFees], ['Less remaining debt', -r.exitDebt], ['Add retained excess cash', r.exitCash], ['Residual equity before floor', r.residualEquity], ['Sponsor proceeds (minimum zero)', r.proceeds]
    ].map(([label, value]) => `<tr><th scope="row">${label}</th><td>${num(value, 2)}</td></tr>`).join('')}</tbody></table></div><p class="data-note">Proceeds are received once, at the end of year ${p.years}. No interim dividends or additional equity contributions are assumed.</p></article>`;
    output.innerHTML = `
      <article class="panel value-hero lbo-return-card">
        <p class="eyebrow">SPONSOR RETURNS · ${esc(p.name || 'Untitled deal')}</p>
        <div class="lbo-return-grid"><div><span class="label">Annual IRR</span><div class="big-value num">${r.irr === null ? '—' : num(r.irr) + '%'}</div></div><div><span class="label">Money multiple</span><div class="lbo-moic num">${r.moic === null ? '—' : num(r.moic, 2) + '×'}</div></div></div>
        <p class="data-note">${r.fundingGap ? 'Financing does not support the forecast. See the shortfall below.' : `${p.years}-year hold · gross deal-level returns, before fund fees, carry and investor taxes.`} <a href="#lbo-form">Edit assumptions ↑</a></p>
        <div class="valuation-bridge"><div><span>Equity invested ($m)</span><strong class="num">${num(r.sponsorEquity)}</strong></div><div><span>Sponsor proceeds ($m)</span><strong class="num">${num(r.proceeds)}</strong></div><div><span>Entry debt / EBITDA</span><strong class="num">${num(p.leverage)}×</strong></div></div>
      </article>
      ${flags.map(flag => `<p class="notice ${r.fundingGap ? 'error' : ''}">${esc(flag)}</p>`).join('')}
      <article class="panel"><div class="panel-heading"><h3>Where the money comes from.</h3><button type="button" id="export-lbo" class="button">Export CSV ↓</button></div>
        <div class="lbo-funding"><div><p class="eyebrow">SOURCES</p><dl><div><dt>New debt</dt><dd>${num(r.initialDebt)}</dd></div><div><dt>Sponsor equity</dt><dd>${num(r.sponsorEquity)}</dd></div><div class="lbo-total"><dt>Total sources</dt><dd>${num(r.initialDebt + r.sponsorEquity)}</dd></div></dl></div><div><p class="eyebrow">USES</p><dl><div><dt>Purchase EV</dt><dd>${num(r.entryEV)}</dd></div><div><dt>Entry fees</dt><dd>${num(r.entryFees)}</dd></div><div class="lbo-total"><dt>Total uses</dt><dd>${num(r.totalUses)}</dd></div></dl></div></div>
        <p class="source-line">USD millions · entry EBITDA $${num(r.entryEbitda)}m · sources and uses balance.</p>
      </article>
      <article class="panel"><h3>Let the business do the heavy lifting.</h3><p class="data-note"><span class="lbo-debt-key">━</span> Debt &nbsp; <span class="lbo-ebitda-key">┄</span> EBITDA · USD millions · ${r.fundingGap ? 'forecast stops at funding shortfall' : `$${num(r.debtRepaid)}m debt repaid during the hold`}</p><div class="native-chart">${debtChart(p, r)}</div></article>
      ${bridge}
      <article class="panel"><h3>Two assumptions. Twenty-five outcomes.</h3><p class="data-note">Annual sponsor IRR (%). Rows change revenue / EBITDA growth; columns change exit EV / EBITDA. Outline = your base case. Colour compares with that case, not a trading signal. “—” means invalid inputs or a funding shortfall.</p>
        <div class="table-scroll" tabindex="0" role="region" aria-label="LBO return sensitivity, scroll horizontally"><table class="sensitivity"><thead><tr><th scope="col">Growth ↓ / Exit →</th>${s.multiples.map(m => `<th scope="col">${num(m)}×</th>`).join('')}</tr></thead><tbody>${s.growths.map((g, i) => `<tr><th scope="row">${num(g)}%</th>${s.values[i].map((v, j) => `<td class="${i === 2 && j === 2 ? 'base-cell' : v === null || r.irr === null ? '' : v >= r.irr ? 'high' : 'low'}">${v === null ? '—' : num(v) + '%'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      </article>
      <article class="panel"><h3>Every year, accounted for.</h3><p class="data-note">USD millions. Positive change in NWC uses cash; a negative value releases it. Interest, taxes, capex and principal payments are shown as positive costs.</p>
        <div class="table-scroll lbo-schedule" tabindex="0" role="region" aria-label="Annual LBO schedule, scroll horizontally"><table><thead><tr><th scope="col">Cash flow &amp; debt</th>${r.forecast.map(row => `<th scope="col">Year ${row.year}</th>`).join('')}</tr></thead><tbody>${scheduleRows.map(([label, key]) => `<tr class="${['ebitda','cashFlow','debt','cash'].includes(key) ? 'lbo-subtotal' : ''}"><th scope="row">${label}</th>${r.forecast.map(row => `<td>${num(row[key], 2)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      </article>`;
    document.querySelector('#export-lbo').addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([lboCsv(p, r)], {type: 'text/csv;charset=utf-8'}));
      const link = document.createElement('a'); link.href = url; link.download = 'capital-toolkit-lbo.csv'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  let timer;
  form.addEventListener('submit', e => e.preventDefault());
  form.addEventListener('input', () => {clearTimeout(timer); timer = setTimeout(render, 150);});
  form.addEventListener('change', () => {clearTimeout(timer); render();});
  document.querySelector('#reset-lbo').addEventListener('click', () => {
    if (confirm('Replace your LBO assumptions with the fictional example?')) {clearTimeout(timer); fill(lboDefaults); render();}
  });
  render();
}
