/* Session-only projection. Does not forge Git evidence or alter the base ledger. */
(function(g) {
  'use strict';
  function project(index, base, value) {
    const records = MyAtlasTracker.parseExport(value, new Set(index.problems.keys()));
    const byProblem = new Map([...base.byProblem].map(([id, row]) => [id, {...row, evidence: [...row.evidence]}]));
    for (const record of records) {
      const row = byProblem.get(record.problemId);
      row.state = 'solved'; row.trackerSource = record.source; row.observedAt = record.observedAt;
      // Observation time is not a claim about when the problem was first solved.
    }
    const solvedIds = new Set([...byProblem].filter(([, row]) => row.state === 'solved').map(([id]) => id));
    const attemptedIds = new Set([...base.attemptedIds].filter(id => !solvedIds.has(id)));
    const coverage = new Map([...base.coverage].map(([id, row]) => [id, {
      primary: new Set(row.primary), members: new Set(row.members),
      solved: new Set([...row.members].filter(id => solvedIds.has(id)))
    }]));
    return {...base, byProblem, solvedIds, attemptedIds, coverage, uniqueSolved: solvedIds.size, uniqueAttempted: attemptedIds.size};
  }
  g.MyAtlasTrackerAdapter = {project};
  if (typeof module !== 'undefined') module.exports = {project};
})(globalThis);
