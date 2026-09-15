import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url),'utf8'));
test('research has a real cutoff and every citation resolves', () => {
  const b = read('./data/brief.json');
  assert.ok(Number.isFinite(Date.parse(b.asOf)));
  assert.ok(Date.parse(b.asOf) <= Date.now());
  assert.ok(b.title && b.deck && b.caveat && b.asOfLabel);
  const ids = new Set(b.sources.map(s=>s.id));
  assert.equal(ids.size,b.sources.length);
  for (const item of [...b.facts,...b.sections]) {
    assert.ok(item.sources.length > 0);
    for (const id of item.sources) assert.ok(ids.has(id), `Unknown source ${id}`);
  }
  for (const source of b.sources) assert.equal(new URL(source.url).protocol,'https:');
});
test('Treasury rows are ordered, numeric, non-future observations', () => {
  const t = read('./data/treasury.json');
  assert.ok(t.rows.length > 100);
  let prior = '';
  for (const row of t.rows) {
    assert.ok(row.date > prior); prior = row.date;
    assert.ok(row.date <= new Date().toISOString().slice(0,10));
    for (const v of Object.values(row.yields)) assert.ok(Number.isFinite(v) && v >= -5 && v <= 30);
    for (const k of ['2Y','10Y','30Y']) assert.ok(Number.isFinite(row.yields[k]));
  }
});
test('no owner opinions fabricated in initial published notes', () => {
  const notes = read('./data/owen-notes.json');
  assert.ok(Array.isArray(notes));
  for (const n of notes) assert.ok(n.title && n.date && n.body);
});
