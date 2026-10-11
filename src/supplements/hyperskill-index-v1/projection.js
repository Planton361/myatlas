/* Catalog binding only. All learning/verification uses accepted ProgressAnalytics. */
(function(g){
'use strict';
function create({catalog,scopes,baseline,catalogBinding,analytics=g.ProgressAnalytics}){
 const known=new Map(scopes.projects.map(p=>[p.scope_id,p]));
 function snapshot(index){
  const rows=index.projects.map(p=>{
   const scope=known.get(p.project_id),state=scope?.state==='KNOWN'&&!scope.explicit_topic_ids.length?'KNOWN_EMPTY':scope?.state||'UNMAPPED';
   return {...p.completion,observed_at:p.completion.confirmed_at||p.completion.observed_at,
    source:(p.manifest.attestation||p.manifest).path,method:'validated_revision_bound_project_index',
    requirements_state:state,topic_ids:state==='UNKNOWN'||state==='UNMAPPED'?[]:[...new Set(scope.explicit_topic_ids)].sort((a,b)=>a-b)};
  });
  const completion={schema:2,policy:baseline.policy,projects:rows.filter(p=>known.has(p.project_id)),course_completion:baseline.course_completion};
  const a=analytics.create({catalog,scopes,completion});
  // Serialize accepted results for the existing frozen projection-adapter.
  // Its source/effective-learning consistency assertions remain active.
  completion.effective_learned_topic_ids=catalog.topics.filter(t=>a.topic(t.id).learned===true).map(t=>t.id).sort((a,b)=>a-b);
  completion.verified_topic_ids=catalog.topics.filter(t=>a.topic(t.id).verified===true).map(t=>t.id).sort((a,b)=>a-b);
  completion.completed_project_ids=completion.projects.map(p=>p.project_id);
  completion.completed_project_count=completion.projects.length;
  const global=a.global();completion.global={state:global.state,eligible:global.eligible,learned:global.learned,verified:global.verified};
  completion.source={commit:catalogBinding.application_revision,project_commit:index.revision,catalog_binding:catalogBinding};
  const register={schema:1,projects:rows,completed_project_ids:rows.map(p=>p.project_id),completed_project_count:rows.length,unmapped_project_ids:rows.filter(p=>!known.has(p.project_id)).map(p=>p.project_id)};
  return Object.freeze({analytics:a,completion,register,catalog_binding:catalogBinding,source_revision:index.revision,
   portfolio:index.projects.map((p,i)=>({...p,requirements_state:rows[i].requirements_state,topic_ids:rows[i].topic_ids,code_url:p.files.find(f=>f.role==='solution').code_url}))});
 }
 // A valid static projection remains the first-visit fallback. Its evidence is
 // replaced wholesale after validation, never merged with the indexed rows.
 const a=analytics.create({catalog,scopes,completion:baseline}),rows=baseline.completion_register?.projects||baseline.projects;
 const fallback=Object.freeze({analytics:a,completion:baseline,catalog_binding:catalogBinding,source_revision:baseline.source.project_commit,
  register:baseline.completion_register||{schema:1,projects:rows,completed_project_ids:rows.map(p=>p.project_id),completed_project_count:rows.length,unmapped_project_ids:[]},
  portfolio:rows.map(p=>({...p,title:p.title||known.get(p.project_id)?.title||'Hyperskill Project '+p.project_id,languages:p.languages||[],code_url:null}))});
 return {snapshot,fallback};
}
g.HyperskillProjection={create};if(typeof module!=='undefined')module.exports=g.HyperskillProjection;
})(globalThis);
