const E=require('./validated-baseline.cjs'),expected=E.projection;
/* Presentation-only contracts; the accepted analytics module is read without edits. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const P=require('../../src/myatlas/knowledge-atlas-v6-skill-tree/progress-analytics.js'),V=require('../../src/myatlas/knowledge-atlas-v6-skill-tree/progress-presentation.js');
const read=p=>JSON.parse(fs.readFileSync(p)),catalog=read('src/myatlas/knowledge-atlas-scope-pyramid/catalog.json'),scopes=read('src/myatlas/knowledge-atlas-scope-pyramid/scope-index.json'),completion=read('data/myatlas/progress.json');
const before=JSON.stringify({catalog,scopes,completion}),a=P.create({catalog,scopes,completion});
assert(V.overview(a,8).includes(expected.global.learned+' / '+expected.global.eligible.toLocaleString('en-US')));assert(V.overview(a,8).includes(expected.global.verified+' verified'));assert.doesNotMatch(V.overview(a,8),/Courses completed|catalog|Not recorded/);
for(const [type,id] of [['course',8],['project',8],['stage',46]]){
 const rowExpected=expected.coverage[type+'s'].find(s=>s.id===id),count=rowExpected.learned+' / '+rowExpected.eligible;
 const row=a.scopeMaps[type].get(id),markup=V.scopeCard(a,type,id,{details:false});assert(markup.includes(row.title));assert(markup.includes(count+' learned'));assert(markup.includes('data-scope="'+type+' '+id+'"'));assert.doesNotMatch(markup,/Not recorded|evidenced learned|Denominator|verification unknown|Official Hyperskill/);
 const stat=a.scope(type,id),bar=V.bar(stat);for(const cls of ['learned','not-learned','unknown'])assert(bar.includes('class="'+cls+'"'));
 assert.match(V.scopeDetails(a,type,id),/Topic denominator/);
}
assert.match(V.scopeCard(a,'project',229),/Requirements unknown/);assert.doesNotMatch(V.scopeCard(a,'project',229),/0 \/ 0|completion-status/);
assert.match(V.scopeCard(a,'project',405),/No required Topics/);assert.match(V.scopeCard(a,'stage',179),/No required Topics/);
assert.equal(V.completionStatus(a.completionStatus('stage',617)),'');assert.match(V.scopeCard(a,'project',113),/>Completed</);
const explicit={...completion,course_completion:{schema:1,records:[{course_id:8,is_completed:true,source:'owner',evidence_id:'copy-course-fixture',observed_at:'2026-10-08T14:00:00Z'}]}},e=P.create({catalog,scopes,completion:explicit});assert.match(V.overview(e),/Courses completed/);assert.match(V.scopeCard(e,'course',8),/>Completed</);assert.equal(e.global().learned,expected.global.learned);assert.equal(e.global().verified,expected.global.verified);
const details=V.panelDetails(a,{course:8,project:8,stage:46,topicIds:catalog.topics.map(t=>t.id)});assert.equal((details.match(/<details data-progress-details>/g)||[]).length,1);assert.doesNotMatch(details,/<details[^>]*open/);for(const text of ['explicitly not learned','explicitly not verified','verification unknown','Official Hyperskill','Owner-attested Project 113','Direct observation','2026-10-01','2026-10-08','Project denominator','Completed Project IDs: 113'])assert(details.includes(text),text);
assert.equal(JSON.stringify({catalog,scopes,completion}),before);assert.equal(a.global().learned,expected.global.learned);assert.equal(a.global().verified,expected.global.verified);assert.equal(a.portfolio().completed_project_count,expected.completed_project_count);assert.equal(a.portfolio().completed_course_count,null);
console.log('Copy presentation contracts PASS: short names/counts, omitted missing completion, explicit completion, UNKNOWN/empty, segmented bars, one collapsed details section, retained evidence and pure inputs');
