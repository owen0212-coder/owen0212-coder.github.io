// Single-tranche, cash-free/debt-free acquisition. All money is USD millions.
export const lboDefaults = Object.freeze({
  name: 'Harbour Supply Co. · fictional', revenue: 500, margin: 20, growth: 5,
  entryMultiple: 10, exitMultiple: 10, years: 5, leverage: 5, interest: 8,
  amortization: 5, sweep: 100, entryFees: 2, exitFees: 1,
  tax: 25, da: 2, capex: 3, nwc: 10
});

export function modelLbo(p) {
  for (const key of Object.keys(lboDefaults).filter(k => k !== 'name')) {
    if (typeof p[key] !== 'number' || !Number.isFinite(p[key])) throw new Error('Enter a valid number in every financial field.');
  }
  if (p.revenue <= 0 || p.revenue > 1e12) throw new Error('Revenue must be positive and no more than 1 trillion USD millions.');
  if (p.margin <= 0 || p.margin > 100) throw new Error('EBITDA margin must be greater than 0% and no more than 100%.');
  if (p.growth <= -100 || p.growth > 100) throw new Error('Revenue growth must be greater than −100% and no more than 100%.');
  if (!Number.isInteger(p.years) || p.years < 1 || p.years > 10) throw new Error('Holding period must be a whole number from 1 to 10 years.');
  if (p.entryMultiple <= 0 || p.entryMultiple > 100 || p.exitMultiple < 0 || p.exitMultiple > 100) throw new Error('Entry multiple must be positive; exit multiple may be zero. Neither may exceed 100×.');
  if (p.leverage < 0 || p.leverage > 20) throw new Error('Entry debt / EBITDA must be between 0× and 20×.');
  for (const key of ['interest', 'amortization', 'sweep', 'entryFees', 'exitFees', 'tax', 'da', 'capex', 'nwc']) {
    if (p[key] < 0 || p[key] > 100) throw new Error('Cost, tax, reinvestment and repayment percentages must be between 0% and 100%.');
  }
  const entryEbitda = p.revenue * p.margin / 100;
  const entryEV = entryEbitda * p.entryMultiple;
  const entryFees = entryEV * p.entryFees / 100;
  const totalUses = entryEV + entryFees;
  const initialDebt = entryEbitda * p.leverage;
  const sponsorEquity = totalUses - initialDebt;
  if (sponsorEquity <= 0) throw new Error('The deal needs positive sponsor equity. Reduce entry leverage or increase the purchase price.');
  let debt = initialDebt, cash = 0, previousRevenue = p.revenue, fundingGap = null;
  const forecast = [];
  for (let year = 1; year <= p.years; year++) {
    const revenue = previousRevenue * (1 + p.growth / 100);
    const ebitda = revenue * p.margin / 100;
    const depreciation = revenue * p.da / 100;
    const ebit = ebitda - depreciation;
    const openingDebt = debt, openingCash = cash;
    const interest = openingDebt * p.interest / 100;
    const tax = Math.max(0, ebit - interest) * p.tax / 100;
    const capex = revenue * p.capex / 100;
    const deltaNwc = (revenue - previousRevenue) * p.nwc / 100;
    const cashFlow = ebitda - interest - tax - capex - deltaNwc;
    const cashAvailable = openingCash + cashFlow;
    const scheduled = Math.min(openingDebt, initialDebt * p.amortization / 100);
    const shortfall = Math.max(0, scheduled - cashAvailable);
    const mandatoryPaid = Math.min(scheduled, Math.max(0, cashAvailable));
    const sweepPaid = Math.min(openingDebt - mandatoryPaid, Math.max(0, cashAvailable - mandatoryPaid) * p.sweep / 100);
    debt = Math.max(0, openingDebt - mandatoryPaid - sweepPaid);
    cash = Math.max(0, cashAvailable - mandatoryPaid - sweepPaid);
    const row = {year, revenue, ebitda, depreciation, ebit, interest, tax, capex, deltaNwc,
      cashFlow, openingCash, openingDebt, scheduled, mandatoryPaid, sweepPaid, debt, cash, shortfall};
    if (!Object.values(row).every(Number.isFinite)) throw new Error('These assumptions exceed the model’s numerical range.');
    forecast.push(row);
    if (shortfall > Math.max(1, totalUses) * 1e-12) {fundingGap = {year, amount: shortfall}; break;}
    previousRevenue = revenue;
  }
  // No dividends, recapitalizations or interim equity injections: one outflow, one inflow.
  // Suppress returns when financing fails rather than inventing a revolver or rescue equity.
  const exitEV = fundingGap ? null : forecast.at(-1).ebitda * p.exitMultiple;
  const exitFees = fundingGap ? null : exitEV * p.exitFees / 100;
  const residualEquity = fundingGap ? null : exitEV - exitFees - debt + cash;
  const proceeds = fundingGap ? null : Math.max(0, residualEquity);
  const moic = fundingGap ? null : proceeds / sponsorEquity;
  const irr = fundingGap ? null : (moic ** (1 / p.years) - 1) * 100;
  const debtRepaid = initialDebt - debt;
  return {entryEbitda, entryEV, entryFees, totalUses, initialDebt, sponsorEquity, forecast,
    fundingGap, exitEV, exitFees, residualEquity, proceeds, moic, irr, debtRepaid, exitDebt: debt, exitCash: cash};
}

export function lboSensitivity(p) {
  const growths = [-2, -1, 0, 1, 2].map(n => p.growth + n);
  const multiples = [-2, -1, 0, 1, 2].map(n => p.exitMultiple + n);
  return {growths, multiples, values: growths.map(growth => multiples.map(exitMultiple => {
    try {return modelLbo({...p, growth, exitMultiple}).irr;} catch {return null;}
  }))};
}

export function lboCsv(p, r) {
  const rows = [
    ['Capital Toolkit LBO', p.name], ['Units', 'USD millions; rates in percent; multiples in x'],
    ['Model', 'Single tranche; beginning-debt interest; annual end-year payments; no interim distributions'],
    ['Caution', 'Fictional example unless replaced. Educational model, not investment advice.'],
    [], ['Assumption', 'Value'], ...Object.entries(p).filter(([key]) => key !== 'name'),
    [], ['Sources and uses', 'USD millions'], ['Entry enterprise value', r.entryEV], ['Entry fees', r.entryFees],
    ['Total uses', r.totalUses], ['New debt', r.initialDebt], ['Sponsor equity', r.sponsorEquity],
    [], ['Year', 'Revenue', 'EBITDA', 'D&A', 'EBIT', 'Cash interest', 'Cash tax', 'Capex', 'Change in NWC', 'Cash flow before principal', 'Opening cash', 'Opening debt', 'Mandatory due', 'Mandatory paid', 'Cash sweep', 'Closing debt', 'Closing cash', 'Unfunded shortfall'],
    ...r.forecast.map(row => ['year','revenue','ebitda','depreciation','ebit','interest','tax','capex','deltaNwc','cashFlow','openingCash','openingDebt','scheduled','mandatoryPaid','sweepPaid','debt','cash','shortfall'].map(key => row[key])),
    [], ['Status', r.fundingGap ? `Unfunded shortfall in year ${r.fundingGap.year}; returns unavailable` : 'Model completes without a cash shortfall'],
    ['Exit enterprise value', r.exitEV], ['Exit fees', r.exitFees], ['Residual equity before limited-liability floor', r.residualEquity],
    ['Sponsor proceeds', r.proceeds], ['Sponsor MOIC (x)', r.moic], ['Annual sponsor IRR (%)', r.irr]
  ];
  return rows.map(row => row.map(value => {
    let s = value == null ? '' : String(value);
    // Escape all text cells, including user names, against spreadsheet formula injection.
    if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }).join(',')).join('\r\n');
}
