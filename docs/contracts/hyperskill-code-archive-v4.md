# Hyperskill universal code archive — contract 4.0

Status: Phase 1 reader contract. No publisher, dynamic loader or production index
is introduced here. Schema 2 and source-only schema 3 remain valid at their
existing paths; full inventories are checked against their original metadata
exceptions (README and manifest are not legacy inventory members); none of their bytes are migrated. See the immutable intake
[baseline](hyperskill-baseline-v1.json) and [Phase 2 handoff](hyperskill-phase2-handoff.md).

## Identity and layout

One archive lives at `projects/<ID>/`, where `<ID>` is the exact decimal
Hyperskill ID, without leading zeroes. IDs are JSON integers, excluding booleans,
strings, fractions and signs in directory names; the interoperable positive
range is `1..9007199254740991`. A title, language, directory nickname or source
symbol cannot identify a project. The URL is exactly
`https://hyperskill.org/projects/<ID>`, without a slash, query, fragment, alternate
host or API prefix. This asserts an owner-selected identity, not a network
check that the project exists on Hyperskill.

The directory contains only `.hyperskill-import.json`, `README.md` and selected
files below `solution/`. Solution bytes and their chosen relative paths are
preserved. No Gradle/Maven wrapper, entrypoint, language adapter, compiler,
interpreter, package manager, dependency resolution or runnable build is needed.
Academy build files are untrusted workspace inputs and never evaluated. The
reader only reads Git blobs, JSON metadata and hashes; it does not interpret
source text to infer imports, frameworks, stages, Topics or Courses.

## Exact manifest

Required fields are precisely `schema`, `mode`, `project_id`, `project_url`,
`title`, `completion`, `files`; `languages` is the sole optional top-level field.
Unknown fields and duplicate JSON object keys, including nested duplicates, fail
closed. `schema` is integer `4`; `mode` is `code-archive`. The title is a trimmed,
non-empty public string without control/format characters. Optional `languages`
is an array of distinct (case-insensitive), trimmed non-empty public strings.
It may be empty or absent. Values are descriptive; there is no language allowlist.

Illustrative manifest (hash placeholders must be replaced with actual lowercase
64-digit SHA-256 values; this is not personal completion evidence):

```json
{
  "schema": 4,
  "mode": "code-archive",
  "project_id": 900000001,
  "project_url": "https://hyperskill.org/projects/900000001",
  "title": "Illustrative owner-selected solution",
  "languages": ["kotlin", "python"],
  "completion": {
    "project_id": 900000001,
    "status": "completed",
    "attested_by": "owner",
    "confirmed_at": "2026-10-10T12:00:00Z"
  },
  "files": {
    "README.md": {"sha256": "<sha256 of README bytes>", "role": "resource"},
    "solution/program": {"sha256": "<sha256 of original bytes>", "role": "solution"}
  }
}
```

`completion` has exactly `project_id`, `status`, `attested_by`, `confirmed_at`,
and optionally `completed_at`. Its ID must equal the manifest ID. It is a
personal owner attestation, with `status: completed` and `attested_by: owner`.
Schema 4 does not currently define revocation records; contradictory legacy
completed/revoked evidence rejects the revision for review.

Both timestamps use calendar-valid UTC `YYYY-MM-DDTHH:MM:SS[.ffffff]Z` (one to
six optional fractional digits). Offsets, local dates, invalid calendar values
and null are refused. `confirmed_at` is the instant the owner actually confirms
completion. It is not the historical completion date. `completed_at` is included
only if the owner knows the actual completion instant, and cannot follow the
confirmation. Never infer it from file mtimes, Git dates, stages, current time
or an import date. Omit it when unknown; do not use null or copy the confirmation
by default. Schema-2/3 `observed_at` retains its existing historical semantics;
the reader does not rewrite or reinterpret those stored attestations. Schema 4
maps confirmation to the accepted projection's `observed_at` observation field.
The reader checks form and consistency; it cannot independently prove an owner's
statement or discover undisclosed private information.

## Full inventory and safe selection

`files` is a non-empty object mapping exact relative POSIX paths to precisely
`{sha256, role}`. Roles are `solution` or `resource`. At least one file must be
explicitly selected as `solution`. `README.md` must be inventoried as `resource`.
Every regular archive file except the manifest itself is inventoried, with no
missing or additional members. The manifest cannot hash itself; the committed
reader's provenance includes its Git blob ID and SHA-256 as well as hashes of
all other archive blobs. Changing the README also invalidates its inventory.
Hashes are lowercase SHA-256 of raw bytes, without newline or encoding changes.

Solution files must be UTF-8 text without binary control characters (tab, CR and
LF are permitted). Selection and the explicit role determine code status, not
suffix. An unknown suffix or no suffix is accepted. Invalid/non-runnable syntax
is accepted without execution. Resources can be text or binary only when
explicitly inventoried as `resource`; resource bytes never become solution code
or Topic evidence. No automatic binary-as-code fallback is allowed.

Paths are NFC Unicode, canonical and confined below `solution/`, with the sole
root-file exception `README.md`. Reject absolute paths, traversal, repeated
separators, dot components, backslashes, control/format characters, colons,
Windows-forbidden characters, trailing dots/spaces and Windows reserved device
names. Reject case-folding aliases of files or any parent directories. Reject
hidden components, dependency/cache output components (`node_modules`,
`__pycache__`, `venv`, `env`, `target`, `dist`) and private-looking components:
`.env*`, `id_rsa`, `id_ed25519`, `.pem`/`.key` suffixes and separated words such
as secret, credential, private, password or token. Symlinks at any level,
submodules and non-regular files are rejected before materializing committed
exports or reading solution bytes.

Known private-key, GitHub-token, AWS-access-key and quoted credential-assignment
patterns are refused in code, resources, README and manifest metadata; error
messages withhold matched contents. This is a conservative heuristic, not a
proof that arbitrary bytes contain no personal data or secrets. The Phase 2
publisher must select only the owner's intended final source/resources and
require exact file/diff review; it must refuse ambiguous ownership or selection,
private content, secrets and unsupported inputs, rather than guessing or silently
falling back. Source/resource files are never selected by Topic keywords.

Duplicate identities across schemas count once. Compatible repeated completed
attestations retain the latest observation, with a deterministic source-path tie
break. Completed/revoked contradictions reject the whole revision; direct review
scan output excludes the conflicting identity as well. The Phase 2 publisher
must prevent new duplicate IDs rather than intentionally replacing old archives.

## MyAtlas read boundary

`external_inputs` extracts only regular committed blobs from the exact requested
Git revision of `Planton361/hyperskill-projects`. Uncommitted files do not count.
A missing manifest, invalid export or inaccessible revision fails the read;
existing evidence is not replaced with an empty successful result.

The scanner's `projects` list contains only IDs in the trusted Atlas scope
catalog. Topic requirements come exclusively from that catalog. `UNKNOWN`
requirements and known empty requirements add no Topics. A valid ID outside
that catalog is `UNMAPPED` with `topic_ids: []`; it does not add a scope node.
Neither source code, README, language, title nor archive manifest can supply
Topic IDs, independent verification or Course completion.

When schema 4 or an unmapped completion is present, an additive
`completion_register` is emitted (schema 1): `projects` is the sorted, deduplicated
universal list; `completed_project_ids` and `completed_project_count` describe
that list; `unmapped_project_ids` is its subset without catalog membership.
Rows retain attestation, source, method, catalog requirement state and Topic IDs;
schema-4 rows also retain title, URL, languages, `confirmed_at` and the optional
actual `completed_at`. The external serializer explicitly checks this register
against the catalog-bound list before calling the accepted serializer.

Existing projection `projects`, top-level `completed_project_ids/count`,
`portfolio`, coverage and Course relationships remain catalog-bound for the
frozen application. Universal totals are in `completion_register`, **not the sum
of the two lists**. The register contains the known projects too. Legacy-only
projections keep their existing shape. Register-only changes are semantic
changes and expose `newly_registered_project_ids`/`removed_registered_project_ids`
in the differential summary, without inventing impacted catalog scopes.

The accepted `completion_projection.cjs`, `progress-analytics.js`, runtime,
catalog, geometry, historic observations and release manifests remain unchanged.
The new external serializer delegates all Topic learning, verification, scope
coverage and Course semantics to that accepted implementation. No second
progress aggregator is introduced. Displaying unmapped rows in the production
UI belongs to the later reviewed dynamic-index integration.
