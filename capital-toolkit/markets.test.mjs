import test from 'node:test';
import assert from 'node:assert/strict';
import {benchmarks, marketView} from './markets.mjs';

test('intraday views disclose ETF prices and delayed data for every benchmark', () => {
  for (const [key, b] of Object.entries(benchmarks)) {
    const view = marketView(key, 'intraday');
    assert.equal(view.config.symbol, b.etf);
    assert.equal(view.config.interval, '1');
    assert.equal(view.config.range, '1D');
    assert.match(view.title, /tracking ETF/);
    assert.match(view.description, /not index points/);
    assert.match(view.description, /delayed/);
    assert.match(view.description, /not a promise/);
    assert.equal(view.config.hide_legend, false);
    assert.match(view.source, /^https:\/\/www\.tradingview\.com\/symbols\//);
  }
});

test('daily mode keeps exact FRED indices separate from intraday ETFs', () => {
  for (const [key, b] of Object.entries(benchmarks)) {
    const view = marketView(key, 'daily', 'dark');
    assert.equal(view.config.symbols[0][0], b.daily + '|1D');
    assert.match(view.description, /not intraday/);
    assert.match(view.description, /lag/);
    assert.equal(view.config.colorTheme, 'dark');
  }
});

test('Nasdaq Composite is not silently replaced by Nasdaq 100', () => {
  assert.equal(benchmarks.nasdaq.etf, 'NASDAQ:ONEQ');
  assert.equal(benchmarks.nasdaq.daily, 'FRED:NDQCOM');
});

test('unknown market selections are rejected', () => {
  assert.throws(() => marketView('unknown','intraday'));
  assert.throws(() => marketView('sp','realtime'));
});
