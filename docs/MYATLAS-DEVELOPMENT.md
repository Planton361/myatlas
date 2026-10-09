> Current hosting and project-source separation: [REPOSITORY-SEPARATION.md](REPOSITORY-SEPARATION.md). The original V6.6 contract below remains the immutable baseline; current builds additionally apply the navigation and external-evidence supplements.

# MyAtlas development and release integrity

Use `scripts/build-myatlas.py` to package the accepted two-tab application into `build/pages/knowledge-map/`. It reads the current Git HEAD's export evidence, resolves exact semantic IDs, reuses the accepted aggregation, and generates `progress.json` plus `runtime-manifest.json`. Repeated builds at the same HEAD are byte-identical. Every browser runtime source is tracked; npm is needed only for locked browser validation tooling.

## Focused validation

```sh
python3 -B scripts/check-myatlas-production.py
python3 -B -m unittest scripts.tests.test_course_completion scripts.tests.test_git_project_completion scripts.tests.test_myatlas_release
for test in progress-analytics universal-progress completion portfolio copy geometry-measurements; do node "tests/myatlas/$test.cjs"; done
npm ci --prefix scripts/knowledge_atlas --ignore-scripts
scripts/knowledge_atlas/node_modules/.bin/playwright install chromium
```

Serve the README's Pages-base-path preview, then run `node tests/myatlas/release.cjs` and `node tests/myatlas/geometry-browser.cjs`. `ATLAS_PREVIEW`, `ATLAS_SITE`, and `ATLAS_BROWSER_EXECUTABLE` select a different local URL, generated site folder, or installed browser. Output goes to ignored `test-results/`. No live Hyperskill request is made. Disposable completion fixtures are never inserted into real evidence.

The explicit migration guard pins the application, build sources, release manifest, and historic Knowledge/State inventories. It reconstructs the committed production projection at its embedded evidence commit; the artifact check additionally requires current HEAD. Public progress and its source commit may change after new validated exports. The static application and historical evidence remain frozen. A code/catalog migration requires a reviewed manifest change, never an unconditional PASS.

## Completion evidence

Supported exports are immediate Java project directories with valid schema2 `.hyperskill-import.json`, complete standalone build/source files, and matching SHA-256 inventory. New owner attestations require exact positive `project_id`, `status: completed`, `attested_by: owner`, and UTC `observed_at`. The stable metadata ID and completion ID must agree; conflicting exact README URLs, missing IDs, unknown catalog Projects, symlinks, incomplete exports, and conflicting duplicate statuses fail validation. The scanner preserves reviewed legacy Project113 through its exact Hyperskill URL and completion statement. A newer `revoked` status removes that Project's contribution while retaining independent evidence.

UNKNOWN requirements contribute no invented Topics; explicitly empty requirements contribute none. Requirements overlap is deduplicated globally. Related Course project counts use exact associated Project IDs, independently of Course completion.

`data/myatlas/course-completions.json` is currently an empty schema1 record collection. Future explicit Course records require exact catalog `course_id`, boolean `is_completed`, full UTC `observed_at`, `source: owner` or `hyperskill`, and a unique public-safe `evidence_id`. Missing records do not mean incomplete. Topics or Project coverage never create a Course completion record. Historical personal observations in `data/knowledge/` are unchanged.

## Publication

`MyAtlas read-only validation` and `Review Git-driven completed Project learning` retain `contents: read`. `MyAtlas Pages` builds and tests with read-only access; only its deployment job has `pages: write` and `id-token: write`. It deploys validated `main` artifacts, refuses stale main SHAs, and cancels superseded runs. Release branch runs validate without deploying. No permanent credentials or repository-writing scanner permission is required. A main push or manual dispatch regenerates the Pages artifact; no self-modifying commits occur.

The Pages artifact root contains `knowledge-map/`; the repository base path is supplied by GitHub Pages. [Official custom-workflow requirements](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [Pages REST configuration](https://docs.github.com/en/rest/pages/pages) document the supported deployment mechanism.

## Revision and provenance contract

The committed `docs/knowledge-map/progress.json` is a validated reference snapshot at the explicit source revision in `docs/releases/myatlas-v6.6.json`. It is not a claim that a generated file contains the SHA of its own Git commit; that would be circular. Its source revision, SHA-256, evidence blobs, and reconstruction are all checked.

Deployable files are generated only after establishing the final committed release HEAD, into ignored `build/pages/knowledge-map/`. The generator reads that Git revision. The builder verifies its implementation and runtime sources against Git blobs, binds the artifact to checkout HEAD and `GITHUB_SHA` when present, and records a deterministic evidence/implementation digest. The artifact guard requires current HEAD, exact source inputs, exact application inventory, and reproducible progress. Fresh rebuilds never update or recommit the tracked reference snapshot.

Advancing HEAD invalidates a previously generated deployment artifact. Build again before testing; do not alter source or HEAD while the artifact is being validated. Identical committed inputs produce byte-identical outputs. The focused stale-snapshot fixture is expected to fail current-artifact validation.

## Frozen cross-platform geometry

`src/myatlas/geometry/measure.js` contains reviewed numeric widths from the accepted macOS font environment, not font files. All three renderers and the scope worker use these exact widths for structural layout. Native system fonts paint complete labels inside unchanged card bounds. Layout/routing code and the five accepted fingerprints remain unchanged. Unknown widths fail closed; the focused measurement test covers every known scope and future learned-counter values. The browser test serializes complete geometry twice and checks full-label containment.

A catalog change requires reviewed measurement coverage and a new explicit release manifest. Ordinary completed Project exports only update progress data and use existing measurement coverage. The maintenance capture tool records widths on the accepted font environment; automatic builds reuse the committed frozen asset on every platform.

Historical compatibility assets under `prototypes/` and the old Knowledge/State helpers are retained only where historic evidence, migration tools or integrity reconstruction need them. They are not deployment inputs or alternate maintained applications. Earlier experiments and generated review imagery are available through Git history.
