# Phase 2 handoff: generalize the existing owner publisher

Inputs: canonical `hyperskill-projects/main` at intake
`100b161fb7851ca3edbc8d73163b9e5a814a2806`, and the reviewed/merged MyAtlas Phase 1
reader commit. Recheck current canonical main before starting. The immutable
[baseline](hyperskill-baseline-v1.json) binds every versioned file of Projects
113, 380 and 229. Preserve all of them byte-for-byte. Do not publish another real
completion as part of implementation or tests.

Implement [archive contract 4.0](hyperskill-code-archive-v4.md) **inside the existing**
`scripts/publish-hyperskill-project` / importer workflow. Replace language-based
admission with safely selected owner UTF-8 source, explicit resources and role
inventory; preserve chosen relative paths under `solution/`. Language detection
is optional metadata. Ambiguous final source/identity or ownership requires exact
owner input; do not guess from titles, code, extensions or historic file dates.

The review must show exact Hyperskill ID/URL/title, every source/resource path and
SHA-256, omitted/unsafe candidates, and the exact proposed diff. Require personal
completion confirmation and record its UTC instant as `confirmed_at`. Ask for an
actual historical completion instant only if known; otherwise omit `completed_at`.
Do not carry the former required `--completed-at` behavior into confirmation-time
semantics. Preserve owner final publication review, canonical-main isolation,
new branch and draft PR. No merge, force-push, build execution, package installs,
Academy build parsing, workspace writes, Gradle/Maven exceptions or archive
migration. Reject duplicate IDs across all old/new formats before publication.

Add universal validation to the existing archive validator and repository CI.
Use only temporary, versioned synthetic archives: Java/Python/Kotlin/multilanguage,
unknown/no extensions, explicit binary resources, malformed IDs/paths/hashes,
private contents, symlinks, duplicate identities and conflicting confirmations.
No source execution is a permitted acceptance prerequisite.

Cross-repository CI must pin the reviewed MyAtlas Phase 1 compatibility commit
until it is on MyAtlas main, then use canonical main. Exercise its scanner and
full isolated Pages acceptance, verify the separate completion register for a
catalog-absent ID, unchanged catalog Topics/verification/Course records and all
five accepted geometry fingerprints. Never pass unmapped IDs into the accepted
catalog-only runtime. The production UI will display unmapped completions only
when the later dynamic-index integration is separately reviewed.

The [planned index contract 1.0](hyperskill-project-index-v1.md) is the next data
boundary. Phase 2 publisher output must provide identity, attestation and complete
inventories needed by that contract. Creating a production index/loader or changing
Pages publication remains separate work, unless a later Auftrag explicitly
includes it. Stop before merge and report exact commit, draft PR, tests and
baseline hash comparison.
