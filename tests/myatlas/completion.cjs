const E=require('./validated-baseline.cjs'),expected=E.projection;
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),path=require('node:path');
const base=path.resolve(__dirname,'../../src/myatlas/knowledge-atlas-v6-skill-tree'),P=require(base+'/progress-analytics.js'),presentation=require(base+'/progress-presentation.js');
const read=p=>JSON.parse(fs.readFileSync(path.resolve(__dirname,p)));
const catalog=read('../../src/myatlas/knowledge-atlas-scope-pyramid/catalog.json'),scopes=read('../../src/myatlas/knowledge-atlas-scope-pyramid/scope-index.json'),completion=read('../../data/myatlas/progress.json');
const frozen=JSON.stringify({catalog,scopes,completion}),baseline=P.create({catalog,scopes}),legacy=P.create({catalog,scopes,completion});
assert.equal(legacy.global().learned,expected.global.learned);assert.equal(legacy.global().verified,expected.global.verified);assert.deepEqual(legacy.newLearnedTopicIds(),[]);assert.equal(legacy.topic(9).evidenceSource,'both');
const id=catalog.progress.topics.find(t=>t.is_learned===false).topic_id;
const fixture=structuredClone(scopes),attest=(pid,ids)=>({project_id:pid,status:'completed',attested_by:'owner',observed_at:'2026-10-08T12:00:00Z',source:'fixture/.hyperskill-import.json',topic_ids:ids});
fixture.projects.push({scope_id:900001,state:'KNOWN',explicit_topic_ids:[id,9]},{scope_id:900002,state:'KNOWN',explicit_topic_ids:[id]},{scope_id:900003,state:'UNKNOWN',explicit_topic_ids:null},{scope_id:900004,state:'KNOWN_EMPTY',explicit_topic_ids:[]});
const candidate={...completion,projects:[...completion.projects,attest(900001,[id,9].sort((a,b)=>a-b)),attest(900002,[id]),attest(900003,[]),attest(900004,[])]};
const a=P.create({catalog,scopes:fixture,completion:candidate});
assert.equal(a.global().learned,expected.global.learned+1);assert.equal(a.global().verified,expected.global.verified);assert.equal(a.topic(id).evidenceSource,'learned through completed Project');assert.equal(a.topic(id).learned,true);assert.deepEqual(a.newLearnedTopicIds(),[id]);
assert.deepEqual(a.officialCourseProgress(8),baseline.officialCourseProgress(8));assert.equal(a.scope('project',900003).learned,null);assert.equal(a.scope('project',900004).learned,0);
for(const type of ['course','project','stage'])for(const row of scopes[type+'s']){const before=baseline.scope(type,row.scope_id),after=a.scope(type,row.scope_id);assert.equal(after.verified,before.verified);assert.equal(after.learned,before.learned===null?null:before.learned+(row.explicit_topic_ids.includes(id)?1:0));}
for(const category of catalog.categories){assert.equal(a.category(category.id).learned,baseline.category(category.id).learned+(a.descendants(category.id).has(id)?1:0));assert.equal(a.category(category.id).verified,baseline.category(category.id).verified);}
assert.match(presentation.topic(a,id),/Owner-attested Project 900001/);assert.match(presentation.topic(a,id),/2026-10-08T12:00:00Z/);
assert.deepEqual(a.global(),P.create({catalog,scopes:fixture,completion:candidate}).global());
const raw=read('../../src/myatlas/knowledge-atlas-v6-skill-tree/model.json');
const context={ProgressAnalytics:P,performance:{now:()=>0}};context.globalThis=context;vm.createContext(context);
for(const file of ['global-registry.js','model.js','routing.js','layout.js'])vm.runInContext(fs.readFileSync(base+'/'+file,'utf8'),context);
const original=context.AtlasModel.model(raw),withLegacy=context.AtlasModel.model({...raw,projectCompletion:completion,completionScopes:scopes}),grown=context.AtlasModel.model({...raw,projectCompletion:candidate,completionScopes:fixture});
assert.equal(grown.raw.counts.learned,expected.global.learned+1);assert(grown.scope.has('topic:'+id));assert.equal(grown.raw.counts.verified,original.raw.counts.verified);
const measure=(s,size=14)=>s.length*size*.55;
const geometry=m=>JSON.stringify(context.AtlasLayout.build(m,measure),(k,v)=>['data','parent'].includes(k)?undefined:v);
assert.equal(geometry(original),geometry(withLegacy));
assert.equal(JSON.stringify({catalog,scopes,completion}),frozen);
console.log('PASS: union, overlap, all Courses/Projects/Stages/Categories, official snapshots, verification, legacy, UNKNOWN/EMPTY, idempotence, Skill Tree growth and legacy geometry');
