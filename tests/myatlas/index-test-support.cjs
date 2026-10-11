'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
const reader=require('../../src/supplements/hyperskill-index-v1/reader.js');
const catalog=read('src/myatlas/knowledge-atlas-scope-pyramid/catalog.json'),scopes=read('src/myatlas/knowledge-atlas-scope-pyramid/scope-index.json'),baseline=JSON.parse(execFileSync(process.env.PYTHON||'python3.12',['-B','scripts/sync-hyperskill-projects.py','--evidence-root',process.env.HYPERSKILL_EVIDENCE_ROOT],{cwd:root,maxBuffer:16*1024*1024})).projection;
const learned=new Set(baseline.effective_learned_topic_ids);
const known=scopes.projects.filter(p=>p.state==='KNOWN'&&p.explicit_topic_ids.some(id=>!learned.has(id))).sort((a,b)=>a.explicit_topic_ids.length-b.explicit_topic_ids.length)[0].scope_id;
const unknown=scopes.projects.find(p=>p.state==='UNKNOWN'&&!baseline.completed_project_ids.includes(p.scope_id)).scope_id;
const unmapped=900000001,empty=scopes.projects.find(p=>p.state==='KNOWN'&&!p.explicit_topic_ids.length).scope_id;
function fixtures(){
 if(!process.env.HYPERSKILL_EVIDENCE_ROOT)throw Error('HYPERSKILL_EVIDENCE_ROOT must be a Schema-4/Phase-3 checkout');
 return JSON.parse(execFileSync(process.env.PYTHON||'python3.12',['-B',path.join(__dirname,'index-fixtures.py'),known,unknown,unmapped,empty].map(String),{cwd:root,maxBuffer:16*1024*1024}));
}
const crypto=require('node:crypto').webcrypto;
async function rehash(value,pointer){const payloadText=reader.encode(value),p={...pointer,index_sha256:await reader.digest(new TextEncoder().encode(payloadText),crypto)};return {pointerText:reader.encode(p),payloadText};}
function response(url,text,options={}){const r=new Response(text,{status:200,...options});Object.defineProperty(r,'url',{value:url});return r;}
function fetchPair(pair,check=()=>{}){return async(url,options)=>{check(url,options);return response(url,url===reader.ENDPOINT?pair.pointerText:pair.payloadText);};}
function storage(initial=null){let value=initial;return {getItem:()=>value,setItem:(_key,v)=>{value=v;},value:()=>value};}
module.exports={root,reader,catalog,scopes,baseline,known,unknown,unmapped,empty,fixtures,crypto,rehash,response,fetchPair,storage};
