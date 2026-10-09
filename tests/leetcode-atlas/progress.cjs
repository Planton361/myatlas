/* Disposable visitors. Synthetic changes stay in route fixtures; live traffic is GET only. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||path.resolve(__dirname,'../../scripts/knowledge_atlas/node_modules/playwright'));
const R=require('../../src/leetcode-progress/loader.js'),workspace=path.resolve(process.argv[2]);
const base=process.env.CPU_SITE_PREVIEW||'http://127.0.0.1:8807/myatlas/';
const expected='c23469da99adc627db3a52d89d316082e53514d8d7210e46c1b13cc8296504a6';
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const geometry=()=>LeetCodeAtlas.state().L.nodes.map(n=>[n.key,n.x,n.y,n.width,n.height,n.physicalParent,n.data.problem?.primaryTaxonomyId]);
const row={problemId:'lc:problem:p0001',source:'manual-owner-attestation'},second={...row,problemId:'lc:problem:eval-00002'};
let tick=0;const doc=solved=>({schemaVersion:1,updatedAt:new Date(Date.UTC(2000,0,1,0,0,tick++)).toISOString(),solved});
const preRelease=process.env.MYATLAS_PRE_RELEASE_PROGRESS==='1';
if(preRelease&&process.env.GITHUB_REF==='refs/heads/main')throw Error('Production must read live progress');
const seed=preRelease?fs.readFileSync(path.resolve(__dirname,'../../progress/leetcode/solved.json'),'utf8'):null;
const results={status:'RUNNING',browsers:[],unauthorizedRequests:0,realWrites:0,preReleaseFixture:preRelease};
async function run(engine,name,options){
 const browser=await engine.launch({headless:true,...options});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],reads=[];
  let status=503,payload=doc([row]),malformed=false;
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{
   const request=route.request(),url=request.url();
   if(new URL(url).origin===new URL(base).origin)return route.continue();
   if(url!==R.URL){results.unauthorizedRequests++;return route.abort();}
   const h=request.headers();assert.equal(h.authorization,undefined);assert.equal(h.cookie,undefined);assert.equal(h.referer,undefined);assert.equal(request.method(),'GET');
   reads.push({method:'GET',authenticated:false,status});return route.fulfill({status,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:malformed?'{malformed':JSON.stringify(payload)});
  });
  await page.goto(base+'leetcode-atlas/');await page.waitForFunction(()=>document.body.dataset.publicState==='unavailable');
  const initial=hash(await page.evaluate(geometry));assert.equal(initial,expected);
  await page.evaluate(()=>{const s=LeetCodeAtlas.state();window.__baseline={L:s.L,index:s.index,compiled:s.compiled,nodes:s.L.nodes.length};LeetCodeAtlas.select('lc:problem:p0001');});
  assert.match(await page.locator('#global-progress').textContent(),/unavailable/);assert.match(await page.locator('.progress-state').textContent(),/unavailable/);
  assert.equal(await page.evaluate(()=>LeetCodeAtlas.lastPaint.progressIndicators.length),0);
  if(name!=='webkit')await page.screenshot({path:path.join(workspace,name+'-offline.png')});
  async function refresh(wanted,count){
   await page.locator('#refresh-public-progress').click();await page.waitForFunction(([wanted,count])=>document.body.dataset.publicState===wanted&&!document.getElementById('refresh-public-progress').disabled&&(count===null||LeetCodeAtlas.state().progress.uniqueSolved===count),[wanted,count]);
  }
  async function check(solved){
   const actual=await page.evaluate(()=>{
    const s=LeetCodeAtlas.state(),p=s.index.problems.get('lc:problem:p0001');
    return {global:s.projection.global.solved,category:s.projection.categories.get(p.primaryTaxonomyId).primary.solved,
     difficulty:[...s.compiled.difficulties].map(([name,ids])=>[name,LeetCodeVisualState.summary(ids,s.projection.solved).solved]),
     L:s.L===__baseline.L,index:s.index===__baseline.index,compiled:s.compiled===__baseline.compiled,builds:s.layoutBuilds,nodes:s.L.nodes.length,
     evidence:s.progress.byProblem.get(p.id).evidence.length,official:s.progress.byProblem.get(p.id).officialAccepted};
   });
   assert.equal(actual.global,solved);assert(actual.L&&actual.index&&actual.compiled);assert.equal(actual.builds,1);assert.equal(hash(await page.evaluate(geometry)),initial);
   assert.equal(actual.evidence,0);assert.equal(actual.official,false);
   for(const [difficulty,n]of actual.difficulty){const label=page.locator('.difficulty-solved[data-difficulty="'+difficulty+'"]');if(await label.count())assert.equal(await label.textContent(),n+' solved');}
   return actual;
  }
  status=200;payload=doc([row]);await refresh('published',1);const one=await check(1);assert.equal(one.category,1);
  await page.waitForFunction(()=>LeetCodeAtlas.lastPaint.styles.some(r=>r.key==='lc:problem:p0001'&&r.solved));
  const green=await page.evaluate(()=>{
   const s=LeetCodeAtlas.state(),n=s.L.byKey.get('lc:problem:p0001'),x=Math.round(n.x*s.transform.k+s.transform.x),y=Math.round((n.y+n.height*.78)*s.transform.k+s.transform.y);
   return [...document.getElementById('world').getContext('2d').getImageData(x,y,1,1).data];
  });assert.deepEqual(green,[32,102,71,255]);
  if(name!=='webkit')await page.screenshot({path:path.join(workspace,name+'-two-sum-green.png')});
  payload=doc([row,second]);await refresh('published',2);await check(2);
  await page.evaluate(()=>LeetCodeAtlas.select('lc:problem:eval-00002'));
  await page.waitForFunction(()=>LeetCodeAtlas.lastPaint.styles.some(r=>r.key=== 'lc:problem:eval-00002'&&r.solved));
  await page.evaluate(()=>LeetCodeAtlas.select('lc:problem:p0001'));
  payload=doc([row,row,second,second]);await refresh('published',2);await check(2);assert.equal(await page.evaluate(()=>MyAtlasPublicIntegration.state().value.duplicates),2);
  payload=doc([row]);await refresh('published',1);await check(1);assert.equal(await page.evaluate(()=>LeetCodeAtlas.state().progress.byProblem.get('lc:problem:eval-00002').state),'not-recorded');
  status=503;await refresh('stale',1);await check(1);assert.match(await page.locator('#public-progress-diagnostics').textContent(),/last validated snapshot/);
  status=200;malformed=true;await refresh('stale',1);await check(1);malformed=false;
  payload=doc([row,{...row,problemId:'lc:problem:p9999'}]);await refresh('published',1);await check(1);
  assert.match(await page.locator('#public-progress-diagnostics').textContent(),/1 unresolved ID\(s\): lc:problem:p9999/);
  payload=doc([]);await refresh('published',0);const zero=await check(0);assert.equal(zero.category,0);
  await page.waitForFunction(()=>LeetCodeAtlas.lastPaint.styles.some(r=>r.key==='lc:problem:p0001'&&!r.solved));
  // Rights-safe summary is independent of evaluation catalog and uses the same reader.
  payload=doc([row]);await page.goto(base+'leetcode-progress/');await page.waitForFunction(()=>document.body.dataset.publicState==='published');
  await page.locator('#refresh').click();await page.waitForFunction(()=>!document.getElementById('refresh').disabled&&document.querySelectorAll('#records li').length===1);
  assert.equal(await page.locator('#records li').count(),1);assert.match(await page.locator('#total').textContent(),/1$/);
  if(name!=='webkit')await page.screenshot({path:path.join(workspace,name+'-rights-safe-summary.png')});
  assert.deepEqual(errors,[]);await context.close();
  // Actual public CORS read in a fresh, unauthenticated visitor context. Never PUT.
  const live=await browser.newContext({viewport:{width:1440,height:1000}}),livePage=await live.newPage(),liveErrors=[],liveReads=[];
  livePage.on('pageerror',e=>liveErrors.push(e.message));livePage.on('console',m=>{if(m.type()==='error')liveErrors.push(m.text());});
  await live.route('**/*',route=>{
   const request=route.request(),url=request.url();if(new URL(url).origin===new URL(base).origin)return route.continue();
   assert.equal(url,R.URL);assert.equal(request.method(),'GET');const h=request.headers();assert.equal(h.authorization,undefined);assert.equal(h.cookie,undefined);assert.equal(h.referer,undefined);liveReads.push({method:'GET',authenticated:false,url});if(preRelease)return route.fulfill({contentType:'application/json',body:seed});return route.continue();
  });
  await livePage.goto(base+'leetcode-atlas/');await livePage.waitForFunction(()=>document.body.dataset.publicState==='published',null,{timeout:30000});
  const state=await livePage.evaluate(()=>MyAtlasPublicIntegration.state());
  assert(state.value.resolved.some(r=>r.problemId===row.problemId&&r.source===row.source));
  assert.equal(await livePage.evaluate(()=>LeetCodeAtlas.state().progress.uniqueSolved),state.value.resolved.length);
  await livePage.evaluate(()=>{LeetCodeAtlas.select('lc:problem:p0001');LeetCodeAtlas.focus('lc:problem:p0001',false,true,false);LeetCodeAtlas.repaint();});
  await livePage.waitForFunction(()=>LeetCodeAtlas.state().transform.k>=1&&LeetCodeAtlas.lastPaint.styles.some(r=>r.key==='lc:problem:p0001'&&r.solved));
  // Moving the guide out of the canvas changes its screen size on focus.
  // ResizeObserver clears the backing buffer; sample only after the new paint.
  await livePage.waitForFunction(()=>{const s=LeetCodeAtlas.state(),n=s.L.byKey.get('lc:problem:p0001'),pixel=document.getElementById('world').getContext('2d').getImageData(Math.round(n.x*s.transform.k+s.transform.x),Math.round((n.y+n.height*.78)*s.transform.k+s.transform.y),1,1).data;return pixel[0]===32&&pixel[1]===102&&pixel[2]===71&&pixel[3]===255;});
  const livePixel=await livePage.evaluate(()=>{const s=LeetCodeAtlas.state(),n=s.L.byKey.get('lc:problem:p0001');return [...document.getElementById('world').getContext('2d').getImageData(Math.round(n.x*s.transform.k+s.transform.x),Math.round((n.y+n.height*.78)*s.transform.k+s.transform.y),1,1).data];});assert.deepEqual(livePixel,[32,102,71,255]);
  if(name!=='webkit')await livePage.screenshot({path:path.join(workspace,name+'-live-two-sum-green.png')});
  assert.equal(hash(await livePage.evaluate(geometry)),expected);
  await livePage.goto(base+'leetcode-progress/');await livePage.waitForFunction(()=>document.body.dataset.publicState==='published');assert.equal(await livePage.locator('#total').textContent(),'Confirmed solved count: '+state.value.document.solved.length);
  if(name!=='webkit')await livePage.screenshot({path:path.join(workspace,name+'-live-rights-safe-summary.png')});
  assert.deepEqual(liveErrors,[]);await live.close();
  results.browsers.push({engine:name,version:browser.version(),mockCases:['A','B','C','D','E','F','G','J','K'],geometry:initial,layoutBuilds:1,greenPixel:green,
   anonymous:true,livePublicCount:state.value.document.solved.length,liveResolvedIds:state.value.resolved.map(r=>r.problemId),sourceUpdatedAt:state.value.document.updatedAt,reads,liveReads});
 }finally{await browser.close();}
}
(async()=>{fs.mkdirSync(workspace,{recursive:true});await run(chromium,process.env.CPU_CHROME==='1'?'chrome':'chromium',process.env.CPU_CHROME==='1'?{channel:'chrome'}:{});await run(webkit,'webkit',{});
 assert.equal(results.unauthorizedRequests,0);results.status='PASS';fs.writeFileSync(path.join(workspace,'public-integration-browser.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1);});
