# Repository separation · 2026-10-09

The owner requested that Hyperskill Projects centre on runnable learning projects and approved moving MyAtlas into its own repository.

- Canonical project source and importer: `Planton361/hyperskill-projects`.
- Atlas source, catalog, evidence tooling, history and Pages application: `Planton361/myatlas`.
- Confirmed public LeetCode IDs: `Planton361/myatlas-leetcode-progress`; unchanged.
- Chrome tracker: the existing LeetCode foundation workspace; unchanged.

The MyAtlas history retains the already public V6.6 baseline commits, so their immutable manifests and historical evidence can still be reconstructed. Current Java exports and importer templates are removed from the MyAtlas source tree; their code is not republished by the Pages build. Conversely, the Hyperskill source tree retains project exports/import tooling and small legacy redirects, with the Atlas application/data/tests relocated here. Existing history is preserved without rewriting either repository.

## Build and provenance boundary

The original `src/myatlas`, V6.6 accepted release manifest, frozen builder, scanner, aggregator and historical evidence remain byte-identical. The existing navigation supplement also remains exact. The new public evidence adapter reads only regular committed Java export blobs from the named public repository, verifies the same standalone-export inventories and invokes the same scanner and aggregator. Both the application commit and evidence repository commit are recorded in generated progress provenance.

Final validation reconstructs the public projection from those real Git objects. It checks the exact final inventory, normalizes only the already-dynamic progress/provenance files in a disposable copy, and runs the unchanged navigation and V6.6 guards. A wrong source repository, missing ref, tampered export or unavailable checkout fails; it cannot silently deploy zero progress. No accepted manifest is regenerated, and no guard is disabled. The initial split must preserve the pre-split projection exactly except for explicit repository provenance.

Public pages move to `https://planton361.github.io/myatlas/`, with the existing sibling `knowledge-map/`, `leetcode-atlas/` and `leetcode-progress/` routes. Relative navigation and asset paths remain intact. The old project Pages site becomes redirect-only and preserves queries/hashes, including Course/Project/Stage and exact-ID bookmarks. Its project sources do not include the bulk catalog.

No new token or cross-repository write permission is introduced. To refresh Hyperskill project evidence after a new export, manually run the MyAtlas Pages workflow on main. The Java project's own build is independent. LeetCode public progress continues to refresh read-only in the browser.

## Release order

1. Validate and publish the independent MyAtlas Pages site first.
2. Verify its views, exact current progress and five frozen geometry fingerprints.
3. Publish the project-focused Hyperskill tree and redirect-only Pages workflow.
4. Verify the old bookmarks, then update the profile README to link to both repositories.

Use focused release branches and green CI before main publication. The project export bytes, canonical IDs, owner confirmations and production geometry must stay unchanged. Rollback uses ordinary revert commits, not force pushes or altered acceptance manifests.
