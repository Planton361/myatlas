# MyAtlas maintenance

The standalone Hyperskill export importer and Java builds are maintained in [hyperskill-projects](https://github.com/Planton361/hyperskill-projects/tree/main/scripts). MyAtlas reads those committed public exports; it never changes them.

## Build order

Use the sequence in the [repository README](../README.md). The frozen V6.6 builder and guard run first, then the exact navigation supplement, then the external project evidence adapter. Finally, package the independent LeetCode summary and CPU routes. All inputs must match committed Git blobs.

`sync-hyperskill-projects.py --evidence-root PATH` prints a read-only review artifact with both repository SHAs. `build-myatlas-external.py --check --evidence-root PATH` reconstructs that projection and reruns every original static runtime/evidence guard in a disposable copy. The accepted aggregator is unchanged. Unknown project requirements never invent topics, and Project completion never implies independent verification or Course completion.

## Validation and publication

The **MyAtlas Pages** workflow validates `release/**` branches without deploying. Successful `main` builds deploy to `/myatlas/`. It checks the project repository out read-only, pins the observed commit in the artifact, verifies all five Hyperskill geometry fingerprints, and runs the existing Chrome/Chromium and WebKit checks. Only the deployment job receives Pages write permission. Visitors receive no GitHub token.

The retained `sync-project-completion.py` and historical fixtures still reproduce the original V6.6 acceptance snapshot. They are the baseline integrity gate; current project progress uses the external reader. The old project-importer documentation remains in the project repository.

After a new completed export is published in Hyperskill Projects, use Actions → MyAtlas Pages → Run workflow → main to refresh the build. LeetCode progress refreshes directly from its separate public source in the visitor's browser and does not require this build.
