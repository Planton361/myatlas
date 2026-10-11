/* Contract 1.0 consumer. Index bytes are data; never execute archive content. */
(function(g){
'use strict';
const REPOSITORY='Planton361/hyperskill-projects';
const ENDPOINT='https://planton361.github.io/hyperskill-projects/portfolio/current.json';
const RAW='https://raw.githubusercontent.com/'+REPOSITORY+'/';
const CODE='https://github.com/'+REPOSITORY+'/blob/';
const SHA=/^[a-f0-9]{40}$/, HASH=/^[a-f0-9]{64}$/;
const validSHA=v=>typeof v==='string'&&SHA.test(v), validHash=v=>typeof v==='string'&&HASH.test(v);
const fail=message=>{throw Error('Hyperskill index: '+message);};
const require=(condition,message)=>{if(!condition)fail(message);};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function fields(value,required,optional=[]){
 require(object(value)&&required.every(k=>Object.hasOwn(value,k))&&Object.keys(value).every(k=>required.includes(k)||optional.includes(k)),'unexpected fields');
}
const id=v=>Number.isSafeInteger(v)&&v>0;
// Python's ensure_ascii=False, sort_keys=True, compact JSON + LF. Contract keys
// are ASCII; paths/language values use Unicode code point order, not UTF-16 order.
function compare(a,b){const x=Array.from(a),y=Array.from(b);for(let i=0;i<Math.min(x.length,y.length);i++){const d=x[i].codePointAt(0)-y[i].codePointAt(0);if(d)return d;}return x.length-y.length;}
function canonical(v){
 if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
 if(object(v))return '{'+Object.keys(v).sort(compare).map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
 return JSON.stringify(v);
}
const encode=v=>canonical(v)+'\n';
function decode(text){let v;try{v=JSON.parse(text);}catch{fail('invalid JSON');}require(encode(v)===text,'noncanonical JSON (including duplicate keys)');return v;}
const CASEFOLD={"\u00b5":"\u03bc","\u00df":"ss","\u0149":"\u02bcn","\u017f":"s","\u01f0":"j\u030c","\u0345":"\u03b9","\u0390":"\u03b9\u0308\u0301","\u03b0":"\u03c5\u0308\u0301","\u03c2":"\u03c3","\u03d0":"\u03b2","\u03d1":"\u03b8","\u03d5":"\u03c6","\u03d6":"\u03c0","\u03f0":"\u03ba","\u03f1":"\u03c1","\u03f5":"\u03b5","\u0587":"\u0565\u0582","\u13a0":"\u13a0","\u13a1":"\u13a1","\u13a2":"\u13a2","\u13a3":"\u13a3","\u13a4":"\u13a4","\u13a5":"\u13a5","\u13a6":"\u13a6","\u13a7":"\u13a7","\u13a8":"\u13a8","\u13a9":"\u13a9","\u13aa":"\u13aa","\u13ab":"\u13ab","\u13ac":"\u13ac","\u13ad":"\u13ad","\u13ae":"\u13ae","\u13af":"\u13af","\u13b0":"\u13b0","\u13b1":"\u13b1","\u13b2":"\u13b2","\u13b3":"\u13b3","\u13b4":"\u13b4","\u13b5":"\u13b5","\u13b6":"\u13b6","\u13b7":"\u13b7","\u13b8":"\u13b8","\u13b9":"\u13b9","\u13ba":"\u13ba","\u13bb":"\u13bb","\u13bc":"\u13bc","\u13bd":"\u13bd","\u13be":"\u13be","\u13bf":"\u13bf","\u13c0":"\u13c0","\u13c1":"\u13c1","\u13c2":"\u13c2","\u13c3":"\u13c3","\u13c4":"\u13c4","\u13c5":"\u13c5","\u13c6":"\u13c6","\u13c7":"\u13c7","\u13c8":"\u13c8","\u13c9":"\u13c9","\u13ca":"\u13ca","\u13cb":"\u13cb","\u13cc":"\u13cc","\u13cd":"\u13cd","\u13ce":"\u13ce","\u13cf":"\u13cf","\u13d0":"\u13d0","\u13d1":"\u13d1","\u13d2":"\u13d2","\u13d3":"\u13d3","\u13d4":"\u13d4","\u13d5":"\u13d5","\u13d6":"\u13d6","\u13d7":"\u13d7","\u13d8":"\u13d8","\u13d9":"\u13d9","\u13da":"\u13da","\u13db":"\u13db","\u13dc":"\u13dc","\u13dd":"\u13dd","\u13de":"\u13de","\u13df":"\u13df","\u13e0":"\u13e0","\u13e1":"\u13e1","\u13e2":"\u13e2","\u13e3":"\u13e3","\u13e4":"\u13e4","\u13e5":"\u13e5","\u13e6":"\u13e6","\u13e7":"\u13e7","\u13e8":"\u13e8","\u13e9":"\u13e9","\u13ea":"\u13ea","\u13eb":"\u13eb","\u13ec":"\u13ec","\u13ed":"\u13ed","\u13ee":"\u13ee","\u13ef":"\u13ef","\u13f0":"\u13f0","\u13f1":"\u13f1","\u13f2":"\u13f2","\u13f3":"\u13f3","\u13f4":"\u13f4","\u13f5":"\u13f5","\u13f8":"\u13f0","\u13f9":"\u13f1","\u13fa":"\u13f2","\u13fb":"\u13f3","\u13fc":"\u13f4","\u13fd":"\u13f5","\u1c80":"\u0432","\u1c81":"\u0434","\u1c82":"\u043e","\u1c83":"\u0441","\u1c84":"\u0442","\u1c85":"\u0442","\u1c86":"\u044a","\u1c87":"\u0463","\u1c88":"\ua64b","\u1e96":"h\u0331","\u1e97":"t\u0308","\u1e98":"w\u030a","\u1e99":"y\u030a","\u1e9a":"a\u02be","\u1e9b":"\u1e61","\u1e9e":"ss","\u1f50":"\u03c5\u0313","\u1f52":"\u03c5\u0313\u0300","\u1f54":"\u03c5\u0313\u0301","\u1f56":"\u03c5\u0313\u0342","\u1f80":"\u1f00\u03b9","\u1f81":"\u1f01\u03b9","\u1f82":"\u1f02\u03b9","\u1f83":"\u1f03\u03b9","\u1f84":"\u1f04\u03b9","\u1f85":"\u1f05\u03b9","\u1f86":"\u1f06\u03b9","\u1f87":"\u1f07\u03b9","\u1f88":"\u1f00\u03b9","\u1f89":"\u1f01\u03b9","\u1f8a":"\u1f02\u03b9","\u1f8b":"\u1f03\u03b9","\u1f8c":"\u1f04\u03b9","\u1f8d":"\u1f05\u03b9","\u1f8e":"\u1f06\u03b9","\u1f8f":"\u1f07\u03b9","\u1f90":"\u1f20\u03b9","\u1f91":"\u1f21\u03b9","\u1f92":"\u1f22\u03b9","\u1f93":"\u1f23\u03b9","\u1f94":"\u1f24\u03b9","\u1f95":"\u1f25\u03b9","\u1f96":"\u1f26\u03b9","\u1f97":"\u1f27\u03b9","\u1f98":"\u1f20\u03b9","\u1f99":"\u1f21\u03b9","\u1f9a":"\u1f22\u03b9","\u1f9b":"\u1f23\u03b9","\u1f9c":"\u1f24\u03b9","\u1f9d":"\u1f25\u03b9","\u1f9e":"\u1f26\u03b9","\u1f9f":"\u1f27\u03b9","\u1fa0":"\u1f60\u03b9","\u1fa1":"\u1f61\u03b9","\u1fa2":"\u1f62\u03b9","\u1fa3":"\u1f63\u03b9","\u1fa4":"\u1f64\u03b9","\u1fa5":"\u1f65\u03b9","\u1fa6":"\u1f66\u03b9","\u1fa7":"\u1f67\u03b9","\u1fa8":"\u1f60\u03b9","\u1fa9":"\u1f61\u03b9","\u1faa":"\u1f62\u03b9","\u1fab":"\u1f63\u03b9","\u1fac":"\u1f64\u03b9","\u1fad":"\u1f65\u03b9","\u1fae":"\u1f66\u03b9","\u1faf":"\u1f67\u03b9","\u1fb2":"\u1f70\u03b9","\u1fb3":"\u03b1\u03b9","\u1fb4":"\u03ac\u03b9","\u1fb6":"\u03b1\u0342","\u1fb7":"\u03b1\u0342\u03b9","\u1fbc":"\u03b1\u03b9","\u1fbe":"\u03b9","\u1fc2":"\u1f74\u03b9","\u1fc3":"\u03b7\u03b9","\u1fc4":"\u03ae\u03b9","\u1fc6":"\u03b7\u0342","\u1fc7":"\u03b7\u0342\u03b9","\u1fcc":"\u03b7\u03b9","\u1fd2":"\u03b9\u0308\u0300","\u1fd3":"\u03b9\u0308\u0301","\u1fd6":"\u03b9\u0342","\u1fd7":"\u03b9\u0308\u0342","\u1fe2":"\u03c5\u0308\u0300","\u1fe3":"\u03c5\u0308\u0301","\u1fe4":"\u03c1\u0313","\u1fe6":"\u03c5\u0342","\u1fe7":"\u03c5\u0308\u0342","\u1ff2":"\u1f7c\u03b9","\u1ff3":"\u03c9\u03b9","\u1ff4":"\u03ce\u03b9","\u1ff6":"\u03c9\u0342","\u1ff7":"\u03c9\u0342\u03b9","\u1ffc":"\u03c9\u03b9","\uab70":"\u13a0","\uab71":"\u13a1","\uab72":"\u13a2","\uab73":"\u13a3","\uab74":"\u13a4","\uab75":"\u13a5","\uab76":"\u13a6","\uab77":"\u13a7","\uab78":"\u13a8","\uab79":"\u13a9","\uab7a":"\u13aa","\uab7b":"\u13ab","\uab7c":"\u13ac","\uab7d":"\u13ad","\uab7e":"\u13ae","\uab7f":"\u13af","\uab80":"\u13b0","\uab81":"\u13b1","\uab82":"\u13b2","\uab83":"\u13b3","\uab84":"\u13b4","\uab85":"\u13b5","\uab86":"\u13b6","\uab87":"\u13b7","\uab88":"\u13b8","\uab89":"\u13b9","\uab8a":"\u13ba","\uab8b":"\u13bb","\uab8c":"\u13bc","\uab8d":"\u13bd","\uab8e":"\u13be","\uab8f":"\u13bf","\uab90":"\u13c0","\uab91":"\u13c1","\uab92":"\u13c2","\uab93":"\u13c3","\uab94":"\u13c4","\uab95":"\u13c5","\uab96":"\u13c6","\uab97":"\u13c7","\uab98":"\u13c8","\uab99":"\u13c9","\uab9a":"\u13ca","\uab9b":"\u13cb","\uab9c":"\u13cc","\uab9d":"\u13cd","\uab9e":"\u13ce","\uab9f":"\u13cf","\uaba0":"\u13d0","\uaba1":"\u13d1","\uaba2":"\u13d2","\uaba3":"\u13d3","\uaba4":"\u13d4","\uaba5":"\u13d5","\uaba6":"\u13d6","\uaba7":"\u13d7","\uaba8":"\u13d8","\uaba9":"\u13d9","\uabaa":"\u13da","\uabab":"\u13db","\uabac":"\u13dc","\uabad":"\u13dd","\uabae":"\u13de","\uabaf":"\u13df","\uabb0":"\u13e0","\uabb1":"\u13e1","\uabb2":"\u13e2","\uabb3":"\u13e3","\uabb4":"\u13e4","\uabb5":"\u13e5","\uabb6":"\u13e6","\uabb7":"\u13e7","\uabb8":"\u13e8","\uabb9":"\u13e9","\uabba":"\u13ea","\uabbb":"\u13eb","\uabbc":"\u13ec","\uabbd":"\u13ed","\uabbe":"\u13ee","\uabbf":"\u13ef","\ufb00":"ff","\ufb01":"fi","\ufb02":"fl","\ufb03":"ffi","\ufb04":"ffl","\ufb05":"st","\ufb06":"st","\ufb13":"\u0574\u0576","\ufb14":"\u0574\u0565","\ufb15":"\u0574\u056b","\ufb16":"\u057e\u0576","\ufb17":"\u0574\u056d"};
const fold=s=>Array.from(s,c=>CASEFOLD[c]||c.toLowerCase()).join('');
function publicText(v){require(typeof v==='string'&&v.length>0&&v===v.trim()&&!/[\p{C}]/u.test(v),'invalid public text');}
function path(value,{manifest=false,universal=false}={}){
 require(typeof value==='string'&&value===value.normalize('NFC')&&value.length<=4096,'unsafe path');
 const parts=value.split('/');
 require(parts.every(p=>p&&p!=='.'&&p!=='..'&&!/[\p{C}\\<>:"|?*]/u.test(p)&&!/[ .]$/.test(p)&&(!p.startsWith('.')||(manifest&&p==='.hyperskill-import.json'))),'unsafe path');
 if(universal)require(parts.every(p=>!(/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(p)||/^(?:node_modules|__pycache__|venv|env|target|dist)$/i.test(p)||/^(?:id_(?:rsa|ed25519)|.*\.(?:pem|key))$|(?:^|[._-])(?:secrets?|credentials?|private|passwords?|tokens?)(?:[._-]|$)/i.test(p))),'private/excluded path');
 return parts;
}
const quote=s=>encodeURIComponent(s).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
const codeURL=(revision,p)=>CODE+revision+'/'+p.split('/').map(quote).join('/');
function timestamp(v){
 require(typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(v),'invalid UTC timestamp');
 const base=v.slice(0,19)+'Z',date=new Date(base);
 require(Number.isFinite(date.getTime())&&date.toISOString().slice(0,19)===v.slice(0,19)&&v.slice(0,4)!=='0000','invalid UTC calendar date');
 return base.slice(0,-1)+'.'+(v.match(/\.(\d+)Z$/)?.[1]||'').padEnd(6,'0')+'Z';
}
function pointer(value){
 fields(value,['schema','repository','revision','index_url','index_sha256']);
 require(value.schema===1&&value.repository===REPOSITORY&&validSHA(value.revision)&&validHash(value.index_sha256),'invalid pointer identity');
 require(typeof value.index_url==='string'&&value.index_url.startsWith(RAW),'foreign index URL');
 const tail=value.index_url.slice(RAW.length).split('/');
 require(tail.length===5&&validSHA(tail[0])&&tail[1]==='portfolio'&&tail[2]==='revisions'&&tail[3]===value.revision&&tail[4]==='index.json','index URL must bind store and source commits');
 return tail[0];
}
function payload(value,p){
 fields(value,['schema','kind','repository','revision','validator','projects']);
 require(value.schema===1&&value.kind==='hyperskill-project-index'&&value.repository===REPOSITORY&&value.revision===p.revision,'payload identity mismatch');
 fields(value.validator,['version','implementation_revision']);
 require(value.validator.version==='1.0'&&validSHA(value.validator.implementation_revision),'unsupported validator');
 require(Array.isArray(value.projects)&&value.projects.length>0&&value.projects.length<=10000,'invalid project inventory');
 let previous=0,total=0;const archiveRoots=new Set(),aliases=new Map();
 for(const row of value.projects){
  fields(row,['project_id','project_url','title','archive_schema','archive_path','manifest','completion','files','evidence_id'],['languages']);
  require(id(row.project_id)&&row.project_id>previous,'duplicate/unsorted project ID');previous=row.project_id;
  require(row.project_url==='https://hyperskill.org/projects/'+row.project_id&&row.evidence_id==='hyperskill:'+row.project_id,'invalid project identity');
  publicText(row.title);require([2,3,4].includes(row.archive_schema),'unsupported archive');
  if(Object.hasOwn(row,'languages')){require(Array.isArray(row.languages),'invalid languages');row.languages.forEach(publicText);require(new Set(row.languages.map(fold)).size===row.languages.length,'duplicate languages');}
  const parts=path(row.archive_path,{universal:row.archive_schema===4});
  require(parts.length===2&&(row.archive_schema===4?row.archive_path==='projects/'+row.project_id:['java','python'].includes(parts[0])),'invalid archive root');
  require(!archiveRoots.has(row.archive_path),'duplicate archive path');archiveRoots.add(row.archive_path);
  const completion=row.completion;
  fields(completion,['project_id','status','attested_by',row.archive_schema===4?'confirmed_at':'observed_at'],row.archive_schema===4?['completed_at']:[]);
  require(completion.project_id===row.project_id&&completion.status==='completed'&&completion.attested_by==='owner','invalid owner attestation');
  const confirmed=timestamp(completion.confirmed_at||completion.observed_at);
  if(Object.hasOwn(completion,'completed_at'))require(timestamp(completion.completed_at)<=confirmed,'completion follows confirmation');
  require(Array.isArray(row.files)&&row.files.length>=3&&row.files.length<=10000&&(total+=row.files.length)<=100000,'invalid file inventory');
  const files=new Map();let previousPath=null,solutions=0;
  for(const file of row.files){
   fields(file,['path','git_blob','sha256','role'],file.role==='solution'?['code_url']:[]);
   const manifest=file.path===row.archive_path+'/.hyperskill-import.json';
   const segments=path(file.path,{manifest,universal:row.archive_schema===4});
   require(file.path.startsWith(row.archive_path+'/')&&(previousPath===null||compare(previousPath,file.path)<0),'duplicate/unsorted/outside file');previousPath=file.path;
   require(validSHA(file.git_blob)&&validHash(file.sha256)&&['solution','resource','metadata'].includes(file.role),'invalid blob/hash/role');
   if(manifest)require(file.role==='metadata','manifest must be metadata');
   else require(file.role!=='metadata','unexpected metadata member');
   const relative=file.path.slice(row.archive_path.length+1);
   if(row.archive_schema===4&&!manifest&&relative!=='README.md')require(relative.startsWith('solution/'),'universal file outside solution/');
   for(let i=1;i<=segments.length;i++){const prefix=segments.slice(0,i).join('/'),alias=fold(prefix);require(!aliases.has(alias)||aliases.get(alias)===prefix,'case alias');aliases.set(alias,prefix);}
   if(file.role==='solution'){require(file.code_url===codeURL(value.revision,file.path),'unsafe/nonrevision code URL');solutions++;}
   files.set(file.path,file);
  }
  require(solutions>0&&files.get(row.archive_path+'/README.md')?.role==='resource','missing README/solution');
  for(const file of row.files){const parts=file.path.split('/');for(let i=1;i<parts.length;i++)require(!files.has(parts.slice(0,i).join('/')),'file/directory alias');}
  const reference=(ref,name,optional=[])=>{fields(ref,['path','git_blob','sha256'],optional);const file=files.get(name);require(ref.path===name&&file&&ref.git_blob===file.git_blob&&ref.sha256===file.sha256,'inventory reference mismatch');};
  reference(row.manifest,row.archive_path+'/.hyperskill-import.json',['attestation']);
  if(Object.hasOwn(row.manifest,'attestation')){require(row.project_id===113&&row.archive_schema===2&&row.archive_path==='java/Simple Chat Bot with Java','unreviewed legacy attestation');reference(row.manifest.attestation,row.archive_path+'/README.md');}
 }
 return value;
}
async function digest(bytes,crypto=g.crypto){require(crypto?.subtle,'Web Crypto unavailable');return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
async function validate(pointerText,payloadText,crypto=g.crypto){
 const p=decode(pointerText),store_revision=pointer(p),bytes=new TextEncoder().encode(payloadText);
 require(await digest(bytes,crypto)===p.index_sha256,'SHA-256 mismatch');
 return Object.freeze({pointer:p,index:payload(decode(payloadText),p),store_revision,pointerText,payloadText});
}
async function download(url,limit,fetcher,signal){
 const response=await fetcher(url,{method:'GET',credentials:'omit',redirect:'error',cache:'no-store',mode:'cors',referrerPolicy:'no-referrer',signal});
 require(response.ok&&!response.redirected&&response.url===url&&response.type!=='opaqueredirect','HTTP/redirect failure');
 const length=response.headers.get('content-length');require(length===null||(/^\d+$/.test(length)&&Number(length)<=limit),'download too large');
 require(response.body?.getReader,'streaming response required');
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;require(size<=limit,'download too large');chunks.push(value);}}
 catch(error){await reader.cancel().catch(()=>{});throw error;}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{fail('invalid UTF-8');}
}
const CACHE='myatlas.hyperskill-index.v1';
function create({fallback,derive=x=>x,fetcher=g.fetch.bind(g),storage=null,crypto=g.crypto,timeout=10000,onChange=()=>{}}){
 let snapshot=fallback,status='unavailable',error=null,receipt=null,serial=0,inflight=null,activeAbort=null;
 const seen=new Set();
 const state=()=>({snapshot,status,error,revision:receipt?.pointer.revision||fallback.source_revision,index_sha256:receipt?.pointer.index_sha256||null,store_revision:receipt?.store_revision||null});
 const notify=()=>onChange(state());
 async function restore(){
  const token=serial;
  try{const raw=storage?.getItem(CACHE);if(!raw)return;require(raw.length<=34*1024*1024,'cache too large');const cached=JSON.parse(raw);fields(cached,['schema','pointerText','payloadText']);require(cached.schema===1,'invalid cache');const valid=await validate(cached.pointerText,cached.payloadText,crypto),next=derive(valid.index);if(token!==serial)return;receipt=valid;snapshot=next;seen.add(valid.pointer.revision);status='stale';notify();}
  catch{if(token===serial){error='Cached snapshot rejected';notify();}}
 }
 function refresh(){
  if(inflight)return inflight;
  const token=++serial,abort=new AbortController();activeAbort=abort;
  let timer;
  const timed=new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error('Hyperskill index: timeout'));},timeout);});
  const work=(async()=>{
   const pointerText=await download(ENDPOINT,4096,fetcher,abort.signal),p=decode(pointerText);pointer(p);
   const payloadText=await download(p.index_url,16*1024*1024,fetcher,abort.signal);
   const valid=await validate(pointerText,payloadText,crypto);
   require(!seen.has(p.revision)||receipt?.pointer.revision===p.revision,'previous revision returned');
   if(receipt?.pointer.revision===p.revision)require(receipt.pointer.index_sha256===p.index_sha256,'immutable revision changed');
   return {valid,next:receipt?.pointer.revision===p.revision?snapshot:derive(valid.index)};
  })();
  inflight=Promise.race([work,timed]).then(({valid,next})=>{
   if(token!==serial)return state();
   receipt=valid;snapshot=next;seen.add(valid.pointer.revision);status='current';error=null;
   try{storage?.setItem(CACHE,JSON.stringify({schema:1,pointerText:valid.pointerText,payloadText:valid.payloadText}));}catch{/* Storage disabled/full: retain valid memory snapshot. */}
   notify();return state();
  }).catch(e=>{if(token===serial){status=receipt?'stale':'unavailable';error=e.message;notify();}return state();}).finally(()=>{clearTimeout(timer);abort.abort();if(token===serial){inflight=null;activeAbort=null;}});
  return inflight;
 }
 // Invalidates late responses, e.g. when the hosting view is disposed. No SHA
 // lexical ordering is invented: source ancestry is enforced by publication.
 function cancel(){++serial;activeAbort?.abort();activeAbort=null;inflight=null;}
 return {state,restore,refresh,cancel};
}
g.HyperskillIndex={REPOSITORY,ENDPOINT,codeURL,canonical,encode,decode,pointer,payload,validate,digest,create,CACHE};
if(typeof module!=='undefined')module.exports=g.HyperskillIndex;
})(globalThis);
