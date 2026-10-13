# Compact Hyperskill portfolio presentation v2

This release replaces only the packaged `hyperskill-index/portfolio.js` and
`portfolio.css`, through the exact SHA-256-pinned manifest
`docs/releases/myatlas-hyperskill-portfolio-v2.json`. It adds its own
`hyperskill_portfolio_release` runtime attestation. All historical manifests,
activation configuration, catalog/analytics, reader, projection and frame
supplements retain their original bytes and checks. Complete release reversal
still reaches every existing V6.6/presentation/geometry guard.

The shell header contains one closed native details control, “Meine Projekte · N”.
Its accessible dropdown lists title, optional descriptive languages and the
existing revision-bound code link with `noopener noreferrer`. Titles use text
nodes. Escape closes and restores focus; outside clicks close. On small screens
the header uses two compact rows, retaining all three navigation links and the
project control without overlap. The dropdown overlays the map; it never changes
catalog membership, map coordinates or packing.

Every displayed row and count derives from the existing reader snapshot.
There is no second project store. Subscription, cached validation, visibility
refresh, five-minute polling, cancellation and progress projection are unchanged,
including while the dropdown is closed. IDs/mapping/revision remain DOM data
attributes for regression diagnostics; technical statuses, source SHAs and Topic
ID lists are absent from ordinary presentation. Topic/verification/Course counts
remain in the existing progress UI.

A human-readable fallback/last-known-good notice is visible even with a closed
portfolio when updates fail. Opening the dropdown places the same notice inside
it; successful validation hides it. Initialization failure retains the static
application and shows a readable notice without exposing exception details.

The existing Chromium/WebKit desktop/mobile index-browser suite now also checks
header placement, safe simple rows, viewport bounds/non-overlap, unchanged
geometry, Escape/focus and polling with a closed dropdown. Its complete previous
reader/cache/identity/Topic/verification/Course and data-only growth assertions
remain. Release tests additionally reject forged presentation provenance and
modified JS/CSS even after a matching inventory rewrite.
