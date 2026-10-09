/* Shared public contract. No credentials, local catalog export, or Chrome dependency. */
(function(g){
  'use strict';
  const ENDPOINT='https://api.github.com/repos/Planton361/myatlas/contents/progress/leetcode/solved.json';
  const REPOSITORY='https://api.github.com/repos/Planton361/myatlas';
  const API_VERSION='2026-03-10',MAX_BYTES=768*1024;
  const SOURCES=new Set(['manual-owner-attestation','accepted-dom-owner-confirmed']);
  const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join('|')===[...keys].sort().join('|');
  function validate(value,ids,now=Date.now()){
    if(!exact(value,['schemaVersion','updatedAt','solved'])||value.schemaVersion!==1||
       typeof value.updatedAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value.updatedAt)||
       !Number.isFinite(Date.parse(value.updatedAt))||Date.parse(value.updatedAt)>now+60000||
       new Date(value.updatedAt).toISOString()!==value.updatedAt||!Array.isArray(value.solved)||value.solved.length>ids.size)
      throw Error('Invalid public progress schema');
    const seen=new Set(),solved=value.solved.map(r=>{
      if(!exact(r,['problemId','source'])||!ids.has(r.problemId)||seen.has(r.problemId)||!SOURCES.has(r.source))
        throw Error('Unknown, duplicate or invalid public Problem ID/source');
      seen.add(r.problemId);return {problemId:r.problemId,source:r.source};
    }).sort((a,b)=>a.problemId.localeCompare(b.problemId));
    return {schemaVersion:1,updatedAt:value.updatedAt,solved};
  }
  function operations(rows,ids){
    if(!Array.isArray(rows)||rows.length>ids.size)throw Error('Invalid pending operations');
    const seen=new Set();return rows.map(r=>{
      if(!exact(r,['problemId','source'])||!ids.has(r.problemId)||seen.has(r.problemId)||(r.source!==null&&!SOURCES.has(r.source)))throw Error('Invalid pending operation');
      seen.add(r.problemId);return {problemId:r.problemId,source:r.source};
    });
  }
  function merge(remote,ops,ids,now=Date.now()){
    const checked=validate(remote,ids,now),map=new Map(checked.solved.map(r=>[r.problemId,r]));
    for(const op of operations(ops,ids))if(op.source===null)map.delete(op.problemId);else map.set(op.problemId,op);
    const solved=[...map.values()].sort((a,b)=>a.problemId.localeCompare(b.problemId));
    if(JSON.stringify(solved)===JSON.stringify(checked.solved))return {changed:false,value:checked};
    return {changed:true,value:{schemaVersion:1,updatedAt:new Date(Math.max(now,Date.parse(checked.updatedAt)+1)).toISOString(),solved}};
  }
  function trackerExport(value,ids){
    const p=validate(value,ids);return {format:'myatlas-leetcode-progress',version:1,records:p.solved.map(r=>({...r,solved:true,observedAt:p.updatedAt}))};
  }
  const api={ENDPOINT,REPOSITORY,API_VERSION,MAX_BYTES,validate,operations,merge,trackerExport};g.MyAtlasPublicProgress=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
