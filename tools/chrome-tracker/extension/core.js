/* Shared validation and a fail-closed detector. No browser/network dependencies. */
(function(g) {
  'use strict';
  const FORMAT = 'myatlas-leetcode-progress', TTL = 120000;
  const SOURCES = new Set(['manual-owner-attestation', 'accepted-dom-owner-confirmed']);
  function problemURL(value) {
    try {
      const u = new URL(value);
      if (u.origin !== 'https://leetcode.com' || u.username || u.password) return null;
      const m = /^\/problems\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/(.*))?$/.exec(u.pathname);
      if (!m) return null;
      return {slug: m[1], path: u.pathname, canObserve: !m[2] || m[2] === 'description/'};
    } catch { return null; }
  }
  function exactKeys(o, keys) {
    return o && typeof o === 'object' && !Array.isArray(o) &&
      Object.keys(o).sort().join('|') === [...keys].sort().join('|');
  }
  function validateRecords(rows, ids, now = Date.now()) {
    if (!Array.isArray(rows) || rows.length > ids.size) throw Error('Invalid record count');
    const seen = new Set();
    return rows.map(r => {
      if (!exactKeys(r, ['problemId', 'solved', 'observedAt', 'source']) ||
          !ids.has(r.problemId) || seen.has(r.problemId) || r.solved !== true ||
          !SOURCES.has(r.source) || typeof r.observedAt !== 'string' ||
          !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(r.observedAt) ||
          !Number.isFinite(Date.parse(r.observedAt)) || Date.parse(r.observedAt) > now + 60000 ||
          new Date(r.observedAt).toISOString() !== r.observedAt) throw Error('Invalid, duplicate or unknown progress record');
      seen.add(r.problemId);
      return {problemId: r.problemId, solved: true, observedAt: r.observedAt, source: r.source};
    });
  }
  function parseExport(value, ids, now) {
    if (!exactKeys(value, ['format', 'version', 'records']) || value.format !== FORMAT || value.version !== 1)
      throw Error('Unsupported progress format');
    return validateRecords(value.records, ids, now);
  }
  const exportProgress = records => ({format: FORMAT, version: 1, records});
  function merge(a, b) {
    const rows = new Map(a.map(r => [r.problemId, r]));
    for (const r of b) if (!rows.has(r.problemId)) rows.set(r.problemId, r);
    return [...rows.values()].sort((a,b) => a.problemId.localeCompare(b.problemId));
  }
  class Detector {
    constructor() { this.reset(); }
    reset() { this.attempt = null; this.candidate = null; }
    submit({url, trusted, active, now}) {
      this.reset();
      const p = problemURL(url);
      if (trusted && active && p?.canObserve) this.attempt = {url, slug: p.slug, started: now, pending: false};
    }
    observe({url, active, status, now}) {
      const a = this.attempt;
      if (!a) return null;
      if (!active || url !== a.url || now < a.started || now - a.started > TTL) { this.reset(); return null; }
      if (/^(Wrong Answer|Runtime Error|Time Limit Exceeded|Memory Limit Exceeded|Output Limit Exceeded|Compile Error|Internal Error)$/.test(status)) {
        this.reset(); return null;
      }
      if (/^(Pending|Judging|Running|Submitting)(\.\.\.)?$/.test(status)) a.pending = true;
      if (status === 'Accepted' && a.pending && !this.candidate) {
        this.candidate = {slug: a.slug, observedAt: new Date(now).toISOString(), source: 'accepted-dom-owner-confirmed'};
      }
      return this.candidate;
    }
  }
  const api = {FORMAT, TTL, problemURL, validateRecords, parseExport, exportProgress, merge, Detector};
  g.MyAtlasTracker = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
