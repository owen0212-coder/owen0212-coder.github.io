import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults, valueCompany, sensitivity} from './dcf.mjs';
test('zero-growth perpetuity is FCFF / WACC, regardless of forecast length', () => {
  for (const years of [1, 5, 10, 20]) {
    const r = valueCompany({...defaults, growth: 0, terminal: 0, years});
    assert.ok(Math.abs(r.enterprise - 1000) < 1e-8);
    assert.ok(Math.abs(r.perShare - 8.5) < 1e-8);
  }
});
test('year-one cash flow grows once and terminal value is discounted to today', () => {
  const r = valueCompany({...defaults, years: 1});
  assert.equal(r.forecast[0].fcf, 108);
  assert.ok(Math.abs(r.enterprise - (108 + 108 * 1.025 / .075) / 1.1) < 1e-8);
});
test('cash and debt bridge enterprise to equity without clamping negative equity', () => {
  const r = valueCompany({...defaults, cash: 0, debt: 100000});
  assert.equal(r.equity, r.enterprise - 100000);
  assert.ok(r.perShare < 0);
});
test('no comparison price means no upside percentage', () => assert.equal(valueCompany({...defaults, price: 0}).upside, null));
test('reject invalid inputs and explosive terminal growth', () => {
  for (const patch of [{wacc: 0}, {terminal: 10}, {terminal: 11}, {shares: 0}, {fcf: -1}, {fcf: 0}, {growth: -100}, {cash: -1}, {debt: -1}, {price: -1}, {years: 0}, {years: 2.5}, {fcf: NaN}, {wacc: Infinity}]) {
    assert.throws(() => valueCompany({...defaults, ...patch}));
  }
});
test('value falls as WACC increases and rises as terminal growth increases', () => {
  const s = sensitivity(defaults);
  assert.equal(s.values[2][2], valueCompany(defaults).perShare);
  assert.ok(s.values[0][2] > s.values[4][2]);
  assert.ok(s.values[2][0] < s.values[2][4]);
});
test('invalid sensitivity combinations are blank, not Infinity', () => assert.ok(sensitivity({...defaults, wacc: 2, terminal: 1.5}).values.flat().includes(null)));
