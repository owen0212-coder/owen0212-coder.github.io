import test from 'node:test';
import assert from 'node:assert/strict';
import {lboDefaults as d, modelLbo, lboSensitivity, lboCsv} from './lbo.mjs';
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
const simple = {...d, revenue: 100, margin: 100, growth: 0, entryMultiple: 10, exitMultiple: 10,
  entryFees: 0, exitFees: 0, leverage: 5, interest: 0, tax: 0, da: 0, capex: 0, nwc: 0, amortization: 0, sweep: 100};

test('sources and uses reconcile; fees increase equity required', () => {
  const r = modelLbo(d);
  near(r.entryEbitda, 100); near(r.entryEV, 1000); near(r.entryFees, 20);
  near(r.sponsorEquity, 520); near(r.initialDebt + r.sponsorEquity, r.totalUses);
});
test('hand-calculated debt-free exit doubles sponsor money in five years', () => {
  const r = modelLbo(simple);
  assert.equal(r.exitDebt, 0); assert.equal(r.exitCash, 0);
  assert.equal(r.proceeds, 1000); assert.equal(r.moic, 2);
  near(r.irr, 14.86983549970351);
});
test('hand-calculated one-year tax, working capital and debt schedule', () => {
  const r = modelLbo({...d, years: 1}); const y = r.forecast[0];
  near(y.revenue, 525); near(y.ebitda, 105); near(y.depreciation, 10.5);
  near(y.interest, 40); near(y.tax, 13.625); near(y.capex, 15.75); near(y.deltaNwc, 2.5);
  near(y.cashFlow, 33.125); near(y.mandatoryPaid, 25); near(y.sweepPaid, 8.125);
  near(y.debt, 466.875); near(r.proceeds, 572.625);
  near(r.irr, (572.625 / 520 - 1) * 100);
});
test('debt cannot go negative and cash accumulates after payoff', () => {
  const r = modelLbo({...simple, years: 7});
  assert.equal(r.exitDebt, 0); assert.equal(r.exitCash, 200);
  assert.equal(r.proceeds, 1200); assert.equal(r.forecast[5].interest, 0);
  for (const y of r.forecast) assert.ok(y.debt >= 0);
});
test('zero sweep retains cash; debt is deducted and cash added exactly once', () => {
  const r = modelLbo({...simple, sweep: 0});
  assert.equal(r.exitDebt, 500); assert.equal(r.exitCash, 500);
  assert.equal(r.proceeds, 1000); assert.equal(r.moic, 2);
});
test('partial sweep uses retained cash and amortization is based on original debt', () => {
  const r = modelLbo({...simple, sweep: 50, amortization: 10, years: 2});
  near(r.forecast[0].cash, 25); near(r.forecast[0].debt, 425);
  near(r.forecast[1].scheduled, 50); near(r.forecast[1].sweepPaid, 37.5);
  near(r.forecast[1].cash, 37.5); near(r.forecast[1].debt, 337.5);
});
test('mandatory payments are capped at remaining debt', () => {
  const r = modelLbo({...simple, leverage: .5, amortization: 100});
  near(r.forecast[0].mandatoryPaid, 50); near(r.forecast[0].sweepPaid, 0);
  near(r.forecast[1].scheduled, 0); near(r.exitCash, 450);
});
test('all-equity acquisition has no interest or debt paydown', () => {
  const r = modelLbo({...simple, leverage: 0, interest: 99});
  near(r.sponsorEquity, 1000); near(r.exitCash, 500); near(r.moic, 1.5);
  assert.ok(r.forecast.every(y => y.interest === 0 && y.debt === 0));
});
test('tax losses do not create refunds; shrinking revenue releases NWC', () => {
  const r = modelLbo({...d, leverage: 0, da: 100, growth: -10});
  assert.equal(r.forecast[0].tax, 0); near(r.forecast[0].deltaNwc, -5);
});
test('operating cash shortfall suppresses returns and stops projection', () => {
  const r = modelLbo({...simple, interest: 100});
  assert.deepEqual(r.fundingGap, {year: 1, amount: 400});
  assert.equal(r.forecast.length, 1); assert.equal(r.moic, null); assert.equal(r.irr, null);
  assert.equal(r.exitEV, null); assert.equal(r.proceeds, null);
});
test('mandatory service shortfall is not silently refinanced', () => {
  const r = modelLbo({...simple, amortization: 100});
  near(r.fundingGap.amount, 400); near(r.forecast[0].mandatoryPaid, 100);
  near(r.forecast[0].debt, 400); assert.equal(r.irr, null);
});
test('insolvent exit floors sponsor proceeds, not the residual equity', () => {
  const r = modelLbo({...simple, years: 1, sweep: 0, exitMultiple: 1});
  assert.equal(r.residualEquity, -300); assert.equal(r.proceeds, 0);
  assert.equal(r.moic, 0); assert.equal(r.irr, -100);
});
test('exit fees reduce proceeds and more expensive debt reduces returns', () => {
  assert.ok(modelLbo({...d, exitFees: 2}).proceeds < modelLbo(d).proceeds);
  assert.ok(modelLbo({...d, interest: 10}).irr < modelLbo(d).irr);
});
test('debt and cash reconcile every year over a grid of assumptions', () => {
  for (const growth of [-10, 0, 10]) for (const sweep of [0, 50, 100]) for (const leverage of [0, 3, 7]) {
    const r = modelLbo({...d, growth, sweep, leverage});
    for (const y of r.forecast) {
      near(y.openingDebt - y.mandatoryPaid - y.sweepPaid, y.debt);
      if (!y.shortfall) near(y.openingCash + y.cashFlow - y.mandatoryPaid - y.sweepPaid, y.cash);
      assert.ok(y.cash >= 0 && y.debt >= 0 && y.tax >= 0);
    }
    if (!r.fundingGap) near(r.sponsorEquity * (1 + r.irr / 100) ** r.forecast.length, r.proceeds);
  }
});
test('reject missing, non-finite and out-of-range inputs', () => {
  for (const patch of [{revenue: 0}, {margin: 0}, {margin: 101}, {growth: -100}, {growth: 101}, {entryMultiple: 0}, {exitMultiple: -1}, {leverage: -1}, {leverage: 11}, {years: 0}, {years: 11}, {years: 2.5}, {interest: NaN}, {tax: Infinity}, {sweep: 101}, {nwc: -1}, {capex: undefined}]) {
    assert.throws(() => modelLbo({...d, ...patch}));
  }
});
test('sensitivity center matches base; growth and exit multiple increase returns', () => {
  const s = lboSensitivity(d);
  near(s.values[2][2], modelLbo(d).irr);
  assert.ok(s.values[4][2] > s.values[0][2]); assert.ok(s.values[2][4] > s.values[2][0]);
});
test('invalid and unfunded sensitivity cells return null', () => {
  assert.ok(lboSensitivity({...d, exitMultiple: 1}).values.flat().includes(null));
  assert.ok(lboSensitivity({...d, interest: 100}).values.flat().every(v => v === null));
});
test('CSV includes schedule and assumptions, escapes names, and preserves negative numbers', () => {
  const p = {...d, name: ' =HYPERLINK("bad")', growth: -5};
  const csv = lboCsv(p, modelLbo(p));
  assert.ok(csv.includes('"\' =HYPERLINK(""bad"")"'));
  assert.ok(csv.includes('"growth","-5"')); assert.ok(csv.includes('"Closing debt"'));
  assert.ok(csv.includes('"Annual sponsor IRR (%)"'));
  assert.ok(!csv.includes('undefined') && !csv.includes('NaN'));
});
