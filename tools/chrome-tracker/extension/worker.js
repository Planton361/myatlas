importScripts('core.js', 'public-schema.js', 'github-publisher.js');
const C = MyAtlasTracker, KEY = 'progress';
const PUBLIC_PERMISSION={permissions:['alarms'],origins:['https://api.github.com/*']},SYNC='publisher',TOKEN='publisherToken',ALARM='myatlas-public-retry';
const emptySync=()=>({enabled:false,phase:'disabled',ops:[],attempts:0,nextRetryAt:null,publishedAt:null,publishedSHA:null,error:null});
// Browser activation is authoritative even when a page's visibility/focus
// signals lag (or a headless test keeps multiple documents visible).
chrome.tabs.onActivated.addListener(async ({tabId, windowId}) => {
  const tabs = await chrome.tabs.query({windowId});
  await Promise.all(tabs.filter(t => t.id !== tabId).map(t =>
    chrome.tabs.sendMessage(t.id, {type: 'dismiss'}, {frameId: 0}).catch(() => {})));
});
const ready = (async () => {
  await chrome.storage.local.setAccessLevel({accessLevel: 'TRUSTED_CONTEXTS'});
  await chrome.storage.session?.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
  const response = await fetch(chrome.runtime.getURL('catalog-index.json'));
  if (!response.ok) throw Error('Prepare the extension with the local catalog first');
  const lookup = await response.json();
  return {lookup, ids: new Set(Object.values(lookup))};
})();
// All writes pass through one serial queue, including concurrent popup windows.
let queue = Promise.resolve();
const enqueue=action=>{const task=queue.then(action);queue=task.catch(()=>{});return task;};
async function syncState(ids){
  const data=await chrome.storage.local.get(SYNC),s=data[SYNC];
  if(!s)return emptySync();
  if(typeof s.enabled!=='boolean'||!Array.isArray(s.ops))throw Error('Invalid publisher state. Pending operations were not discarded.');
  MyAtlasPublicProgress.operations(s.ops,ids);return s;
}
function visibleSync(s,hasToken=false){return {enabled:s.enabled,phase:s.enabled&&!hasToken&&!['token-rejected','permission-required','blocked'].includes(s.phase)?'token-required':s.phase,pending:s.ops.length,attempts:s.attempts,nextRetryAt:s.nextRetryAt,publishedAt:s.publishedAt,error:s.error};}
async function token(){
  const data=await chrome.storage.session?.get([TOKEN,'publisherDestination']);
  // A token saved for the old repository must never be reused at a new endpoint.
  if(data?.publisherDestination!==MyAtlasPublicProgress.ENDPOINT){
    if(data?.[TOKEN])await chrome.storage.session.remove([TOKEN,'publisherDestination']);
    return null;
  }
  return data?.[TOKEN]||null;
}
async function schedule(s){
  if(!chrome.alarms)return;
  if(s.enabled&&s.nextRetryAt&&await chrome.permissions.contains(PUBLIC_PERMISSION))await chrome.alarms.create(ALARM,{when:s.nextRetryAt});
  else if(await chrome.permissions.contains({permissions:['alarms']}))await chrome.alarms.clear(ALARM);
}
async function saveProgress(rows,next,ids){
  const data=await chrome.storage.local.get(SYNC),s=data[SYNC];
  if(!s){await chrome.storage.local.set({[KEY]:C.validateRecords(next,ids)});return;}
  const checked=await syncState(ids),ops=new Map(checked.ops.map(op=>[op.problemId,op]));
  const a=new Map(rows.map(r=>[r.problemId,r])),b=new Map(next.map(r=>[r.problemId,r]));
  let changed=false;
  for(const [id,r]of b)if(!a.has(id)||a.get(id).source!==r.source){ops.set(id,{problemId:id,source:r.source});changed=true;}
  for(const id of a.keys())if(!b.has(id)){ops.set(id,{problemId:id,source:null});changed=true;}
  const fresh=changed?{...checked,ops:[...ops.values()],phase:checked.enabled?'pending':'disabled',attempts:0,nextRetryAt:checked.enabled?Date.now()+60000:null,error:null}:checked;
  // Local correction and its public tombstone are one durable storage write.
  await chrome.storage.local.set({[KEY]:C.validateRecords(next,ids),[SYNC]:fresh});
  if(changed&&fresh.enabled){await schedule(fresh);enqueue(()=>syncNow()).catch(()=>{});}
}
async function syncNow(){
  const {ids}=await ready,s=await syncState(ids);
  if(!s.enabled)return visibleSync(s);
  if(!await chrome.permissions.contains(PUBLIC_PERMISSION)){
    const stopped={...s,phase:'permission-required',nextRetryAt:null,error:'Publisher permission is missing. Pending changes retained.'};await chrome.storage.local.set({[SYNC]:stopped});return visibleSync(stopped,Boolean(await token()));
  }
  const credential=await token();
  if(!credential){const stopped={...s,phase:'token-required',nextRetryAt:null,error:'Re-enter the restricted token after browser restart.'};await chrome.storage.local.set({[SYNC]:stopped});await schedule(stopped);return visibleSync(stopped);}
  await chrome.storage.local.set({[SYNC]:{...s,phase:'publishing',error:null}});
  try{
    const published=await MyAtlasGitHubPublisher.create({ids}).publish(credential,s.ops);
    const done={...s,ops:[],phase:'published',attempts:0,nextRetryAt:null,publishedAt:published.value.updatedAt,publishedSHA:published.sha,error:null};
    await chrome.storage.local.set({[SYNC]:done});await schedule(done);return visibleSync(done,true);
  }catch(e){
    const attempts=(s.attempts||0)+1,temporary=e.kind==='temporary';
    const retry=temporary&&attempts<=6?Date.now()+Math.max(e.retryAfter||0,60000*2**(attempts-1)):null;
    const stopped={...s,phase:temporary?(retry?'pending':'retry-paused'):e.kind==='auth'?'token-rejected':'blocked',attempts,nextRetryAt:retry,error:e.message};
    if(e.kind==='auth')await chrome.storage.session.remove(TOKEN);
    await chrome.storage.local.set({[SYNC]:stopped});await schedule(stopped);return visibleSync(stopped,e.kind!=='auth');
  }
}
let alarmRegistered=false;
function registerAlarm(){
  if(chrome.alarms&&!alarmRegistered){chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name===ALARM)enqueue(()=>syncNow()).catch(()=>{});});alarmRegistered=true;}
}
registerAlarm();
chrome.permissions?.onAdded?.addListener(registerAlarm);
chrome.runtime.onStartup?.addListener(()=>enqueue(()=>syncNow()).catch(()=>{}));
// Recreate a lost retry alarm after worker restart, without making a request.
ready.then(async({ids})=>{const s=await syncState(ids);await schedule(s);}).catch(()=>{});
async function records(ids) {
  const data = await chrome.storage.local.get(KEY);
  return C.validateRecords(data[KEY] || [], ids);
}
async function current(lookup) {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  // Querying tab IDs needs no tabs/activeTab permission. Ask only our narrowly
  // matched content script for the exact current page identity.
  let parsed;
  try { parsed = await chrome.tabs.sendMessage(tab.id, {type: 'context'}, {frameId: 0}); }
  catch { return null; }
  return parsed && Object.hasOwn(lookup, parsed.slug) ? {tabId: tab.id, slug: parsed.slug, problemId: lookup[parsed.slug]} : null;
}
async function candidate(tabId) {
  try { return await chrome.tabs.sendMessage(tabId, {type: 'candidate'}, {frameId: 0}); }
  catch { return null; }
}
async function handle(m) {
  const {lookup, ids} = await ready;
  const rows = await records(ids);
  if (m.type === 'state') {
    const page = await current(lookup), seen = page ? await candidate(page.tabId) : null;
    return {records: rows, current: page, candidate: seen?.slug === page?.slug ? seen : null,publisher:visibleSync(await syncState(ids),Boolean(await token()))};
  }
  if (m.type === 'mark') {
    const page = await current(lookup);
    if (!page || page.problemId !== m.problemId) throw Error('The active problem changed. Reopen the popup.');
    let observedAt = new Date().toISOString(), source = 'manual-owner-attestation';
    if (m.detected) {
      const seen = await candidate(page.tabId);
      if (!seen || seen.slug !== page.slug || Date.now() - Date.parse(seen.observedAt) > C.TTL) throw Error('Observation expired. Use manual attestation if appropriate.');
      observedAt = seen.observedAt; source = 'accepted-dom-owner-confirmed';
    }
    const next = C.merge(rows, [{problemId: page.problemId, solved: true, observedAt, source}]);
    await saveProgress(rows,next,ids);
    try { await chrome.tabs.sendMessage(page.tabId, {type: 'dismiss'}, {frameId: 0}); } catch {}
    return next;
  }
  if (m.type === 'remove') {
    if (!ids.has(m.problemId)) throw Error('Unknown Problem ID');
    const next = rows.filter(r => r.problemId !== m.problemId);
    await saveProgress(rows,next,ids); return next;
  }
  if (m.type === 'preview-import') return C.parseExport(m.value, ids);
  if (m.type === 'import') {
    const next = C.merge(rows, C.parseExport(m.value, ids));
    await saveProgress(rows,next,ids); return next;
  }
  if(m.type==='publisher-enable'){
    if(!await chrome.permissions.contains(PUBLIC_PERMISSION))throw Error('Grant only the optional publisher permissions from the popup.');
    registerAlarm();
    if(typeof m.token!=='string'||!/^github_pat_[A-Za-z0-9_]+$/.test(m.token))throw Error('Use a fine-grained GitHub token restricted to Planton361/myatlas.');
    const s=await syncState(ids),ops=new Map(s.ops.map(op=>[op.problemId,op]));
    rows.forEach(r=>ops.set(r.problemId,{problemId:r.problemId,source:r.source}));
    const enabled={...s,enabled:true,ops:[...ops.values()],phase:'pending',attempts:0,nextRetryAt:Date.now()+60000,error:null};
    await chrome.storage.session.set({[TOKEN]:m.token,publisherDestination:MyAtlasPublicProgress.ENDPOINT});await chrome.storage.local.set({[SYNC]:enabled});await schedule(enabled);
    enqueue(()=>syncNow()).catch(()=>{});return visibleSync(enabled,true);
  }
  if(m.type==='publisher-disable'){
    const stopped={...await syncState(ids),enabled:false,phase:'disabled',nextRetryAt:null,error:null};
    await chrome.storage.session.remove(TOKEN);await chrome.storage.local.set({[SYNC]:stopped});await schedule(stopped);return visibleSync(stopped);
  }
  if(m.type==='sync-now')return syncNow();
  throw Error('Unknown action');
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  // Page content scripts have no write path. Only our packaged popup may attest.
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('popup.html')) return;
  const task = message.type==='state'?handle(message):enqueue(()=>handle(message));
  task.then(value => respond({ok: true, value}), error => respond({ok: false, error: error.message}));
  return true;
});
