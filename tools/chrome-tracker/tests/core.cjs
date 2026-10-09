const {test} = require('node:test'), assert = require('node:assert/strict');
const C = require('../extension/core.js');
const url = 'https://leetcode.com/problems/two-sum/', now = Date.parse('2026-01-01T00:00:00.000Z');
const ids = new Set(['lc:problem:p0001', 'lc:problem:eval-00002']);
const record = {problemId: 'lc:problem:p0001', solved: true, observedAt: new Date(now).toISOString(), source: 'manual-owner-attestation'};
const armed = () => { const d = new C.Detector(); d.submit({url, trusted: true, active: true, now}); return d; };
const observe = (d, status, extra = {}) => d.observe({url, active: true, status, now: now + 1, ...extra});
test('exact URL parsing; historical detail pages cannot arm', () => {
  assert.equal(C.problemURL(url).slug, 'two-sum');
  for (const bad of ['http://leetcode.com/problems/two-sum/', 'https://leetcode.com.evil/problems/two-sum/', 'https://leetcode.cn/problems/two-sum/', 'https://leetcode.com/problemset/', 'https://leetcode.com/problems/two%2dsum/']) assert.equal(C.problemURL(bad), null);
  for (const path of ['submissions/', 'submissions/123/', 'solutions/']) {
    const d = new C.Detector(); d.submit({url: url + path, trusted: true, active: true, now}); assert.equal(d.attempt, null);
  }
});
test('viewed Accepted and Accepted without a pending transition never qualify', () => {
  assert.equal(observe(new C.Detector(), 'Accepted'), null);
  assert.equal(observe(armed(), 'Accepted'), null);
});
test('synthetic clicks and background submits cannot arm', () => {
  for (const pair of [{trusted: false, active: true}, {trusted: true, active: false}]) {
    const d = new C.Detector(); d.submit({url, now, ...pair}); assert.equal(d.attempt, null);
  }
});
test('recent pending → Accepted produces one confirmation candidate, never progress', () => {
  const d = armed(); observe(d, 'Judging'); const c = observe(d, 'Accepted');
  assert.equal(c.slug, 'two-sum'); assert.equal(c.source, 'accepted-dom-owner-confirmed');
  assert.equal(observe(d, 'Accepted'), c); assert.equal(c.solved, undefined);
});
test('all rejected outcomes cancel; a subsequent historical Accepted does not revive them', () => {
  for (const status of ['Wrong Answer','Runtime Error','Time Limit Exceeded','Memory Limit Exceeded','Output Limit Exceeded','Compile Error','Internal Error']) {
    const d = armed(); observe(d, 'Pending'); observe(d, status); assert.equal(observe(d, 'Accepted'), null);
  }
});
test('expiry, clock reversal, different slug, route change, and background cancel', () => {
  for (const extra of [{now: now + C.TTL + 1}, {now: now - 1}, {url: url.replace('two-sum','add-two-numbers')}, {url: url+'submissions/123/'}, {active: false}]) {
    const d = armed(); observe(d, 'Pending'); assert.equal(observe(d, 'Accepted', extra), null);
    assert.equal(observe(d, 'Accepted'), null);
  }
});
test('another submit clears an earlier candidate', () => {
  const d = armed(); observe(d, 'Pending'); observe(d, 'Accepted'); d.submit({url, trusted:true, active:true, now:now+3});
  assert.equal(d.candidate, null); assert.equal(observe(d,'Accepted',{now:now+4}),null);
});
test('strict four-field JSON round trip and stable ID deduplication', () => {
  assert.deepEqual(C.parseExport(C.exportProgress([record]),ids,now),[record]);
  assert.deepEqual(C.merge([record],[{...record,observedAt:new Date(now+10).toISOString()}]),[record]);
});
test('reject unknown IDs, duplicates, code/URLs, false solves, bad timestamps and fabricated sources', () => {
  for (const r of [{...record,problemId:'1'},{...record,code:'secret'}, {...record,url}, {...record,solved:false}, {...record,observedAt:'yesterday'}, {...record,observedAt:'2026-02-30T00:00:00.000Z'}, {...record,observedAt:new Date(now+120000).toISOString()}, {...record,source:'official-api'}]) assert.throws(()=>C.parseExport(C.exportProgress([r]),ids,now));
  assert.throws(()=>C.parseExport(C.exportProgress([record,record]),ids,now));
  assert.throws(()=>C.parseExport({...C.exportProgress([]),secret:'x'},ids,now));
  assert.throws(()=>C.parseExport({...C.exportProgress([]),version:2},ids,now));
});
test('adapter preserves ledger and base evidence, and resets to zero', () => {
  const M = require('../../../src/leetcode-atlas/model.js'), A = require('../atlas-adapter.js');
  const catalog = require('../../../src/leetcode-atlas/data/catalog.json'), tax = require('../../../src/leetcode-atlas/data/taxonomy.json'), ledger = require('../../../src/leetcode-atlas/data/progress.json');
  const index = M.validate(catalog,tax), base = M.projectProgress(index,ledger), before=JSON.stringify(ledger);
  const projected=A.project(index,base,C.exportProgress([record]));
  assert.equal(projected.uniqueSolved,1); assert.equal(base.uniqueSolved,0);
  assert.equal(projected.byProblem.get(record.problemId).officialAccepted,false);
  assert.deepEqual(projected.byProblem.get(record.problemId).evidence,[]);
  assert.equal(A.project(index,base,C.exportProgress([])).uniqueSolved,0);
  assert.equal(JSON.stringify(ledger),before);
});
