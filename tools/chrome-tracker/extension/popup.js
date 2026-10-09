'use strict';
const $ = id => document.getElementById(id);
let state, pendingImport;
async function send(message) {
  const result = await chrome.runtime.sendMessage(message);
  if (!result?.ok) throw Error(result?.error || 'Extension unavailable; reopen the popup.');
  return result.value;
}
function notice(text) { $('message').textContent = text; }
async function run(action) { try { await action(); } catch (e) { notice(e.message); } }
async function refresh() {
  state = await send({type: 'state'});
  const p=state.publisher;
  if(p){$('publisher-status').textContent='Public sync: '+p.phase+' · '+p.pending+' pending'+(p.publishedAt?' · published '+p.publishedAt:'')+(p.nextRetryAt?' · retry '+new Date(p.nextRetryAt).toLocaleTimeString():'')+(p.error?' · '+p.error:'');$('sync-now').disabled=!p.enabled;}
  $('count').textContent = state.records.length + ' solved';
  $('current').textContent = state.current ? state.current.problemId + ' · ' + state.current.slug : 'Open a catalogued leetcode.com/problems/ page.';
  $('mark').disabled = !state.current;
  $('confirm').hidden = !state.candidate;
  $('candidate').textContent = state.candidate ? 'Recent Submit → Accepted observed. Confirm that this was your new submission.' : 'No recent Accepted observation. Manual attestation is available.';
  const sorted = [...state.records].sort((a,b) => b.observedAt.localeCompare(a.observedAt));
  $('recent').replaceChildren(); $('correction').replaceChildren();
  for (const r of sorted) {
    const option = document.createElement('option'); option.value = r.problemId; option.textContent = r.problemId; $('correction').append(option);
  }
  $('remove').disabled = !sorted.length;
  for (const r of sorted.slice(0, 8)) {
    const li = document.createElement('li'), small = document.createElement('small'), undo = document.createElement('button');
    li.textContent = r.problemId; small.textContent = new Date(r.observedAt).toLocaleString() + ' · ' + r.source;
    undo.textContent = 'Undo'; undo.onclick = () => run(async () => { await send({type: 'remove', problemId: r.problemId}); await refresh(); notice('Solve removed.'); });
    li.append(undo, small); $('recent').append(li);
  }
}
for (const [id, detected] of [['mark', false], ['confirm', true]]) $(id).onclick = () => run(async () => {
  await send({type: 'mark', problemId: state.current?.problemId, detected}); await refresh(); notice('Saved locally. Repeated solves count once.');
});
$('remove').onclick = () => run(async () => { await send({type: 'remove', problemId: $('correction').value}); await refresh(); notice('Solve removed.'); });
$('export').onclick = () => run(async () => {
  await refresh();
  const url = URL.createObjectURL(new Blob([JSON.stringify(MyAtlasTracker.exportProgress(state.records), null, 2) + '\n'], {type: 'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = 'myatlas-leetcode-progress.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000); notice('Progress backup exported.');
});
$('import').onchange = () => run(async () => {
  pendingImport = null; $('apply-import').hidden = true;
  const file = $('import').files[0]; if (!file) return;
  if (file.size > 1024 * 1024) throw Error('Progress JSON must be under 1 MiB.');
  const value = JSON.parse(await file.text()); const rows = await send({type: 'preview-import', value});
  pendingImport = MyAtlasTracker.exportProgress(rows); $('apply-import').hidden = false;
  notice(rows.length + ' valid records selected. Merge to add missing solves. Nothing changed yet.');
});
$('apply-import').onclick = () => run(async () => {
  if (!pendingImport) return;
  await send({type: 'import', value: pendingImport}); pendingImport = null; $('apply-import').hidden = true; $('import').value = '';
  await refresh(); notice('Backup merged locally. Use Undo to correct a solve.');
});
const publisherReloadMessage='The loaded tracker manifest is missing optional GitHub permissions. Open chrome://extensions and click Reload on this existing extension, then reopen the popup. Do not remove or reinstall it; local solved records will be retained.';
$('publisher-enable').onclick=()=>{
  const credential=$('publisher-token').value.trim();
  let permissionRequest;
  try{
    if(!credential)throw Error('Enter a repository-restricted fine-grained token.');
    // Chrome caches an unpacked manifest until Reload, even while popup.js
    // changes on disk. Check Chrome's loaded manifest, not a fetched file.
    const manifest=chrome.runtime.getManifest();
    if(!manifest.optional_permissions?.includes('alarms')||!manifest.optional_host_permissions?.includes('https://api.github.com/*'))throw Error(publisherReloadMessage);
    // Keep the API call synchronous in the button handler, before any await.
    permissionRequest=chrome.permissions.request({permissions:['alarms'],origins:['https://api.github.com/*']});
  }catch(e){$('publisher-token').value='';notice(e.message);return;}
  run(async()=>{
    try{
      const allowed=await permissionRequest;
      if(!allowed){notice('Optional publisher permissions were declined. Publishing was not enabled by this attempt; local progress is unchanged.');return;}
      await send({type:'publisher-enable',token:credential});await refresh();notice('Confirmed records queued for the public progress repository.');
    }catch(e){notice(e.message.includes('Only permissions specified in the manifest')?publisherReloadMessage:e.message);}
    finally{$('publisher-token').value='';}
  });
};
$('sync-now').onclick=()=>run(async()=>{await send({type:'sync-now'});await refresh();});
$('publisher-disable').onclick=()=>run(async()=>{await send({type:'publisher-disable'});$('publisher-token').value='';await refresh();notice('Publisher disabled and token forgotten. Pending corrections are retained locally.');});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes.progress||changes.publisher))run(refresh);});
run(refresh);
