/* Fresh visitor contexts: project-prefix assets, anonymous live read and disposable failures. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||path.join(root,'scripts/knowledge_atlas/node_modules/playwright'));
const base=process.env.LEETCODE_PREVIEW||'http://127.0.0.1:8807/myatlas/leetcode-progress/';
const source=require('../../src/leetcode-progress/loader.js').URL;
// Before this repository has a public main, exercise its exact committed snapshot.
// Production builds and live verification must always use the real anonymous GET.
const preRelease=process.env.MYATLAS_PRE_RELEASE_PROGRESS==='1';
if(preRelease&&process.env.GITHUB_REF==='refs/heads/main')throw Error('Production must read live progress');
const seed=preRelease?fs.readFileSync(path.join(root,'progress/leetcode/solved.json'),'utf8'):null;

const artifact=process.env.LEETCODE_ARTIFACT_DIR||path.join(root,'test-results');
const fixtureRow={problemId:'lc:problem:p0001',source:'manual-owner-attestation'};
const doc=(solved=[fixtureRow])=>({schemaVersion:1,updatedAt:new Date().toISOString(),solved});
const count=n=>'Confirmed solved count: '+n;
const results=[];

async function visit(engine,name){
 const browser=await engine.launch({headless:true,...(name==='chrome'?{channel:'chrome'}:{})});
 try{
  const row={engine:name,version:browser.version(),checks:[],requests:[]},errors=[],bad=[],consoleErrors=[];
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  let phase='live',liveDocument=null;
  await context.route('**/*',async route=>{
   const request=route.request(),url=request.url(),headers=await request.allHeaders();
   const external=new URL(url).origin!==new URL(base).origin;
   row.requests.push({url,method:request.method(),external,phase});
   assert.equal(request.method(),'GET');
   assert(!('authorization' in headers));assert(!('cookie' in headers));
   if(external){assert.equal(url,source);assert(!('referer' in headers));if(preRelease)return route.fulfill({contentType:'application/json',body:seed});}
   else assert(new URL(url).pathname.startsWith(new URL(base).pathname));
   await route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&phase!=='offline'&&phase!=='stale')consoleErrors.push(m.text());});
  page.on('response',async response=>{
   if(response.status()>=400)bad.push([response.url(),response.status()]);
   if(response.url()===source&&phase==='live')liveDocument=await response.json();
  });
  const ready=async state=>{await page.waitForFunction(expected=>document.body.dataset.publicState===expected,state);await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);};
  await page.goto(base);await ready('published');
  assert(liveDocument,'Live public response required');
  const unique=[...new Map(liveDocument.solved.map(r=>[r.problemId,r])).values()].sort((a,b)=>a.problemId.localeCompare(b.problemId));
  assert.equal(await page.locator('#total').innerText(),count(unique.length));
  assert.deepEqual(await page.locator('#records li').allTextContents(),unique.map(r=>r.problemId+' · '+r.source));
  assert((await page.locator('#status').innerText()).includes(liveDocument.updatedAt));
  assert(!await page.locator('body').innerText().then(s=>s.includes('3,511')));
  row.live={count:unique.length,updatedAt:liveDocument.updatedAt,preReleaseFixture:preRelease};
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:width===390?844:1000});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert(await page.locator('#refresh').isVisible());
   // Playwright's WebKit screenshot preparation injects an inline animation-sync
   // stylesheet, which the unchanged reviewed CSP correctly refuses. Capture
   // images in Chrome/Chromium; keep WebKit console checks free of tool injection.
   if(name!=='webkit')await page.screenshot({path:path.join(artifact,name+'-summary-'+width+'.png'),fullPage:true});
  }
  const calls=()=>row.requests.filter(r=>r.url===source).length;
  const before=calls();await page.locator('#refresh').click();await ready('published');assert(calls()>before);
  row.checks.push('Live anonymous GET matches current unique published count/IDs; source timestamp; desktop/mobile; Refresh bypasses cache');
  const assets=row.requests.filter(r=>!r.external).map(r=>new URL(r.url).pathname);
  for(const filename of ['loader.js','summary.js','summary.css'])assert(assets.includes(new URL(filename,base).pathname));
  assert(!assets.some(p=>/catalog|taxonomy|cpu|extension|progress\.json/.test(p)));
  row.checks.push('Four relative summary assets under project prefix; no catalog, CPU, extension or credentials');
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);assert.deepEqual(consoleErrors,[]);
  await context.close();

  // Separate fresh context: fixtures never write storage belonging to the owner.
  const mocked=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  let mode='offline',value=doc(),requests=0;
  await mocked.route(source,route=>{
   requests++;
   if(mode==='offline')return route.abort('internetdisconnected');
   return route.fulfill({contentType:'application/json',body:mode==='malformed'?'{broken JSON':JSON.stringify(value)});
  });
  const p=await mocked.newPage();p.on('pageerror',e=>errors.push(e.message));
  const settled=async state=>{await p.waitForFunction(s=>document.body.dataset.publicState===s,state);await p.waitForFunction(()=>!document.querySelector('#refresh').disabled);};
  await p.goto(base);await settled('unavailable');assert.equal(await p.locator('#total').innerText(),count('unknown'));assert.match(await p.locator('#status').innerText(),/unavailable|unknown/i);
  mode='ok';await p.locator('#refresh').click();await settled('published');assert.equal(await p.locator('#total').innerText(),count(1));
  value=doc([fixtureRow,fixtureRow,{...fixtureRow,problemId:'lc:problem:eval-00002'}]);
  await p.locator('#refresh').click();await settled('published');assert.equal(await p.locator('#total').innerText(),count(2));assert.equal(await p.locator('#records li').count(),2);
  value=doc([{...fixtureRow,problemId:'lc:problem:eval-00002'}]);
  await p.locator('#refresh').click();await settled('published');assert.equal(await p.locator('#total').innerText(),count(1));assert(!await p.locator('#records').innerText().then(t=>t.includes('p0001')));
  mode='offline';await p.locator('#refresh').click();await settled('stale');assert.equal(await p.locator('#total').innerText(),count(1));assert.match(await p.locator('#status').innerText(),/last validated snapshot/);
  mode='malformed';await p.locator('#refresh').click();await settled('stale');assert.equal(await p.locator('#total').innerText(),count(1));
  mode='ok';value=doc([]);await p.locator('#refresh').click();await settled('published');assert.equal(await p.locator('#total').innerText(),count(0));
  assert.deepEqual(errors,[]);assert(requests>=7);await mocked.close();
  row.checks.push('Fresh offline is unknown; recovery; duplicate elimination; authoritative undo; failed/malformed refresh is stale; valid empty source is zero');
  results.push(row);
 }finally{await browser.close();}
}

(async()=>{
 fs.mkdirSync(artifact,{recursive:true});
 await visit(chromium,process.env.LEETCODE_CHROME==='1'?'chrome':'chromium');
 await visit(webkit,'webkit');
 const result={status:'PASS',preview:base,publicSource:source,results};
 fs.writeFileSync(path.join(artifact,'leetcode-progress.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1;});
