/* External register serialization only; learning uses the accepted projection. */
'use strict';
const fs=require('node:fs');
const {run:projectAccepted}=require('./completion_projection.cjs');
const canonical=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
function run(input){
 const known=new Set(input.scopes.projects.map(p=>p.scope_id));
 if(input.completion.projects.some(p=>!known.has(p.project_id)))throw Error('Unmapped completion must stay in the separate register');
 const register=input.completion.completion_register;
 if(register){
  const rows=register.projects,ids=rows.map(p=>p.project_id);
  if(register.schema!==1||ids.some(id=>!Number.isSafeInteger(id)||id<=0)||new Set(ids).size!==ids.length||canonical(ids)!==canonical([...ids].sort((a,b)=>a-b))||canonical(ids)!==canonical(register.completed_project_ids)||register.completed_project_count!==ids.length)throw Error('Invalid completion register identities');
  if(canonical(register.unmapped_project_ids)!==canonical(ids.filter(id=>!known.has(id))))throw Error('Invalid register catalog mapping');
  for(const p of rows){
   if(p.status!=='completed'||p.attested_by!=='owner'||!p.source||!p.observed_at)throw Error('Invalid register attestation');
   if(!known.has(p.project_id)&&(p.requirements_state!=='UNMAPPED'||p.topic_ids.length))throw Error('Unmapped completion cannot claim Topics');
  }
  if(canonical(rows.filter(p=>known.has(p.project_id)))!==canonical(input.completion.projects))throw Error('Register/catalog completion mismatch');
 }
 const result=projectAccepted(input);
 if(register)result.projection.completion_register=register;
 const previous=input.previous?.completion_register;
 if(register||previous){
  const changed=canonical(register||null)!==canonical(previous||null);
  result.changes.semantic_change ||= changed;
  result.changes.completion_register=register||null;
  const oldIds=previous?.completed_project_ids||input.previous?.completed_project_ids||[];
  const newIds=register?.completed_project_ids||result.projection.completed_project_ids;
  result.changes.newly_registered_project_ids=newIds.filter(id=>!oldIds.includes(id));
  result.changes.removed_registered_project_ids=oldIds.filter(id=>!newIds.includes(id));
 }
 return result;
}
module.exports={run};
if(require.main===module)process.stdout.write(JSON.stringify(run(JSON.parse(fs.readFileSync(0,'utf8'))))+'\n');
