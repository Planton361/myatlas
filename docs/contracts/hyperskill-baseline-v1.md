# Phase 0 intake and invariant reference

Both local checkouts were on `main`, with clean tracked and untracked working
trees at intake. Fetch confirmed MyAtlas
`7fff57c49718c5fa6d3882a2d0e2ed05661867e7` and hyperskill-projects
`100b161fb7851ca3edbc8d73163b9e5a814a2806` as canonical `origin/main`.
Work is isolated at `/private/tmp/myatlas-universal-reader`; neither original
checkout is switched or rewritten. The archive repository is read-only.

The [machine-readable baseline](hyperskill-baseline-v1.json) records all **22**
versioned archive-file SHA-256 hashes (including every README and manifest),
trusted input hashes, exact external semantic projection digest, independent
verification IDs and all five accepted geometry fingerprints.

| ID | Format/path | Completion evidence | Catalog requirements |
| --- | --- | --- | --- |
| 113 | schema 2, `java/Simple Chat Bot with Java` | Exact reviewed README statement/URL; existing legacy observation `2026-10-08T00:00:00Z` | Trusted known requirements |
| 380 | schema 2, `java/My First Project with Java` | Owner manifest observation `2026-10-09T21:19:23Z` | Trusted known requirements |
| 229 | schema 3, `java/Zookeeper with Java` | Owner manifest observation `2026-10-10T11:45:17Z` | `UNKNOWN`, no inferred Topics |

The canonical external projection is [113, 229, 380], 3106 eligible Topics,
32 effectively learned and 12 independently verified. Verification IDs are
15, 25, 31, 32, 36, 87, 88, 148, 152, 259, 571 and 1761.
Course completion records are empty; no Course completion is derived from these
projects. The committed `docs/knowledge-map/progress.json` remains a separate,
older immutable reference snapshot, identified by the existing V6.6 release
manifest's source commit and projection digest. It is not overwritten with the
latest external projection, nor described as a live deployment observation.

## Existing contracts and workflows inspected

- `git_completion.py` reads trusted committed catalog/scope/course records and
  historical project evidence; `external_completion.py` substitutes validated
  canonical project-repository evidence and binds exact revision/blob/hash
  provenance. Working-tree solution edits are not progress.
- `project_completion.py` retains frozen historical schema-2 semantics.
  `external_export_scan.py` is the current external schema-2/3 boundary.
  `completion_projection.cjs` and accepted `progress-analytics.js` own learning,
  verification, exact-ID deduplication, scope coverage and Course associations.
- The versioned scope index defines Project, Stage and Course requirements using
  semantic IDs and `KNOWN`, `KNOWN_EMPTY` or `UNKNOWN` states. The catalog owns
  Topics, Categories, memberships and historical independently sourced progress.
  Unknown requirements do not become known through source/README text. Course
  associations use exact IDs and remain distinct from explicit Course completion
  records (`course_completion.py`). The frozen analytics' portfolio lookup can
  reject catalog-absent project IDs, motivating the separate register.
- In hyperskill-projects, the existing owner publisher/importer, `source_adapters.py`
  and `export_metadata.py` implement source-only Java/Python selection and owner
  review; `validate-project-exports.py` validates archives without execution.
  No publisher or importer is modified in Phase 1.
- Archive CI: `owner-publish-check.yml` tests temporary publisher/importer fixtures;
  `projects.yml` checks committed archives; `project-atlas-acceptance.yml` runs
  committed/Java/Python/UNKNOWN/growth compatibility against pinned or canonical
  MyAtlas. `pages-redirects.yml` serves old URL redirects only.
- MyAtlas `knowledge-atlas-check.yml` is read-only focused validation.
  `myatlas-pages.yml` reads canonical project main (daily/manual/PR/main),
  `project_sync.py` compares exact revisions and fails closed, builds isolated
  external progress, and runs `validate-pages-candidate.py`. Its deployment job
  is main-only. This Auftrag creates only a feature-branch draft PR.
- `external_release.py`, navigation/presentation supplements and V6.6/historic
  guards verify provenance and immutable runtime/evidence inventories. The
  existing frozen geometry measurement contract plus browser suites verify all
  five fingerprints. Those guards and release manifests are not relaxed.

No productive dynamic project index exists in this baseline. The future index
contract is documented separately; no deployment or full-build replacement is
implemented here. Final validation results and the review commit are recorded in
the draft PR; machine hashes in this document bind the original intake reference.
