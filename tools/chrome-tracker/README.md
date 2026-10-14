# MyAtlas owner Chrome tracker

The existing tracker now publishes only to `Planton361/myatlas`, branch `main`, file `progress/leetcode/solved.json`. The public Atlas uses the same file anonymously. Accepted observations still require owner confirmation; manual Mark Solved, duplicate prevention, Undo, Sync Now and JSON backup/import are retained. No solution code, statements or authentication data is collected by content scripts or sent to MyAtlas visitors.

## Encrypted GitHub token vault (extension v0.3.0)

The token can now survive a browser restart **as ciphertext only**. The popup encrypts the fine-grained PAT with AES-256-GCM and a randomly salted PBKDF2-SHA-256 key derived from an owner-chosen passphrase (600,000 iterations). The passphrase and decrypted token are never saved in persistent Chrome storage. The decrypted PAT is only held in `chrome.storage.session` with access restricted to trusted extension contexts; it disappears when Chrome closes. A new Chrome session must be **unlocked with the passphrase** before publishing can resume. Pending confirmed solve/undo operations stay in local storage, even if offline or locked.

A sufficiently long, unique passphrase (16+ characters, preferably a memorable multiword phrase) is required. Keep it in a password manager. This protects a copied Chrome storage directory against casual token disclosure, but **does not protect against an already compromised browser session/profile**, and is not macOS Keychain integration or truly unattended login. If the passphrase is lost, set up a **new** fine-grained PAT and passphrase; previously confirmed progress is not lost. Revoked/expired PATs require replacement. **Disable and forget saved token** removes the encrypted vault and session PAT, but leaves confirmed progress and pending corrections.

Chrome extension storage itself is not encrypted by Chrome: only the dedicated PAT vault uses authenticated encryption. No new extension permission, network destination, remote service, or additional GitHub access is introduced.

## Preserve the existing installation

1. In the existing popup, **Export progress JSON** to a private backup outside Git, then **Disable publisher / forget token**. Do not uninstall.
2. Copy the updated **five files** from `tools/chrome-tracker/extension/` into the **same installed unpacked extension directory**: `token-vault.js` (new), `worker.js`, `popup.html`, `popup.js`, `manifest.json` (v0.3.0). Keep the folder path and extension ID unchanged. Do not delete the extension's local data. The previous durable directory is `/Users/antonplatonov/IdeaProjects/leetcode-atlas-foundation/prototypes/leetcode-atlas/chrome-tracker/extension/`.
3. In `chrome://extensions`, click **Reload** on that same existing tracker and reopen its popup. Local solved records and pending corrections survive. Reload discards the former session-only PAT; if you have lost its original value, create a new fine-grained PAT. Do not remove/reinstall the extension.
4. Create a fine-grained GitHub token: resource owner **Planton361**, **Only select repositories → myatlas**, repository permission **Contents: Read and write**, no other additional permissions. Use a short expiry. GitHub scopes Contents write to the repository, not to this one file; the publisher itself fixes the sole file endpoint. Do not grant Actions/workflow or administration access. Do not paste the token into chat, repository files, Pages, or a LeetCode page.
5. Enter the PAT and a **separate 16+ character vault passphrase** into the extension popup. Click **Save encrypted token and enable sync** and grant the optional permissions if asked. Existing remote records are read/merged using their exact IDs. An unchanged snapshot results in no GitHub write. Click **Sync Now** and wait for **published · 0 pending**. The next time Chrome starts, open the popup and enter **only the vault passphrase** under **Unlock saved GitHub token and sync**. Offline/failed unlock/token rejection never discards pending records.
6. Verify the public source and green cards at <https://planton361.github.io/myatlas/leetcode-atlas/>. Verify the snapshot still contains all existing confirmed records. Do not fabricate a solve for this test.
7. **Only after successful verification**, revoke the old progress-repository token and delete `Planton361/myatlas-leetcode-progress`. This release deliberately retains that repository until the owner finishes the new-token test. Existing GitHub history remains in the old repository until deletion; its snapshot and SHA-256 are preserved below.

Fresh users may load unpacked from this repository's `tools/chrome-tracker/extension/`. The owner should follow the in-place procedure above to preserve installation identity. The PAT is present in plaintext only in trusted session storage **after setup or passphrase unlock**, and survives browser restarts only as encrypted local ciphertext. The passphrase is never stored. Public browser requests use anonymous GET only.

Required permission: `storage`. Optional, user-triggered publisher permissions: `alarms` and `https://api.github.com/*`. Content script match: only top-frame `https://leetcode.com/problems/*`. No added browser permissions, real-account automation or unattended Accepted recording.

Initial exact public snapshot SHA-256: `99222c68d37d7093de7991aa253ba9878a1dc0fa556ce7a2346b0ad4ea596303`. All confirmed IDs, sources, update timestamp and schema version were preserved byte-for-byte. This is not a personal Chrome backup.

## Focused checks

```sh
node --test tools/chrome-tracker/tests/core.cjs tools/chrome-tracker/tests/worker.cjs tools/chrome-tracker/tests/package.cjs tools/chrome-tracker/tests/public-sync.cjs tools/chrome-tracker/tests/token-vault.cjs
node tools/chrome-tracker/tests/chrome-smoke.cjs /tmp/myatlas-tracker-smoke
```

Tests use inert dummy credentials, mocked GitHub responses and disposable browser profiles. No real GitHub publisher writes or personal Chrome storage access occur. The extension package is source-only and is not part of the Pages artifact.
