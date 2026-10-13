/* Read-only real HTTPS/CORS smoke from the actual public MyAtlas origin. No mocks. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('./node_modules/playwright');
const ORIGIN='https://planton361.github.io',PAGE=ORIGIN+'/myatlas/knowledge-map/';
const readerSource=fs.readFileSync(path.join(__dirname,'../../src/supplements/hyperskill-index-v1/reader.js'),'utf8');
(async()=>{
 const rows=[];let pair=null;
 for(const [name,engine]of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch({headless:true});
  try{
   const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
   const anonymous=[];
   page.on('request',request=>{if(request.url()==='https://planton361.github.io/hyperskill-projects/portfolio/current.json'||request.url().startsWith('https://raw.githubusercontent.com/Planton361/hyperskill-projects/'))anonymous.push(request);});
   await page.goto(PAGE,{waitUntil:'domcontentloaded',timeout:30000});
   if(new URL(page.url()).origin!==ORIGIN)throw Error('Public origin changed');
   await page.addScriptTag({content:readerSource});
   const result=await page.evaluate(async()=>{
    const r=HyperskillIndex,options={method:'GET',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store'};
    async function read(url,limit){
     const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
     try{
      const response=await fetch(url,{...options,signal:controller.signal});
      if(response.redirected||response.url!==url)throw Error('Redirect refused');
      if(!response.ok)return {status:response.status};
      const stream=response.body.getReader(),chunks=[];let size=0;
      for(;;){const item=await stream.read();if(item.done)break;size+=item.value.length;if(size>limit){await stream.cancel();throw Error('Size limit');}chunks.push(item.value);}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      return {status:response.status,text:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes),sha256:await r.digest(bytes,crypto)};
     }finally{clearTimeout(timer);}
    }
    const pointer=await read(r.ENDPOINT,4096);
    if(pointer.status===404)return {origin:location.origin,status:'EXPECTED_ABSENT',pointer_http_status:404,payload_cors:'BLOCKED_BEFORE_BOOTSTRAP'};
    if(pointer.status!==200)throw Error('Pointer HTTP '+pointer.status);
    const p=r.decode(pointer.text),store=r.pointer(p);
    if(store===p.revision)throw Error('Source and store commits must differ');
    const payload=await read(p.index_url,16*1024*1024);
    if(payload.status!==200)throw Error('Payload HTTP '+payload.status);
    if(payload.sha256!==p.index_sha256)throw Error('Original payload byte digest mismatch');
    const checked=await r.validate(pointer.text,payload.text,crypto);
    return {origin:location.origin,status:'PRODUCTION_VERIFIED',source_revision:p.revision,store_revision:store,
     index_sha256:p.index_sha256,project_ids:checked.index.projects.map(p=>p.project_id),pointerText:pointer.text,payloadText:payload.text,payload_cors:'PASS'};
   });
   if(result.status==='PRODUCTION_VERIFIED'){
    if(pair&&(pair.pointerText!==result.pointerText||pair.payloadText!==result.payloadText))throw Error('Public pair changed between engines; retry atomically');
    pair={pointerText:result.pointerText,payloadText:result.payloadText};
   }
   for(const request of anonymous){const headers=await request.allHeaders();if(headers.cookie||headers.authorization)throw Error('Credential header refused');}
   if(!anonymous.length)throw Error('No actual anonymous index fetch observed');
   const {pointerText,payloadText,...row}=result;rows.push({engine:name,anonymous_requests:anonymous.length,...row});
   await context.close();
  }finally{await browser.close();}
 }
 if(new Set(rows.map(r=>r.status)).size!==1)throw Error('Availability changed between engines');
 process.stdout.write(JSON.stringify({rows,pair})+'\n');
})().catch(error=>{console.error('Public index smoke BLOCKED:',error.message);process.exitCode=1;});
