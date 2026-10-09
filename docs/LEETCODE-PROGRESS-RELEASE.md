> Repository split: current public source is `Planton361/myatlas/progress/leetcode/solved.json`. The original release inventory below is historical; the loader URL and summary source link have since been relocated. See [cutover instructions](../tools/chrome-tracker/README.md).

# Public LeetCode progress summary

Public route: <https://planton361.github.io/hyperskill-projects/leetcode-progress/>.
Read-only source: <https://raw.githubusercontent.com/Planton361/myatlas-leetcode-progress/main/solved.json>.

## Approved publication inventory

The summary is copied byte-for-byte from the foundation repository's
`prototypes/leetcode-atlas/public-progress/` at reviewed commit
`691c02146ac3bcb497c554c745c10b3f30c217f1`. Its review is
`prototypes/leetcode-atlas/PUBLIC-PROGRESS-INTEGRATION-REVIEW.md` in that repository.
The later CPU toolbar changes do not change these four approved assets.

| Production source | Generated sibling route file | SHA-256 |
| --- | --- | --- |
| `src/leetcode-progress/summary.html` | `leetcode-progress/index.html` | `ee337a3702b40cd213ed516f01c2f981ab0b8fe359c1dcd110ffcd8a6e2c506c` |
| `src/leetcode-progress/summary.css` | `leetcode-progress/summary.css` | `045a6d52145fe5d26770a5511a31d5b9fbc6ee6422dc702546883b1f6b815db5` |
| `src/leetcode-progress/summary.js` | `leetcode-progress/summary.js` | `0e382168c0f320020eaf1d006327d546bdf8088c7ac14e687286f98870896031` |
| `src/leetcode-progress/loader.js` | `leetcode-progress/loader.js` | `a121d826a624661448bc8ad89feec5ba095011f9240956a33d36eb1934ef60c2` |

`scripts/build-leetcode-progress.py` checks this exact allowlist and its reviewed
hashes, refuses uncommitted implementation/assets, and writes only
`build/pages/leetcode-progress/`. It performs no network request. Generated files
are ignored by Git. The existing Hyperskill build, guard, accepted manifest,
source assets and navigation shell remain unchanged. No LeetCode catalog,
derived catalog metadata, CPU renderer, problem descriptions, solutions,
extension, credentials or downloaded progress snapshot is packaged. The separate owner-approved CPU snapshot release is documented in
[LEETCODE-CPU-RELEASE.md](LEETCODE-CPU-RELEASE.md); this summary allowlist remains unchanged.

## Public reader behavior

The unchanged reviewed loader accepts only schema version 1, a valid update
timestamp, exact canonical ID syntax and supported owner attestation sources.
Identical duplicates count once; conflicting duplicates and unexpected fields
are rejected. IDs are displayed verbatim. Evaluation identifiers are never
translated into official numeric LeetCode IDs. Counts come from the current
source, with no hardcoded solve count or catalog denominator.

Requests are anonymous GETs with credentials omitted and no referrer. No Chrome
extension, login or token is needed. The owner's existing Chrome capture and
GitHub publisher are unchanged, including confirmation for uncertain Accepted
observations; fully automatic detection is not claimed.

The reader coalesces simultaneous requests, caches for one minute, and validates
an optional per-tab session snapshot for at most 24 hours. Refresh bypasses the
application cache; returning to a visible tab refreshes if needed. There is no
polling timer. GitHub/CDN propagation may delay a new publication. Source update
time and last successful check are displayed separately. Initial failure shows
unknown/unavailable. A failed subsequent refresh retains the last validated
count and IDs with an explicit stale message, never silently zero.

## Reproduce and validate from a committed clean checkout

```sh
python3 -B scripts/check-myatlas-production.py
python3 -B -m unittest scripts.tests.test_course_completion scripts.tests.test_git_project_completion scripts.tests.test_myatlas_release scripts.tests.test_leetcode_progress
node --test tests/leetcode-progress/loader.cjs
python3 -B scripts/build-myatlas.py
python3 -B scripts/check-myatlas-production.py --site build/pages/knowledge-map --current-head
python3 -B scripts/build-leetcode-progress.py
cp docs/.nojekyll build/pages/.nojekyll
npm ci --prefix scripts/knowledge_atlas --ignore-scripts
scripts/knowledge_atlas/node_modules/.bin/playwright install chromium webkit
mkdir -p build/preview
ln -s ../pages build/preview/hyperskill-projects
python3 -B -m http.server 8807 --bind 127.0.0.1 --directory build/preview
```

Use a fresh preview directory, or keep its existing symlink. Open
`http://127.0.0.1:8807/hyperskill-projects/leetcode-progress/` and the unchanged
`/hyperskill-projects/knowledge-map/`. In another terminal:

```sh
node tests/myatlas/release.cjs
node tests/myatlas/geometry-browser.cjs
node tests/leetcode-progress/browser.cjs
```

The workflow also retains all existing focused Hyperskill Node checks. The
summary browser test covers Chromium and WebKit, actual anonymous public
progress, 1440px/390px layouts, relative assets under the project prefix, refresh,
synthetic duplicates/undo, malformed JSON, initial offline and stale refresh,
and absence of writable or authenticated requests. `LEETCODE_CHROME=1` selects
installed Chrome locally; `LEETCODE_PREVIEW` and `PLAYWRIGHT_MODULE` allow a
different local URL/tooling location. Screenshots and JSON evidence go into
ignored `test-results/`, or `LEETCODE_ARTIFACT_DIR` outside Git.

## Release and rollback

Push the focused `release/leetcode-progress` branch first. The existing workflow
validates release branches without uploading/deploying a Pages artifact. Only
after all gates pass, update against current main and push a fast-forward-safe
reviewed change to main. Main runs the same gates before Pages deployment.
Never bypass the V6.6 guard or regenerate its accepted manifest.

After deployment, verify both unchanged MyAtlas views and the summary in fresh
visitor contexts. Compare the displayed IDs/count to the live public response;
never fabricate or modify personal progress. Retain the five existing geometry
fingerprints and frozen application hash as evidence.

If rollback is needed, revert only the focused summary release commit with a
new commit through the same validation/deployment workflow. Do not force-push,
change the V6.6 release manifest, or modify the separate progress repository.
