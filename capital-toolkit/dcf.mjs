// Unlevered, year-end FCFF model. Monetary inputs and shares are in millions.
export const defaults = Object.freeze({name: 'Example company', fcf: 100, growth: 8, years: 5, wacc: 10, terminal: 2.5, cash: 150, debt: 300, shares: 100, price: 15});

export function valueCompany(input) {
  const p = {...input};
  for (const key of ['fcf', 'growth', 'years', 'wacc', 'terminal', 'cash', 'debt', 'shares', 'price']) {
    if (typeof p[key] !== 'number' || !Number.isFinite(p[key])) throw new Error('Please enter a valid number in every financial field.');
  }
  if (!Number.isInteger(p.years) || p.years < 1 || p.years > 20) throw new Error('Forecast length must be a whole number from 1 to 20 years.');
  if (p.fcf <= 0) throw new Error('This simple growth model needs positive, normalized unlevered free cash flow. It is not suitable for a loss-making business.');
  if (p.growth <= -100 || p.growth > 100) throw new Error('Forecast growth must be greater than −100% and no more than 100%.');
  if (p.wacc <= 0 || p.wacc > 100) throw new Error('WACC must be greater than 0% and no more than 100%.');
  if (p.terminal <= -100 || p.terminal >= p.wacc) throw new Error('Terminal growth must be greater than −100% and strictly below WACC.');
  if (p.shares <= 0) throw new Error('Diluted shares outstanding must be greater than zero.');
  if (p.cash < 0 || p.debt < 0 || p.price < 0) throw new Error('Cash, debt, and the comparison share price cannot be negative.');
  const r = p.wacc / 100, g = p.terminal / 100;
  const forecast = Array.from({length: p.years}, (_, i) => {
    const year = i + 1, fcf = p.fcf * (1 + p.growth / 100) ** year;
    const factor = 1 / (1 + r) ** year;
    return {year, fcf, factor, pv: fcf * factor};
  });
  const terminalCashFlow = forecast.at(-1).fcf * (1 + g);
  const terminalValue = terminalCashFlow / (r - g);
  const terminalPV = terminalValue / (1 + r) ** p.years;
  const cashFlowPV = forecast.reduce((sum, row) => sum + row.pv, 0);
  const enterprise = cashFlowPV + terminalPV;
  const equity = enterprise + p.cash - p.debt;
  const perShare = equity / p.shares;
  if (![enterprise, equity, perShare, terminalValue].every(Number.isFinite)) throw new Error('These assumptions exceed the calculator’s numerical range.');
  return {forecast, terminalCashFlow, terminalValue, terminalPV, cashFlowPV, enterprise, equity, perShare,
    upside: p.price > 0 ? (perShare / p.price - 1) * 100 : null, terminalWeight: terminalPV / enterprise * 100};
}

export function sensitivity(input) {
  const rates = [-2, -1, 0, 1, 2].map(offset => input.wacc + offset);
  const growths = [-1, -.5, 0, .5, 1].map(offset => input.terminal + offset);
  return {rates, growths, values: rates.map(wacc => growths.map(terminal => {
    try { return valueCompany({...input, wacc, terminal}).perShare; } catch { return null; }
  }))};
}
