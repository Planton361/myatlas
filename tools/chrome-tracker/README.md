# MyAtlas owner Chrome tracker

The existing tracker now publishes only to `Planton361/myatlas`, branch `main`, file `progress/leetcode/solved.json`. The public Atlas uses the same file anonymously. Accepted observations still require owner confirmation; manual Mark Solved, duplicate prevention, Undo, Sync Now and JSON backup/import are retained. No solution code, statements or authentication data is collected by content scripts or sent to MyAtlas visitors.

## Preserve the existing installation

1. In the existing popup, **Export progress JSON** to a private backup outside Git, then **Disable publisher / forget token**. Do not uninstall.
2. Copy these four files from `tools/chrome-tracker/extension/` over the corresponding files in your **already installed unpacked extension directory**: `public-schema.js`, `github-publisher.js`, `worker.js`, `popup.html`. Keep the installed directory, manifest and extension ID unchanged. The previous durable directory is `/Users/antonplatonov/IdeaProjects/leetcode-atlas-foundation/prototypes/leetcode-atlas/chrome-tracker/extension/`.
3. In `chrome://extensions`, click **Reload** on that same existing tracker and reopen its popup. Its local records and pending corrections survive. Endpoint changes forget old session credentials; a new token is required.
4. Create a fine-grained GitHub token: resource owner **Planton361**, **Only select repositories → myatlas**, repository permission **Contents: Read and write**, no other additional permissions. Use a short expiry. GitHub scopes Contents write to the repository, not to this one file; the publisher itself fixes the sole file endpoint. Do not grant Actions/workflow or administration access. Do not paste the token into chat, repository files, Pages, or a LeetCode page.
5. Paste it only into the extension popup. Click **Enable and publish confirmed records** and grant the optional permissions if asked. Existing remote records are read/merged using their exact IDs. An unchanged snapshot results in no GitHub write. Click **Sync Now** and wait for **published · 0 pending**. Token rejection/offline preserves local records and pending corrections.
6. Verify the public source and green cards at <https://planton361.github.io/myatlas/leetcode-atlas/>. Verify the snapshot still contains all existing confirmed records. Do not fabricate a solve for this test.
7. **Only after successful verification**, revoke the old progress-repository token and delete `Planton361/myatlas-leetcode-progress`. This release deliberately retains that repository until the owner finishes the new-token test. Existing GitHub history remains in the old repository until deletion; its snapshot and SHA-256 are preserved below.

Fresh users may load unpacked from this repository's `tools/chrome-tracker/extension/`. The owner should follow the in-place procedure above to preserve installation identity. Tokens are stored only in trusted extension session storage and must be re-entered after browser restart. Public browser requests use anonymous GET only.

Required permission: `storage`. Optional, user-triggered publisher permissions: `alarms` and `https://api.github.com/*`. Content script match: only top-frame `https://leetcode.com/problems/*`. No added browser permissions, real-account automation or unattended Accepted recording.

Initial exact public snapshot SHA-256: `99222c68d37d7093de7991aa253ba9878a1dc0fa556ce7a2346b0ad4ea596303`. All confirmed IDs, sources, update timestamp and schema version were preserved byte-for-byte. This is not a personal Chrome backup.

## Focused checks

```sh
node --test tools/chrome-tracker/tests/core.cjs tools/chrome-tracker/tests/worker.cjs tools/chrome-tracker/tests/package.cjs tools/chrome-tracker/tests/public-sync.cjs
node tools/chrome-tracker/tests/chrome-smoke.cjs /tmp/myatlas-tracker-smoke
```

Tests use inert dummy credentials, mocked GitHub responses and disposable browser profiles. No real GitHub publisher writes or personal Chrome storage access occur. The extension package is source-only and is not part of the Pages artifact.
