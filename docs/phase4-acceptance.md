# Phase 4 acceptance and rollout handoff

Development base: MyAtlas `dc5870ebdd240f022292a8050a8600e6a661a67d`
(merged Schema-4 PR #7) and Hyperskill Projects
`5795c668c639e001fcef80c45f36794d0ca2a39b` (merged index PR #12).
Both canonical main revisions had successful CI before implementation. Work uses
a separate MyAtlas worktree; both original checkouts and every real archive stay
unchanged. There is no production activation, GitHub variable change, store write,
index publication, deployment or automatic merge.

Contract and rollout instructions:
[dynamic reader v1](contracts/hyperskill-dynamic-reader-v1.md).
The exact packaged delta is
[the disabled supplement manifest](releases/myatlas-hyperskill-index-v1.json).
The original index/archive contracts, historical manifests, Atlas sources and
learning records are unchanged.

## Executable acceptance

```sh
HYPERSKILL_EVIDENCE_ROOT=/path/to/hyperskill-projects \
  node --test tests/myatlas/index-reader.cjs
python3.12 -B scripts/validate-pages-candidate.py \
  --evidence-root /path/to/hyperskill-projects
```

The reader suite has **45 tests**. Its payloads come from the actual Phase-3
generator and independent validator, using exclusively synthetic, committed
archives in temporary Git repositories. Cases cover all existing IDs, schemas
2/3/4, Unicode/mixed-language/unknown-extension/extensionless code, binary resource
roles, known/known-empty/unknown/unmapped mapping, exact full replacement,
every Topic's unchanged independent verification state, unchanged direct/Course
observations, malformed manifests/inventories/URLs/hashes/identities, aliases,
canonical bytes, bounded anonymous HTTP, failures, cache corruption, timeout,
late cache restore, cancellation, rollback and identical immutable revisions.

The full candidate entrypoint retains every existing unit, release, source,
runtime, navigation, presentation, LeetCode and geometry check. It adds the reader
tests, six supplement reversal/tamper/baseline tests and dynamic browser checks.
The supplement is packaged only after the existing frozen browser suites have
passed, then independently reversed through **all** their release guards. This
ordering preserves existing assertions and makes the final Pages artifact fully
attested, with its production configuration still false.

Dynamic browser scenarios run in Chromium and WebKit at **1440px and 390px**.
Within the same loaded application, four consecutive valid synthetic revisions
increase completion count from **3 to 7**, learned Topics from **32 to 33**, and
keep independently verified Topics at **12**. They check safe title text, exact
source-bound code links, KNOWN/KNOWN_EMPTY/UNKNOWN/UNMAPPED labels, absence of
UNMAPPED scope options, painted Scope/Global Topic status, consistent frame and
portfolio counters, cache reload and offline last-known-good. No application build
or page reload occurs between the four data additions. Separate visits exercise
static bootstrap, cached bootstrap and all five unchanged map geometries.

Output artifacts include `pages-candidate.json`, `index-browser.json`,
`index-baseline.json`, all previous acceptance reports and four browser screenshots
under ignored `test-results/`. GitHub's existing Pages CI uploads these artifacts;
PR runs do not deploy. The final CI checks the PR candidate and the existing
production context, retaining the application's wrong-Git-revision protection.

During development, incorrect hidden-portfolio and boolean-verification fixture
assumptions were corrected: the section is now visibly opened, and nullable
verification is compared exactly against accepted analytics. The status-tile
integration was fixed to retain all original paint paths. WebKit readiness waits
for the complete snapshot and renderer worker before a test navigates away.
No errors are whitelisted, no assertions weakened and no test is retried to hide
these findings. Retired view workers and obsolete index requests have explicit
lifecycle cleanup; active worker failures keep the original handler.

## Unchanged real evidence

All **22** per-file archive hashes are checked against the unchanged
[baseline](contracts/hyperskill-baseline-v1.json). Canonical compact sorted JSON
of that exact hash mapping plus LF has SHA-256:
`6045f7b64cb92af554f575bde4a346adeadbe5f7b384d7a2ab38a09f7c1e9bf2`.

The unchanged real projection contains IDs **113, 229, 380**, **32** learned
Topics, **12** independently verified Topics and no Course completion records.
After excluding only source provenance, its complete semantic SHA-256 remains
`1a86243ba9c3581c709417281cd18498bb72b5b0bfc23a91baa6bcffa0086878`.
All five original accepted geometry fingerprints are checked without alteration;
the dynamic scenarios additionally compare exact geometry before/after updates.

## Manual rollout and Phase 5

This draft implements consumption only. The production endpoint is still not
activated. A separate reviewed rollout must first bootstrap/validate Phase 3's
immutable store and pointer, inspect the complete real payload, prove retained
history and verify anonymous CORS from the public MyAtlas origin. Then approve
a versioned activation change and one initial application deployment. No such
approval or deployment is performed here. Later archives update data only.

Remaining trust limits: unsigned HTTPS publisher and same-origin cache integrity;
the digest alone is not origin authentication. The browser structurally verifies
inventory references, while Phase 3 verifies committed file bytes/Git objects.
Unknown source ancestry cannot be ordered by SHA; publication guards, request
generations and known-revision rollback rejection provide the specified controls.
Browser storage quotas may leave only an in-memory LKG. The fixed personal map
keeps its structural membership; newly learned Topics outside it are presented
in the portfolio and existing Global Atlas.

Phase 5 may decouple project-data CI from unnecessary complete application builds.
Keep revision/store provenance, exact wire validation, atomic publication,
catalog digest binding, complete-register replacement and the static/LKG fallback.
Do not remove full release/browser/geometry gates for actual application, catalog,
analytics or supplement changes. Course/verification evidence remains independent.
