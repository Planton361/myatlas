# MyAtlas

An interactive view of my programming learning: Hyperskill concepts and project coverage, my personal Skill Tree, and confirmed LeetCode progress.

| View | Open |
| --- | --- |
| Hyperskill Atlas · global concepts and Course / Project / Stage focus | [Atlas](https://planton361.github.io/myatlas/knowledge-map/?view=atlas) |
| Personal learning and independently verified topics | [My Skill Tree](https://planton361.github.io/myatlas/knowledge-map/?view=skill-tree) |
| LeetCode CPU floorplan with green confirmed solved cards | [LeetCode Atlas](https://planton361.github.io/myatlas/leetcode-atlas/) |
| Compact, read-only public LeetCode progress | [Progress summary](https://planton361.github.io/myatlas/leetcode-progress/) |

All three map views have a persistent navigation link to LeetCode. Visitors can use Chrome or Safari without authentication or the owner's extension.

## Projects and progress sources

My completed Hyperskill solution archives live in [Planton361/hyperskill-projects](https://github.com/Planton361/hyperskill-projects). Earlier exports are standalone; new source-only archives contain the final solution code without claiming that it builds or runs. This repository contains the visualizations, trusted catalogs, evidence tools and static Pages release; it does not duplicate the archived source.

The Pages build reads committed exports from the public project repository, validates their exact IDs and file inventories, and uses the existing accepted aggregator. The build records both the MyAtlas release SHA and the Hyperskill evidence SHA. Missing, unavailable or rejected source data stops the build and leaves the last deployed view intact. After publishing a new completed project, run **MyAtlas Pages** from this repository's Actions tab to rebuild from the latest project evidence. No cross-repository publishing token is required.

**Live progress (not a frozen README count):** [My Skill Tree](https://planton361.github.io/myatlas/knowledge-map/?view=skill-tree) reports completed Hyperskill projects, learned Topics, independently verified Topics, and Course/Project/Stage coverage from the latest validated public project evidence. These are distinct evidence-backed measures, not an assertion that a whole Course or Stage is completed. The reference catalog describes the learning landscape, not my enrolled plan. This README intentionally contains no manually maintained personal progress totals, so the fourth and later project updates require no documentation edits.

LeetCode progress is fetched dynamically from [progress/leetcode/solved.json](progress/leetcode/solved.json) in this repository. Only owner-confirmed exact Problem IDs, attestation sources and update metadata are read. Counts are not hardcoded. An unavailable first load remains explicitly unavailable; a failed refresh preserves the last validated snapshot. The owner's [Chrome extension](tools/chrome-tracker/README.md) is maintained here as a capture/publishing tool with manual confirmation when Accepted detection is uncertain. No credentials, solutions or descriptions are sent to visitors.

## LeetCode catalog boundary

The CPU view contains 3,511 identities from the already approved pinned community metadata snapshot. It is a dated partial snapshot, not a claim of today's official complete LeetCode catalog. It includes no problem statements or solutions. [Attribution and the owner-approved publication scope](docs/LEETCODE-CPU-RELEASE.md). The compact progress summary is logically independent of that metadata catalog.

## Structure

```text
src/myatlas/             Accepted Hyperskill V6.6 runtime
src/leetcode-atlas/      Accepted CPU Atlas source and snapshot
src/leetcode-progress/   Shared anonymous public progress reader and summary
scripts/                Evidence validation, build and release tooling
data/, state/           Public learning evidence and protected history
tests/                  Focused runtime, progress and geometry checks
docs/                   Release guides, immutable baselines and reviews
```

The V6.6 release manifest and canonical runtime remain unchanged. The separately pinned navigation supplement adds the LeetCode return link. Moving the repository changes hosting/provenance, not map geometry, identities, progress semantics or confirmed solves. [Repository separation](docs/REPOSITORY-SEPARATION.md).

## Build locally

From a committed checkout, with Python 3 and Node 22, and a local checkout of the public Hyperskill project repository:

```sh
python3 -B scripts/build-myatlas.py
python3 -B scripts/check-myatlas-production.py --site build/pages/knowledge-map --current-head
python3 -B scripts/build-myatlas-navigation.py
python3 -B scripts/build-myatlas-external.py --evidence-root ../hyperskill-projects
python3 -B scripts/build-myatlas-external.py --check --evidence-root ../hyperskill-projects
python3 -B scripts/build-leetcode-progress.py
python3 -B scripts/build-leetcode-atlas.py
mkdir -p build/preview
ln -s ../pages build/preview/myatlas
python3 -B -m http.server 8807 --bind 127.0.0.1 --directory build/preview
```

Open `http://127.0.0.1:8807/myatlas/knowledge-map/`. Retain an existing preview symlink when rebuilding. Use the current committed Hyperskill `main` for evidence; the reader ignores local uncommitted files. Generated files stay in ignored `build/pages/`.

[Maintenance and validation](scripts/README.md) · [Original V6.6 integrity contract](docs/MYATLAS-DEVELOPMENT.md) · [Navigation supplement](docs/LEETCODE-NAVIGATION-RELEASE.md)

Earlier `/hyperskill-projects/knowledge-map/`, `/leetcode-atlas/` and `/leetcode-progress/` bookmarks are retained through redirects in the project repository. Their query parameters and hashes continue to select the corresponding view.
