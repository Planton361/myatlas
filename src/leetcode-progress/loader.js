/* Anonymous public projection. No Chrome, publisher, credentials or catalog data. */
(function(g){
'use strict';
const URL='https://raw.githubusercontent.com/Planton361/myatlas/main/progress/leetcode/solved.json';
const MAX_BYTES=768*1024, TTL=60000, MAX_CACHE_AGE=86400000;
const SOURCES=new Set(['manual-owner-attestation','accepted-dom-owner-confirmed']);
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join('|')===keys.slice().sort().join('|');
function validate(value,ids=null,now=Date.now()){
 if(!exact(value,['schemaVersion','updatedAt','solved'])||value.schemaVersion!==1||
    typeof value.updatedAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value.updatedAt)||
    !Number.isFinite(Date.parse(value.updatedAt))||new Date(value.updatedAt).toISOString()!==value.updatedAt||
    Date.parse(value.updatedAt)>now+60000||!Array.isArray(value.solved)||value.solved.length>10000)
  throw Error('Invalid public progress schema');
 const rows=new Map();let duplicates=0;
 for(const row of value.solved){
  if(!exact(row,['problemId','source'])||typeof row.problemId!=='string'||
     !/^lc:problem:(?:p[0-9]{4}|eval-[0-9]{5})$/.test(row.problemId)||!SOURCES.has(row.source))
   throw Error('Invalid canonical Problem ID or attestation source');
  if(rows.has(row.problemId)){if(rows.get(row.problemId).source!==row.source)throw Error('Conflicting duplicate attestation');duplicates++;}
  else rows.set(row.problemId,{problemId:row.problemId,source:row.source});
 }
 const solved=[...rows.values()].sort((a,b)=>a.problemId.localeCompare(b.problemId));
 // No numeric/slug inference. An optional caller-owned catalog resolves exact IDs.
 return {document:{schemaVersion:1,updatedAt:value.updatedAt,solved},duplicates,
  resolved:ids===null?[]:solved.filter(r=>ids.has(r.problemId)),
  unresolved:ids===null?[]:solved.filter(r=>!ids.has(r.problemId)),catalogChecked:ids!==null};
}
async function read(response){
 const length=Number(response.headers?.get('content-length'));if(length>MAX_BYTES)throw Error('Public response too large');
 if(!response.body?.getReader){const text=await response.text();if(new TextEncoder().encode(text).length>MAX_BYTES)throw Error('Public response too large');return text;}
 const reader=response.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let size=0,text='';
 try{for(;;){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>MAX_BYTES)throw Error('Public response too large');text+=decoder.decode(chunk.value,{stream:true});}return text+decoder.decode();}
 catch(e){await reader.cancel();throw e;}
 finally{reader.releaseLock();}
}
function create({ids=null,fetch:request=g.fetch.bind(g),now=()=>Date.now(),storage=null,timeout=15000}={}){
 let last=null,checkedAt=null,flight=null,lastError=null;
 const key='myatlas-public-progress-v1:'+URL;
 function cached(){
  try{const c=JSON.parse(storage?.getItem(key)||'null');
   if(c&&Number.isFinite(c.checkedAt)&&c.checkedAt<=now()&&now()-c.checkedAt<=MAX_CACHE_AGE){last=validate(c.document,ids,now());checkedAt=c.checkedAt;}
  }catch{/* Storage is optional; invalid or expired data is never projected. */}
 }
 cached();
 function result(status,error=null,cache=false){return {status,value:last,checkedAt:checkedAt===null?null:new Date(checkedAt).toISOString(),error,cache};}
 async function refresh(){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{
   const response=await request(URL,{method:'GET',credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',cache:'no-cache',signal:controller.signal,headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   const next=validate(JSON.parse(await read(response)),ids,now());last=next;checkedAt=now();lastError=null;
   try{storage?.setItem(key,JSON.stringify({document:last.document,checkedAt}));}catch{/* Still usable when storage is blocked. */}
   return result('published');
  }catch{
   lastError='Public progress unavailable. '+(last?'Showing the last validated snapshot.':'Solved total is unknown.');
   return result(last?'stale':'unavailable',lastError);
  }finally{clearTimeout(timer);}
 }
 function load({force=false}={}){
  if(flight)return flight;
  if(!force&&last&&now()-checkedAt<TTL)return Promise.resolve(result(lastError?'stale':'published',lastError,true));
  flight=refresh().finally(()=>{flight=null;});return flight;
 }
 return {load};
}
function project(base,value){
 const solved=new Map(value.resolved.map(r=>[r.problemId,r]));
 const byProblem=new Map([...base.byProblem].map(([id,row])=>[id,{...row,state:solved.has(id)?'solved':'not-recorded',
  solvedDate:null,officialAccepted:false,evidence:[],trackerSource:solved.get(id)?.source,observedAt:solved.has(id)?value.document.updatedAt:null}]));
 const solvedIds=new Set(solved.keys()),coverage=new Map([...base.coverage].map(([id,c])=>[id,{primary:new Set(c.primary),members:new Set(c.members),solved:new Set([...c.members].filter(p=>solvedIds.has(p)))}]));
 return {...base,byProblem,solvedIds,attemptedIds:new Set(),coverage,uniqueSolved:solvedIds.size,uniqueAttempted:0};
}
const api={URL,TTL,MAX_BYTES,validate,create,project};g.MyAtlasReadOnlyProgress=Object.freeze(api);if(typeof module!=='undefined')module.exports=api;
})(globalThis);
