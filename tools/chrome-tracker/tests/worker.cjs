const {test} = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const C = require('../extension/core.js');
function harness(initial = {}, options = {}) {
  let listener, data = structuredClone(initial), failWrite = false;
  const runtime = {id:'test',getURL:p=>'chrome-extension://test/'+p,onMessage:{addListener:f=>listener=f}};
  const tab = {id:1,url:'https://leetcode.com/problems/two-sum/'};
  let candidate=null, access,sessionAccess,alarmHandler,sessionData=structuredClone(options.session||{}),alarm,granted=options.permissions!==false,added;
  const chrome = {runtime,storage:{local:{setAccessLevel:async x=>access=x,get:async()=>structuredClone(data),set:async x=>{if(failWrite)throw Error('Quota exceeded');await new Promise(r=>setTimeout(r,1));data={...data,...structuredClone(x)};}}},tabs:{query:async()=>[tab],sendMessage:async(id,m)=>m.type==='context'?C.problemURL(tab.url):m.type==='candidate'?candidate:(candidate=null)}};
  chrome.storage.session={setAccessLevel:async x=>sessionAccess=x,get:async()=>structuredClone(sessionData),set:async x=>sessionData={...sessionData,...structuredClone(x)},remove:async key=>{for(const k of Array.isArray(key)?key:[key])delete sessionData[k];}};
  chrome.permissions={contains:async()=>granted,onAdded:{addListener:f=>added=f}};
  const alarmAPI={onAlarm:{addListener:f=>alarmHandler=f},create:async(name,value)=>alarm={name,...value},clear:async()=>alarm=null};
  if(!options.delayedAlarm)chrome.alarms=alarmAPI;
  let context;
  context=vm.createContext({MyAtlasTracker:C,chrome,importScripts:(...files)=>files.filter(f=>f!=='core.js').forEach(f=>vm.runInContext(fs.readFileSync(path.join(__dirname,'../extension',f),'utf8'),context)),fetch:async(url,params)=>url.endsWith('catalog-index.json')?{ok:true,json:async()=>({'two-sum':'lc:problem:p0001','add-two-numbers':'lc:problem:eval-00002'})}:options.fetch(url,params),URL,Date,Set,Promise,Error,AbortController,setTimeout,clearTimeout,atob,btoa});
  chrome.tabs.onActivated={addListener:()=>{}};
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../extension/worker.js'),'utf8'),context);
  const popup={id:'test',url:runtime.getURL('popup.html')};
  const send=(m,sender=popup)=>new Promise(resolve=>{if(listener(m,sender,resolve)!==true)resolve(undefined);});
  return {send,tab,get data(){return data;},set failWrite(v){failWrite=v;},set candidate(v){candidate=v;},get access(){return access;},get sessionAccess(){return sessionAccess;},get session(){return sessionData;},get alarm(){return alarm;},fireAlarm:()=>alarmHandler({name:'myatlas-public-retry'}),grantPermissions:()=>{granted=true;chrome.alarms=alarmAPI;added();}};
}
test('only popup can write; content scripts and other pages cannot attest',async()=>{
  const h=harness(); const m={type:'mark',problemId:'lc:problem:p0001'};
  assert.equal(await h.send(m,{id:'test',url:'https://leetcode.com/problems/two-sum/',tab:{id:1}}),undefined);
  assert.equal(await h.send(m,{id:'foreign',url:'chrome-extension://test/popup.html'}),undefined);
  assert.equal((await h.send({type:'state'})).value.records.length,0);
  assert.equal(h.access.accessLevel,'TRUSTED_CONTEXTS');assert.deepEqual(h.data,{});
});
if(require.main!==module)module.exports={harness};
test('serial concurrent writes deduplicate; undo persists across worker restarts',async()=>{
  const h=harness(); await Promise.all(Array.from({length:20},()=>h.send({type:'mark',problemId:'lc:problem:p0001'})));
  assert.equal(h.data.progress.length,1);assert.deepEqual(Object.keys(h.data.progress[0]).sort(),['observedAt','problemId','solved','source']);
  const restarted=harness(h.data);assert.equal((await restarted.send({type:'state'})).value.records.length,1);
  await restarted.send({type:'remove',problemId:'lc:problem:p0001'});assert.deepEqual(restarted.data.progress,[]);
});
test('navigation race, stale candidate and storage failure produce errors without writes',async()=>{
  const h=harness(); h.tab.url='https://leetcode.com/problems/add-two-numbers/';
  assert.equal((await h.send({type:'mark',problemId:'lc:problem:p0001'})).ok,false);
  h.tab.url='https://leetcode.com/problems/two-sum/';
  assert.equal((await h.send({type:'mark',problemId:'lc:problem:p0001',detected:true})).ok,false);
  h.failWrite=true;assert.equal((await h.send({type:'mark',problemId:'lc:problem:p0001'})).ok,false);assert.deepEqual(h.data,{});
});
test('observation needs explicit confirmation; imports validate atomically and preserve existing record',async()=>{
  const h=harness();h.candidate={slug:'two-sum',observedAt:new Date().toISOString(),source:'accepted-dom-owner-confirmed'};
  assert.equal((await h.send({type:'state'})).value.records.length,0);
  assert.equal((await h.send({type:'mark',problemId:'lc:problem:p0001',detected:true})).ok,true);
  assert.equal(h.data.progress[0].source,'accepted-dom-owner-confirmed');
  const backup=C.exportProgress(h.data.progress), before=structuredClone(h.data);
  assert.equal((await h.send({type:'preview-import',value:backup})).ok,true);assert.deepEqual(h.data,before);
  assert.equal((await h.send({type:'import',value:backup})).ok,true);assert.deepEqual(h.data,before);
  backup.records.push({...backup.records[0],problemId:'unknown'});
  assert.equal((await h.send({type:'import',value:backup})).ok,false);assert.deepEqual(h.data,before);
});

test('destination change forgets the old token without touching records or pending undo',async()=>{
  const record={problemId:'lc:problem:p0001',source:'manual-owner-attestation',solved:true,observedAt:new Date().toISOString()};
  const initial={progress:[record],publisher:{enabled:true,phase:'published',ops:[{problemId:record.problemId,source:null}],nextRetryAt:null}};
  let calls=0;const h=harness(initial,{session:{publisherToken:'github_pat_DISPOSABLE_OLD_DESTINATION',publisherDestination:'https://api.github.com/repos/Planton361/myatlas-leetcode-progress/contents/solved.json'},fetch:async()=>{calls++;throw Error('Forbidden');}});
  assert.equal((await h.send({type:'state'})).value.publisher.phase,'token-required');
  assert.equal(h.session.publisherToken,undefined);assert.deepEqual(h.data,initial);
  await h.send({type:'sync-now'});assert.equal(calls,0);assert.deepEqual(h.data.progress,[record]);assert.deepEqual(h.data.publisher.ops,initial.publisher.ops);
});
