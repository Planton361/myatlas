# MyAtlas maintenance

The standalone Hyperskill export importer and Java builds are maintained in [hyperskill-projects](https://github.com/Planton361/hyperskill-projects/tree/main/scripts). MyAtlas reads those committed public exports; it never changes them.

## Build order

Use the sequence in the [repository README](../README.md). The frozen V6.6 builder and guard run first, then the exact navigation supplement, then the external project evidence adapter. Finally, package the independent LeetCode summary and CPU routes. All inputs must match committed Git blobs.

`sync-hyperskill-projects.py --evidence-root PATH` prints a read-only review artifact with both repository SHAs. `build-myatlas-external.py --check --evidence-root PATH` reconstructs that projection and reruns every original static runtime/evidence guard in a disposable copy. The accepted aggregator is unchanged. Unknown project requirements never invent topics, and Project completion never implies independent verification or Course completion.

## Validation and publication

The **MyAtlas Pages** workflow validates `release/**` branches without deploying. Successful `main` builds deploy to `/myatlas/`. It checks the project repository out read-only, pins the observed commit in the artifact, verifies all five Hyperskill geometry fingerprints, and runs the existing Chrome/Chromium and WebKit checks. Only the deployment job receives Pages write permission. Visitors receive no GitHub token.

The retained `sync-project-completion.py` and historical fixtures still reproduce the original V6.6 acceptance snapshot. They are the baseline integrity gate; current project progress uses the external reader. The old project-importer documentation remains in the project repository.

After a new completed export is published in Hyperskill Projects, use Actions → MyAtlas Pages → Run workflow → main to refresh the build. LeetCode progress refreshes directly from its separate public source in the visitor's browser and does not require this build.

## Daily project progress check

The Pages workflow retains main/release pushes and manual `workflow_dispatch`.
Pushes limited to `progress/leetcode/**` remain ignored. A new
`schedule: [{cron: "23 5 * * *"}]` requests a daily run at **05:23 UTC**. GitHub
runs scheduled workflows from the default branch and may delay them; this is a
check cadence, not an exact-time guarantee ([GitHub scheduling documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)).
The update must be reviewed and merged into MyAtlas **main** before it activates.

A read-only preflight checks out `Planton361/hyperskill-projects` **main**, then runs
the existing committed export scanner and exact progress projection. It records the
observed project commit and MyAtlas application commit. Invalid exports fail this
job and prevent build/deploy; there is no empty-progress fallback. Java code never
provides Topic IDs, and Project, Course, Stage, learned and independently verified
Topic semantics retain their existing separate contracts.

For scheduled runs only, `check-project-sync.py` anonymously reads the deployed
`knowledge-map/runtime-manifest.json` and its hash-bound `progress.json`. These
artifacts were produced by the successful validated deployment. It skips the costly
build/deployment only if **both exact revisions** match the current checkout and
project-source commit, with an anonymous reference read also confirming current
MyAtlas main. If main advanced while the check was queued, it cannot skip. Missing/invalid JSON, malformed or absent revisions, wrong
source repository, network failures, mixed cached artifacts or mismatched projection
provenance all select the full validated build. An application commit change alone
also selects a build. This deliberately conservative comparison treats any new
MyAtlas HEAD (including a progress-only commit) as a new application revision;
progress-only pushes still avoid an immediate rebuild for each solve.

Push and manual runs always use the existing full validated build and a fresh
project **main** checkout. The build pins the revision actually observed there;
if main advances during the workflow, the existing outdated-main deployment guard
still rejects an obsolete MyAtlas artifact. Release branches validate without
Pages deployment. Scheduled main runs may deploy only after all existing frozen
runtime, evidence, navigation, geometry, LeetCode and browser gates pass. No new
PAT, cross-repository write permission or automatic project publication is used.
Only the existing deploy job retains `pages: write` / `id-token: write`.

```bash
python3 -B -m unittest scripts.tests.test_project_sync scripts.tests.test_external_completion \
  scripts.tests.test_myatlas_release scripts.tests.test_git_project_completion scripts.tests.test_course_completion
```

These tests use disposable committed exports and mocked deployed responses. They
cover unchanged/new evidence, changed application revisions, push/manual freshness,
unavailable/invalid provenance, rejection before comparison, and preservation of
all existing workflow gates. Browser release/geometry checks run on a local build,
never the production site.

Rollback: remove only the new schedule to stop daily checks while retaining push
and manual triggers. To restore the prior workflow completely, revert the reviewed
scheduler commit through a normal owner-reviewed PR. Leave progress/evidence,
LeetCode, tracker, frozen runtime, links and deployment artifacts intact. If new
evidence fails validation, repair the project export in its own repository through
review; the last successful Pages deployment stays live. No production deployment
has been performed while preparing this change.
