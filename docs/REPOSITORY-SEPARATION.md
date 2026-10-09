# Repository separation · 2026-10-09

The owner requested that Hyperskill Projects centre on runnable learning projects and approved moving MyAtlas into its own repository.

- Canonical project source and importer: `Planton361/hyperskill-projects`.
- Atlas source, catalog, evidence tooling, history and Pages application: `Planton361/myatlas`.
- Confirmed public LeetCode IDs: `myatlas/progress/leetcode/solved.json`, copied byte-for-byte from the former progress repository.
- Chrome tracker: `tools/chrome-tracker/extension/`; the existing installation is updated in place to preserve identity and local storage.

The MyAtlas history retains the already public V6.6 baseline commits, so their immutable manifests and historical evidence can still be reconstructed. Current Java exports and importer templates are removed from the MyAtlas source tree; their code is not republished by the Pages build. Conversely, the Hyperskill source tree retains project exports/import tooling and small legacy redirects, with the Atlas application/data/tests relocated here. Existing history is preserved without rewriting either repository.

## Build and provenance boundary

The original `src/myatlas`, V6.6 accepted release manifest, frozen builder, scanner, aggregator and historical evidence remain byte-identical. The existing navigation supplement also remains exact. The new public evidence adapter reads only regular committed Java export blobs from the named public repository, verifies the same standalone-export inventories and invokes the same scanner and aggregator. Both the application commit and evidence repository commit are recorded in generated progress provenance.

Final validation reconstructs the public projection from those real Git objects. It checks the exact final inventory, normalizes only the already-dynamic progress/provenance files in a disposable copy, and runs the unchanged navigation and V6.6 guards. A wrong source repository, missing ref, tampered export or unavailable checkout fails; it cannot silently deploy zero progress. No accepted manifest is regenerated, and no guard is disabled. The initial split must preserve the pre-split projection exactly except for explicit repository provenance.

Public pages move to `https://planton361.github.io/myatlas/`, with the existing sibling `knowledge-map/`, `leetcode-atlas/` and `leetcode-progress/` routes. Relative navigation and asset paths remain intact. The old project Pages site becomes redirect-only and preserves queries/hashes, including Course/Project/Stage and exact-ID bookmarks. Its project sources do not include the bulk catalog.

Hyperskill evidence needs no cross-repository write permission. The owner must replace the extension token with a fine-grained Contents read/write token restricted to MyAtlas for the new LeetCode publisher destination; visitors remain anonymous. To refresh Hyperskill project evidence after a new export, manually run the MyAtlas Pages workflow on main. The Java project's own build is independent. LeetCode public progress continues to refresh read-only in the browser.

## Release order

1. Validate and publish the independent MyAtlas Pages site first.
2. Verify its views, exact current progress and five frozen geometry fingerprints.
3. Publish the project-focused Hyperskill tree and redirect-only Pages workflow.
4. Verify the old bookmarks, then update the profile README to link to both repositories.

Use focused release branches and green CI before main publication. The project export bytes, canonical IDs, owner confirmations and production geometry must stay unchanged. Rollback uses ordinary revert commits, not force pushes or altered acceptance manifests.

## LeetCode progress cutover

See [the exact cutover checklist](../tools/chrome-tracker/README.md). The confirmed public JSON is copied without modifying IDs, sources, timestamp or schema. Browser reads and publisher writes now name only `Planton361/myatlas/progress/leetcode/solved.json`. Old session tokens are invalidated on endpoint change, while local records and pending corrections survive. The former `myatlas-leetcode-progress` repository remains until the owner verifies the first new-token Sync Now; only then may it be deleted. Do not delete it during the release or re-enable the old publisher after cutover. There is no background mirroring.
