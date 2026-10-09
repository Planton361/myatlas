const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../extension/public-schema.js'),G=require('../extension/github-publisher.js'),R=require('../public-reader.js'),M=require('../mock-github.js');
const {harness}=require('./worker.cjs');
const ids=new Set(['lc:problem:p0001','lc:problem:eval-00002']),token='github_pat_DISPOSABLE_NO_PRIVILEGES',now=Date.now();
const op={problemId:'lc:problem:p0001',source:'manual-owner-attestation'},empty=()=>({schemaVersion:1,updatedAt:new Date(now).toISOString(),solved:[]});
function setup(){const api=M.create({ids,now:()=>now}),publisher=G.create({ids,fetch:api.fetch,now:()=>now,pause:async()=>{}});return {api,publisher};}
test('strict public data has only version, timestamp, exact IDs and attestation sources',()=>{
  for(const value of [{...empty(),title:'No'},{...empty(),schemaVersion:2},{...empty(),updatedAt:'bad'},{...empty(),solved:[{...op,code:'No'}]},{...empty(),solved:[{...op,problemId:'1'}]},{...empty(),solved:[op,op]}])assert.throws(()=>P.validate(value,ids,now));
  assert.deepEqual(P.validate(empty(),ids,now),empty());
});
test('first confirmed solve creates only solved.json; duplicate is idempotent without another PUT',async()=>{
  const {api,publisher}=setup();const first=await publisher.publish(token,[op]);assert.equal(first.wrote,true);assert.deepEqual(first.value.solved,[op]);
  const second=await publisher.publish(token,[op]);assert.equal(second.wrote,false);assert.equal(second.value.updatedAt,first.value.updatedAt);assert.equal(api.puts,1);
  assert.deepEqual(Object.keys(api.value).sort(),['schemaVersion','solved','updatedAt']);assert.deepEqual(Object.keys(api.value.solved[0]).sort(),['problemId','source']);
});
test('safe conflict rebase preserves unrelated remote solve, then undo removes only its exact ID',async()=>{
  const {api,publisher}=setup();api.setScenario('conflict');const result=await publisher.publish(token,[op]);assert.equal(result.value.solved.length,2);
  await publisher.publish(token,[{problemId:op.problemId,source:null}]);assert.equal(api.value.solved.length,1);assert.equal(api.value.solved[0].problemId,'lc:problem:eval-00002');
});
test('offline transport and token rejection retain operations for an explicit retry',async()=>{
  const {api,publisher}=setup();api.setScenario('offline');await assert.rejects(publisher.publish(token,[op]),e=>e.kind==='temporary');assert.equal(api.value,null);
  api.setScenario('rejected');await assert.rejects(publisher.publish(token,[op]),e=>e.kind==='auth');assert.equal(api.value,null);
  await publisher.publish(token,[op]);assert.equal(api.puts,1);
});
test('a committed PUT with a lost acknowledgement is verified idempotently on retry',async()=>{
  const {api}=setup();let lose=true;
  const publisher=G.create({ids,fetch:async(url,options)=>{const r=await api.fetch(url,options);if(options.method==='PUT'&&lose){lose=false;throw Error('Lost response');}return r;},now:()=>now});
  await assert.rejects(publisher.publish(token,[op]),e=>e.kind==='temporary');assert.equal(api.puts,1);
  assert.equal((await publisher.publish(token,[op])).wrote,false);assert.equal(api.puts,1);
});
test('unknown/corrupt remote IDs cannot be overwritten',async()=>{
  let writes=0;const publisher=G.create({ids,fetch:async(url,options)=>{if(options.method==='PUT')writes++;return {ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify(url===P.REPOSITORY?{private:false,full_name:'Planton361/myatlas',default_branch:'main'}:{type:'file',path:'progress/leetcode/solved.json',encoding:'base64',size:80,sha:'a'.repeat(40),content:btoa(JSON.stringify({...empty(),solved:[{...op,problemId:'unknown'}]}))})};}});
  await assert.rejects(publisher.publish(token,[op]),e=>e.kind==='invalid');assert.equal(writes,0);
});
test('rate limits respect server retry timing; nonconflicting 422 stops without blind overwrite',async()=>{
  const rate=G.create({ids,fetch:async()=>({ok:false,status:429,headers:{get:k=>k==='retry-after'?'180':null},text:async()=> '{}'})});
  await assert.rejects(rate.publish(token,[op]),e=>e.kind==='temporary'&&e.retryAfter>=180000);
  const {api}=setup();await G.create({ids,fetch:api.fetch}).publish(token,[op]);
  const bad=G.create({ids,fetch:(url,opts)=>opts.method==='PUT'?Promise.resolve({ok:false,status:422,headers:{get:()=>null},text:async()=> '{}'}):api.fetch(url,opts),pause:async()=>{}});
  await assert.rejects(bad.publish(token,[{...op,source:'accepted-dom-owner-confirmed'}]),e=>e.kind==='blocked');
});
test('public reader is anonymous; missing data is unknown and a failed refresh keeps a stale snapshot',async()=>{
  const {api,publisher}=setup(),reader=R.create({ids,fetch:api.fetch,now:()=>now});
  assert.equal((await reader.load()).status,'unavailable');
  await publisher.publish(token,[op]);assert.equal((await reader.load()).status,'published');
  api.setScenario('unavailable');const stale=await reader.load();assert.equal(stale.status,'stale');assert.equal(stale.value.solved.length,1);
  const reads=api.calls.filter(c=>c.accept==='application/vnd.github.raw+json');assert(reads.every(c=>!c.authenticated));
});
test('private, wrong-name or uninitialized repositories are blocked before token transmission',async()=>{
  for(const repo of [{private:true,full_name:'Planton361/myatlas',default_branch:'main'},{private:false,full_name:'Planton361/other',default_branch:'main'},{private:false,full_name:'Planton361/myatlas',default_branch:null}]){
    const calls=[];const publisher=G.create({ids,fetch:async(url,options)=>{calls.push(options);return {ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify(repo)};}});
    await assert.rejects(publisher.publish(token,[op]),e=>e.kind==='blocked');assert.equal(calls.length,1);assert.equal(calls[0].headers.Authorization,undefined);
  }
});
async function phase(h,wanted,check=()=>true){for(let i=0;i<80;i++){const result=await h.send({type:'state'});if(result.value.publisher.phase===wanted&&check(result.value.publisher))return result.value;await new Promise(r=>setTimeout(r,5));}throw Error('Missing phase '+wanted);}
test('worker opt-in keeps credentials in trusted session storage and publishes confirmed local IDs',async()=>{
  const api=M.create({ids}),record={...op,solved:true,observedAt:new Date().toISOString()},h=harness({progress:[record]},{fetch:api.fetch});
  assert.equal((await h.send({type:'state'})).value.publisher.enabled,false);assert.equal(api.calls.length,0);
  assert.equal((await h.send({type:'publisher-enable',token})).ok,true);const state=await phase(h,'published');
  assert.equal(state.publisher.pending,0);assert.equal(api.value.solved.length,1);
  assert.equal(h.session.publisherToken,token);assert.equal(h.sessionAccess.accessLevel,'TRUSTED_CONTEXTS');assert(!JSON.stringify(h.data).includes(token));assert(!JSON.stringify(state).includes(token));
  assert.equal(await h.send({type:'state'},{id:'test',url:'https://leetcode.com/problems/two-sum/',tab:{id:1}}),undefined);
  await h.send({type:'publisher-disable'});assert.equal(h.session.publisherToken,undefined);
});
test('worker retry outbox survives restart, remembers undo while disabled, and never resurrects deleted solves',async()=>{
  const api=M.create({ids}),record={...op,solved:true,observedAt:new Date().toISOString()},h=harness({progress:[record]},{fetch:api.fetch});
  api.setScenario('offline');await h.send({type:'publisher-enable',token});const pending=await phase(h,'pending',p=>p.attempts>0);
  assert.equal(pending.publisher.pending,1);assert(h.alarm.when>Date.now());
  h.fireAlarm();await phase(h,'published');assert.equal(api.puts,1);
  const restarted=harness(h.data,{fetch:api.fetch});assert.equal((await restarted.send({type:'state'})).value.publisher.phase,'token-required');
  await restarted.send({type:'publisher-enable',token});await phase(restarted,'published');
  await restarted.send({type:'publisher-disable'});await restarted.send({type:'remove',problemId:op.problemId});
  assert.equal(restarted.data.publisher.ops[0].source,null);
  await restarted.send({type:'publisher-enable',token});await phase(restarted,'published');assert.equal(api.value.solved.length,0);
});
test('worker rejects token without dropping pending IDs and makes permission denial a local-only state',async()=>{
  const api=M.create({ids}),record={...op,solved:true,observedAt:new Date().toISOString()},h=harness({progress:[record]},{fetch:api.fetch});
  api.setScenario('rejected');await h.send({type:'publisher-enable',token});const rejected=await phase(h,'token-rejected');assert.equal(rejected.publisher.pending,1);assert.equal(h.session.publisherToken,undefined);
  const denied=harness({progress:[record]},{fetch:api.fetch,permissions:false});assert.equal((await denied.send({type:'publisher-enable',token})).ok,false);assert.equal(denied.data.publisher,undefined);
});
test('an optional alarms API appearing after permission grant registers retries correctly',async()=>{
  const api=M.create({ids}),record={...op,solved:true,observedAt:new Date().toISOString()},h=harness({progress:[record]},{fetch:api.fetch,permissions:false,delayedAlarm:true});
  await h.send({type:'state'});h.grantPermissions();api.setScenario('offline');await h.send({type:'publisher-enable',token});await phase(h,'pending',p=>p.attempts>0);
  assert(h.alarm);h.fireAlarm();await phase(h,'published');assert.equal(api.puts,1);
});
