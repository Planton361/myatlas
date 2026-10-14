'use strict';
const $ = id => document.getElementById(id);
let state, pendingImport;
const slugById = new Map();
const catalogReady = (async () => {
  try {
    const response = await fetch(chrome.runtime.getURL('catalog-index.json'));
    if (!response.ok) return;
    const catalog = await response.json();
    for (const [slug, id] of Object.entries(catalog)) slugById.set(id, slug);
  } catch {}
})();

async function send(message) {
  const result = await chrome.runtime.sendMessage(message);
  if (!result?.ok) throw Error(result?.error || 'The tracker is unavailable. Close and reopen the popup.');
  return result.value;
}
function notice(text) {
  $('message').textContent = text;
  $('message').hidden = !text;
}
async function run(action) { try { await action(); } catch (e) { notice(e.message); } }
function problemName(slug) {
  return slug ? slug.split('-').map(word => word ? word[0].toUpperCase() + word.slice(1) : '').join(' ') : 'Saved problem';
}
function nameForId(id) { return problemName(slugById.get(id)); }
function shortDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});
}
function sourceName(source) { return source === 'accepted-dom-owner-confirmed' ? 'Accepted confirmed' : 'Marked manually'; }
function publisherTitle(phase) {
  return ({
    disabled: 'Sync is off', published: 'Up to date', pending: 'Waiting to sync', publishing: 'Syncing now',
    'unlock-required': 'Unlock to resume sync', 'token-required': 'Token setup needed',
    'token-rejected': 'Token needs attention', 'permission-required': 'Permission needed',
    'retry-paused': 'Sync paused', blocked: 'Sync needs attention'
  })[phase] || 'Public sync status';
}
function friendlyPublisherError(error) {
  if (/rate limit|temporarily unavailable|temporary failure/i.test(error)) return 'GitHub is temporarily unavailable. Your changes are saved and will retry.';
  if (/token rejected|contents write access denied/i.test(error)) return 'GitHub rejected this token or its write access. Replace the token below.';
  if (/HTTP \d+/i.test(error)) return 'GitHub could not update the public progress file. Pending changes are kept.';
  if (/publisher permission is missing/i.test(error)) return 'GitHub access is not enabled yet. Set up sync below to review permissions.';
  return error;
}
function publisherDetail(p) {
  if (p.error) return friendlyPublisherError(p.error);
  const pending = p.pending || 0;
  if (p.phase === 'published') return p.publishedAt ? 'Everything is up to date. Last synced ' + shortDate(p.publishedAt) + '.' : 'Everything is up to date.';
  if (pending && p.phase === 'disabled') return pending + ' confirmed ' + (pending === 1 ? 'solve is' : 'solves are') + ' queued on this device. Turn on sync to publish.';
  if (pending) return pending + ' confirmed ' + (pending === 1 ? 'solve is' : 'solves are') + ' waiting to sync. They remain saved on this device.';
  if (p.phase === 'unlock-required') return 'Enter your passphrase to unlock the saved token for this Chrome session.';
  if (p.phase === 'token-required') return 'Add a restricted GitHub token below to enable public sync.';
  if (p.phase === 'token-rejected') return 'Replace the token with one that can write to the MyAtlas repository.';
  if (p.phase === 'permission-required') return 'Grant the optional GitHub access from the setup below.';
  if (p.phase === 'retry-paused') return 'Sync paused after repeated attempts. Your local progress is safe.';
  if (p.phase === 'blocked') return 'Sync needs attention. Your local progress is safe.';
  if (p.phase === 'publishing') return 'Your confirmed progress is being published.';
  if (p.phase === 'pending') return p.nextRetryAt ? 'Your changes are queued and will retry around ' + new Date(p.nextRetryAt).toLocaleTimeString() + '.' : 'Your confirmed progress is queued for sync.';
  return 'Your progress stays on this device until you turn sync on.';
}
function renderPublisher(p) {
  const title = publisherTitle(p.phase);
  $('publisher-status-title').textContent = title;
  $('publisher-status-detail').textContent = publisherDetail(p);
  $('publisher-status').dataset.state = p.phase || 'disabled';
  $('publisher-summary').textContent = title + (p.pending ? ' · ' + p.pending + ' waiting' : '');
  $('sync-now').disabled = !p.enabled || !p.unlocked;
  $('publisher-unlock-controls').hidden = !p.vaultSaved || !p.enabled || p.unlocked;
  $('publisher-enable').textContent = p.vaultSaved ? 'Replace saved token and passphrase' : 'Save encrypted token and enable sync';
  if (p.enabled && ['unlock-required', 'token-required', 'token-rejected', 'permission-required', 'blocked'].includes(p.phase)) $('sync-details').open = true;
}
async function refresh() {
  await catalogReady;
  state = await send({type: 'state'});
  renderPublisher(state.publisher);
  $('count').textContent = String(state.records.length);
  $('solved-badge').setAttribute('aria-label', state.records.length + ' solved problems');
  $('recent-count').textContent = String(Math.min(state.records.length, 5));
  $('recent-count').setAttribute('aria-label', Math.min(state.records.length, 5) + ' recent problems');
  $('current-state').textContent = state.current ? 'Ready' : 'No page';
  if (state.current) {
    $('current').textContent = problemName(state.current.slug);
    $('current-meta').replaceChildren();
    const slug = document.createElement('span');
    slug.textContent = 'URL slug · ' + state.current.slug;
    const id = document.createElement('span');
    id.className = 'tech-id';
    id.textContent = 'Problem ID · ' + state.current.problemId;
    $('current-meta').append(slug, id);
    $('current-meta').setAttribute('aria-label', 'URL slug ' + state.current.slug + '. Problem ID ' + state.current.problemId + '.');
  } else {
    $('current').textContent = 'No supported problem open';
    $('current-meta').textContent = 'Open a LeetCode problem page included in the tracker catalog.';
    $('current-meta').setAttribute('aria-label', 'Current problem details');
  }
  $('mark').disabled = !state.current;
  $('accepted-card').hidden = !state.candidate;
  $('confirm').hidden = !state.candidate;
  $('mark').className = state.candidate ? 'button button-secondary' : 'button button-primary';
  $('candidate').textContent = state.candidate ? 'LeetCode accepted ' + problemName(state.candidate.slug) + '. Confirm to add it to your tracker.' : '';

  const sorted = [...state.records].sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  $('recent').replaceChildren();
  $('correction').replaceChildren();
  for (const record of sorted) {
    const option = document.createElement('option');
    option.value = record.problemId;
    option.textContent = nameForId(record.problemId);
    $('correction').append(option);
  }
  $('correction').disabled = !sorted.length;
  $('remove').disabled = !sorted.length;
  for (const record of sorted.slice(0, 5)) {
    const li = document.createElement('li');
    const copy = document.createElement('div');
    const title = document.createElement('span');
    const meta = document.createElement('small');
    const undo = document.createElement('button');
    li.className = 'recent-row';
    copy.className = 'recent-copy';
    title.className = 'recent-name';
    meta.className = 'recent-meta';
    undo.className = 'undo-button';
    undo.type = 'button';
    title.textContent = nameForId(record.problemId);
    meta.textContent = shortDate(record.observedAt) + ' · ' + sourceName(record.source);
    undo.textContent = 'Undo';
    undo.setAttribute('aria-label', 'Undo solve for ' + nameForId(record.problemId));
    undo.onclick = () => run(async () => { await send({type: 'remove', problemId: record.problemId}); await refresh(); notice('Solve removed from your tracker.'); });
    copy.append(title, meta);
    li.append(copy, undo);
    $('recent').append(li);
  }
  if (!sorted.length) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = 'No solves recorded yet.';
    $('recent').append(empty);
  }
}

for (const [id, detected] of [['mark', false], ['confirm', true]]) $(id).onclick = () => run(async () => {
  await send({type: 'mark', problemId: state.current?.problemId, detected}); await refresh(); notice('Saved on this device. Duplicate solves are kept once.');
});
$('remove').onclick = () => run(async () => { await send({type: 'remove', problemId: $('correction').value}); await refresh(); notice('Solve removed from your tracker.'); });
$('export').onclick = () => run(async () => {
  await refresh();
  const url = URL.createObjectURL(new Blob([JSON.stringify(MyAtlasTracker.exportProgress(state.records), null, 2) + '\n'], {type: 'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = 'myatlas-leetcode-progress.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000); notice('Progress backup downloaded.');
});
$('import').onchange = () => run(async () => {
  pendingImport = null; $('apply-import').hidden = true;
  const file = $('import').files[0]; if (!file) return;
  if (file.size > 1024 * 1024) throw Error('Progress JSON must be under 1 MiB.');
  const value = JSON.parse(await file.text()); const rows = await send({type: 'preview-import', value});
  pendingImport = MyAtlasTracker.exportProgress(rows); $('apply-import').hidden = false;
  notice(rows.length + ' valid solves found. Review and merge to add missing solves. Nothing has changed yet.');
});
$('apply-import').onclick = () => run(async () => {
  if (!pendingImport) return;
  await send({type: 'import', value: pendingImport}); pendingImport = null; $('apply-import').hidden = true; $('import').value = '';
  await refresh(); notice('Backup merged. Existing solves were kept.');
});
const publisherReloadMessage = 'The loaded tracker needs a refresh. Open chrome://extensions and click Reload on this existing extension, then reopen the popup. Do not remove or reinstall it; local solved records will be retained.';
$('publisher-enable').onclick = () => {
  const credential = $('publisher-token').value.trim(), passphrase = $('publisher-vault-passphrase').value;
  let permissionRequest;
  try {
    if (!credential) throw Error('Enter a fine-grained GitHub token limited to Planton361/myatlas.');
    if (passphrase.length < 16) throw Error('Choose a separate vault passphrase with at least 16 characters.');
    // Chrome caches an unpacked manifest until Reload, even while popup.js changes on disk.
    const manifest = chrome.runtime.getManifest();
    if (!manifest.optional_permissions?.includes('alarms') || !manifest.optional_host_permissions?.includes('https://api.github.com/*')) throw Error(publisherReloadMessage);
    // Keep the API call synchronous in the button handler, before any await.
    permissionRequest = chrome.permissions.request({permissions: ['alarms'], origins: ['https://api.github.com/*']});
  } catch (e) {
    $('publisher-token').value = ''; $('publisher-vault-passphrase').value = ''; notice(e.message); return;
  }
  run(async () => {
    try {
      const allowed = await permissionRequest;
      if (!allowed) { notice('Optional publisher access was declined. Sync was not enabled; local progress is unchanged.'); return; }
      await send({type: 'publisher-enable', token: credential, passphrase}); await refresh(); notice('Encrypted token saved. Confirmed solves are ready to sync.');
    } catch (e) { notice(e.message.includes('Only permissions specified in the manifest') ? publisherReloadMessage : e.message); }
    finally { $('publisher-token').value = ''; $('publisher-vault-passphrase').value = ''; }
  });
};
$('publisher-unlock').onclick = () => run(async () => {
  const passphrase = $('publisher-unlock-passphrase').value;
  $('publisher-unlock-passphrase').value = '';
  await send({type: 'publisher-unlock', passphrase}); await refresh(); notice('Sync resumed for this Chrome session.');
});
$('sync-now').onclick = () => run(async () => { await send({type: 'sync-now'}); await refresh(); notice('Sync checked. See the status above.'); });
$('publisher-disable').onclick = () => run(async () => {
  await send({type: 'publisher-disable'});
  for (const id of ['publisher-token', 'publisher-vault-passphrase', 'publisher-unlock-passphrase']) $(id).value = '';
  await refresh(); notice('Sync is off and the saved token was forgotten. Pending corrections remain.');
});
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && (changes.progress || changes.publisher)) run(refresh); });
run(refresh);
