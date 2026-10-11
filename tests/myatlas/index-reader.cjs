'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const s=require('./index-test-support.cjs'),{reader,crypto}=s;
const pairs=s.fixtures(),p=JSON.parse(pairs[3].pointerText);
const projector=require('../../src/supplements/hyperskill-index-v1/projection.js').create({catalog:s.catalog,scopes:s.scopes,baseline:{...s.baseline,source:{...s.baseline.source,project_commit:'0'.repeat(40)}},catalogBinding:{catalog_sha256:'trusted-digest'},analytics:require('../../src/myatlas/knowledge-atlas-v6-skill-tree/progress-analytics.js')});
test('wire bytes from real Phase-3 generator validate; source/store differ; legacy README nested attestation',async()=>{
 for(const pair of pairs){const valid=await reader.validate(pair.pointerText,pair.payloadText,crypto);assert.notEqual(valid.store_revision,valid.index.revision);assert.deepEqual(valid.index.projects.map(p=>p.project_id).sort((a,b)=>a-b).filter(id=>[113,229,380].includes(id)),[113,229,380]);assert.equal(valid.index.projects.find(p=>p.project_id===113).manifest.attestation.path,'java/Simple Chat Bot with Java/README.md');}
});
test('complete register replaces static evidence; trusted KNOWN/UNKNOWN/UNMAPPED; verification/course unaffected',async()=>{
 const counts=[];
 for(const pair of pairs){const valid=await reader.validate(pair.pointerText,pair.payloadText,crypto),next=projector.snapshot(valid.index);counts.push(next.register.completed_project_count);assert.equal(next.analytics.global().verified,12);assert.deepEqual(next.completion.course_completion,s.baseline.course_completion);assert(next.completion.projects.every(p=>p.requirements_state!=='UNMAPPED'));assert.equal(next.catalog_binding.catalog_sha256,'trusted-digest');}
 assert.deepEqual(counts,[3,4,5,6,7]);assert.equal(projector.snapshot(JSON.parse(pairs[0].payloadText)).analytics.global().learned,32);
 const final=projector.snapshot(JSON.parse(pairs[3].payloadText));assert(final.analytics.global().learned>32);assert.deepEqual(final.register.unmapped_project_ids,[s.unmapped]);
 assert.deepEqual(final.register.projects.find(p=>p.project_id===s.unknown).topic_ids,[]);assert.deepEqual(final.register.projects.find(p=>p.project_id===s.unmapped).topic_ids,[]);
});
test('KNOWN_EMPTY, Unicode paths, unknown extensions and extensionless code keep explicit roles',async()=>{
 const valid=await reader.validate(pairs[4].pointerText,pairs[4].payloadText,crypto),next=projector.snapshot(valid.index);
 assert.equal(next.register.projects.find(p=>p.project_id===s.empty).requirements_state,'KNOWN_EMPTY');
 assert.deepEqual(next.register.projects.find(p=>p.project_id===s.empty).topic_ids,[]);
 const files=valid.index.projects.find(p=>p.project_id===s.unmapped).files;
 for(const name of ['unknown.future','program','é(!).future','𐀀program'])assert.equal(files.find(f=>f.path.endsWith('/'+name)).role,'solution');
 assert.equal(files.find(f=>f.path.endsWith('/data.bin')).role,'resource');
 assert(files.find(f=>f.path.endsWith('/é(!).future')).code_url.includes('%C3%A9%28%21%29.future'));
 for(const t of s.catalog.topics)assert.equal(next.analytics.topic(t.id).verified,projector.fallback.analytics.topic(t.id).verified);
 assert.equal(next.register.projects.flatMap(p=>p.topic_ids).includes(999999),false);
});
test('structurally valid extra index evidence fully replaces previous project rows, retaining direct observations',()=>{
 const value=JSON.parse(pairs[0].payloadText);value.projects=value.projects.filter(p=>p.project_id!==380);
 const next=projector.snapshot(value);assert.equal(next.register.completed_project_count,2);assert.equal(next.analytics.global().verified,12);
 for(const t of s.catalog.topics)assert.equal(next.analytics.topic(t.id).directlyLearned,projector.fallback.analytics.topic(t.id).directlyLearned);
});
const invalidPointer={foreign:q=>{q.repository='other/repo';},extra:q=>{q.cookies=true;},branch:q=>{q.index_url=q.index_url.replace(/\/([a-f0-9]{40})\/portfolio/,'/main/portfolio');},credentials:q=>{q.index_url=q.index_url.replace('https://','https://user:password@');},source:q=>{q.revision='a'.repeat(40);},host:q=>{q.index_url=q.index_url.replace('raw.githubusercontent.com','evil.invalid');},hash:q=>{q.index_sha256='b'.repeat(64);},nonString:q=>{q.revision=[q.revision];}};
for(const [name,mutate]of Object.entries(invalidPointer))test('reject pointer '+name,async()=>{const q={...p};mutate(q);await assert.rejects(reader.validate(reader.encode(q),pairs[3].payloadText,crypto));});
const invalidPayload={
 duplicate:v=>v.projects.push(v.projects[0]),unsorted:v=>v.projects.reverse(),empty:v=>{v.projects=[];},identity:v=>{v.projects[0].project_url='https://hyperskill.org/projects/999';},
 topicClaim:v=>{v.projects[0].topic_ids=[36];},courseClaim:v=>{v.course_completion={completed:true};},schema:v=>{v.schema=2;},validator:v=>{v.validator.version='2.0';},
 outside:v=>{v.projects.find(p=>p.project_id===s.unmapped).files[0].path='../outside';},missingREADME:v=>{v.projects.find(p=>p.project_id===s.unmapped).files=v.projects.find(p=>p.project_id===s.unmapped).files.filter(f=>!f.path.endsWith('/README.md'));},
 missingManifest:v=>{v.projects.find(p=>p.project_id===s.unmapped).files=v.projects.find(p=>p.project_id===s.unmapped).files.filter(f=>f.role!=='metadata');},referenceHash:v=>{v.projects.find(p=>p.project_id===s.unmapped).manifest.sha256='a'.repeat(64);},
 invalidHash:v=>{v.projects.find(p=>p.project_id===s.unmapped).files[0].sha256='sha';},invalidBlob:v=>{v.projects.find(p=>p.project_id===s.unmapped).files[0].git_blob='main';},roles:v=>{v.projects.find(p=>p.project_id===s.unmapped).files[0].role='executable';},
 wrongLink:v=>{v.projects.find(p=>p.project_id===s.unmapped).files.find(f=>f.role==='solution').code_url='https://evil.invalid/code';},branchLink:v=>{const f=v.projects.find(p=>p.project_id===s.unmapped).files.find(f=>f.role==='solution');f.code_url=f.code_url.replace(v.revision,'main');},
 binaryCodeMetadata:v=>{v.projects.find(p=>p.project_id===s.unmapped).files[0].code_url='https://evil.invalid/';},conflictingConfirmation:v=>{v.projects.find(p=>p.project_id===s.unmapped).completion.project_id=95;},
 invalidDate:v=>{v.projects.find(p=>p.project_id===s.unmapped).completion.confirmed_at='2026-02-31T00:00:00Z';},inventedTime:v=>{v.projects.find(p=>p.project_id===s.unmapped).completion.completed_at='2027-01-01T00:00:00Z';},
 unsafePath:v=>{v.projects.find(p=>p.project_id===s.unmapped).files[2].path=v.projects.find(p=>p.project_id===s.unmapped).archive_path+'/solution/../private.key';},
 caseAlias:v=>{const row=v.projects.find(p=>p.project_id===s.unmapped),f=row.files.find(f=>f.role==='solution');row.files.push({...f,path:f.path.replace('/solution/','/Solution/'),code_url:reader.codeURL(v.revision,f.path.replace('/solution/','/Solution/'))});row.files.sort((a,b)=>a.path.localeCompare(b.path));},
 extraFileField:v=>{v.projects.find(p=>p.project_id===s.unmapped).files[0].mode='120000';},
};
for(const [name,mutate]of Object.entries(invalidPayload))test('reject payload '+name,async()=>{const v=structuredClone(JSON.parse(pairs[3].payloadText));mutate(v);const pair=await s.rehash(v,p);await assert.rejects(reader.validate(pair.pointerText,pair.payloadText,crypto));});
test('reject noncanonical bytes, duplicate keys, BOM and malformed UTF-8',async()=>{
 await assert.rejects(reader.validate(pairs[0].pointerText,pairs[0].payloadText+' ',crypto));
 assert.throws(()=>reader.decode('{"schema":1,"schema":1}\n'));
 assert.throws(()=>reader.decode('\ufeff'+pairs[0].pointerText));
 const r=reader.create({fallback:projector.fallback,crypto,fetcher:async url=>s.response(url,new Uint8Array([255]))});await r.refresh();assert.match(r.state().error,/UTF-8/);
});
test('anonymous bounded fetch; first failure retains static fallback',async()=>{
 const options=[];const r=reader.create({fallback:projector.fallback,crypto,derive:projector.snapshot,fetcher:s.fetchPair(pairs[0],(_u,o)=>options.push(o))});await r.refresh();assert.equal(r.state().status,'current');
 assert(options.every(o=>o.credentials==='omit'&&o.redirect==='error'&&o.referrerPolicy==='no-referrer'&&o.method==='GET'));assert.equal(r.state().snapshot.register.completed_project_count,3);
 const broken=reader.create({fallback:projector.fallback,crypto,fetcher:async()=>{throw Error('Offline');}});await broken.refresh();assert.equal(broken.state().status,'unavailable');assert.equal(broken.state().snapshot.analytics.global().learned,32);
});
test('atomic transitions and LKG on missing pointer/payload, hashes, network, oversized and redirect responses',async()=>{
 let pair=pairs[0],failure=null;const events=[];
 const r=reader.create({fallback:projector.fallback,crypto,derive:projector.snapshot,onChange:state=>events.push(state.snapshot.register.completed_project_count),fetcher:async(url,options)=>failure?failure(url):s.fetchPair(pair)(url,options)});
 await r.refresh();pair=pairs[3];await r.refresh();assert.deepEqual(events,[3,6]);const last=r.state().snapshot;
 const failures=[async()=>{throw Error('Network abort');},async url=>s.response(url,'',{status:404}),async url=>s.response(url,'',{headers:{'content-length':'999999999'}}),async url=>{const response=s.response(url,'');Object.defineProperty(response,'redirected',{value:true});return response;},async url=>s.response(url,url===reader.ENDPOINT?pairs[0].pointerText:pairs[3].payloadText)];
 for(const fail of failures){failure=fail;await r.refresh();assert.equal(r.state().status,'stale');assert.strictEqual(r.state().snapshot,last);}
});
test('cache validated again; corrupted cache retains fallback; storage denial harmless',async()=>{
 const store=s.storage();const first=reader.create({fallback:projector.fallback,crypto,derive:projector.snapshot,storage:store,fetcher:s.fetchPair(pairs[3])});await first.refresh();
 const cached=reader.create({fallback:projector.fallback,crypto,derive:projector.snapshot,storage:store,fetcher:async()=>{throw Error('Offline');}});await cached.restore();await cached.refresh();assert.equal(cached.state().status,'stale');assert.equal(cached.state().snapshot.register.completed_project_count,6);
 const bad=reader.create({fallback:projector.fallback,crypto,storage:s.storage('{bad')});await bad.restore();assert.equal(bad.state().snapshot.register.completed_project_count,3);
 const malformed=JSON.parse(store.value());malformed.payloadText=malformed.payloadText.replace('Synthetic','Changed');const tampered=reader.create({fallback:projector.fallback,crypto,storage:s.storage(JSON.stringify(malformed))});await tampered.restore();assert.equal(tampered.state().snapshot.register.completed_project_count,3);
 const denied=reader.create({fallback:projector.fallback,crypto,derive:projector.snapshot,fetcher:s.fetchPair(pairs[0]),storage:{setItem(){throw Error('Denied');}}});await denied.refresh();assert.equal(denied.state().status,'current');
});
test('idempotence, no concurrent fetches, known rollback/immutable mutation rejected',async()=>{
 let pair=pairs[0],requests=0;const r=reader.create({fallback:projector.fallback,crypto,derive:projector.snapshot,fetcher:async(...args)=>{requests++;return s.fetchPair(pair)(...args);}});
 const first=r.refresh();assert.strictEqual(first,r.refresh());await first;assert.equal(requests,2);await r.refresh();assert.equal(r.state().snapshot.register.completed_project_count,3);
 pair=pairs[1];await r.refresh();pair=pairs[0];await r.refresh();assert.equal(r.state().status,'stale');assert.equal(r.state().snapshot.register.completed_project_count,4);
 const value=JSON.parse(pairs[1].payloadText);value.projects[0].title='Changed immutable title';pair=await s.rehash(value,JSON.parse(pairs[1].pointerText));await r.refresh();assert.match(r.state().error,/immutable revision changed/);
});
test('timeout and late older responses cannot replace a newer snapshot; cancel ignores results',async()=>{
 let resolveOld;let slow=true;
 const r=reader.create({fallback:projector.fallback,crypto,derive:projector.snapshot,timeout:20,fetcher:async(url,options)=>slow?new Promise(resolve=>{resolveOld=()=>resolve(s.response(url,pairs[0].pointerText));}):s.fetchPair(pairs[3])(url,options)});
 await r.refresh();assert.match(r.state().error,/timeout/);slow=false;await r.refresh();assert.equal(r.state().snapshot.register.completed_project_count,6);resolveOld();await new Promise(resolve=>setTimeout(resolve,30));assert.equal(r.state().snapshot.register.completed_project_count,6);
 let resolve;const pending=reader.create({fallback:projector.fallback,crypto,derive:projector.snapshot,fetcher:async(url,options)=>{if(url===reader.ENDPOINT)await new Promise(r=>{resolve=r;});return s.fetchPair(pairs[3])(url,options);}});const work=pending.refresh();pending.cancel();resolve();await work;assert.equal(pending.state().snapshot.register.completed_project_count,3);
});
test('cache restoration cannot overtake a completed newer refresh',async()=>{
 const store=s.storage(JSON.stringify({schema:1,...pairs[0]}));let release;let first=true;
 const delayedCrypto={subtle:{digest:async(...args)=>{if(first){first=false;await new Promise(resolve=>{release=resolve;});}return crypto.subtle.digest(...args);}}};
 const r=reader.create({fallback:projector.fallback,crypto:delayedCrypto,storage:store,derive:projector.snapshot,fetcher:s.fetchPair(pairs[3])});
 const restoring=r.restore();await new Promise(resolve=>setTimeout(resolve,0));await r.refresh();release();await restoring;
 assert.equal(r.state().status,'current');assert.equal(r.state().snapshot.register.completed_project_count,6);
});
test('case aliases across different archives cannot evade per-file inventory checks',async()=>{
 const value=JSON.parse(pairs[0].payloadText),row=structuredClone(value.projects[0]),old=row.archive_path;
 row.project_id=900000002;row.evidence_id='hyperskill:900000002';row.project_url='https://hyperskill.org/projects/900000002';row.completion.project_id=row.project_id;
 row.archive_path=old.toLowerCase();
 for(const f of row.files){f.path=f.path.replace(old+'/',row.archive_path+'/');if(f.role==='solution')f.code_url=reader.codeURL(value.revision,f.path);}
 row.manifest={...row.manifest,path:row.archive_path+'/.hyperskill-import.json'};delete row.manifest.attestation;
 value.projects.push(row);const pair=await s.rehash(value,JSON.parse(pairs[0].pointerText));
 await assert.rejects(reader.validate(pair.pointerText,pair.payloadText,crypto),/case alias/);
});
