# Dynamic reader supplement 1

This implements the existing index contract, not a new wire format. Production
activation is **disabled** in the pinned `hyperskill-index-v1` release manifest
and configuration. There is no URL, environment or local-storage activation
switch. A merge alone must not enable dynamic public evidence. Phase 3's GitHub
variables `PROJECT_INDEX_ENABLED` and `PROJECT_INDEX_BOOTSTRAP` remain untouched.

## Trust and exact bytes

The anonymous HTTPS pointer is fixed to
`https://planton361.github.io/hyperskill-projects/portfolio/current.json`.
Its exact five fields are `schema`, `repository`, `revision`, `index_url` and
`index_sha256`. `revision` is the **source** commit. The only accepted payload
URL is `https://raw.githubusercontent.com/Planton361/hyperskill-projects/`
`<STORE_SHA>/portfolio/revisions/<SOURCE_SHA>/index.json`. The store commit is
separate from source and validator implementation commits; no branch names,
foreign hosts, credentials, query strings, fragments or redirects are accepted.

Both downloads use omitted credentials, no referrer, rejected redirects,
no-store and a ten-second total deadline. Streaming limits are 4 KiB pointer,
16 MiB index, 10,000 projects, 10,000 files per project and 100,000 files total.
These are documented client resource bounds, not changes to the archive schema.
UTF-8 decoding is fatal; byte-equivalent canonical compact sorted JSON plus LF
is required. Web Crypto computes SHA-256 over the entire payload. Field sets,
identities, exact safe positive integers, sorted unique IDs/paths, inventories,
roles, Git-blob and content-hash syntax, manifest/README references, path aliases,
timestamps and revision-bound percent-encoded code URLs are checked independently.
Legacy Project 113's README reference is nested at `manifest.attestation`, as
implemented and validated by Phase 3. Descriptive languages have no allowlist.
No archive contents or instructions are fetched or executed.

SHA-256 establishes consistency with the pointer, not authenticity. Authenticity
depends on the fixed HTTPS publication origin and Phase 3's validated immutable
store/publication chain. The browser checks inventory structure and references;
Phase 3 checks actual committed blobs and content hashes. An internally consistent
forged pointer plus payload from a compromised trusted origin cannot be detected
by this unsigned contract. The same limitation applies to malicious same-origin
code/local-storage access. Cached bytes are fully revalidated, but the cache is
not a separate cryptographic proof of publication.

## One state and one aggregator

The shell owns the validated snapshot, source/store revisions, digest and status.
It binds the trusted catalog and scope-index SHA-256 values and the application's
source revision to the derived snapshot. Indexed evidence replaces the complete
static external register; counts are never summed. `hyperskill:<ID>` is the only
completion identity. Titles, languages, source-code words and Topic claims cannot
add catalog membership or evidence.

Only exact catalog IDs enter the unchanged `ProgressAnalytics.create` function.
All IDs remain in the existing separate universal register. KNOWN requirements
use explicit trusted catalog Topics; known empty requirements display KNOWN_EMPTY;
UNKNOWN and UNMAPPED contribute none. Independent Topic verification, direct
learning observations and Course completion records retain their accepted source
and semantics. Portfolio rows and total project counts use the universal register;
Course project coverage continues to mean its explicit catalog association.

The additive presentation updates existing models' learned flags, accepted
analytics methods and counters without rerunning layout or changing membership.
Newly learned Topics outside the fixed personal map appear in the portfolio's
Topic list and the existing Global Atlas. Scope options remain catalog-bound;
UNMAPPED projects appear only in the portfolio. Project titles are DOM text nodes.
Code links are already validated, commit-bound, and use `noopener noreferrer`.

The exact versioned supplement attests every source and packaged asset. Its
verifier reverses only the pinned additions in a disposable copy, then invokes
all unchanged presentation, external-evidence, navigation and historical V6.6
release gates. No frozen runtime asset or historical manifest is edited.

## Last-known-good and refresh

Only a completely validated and catalog-projected snapshot is installed. On
failure the same previous snapshot remains, with `stale`; before any valid
dynamic snapshot the accepted build's static external evidence remains, with
`unavailable`. Successful data is `current`. The portfolio reports the source
revision and a factual update notice. No failure resets counts to zero.

The optional local-storage cache contains canonical pointer/payload texts and a
cache schema. It is fully revalidated and reprojected against the current trusted
catalog before use. Corruption, storage denial or quota exhaustion leaves the
static or memory snapshot intact. Cache restore cannot overtake a newer request.
Fetches are coalesced; a generation token prevents canceled/timed-out older
responses from replacing newer state. Previously accepted revisions cannot roll
back within the current reader session, and a source revision cannot change its
payload digest. Git SHAs have no chronological ordering: unseen ancestry cannot
be inferred from this contract. Phase 3's publication guards enforce canonical
main ancestry; the browser rejects out-of-order local operations, not an invented
SHA ordering.

At page visit the reader restores then refreshes. Visible pages refresh every
five minutes, and returning to a page can refresh after sixty seconds. A manual
Refresh button is available. The entire current index is the update unit. No
MyAtlas application build or navigation reload is needed to install new data.

## Acceptance and rollout

Run the complete candidate acceptance with Python 3.12:

```sh
python3.12 -B scripts/validate-pages-candidate.py --evidence-root /path/to/hyperskill-projects
```

The test harness uses Phase 3's actual producer and independent validator with
synthetic archives in disposable Git repositories. Chromium and WebKit each
exercise desktop and mobile views against locally fulfilled HTTP responses at
the allowlisted URLs. Only the isolated test response enables the configuration;
packaged bytes remain disabled and attested. Existing release/browser suites run
before supplement packaging, followed by its reversal/tamper/baseline tests and
dynamic browser tests. No production network publication or deployment occurs.

Rollout requires a separate reviewed change: first approve Phase 3's immutable
store bootstrap and inspect the real pointer/payload, history retention and
digest; then verify anonymous cross-origin CORS access in both browser engines.
Only afterward review a MyAtlas activation manifest/configuration update and
one initial application release. This PR neither enables nor performs that
release. Subsequent project changes need index publication and data refresh only.
For rollback, review a disabled activation release; cache failures already retain
the accepted static or last-valid snapshot. Do not reset the index store or
replace a damaged pointer automatically.

## Phase 5 handoff

The full application acceptance remains mandatory and unchanged in strength.
Phase 5 may separate project-data validation from application/browser builds:
the producer must continue validating exact source revisions, immutable payloads,
store ancestry and pointer publication; this reader's wire/aggregation fixtures
must stay compatible. Application, catalog, supplement, analytics or geometry
changes still require complete release/browser checks. Use the source/store and
catalog digests in diagnostics. Preserve static fallback, universal-register
replacement, all baseline verification/Course records and manual rollout gates.
Do not introduce a second aggregator or require a MyAtlas build for each project.
