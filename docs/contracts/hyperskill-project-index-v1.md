# Validated project index — planned contract 1.0

Status: design contract for a later phase. No index is published and no production
page or loader is switched in Phase 1. The existing static release is unchanged.

## Immutable payload

One schema-1 JSON payload has exact fields `schema: 1`,
`kind: hyperskill-project-index`, `repository: Planton361/hyperskill-projects`,
`revision` (full 40-character lowercase Git commit SHA), `validator` (version and
immutable implementation revision), and `projects` (sorted by exact project ID).
No publication clock is needed in this deterministic immutable payload.
Each project has:

- `project_id`, `project_url`, `title`, optional descriptive `languages`;
- `archive_schema` (2, 3 or 4), `archive_path`, and `manifest` with `path`,
  `git_blob` and `sha256` (for reviewed Project 113, identify README attestation too);
- `completion` with its original schema/timestamp semantics. Schema 4 preserves
  confirmation and optional actual completion separately; old observations are
  never backfilled with an invented actual date;
- `files`, containing **every** committed archive blob including README and
  manifest: exact `path`, `git_blob`, `sha256`, `role` (`solution`, `resource` or
  `metadata`) and `code_url` for solution members;
- `evidence_id: hyperskill:<ID>` as the stable counting/deduplication identity.

The index validates the entire revision first. Existing schemas keep their own
archive validators and paths; schema 4 uses the universal contract. Index URLs
are derived from the allowlisted repository, exact revision and percent-encoded
path segments: `https://github.com/Planton361/hyperskill-projects/blob/<revision>/<path>`.
Never accept arbitrary link hosts, branch-only links, executable URLs or
unvalidated manifest-provided URLs. Preserve existing legacy identity 113 from
its reviewed statement, rather than inferring it from a project title. Fail the
whole candidate on duplicate/conflicting IDs or incomplete inventory.

Do not embed learned, verified, Course-completed or source-inferred Topic claims
in the archive index. The owner completion is the only archive progress claim.
MyAtlas maps exact IDs against its own trusted versioned catalog at read time.
Its derived mapping is `KNOWN`, `KNOWN_EMPTY`, `UNKNOWN` or `UNMAPPED`, with the
catalog commit/digest and trusted requirement Topic IDs. An absent ID stays in
the universal completion register with no catalog node or Topic contribution.
A later catalog revision may supply a reviewed mapping; it cannot alter history.
Independent verification and Course records remain separate trusted sources.

## Publication and consumption

After merge in the archive repository, a read-only validator reads the pinned
merged commit and emits a deterministic payload. Validate and stage a complete
immutable payload at a revision-specific URL before switching a small schema-1
`current` pointer containing `repository`, `revision`, `index_url`, and
`index_sha256`. Publish the pointer atomically **after** the immutable payload is
available; prevent an older concurrent job from overwriting a newer main pointer.
The pointer/payload must agree on exact revision. Never mutate a published
revision's index. CI should publish through the existing hosting workflow;
Phase 2 does not build a second publisher or automatically merge archives.

A later MyAtlas data loader fetches the trusted pointer and digest-bound payload
without a complete app build, validates schema, bounds, canonical identities,
full inventories and URLs, then installs one complete snapshot atomically. It
records the index revision, SHA-256 and local catalog mapping digest for review.
Digest pinning checks consistency, not authenticity by itself: trust comes from
the allowlisted HTTPS publication source and its validated CI artifact chain.
Checking raw blobs when needed remains possible through the recorded hashes/IDs.

Unavailable, truncated, malformed, stale/mismatched or unsupported input retains
the last-known-good validated snapshot. Never reset completions to zero on a
network/validation error, install a partially valid payload or silently invent
an empty source. On first load without a valid cached index, retain the existing
validated static snapshot. Expose source revision and update status without
claiming unsupported progress.

The complete index snapshot replaces the prior external-project evidence as a
single source. Merge legacy static and new indexed evidence by exact
`hyperskill:<ID>` identity with deterministic compatibility/conflict rules;
never add their counts. Do not deduplicate by title/language or Topic ID. Topic
union, independent verification and Course completion continue through the
accepted analytics, with only mapped project rows supplied to it. The universal
register counts all validated completions once and remains separate from the
catalog-bound portfolio and geometry.

Later index/loader work must test atomic revisions, malformed/stale pointers,
network failure, first-load fallback, legacy/new overlaps, catalog mapping
changes and immutable blob links. This contract specifies those responsibilities;
it does not claim that a production index or dynamic loader already exists.
