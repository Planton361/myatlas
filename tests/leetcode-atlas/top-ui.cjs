/* Real public reads, disposable visitors; no progress mutations or publisher access. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||path.resolve(__dirname,'../../scripts/knowledge_atlas/node_modules/playwright'));
const R=require('../../src/leetcode-progress/loader.js'),workspace=path.resolve(process.argv[2]),phase=process.argv[3]||'after';
const progressPath=path.resolve(__dirname,'../../build/pages/knowledge-map/progress.json'),progressBytes=fs.readFileSync(progressPath),progress=JSON.parse(progressBytes.toString('utf8'));
const runtime=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../build/pages/knowledge-map/runtime-manifest.json'),'utf8'));
const unique=(ids,label)=>{assert(Array.isArray(ids),label+' IDs must be an array');assert.equal(new Set(ids).size,ids.length,label+' IDs must be deduplicated');};
assert.equal(progress.schema,2,'Validated public progress projection required');
unique(progress.completed_project_ids,'Completed project');
assert(progress.completed_project_ids.includes(113),'Project 113 must remain completed');
assert(progress.completed_project_ids.includes(380),'Project 380 must remain completed');
assert.equal(progress.completed_project_count,progress.completed_project_ids.length);
unique(progress.effective_learned_topic_ids,'Learned topic');
unique(progress.verified_topic_ids,'Verified topic');
assert.equal(progress.global.learned,progress.effective_learned_topic_ids.length,'Projection learned count must match deduplicated topic IDs');
assert.equal(progress.global.verified,progress.verified_topic_ids.length,'Projection verified count must match deduplicated topic IDs');
assert.equal(progress.source.project_repository,'Planton361/hyperskill-projects');
assert.equal(runtime.project_source.repository,progress.source.project_repository);
assert.equal(runtime.project_source.commit,progress.source.project_commit);
assert.equal(runtime.inventory['progress.json'],crypto.createHash('sha256').update(progressBytes).digest('hex'),'Runtime manifest must bind the validated projection');
const base=process.env.CPU_PREVIEW||'http://127.0.0.1:8807/myatlas/leetcode-atlas/';
const widths=[2048,1440,1280,1024,768,390],expected='c23469da99adc627db3a52d89d316082e53514d8d7210e46c1b13cc8296504a6';
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const geo=()=>LeetCodeAtlas.state().L.nodes.map(n=>[n.key,n.x,n.y,n.width,n.height,n.physicalParent,n.data.problem?.primaryTaxonomyId]);
const results={phase,status:'RUNNING',rows:[],realWrites:0};
// Before this repository has a public main, exercise its exact committed snapshot.
// Production builds and live verification must always use the real anonymous GET.
const preRelease=process.env.MYATLAS_PRE_RELEASE_PROGRESS==='1';
if(preRelease&&process.env.GITHUB_REF==='refs/heads/main')throw Error('Production must read live progress');
const seed=preRelease?fs.readFileSync(path.resolve(__dirname,'../../progress/leetcode/solved.json'),'utf8'):null;

function upperBoxes(){
 const selectors=['#application-header h1','#application-nav a','#difficulty-field','#availability-field','#branch-menu>summary','#reset-filters','#search','#search-results',
  '#atlas-context','#global-progress','#difficulty-distribution','#public-progress-status','#refresh-public-progress','#public-progress-details>summary',
  '#public-progress-diagnostics','.map-controls button','.map-controls output','#inspector-toggle','#overview-guide button'];
 const boxes=selectors.flatMap(selector=>[...document.querySelectorAll(selector)].filter(e=>{
  const closed=e.closest('details:not([open])');
  if(closed&&!closed.querySelector(':scope>summary').contains(e))return false;
  return e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
 }).map((e,i)=>{
  const r=e.getBoundingClientRect();return {selector:selector+':'+i,text:e.textContent,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
 }));
 const collisions=[];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
  const a=boxes[i],b=boxes[j];if(Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1)collisions.push([a.selector,b.selector]);
 }
 const overflow=boxes.filter(b=>b.x<-.5||b.right>innerWidth+.5||b.y<-.5);
 const canvas=document.getElementById('world').getBoundingClientRect(),toolbar=document.getElementById('map-toolbar')?.getBoundingClientRect();
 return {boxes,collisions,overflow,documentOverflow:document.documentElement.scrollWidth>innerWidth,canvas:{top:canvas.top,height:canvas.height},toolbarClear:!toolbar||toolbar.bottom<=canvas.top+.5};
}
async function run(engine,name,options){
 const browser=await engine.launch({headless:true,...options});
 try{for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000}}),page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url());});
  await context.route('**/*',route=>{const q=route.request(),url=q.url();assert.equal(q.method(),'GET');assert.equal(q.headers().authorization,undefined);assert.equal(q.headers().cookie,undefined);
   assert(new URL(url).origin===new URL(base).origin||url===R.URL,'Unexpected network destination');if(url===R.URL){requests.push({method:'GET',credentials:false});if(preRelease)return route.fulfill({contentType:'application/json',body:seed});}return route.continue();});
  await page.goto(base);await page.waitForFunction(()=>document.body.dataset.publicState==='published');await page.evaluate(()=>document.fonts.ready);
  const solvedCount=await page.evaluate(()=>MyAtlasPublicIntegration.state().value.resolved.length),publishedCount=await page.evaluate(()=>MyAtlasPublicIntegration.state().value.document.solved.length);
  assert.equal(await page.evaluate(()=>LeetCodeAtlas.state().progress.uniqueSolved),solvedCount);
  const geometry=hash(await page.evaluate(geo));assert.equal(geometry,expected);
  await page.evaluate(()=>{const s=LeetCodeAtlas.state();window.__topBaseline={L:s.L,index:s.index,compiled:s.compiled};});
  const initial=await page.evaluate(upperBoxes);if(name!=='webkit')await page.screenshot({path:path.join(workspace,`${phase}-${name}-${width}.png`)});
  const checks=[];
  async function clear(label){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const boxes=await page.evaluate(upperBoxes);assert.deepEqual(boxes.collisions,[],label+' collisions');assert.deepEqual(boxes.overflow,[],label+' bounds');assert.equal(boxes.documentOverflow,false,label+' overflow');assert.equal(boxes.toolbarClear,true,label+' toolbar covers map');assert(boxes.canvas.height>200,label+' map must retain useful viewport area');checks.push({label,canvasHeight:boxes.canvas.height,collisions:0});}
  if(phase==='after'){
   await clear('initial');assert.equal(await page.locator('#global-progress .progress-count').textContent(),solvedCount+' / 3,511 solved');assert.equal(await page.locator('#global-progress strong').textContent(),(solvedCount/3511*100).toFixed(2)+'%');assert.equal(await page.locator('#public-progress-status').textContent(),publishedCount+' published');
   assert.equal(await page.locator('#public-progress-details').getAttribute('open'),null);
   await page.locator('#public-progress-details>summary').click();assert.match(await page.locator('#public-progress-diagnostics').textContent(),/Source updated/);await clear('details expanded');await page.locator('#public-progress-details>summary').click();
   await page.locator('#difficulty').selectOption('Easy');assert(await page.evaluate(()=>[...LeetCodeAtlas.state().visual.matches].every(id=>LeetCodeAtlas.state().index.problems.get(id).difficulty==='Easy')));
   await page.locator('#premium').selectOption('free');assert(await page.evaluate(()=>[...LeetCodeAtlas.state().visual.matches].every(id=>LeetCodeAtlas.state().index.problems.get(id).premium==='free')));await clear('filters');
   await page.locator('#reset-filters').click();assert.equal(await page.locator('#difficulty').inputValue(),'all');assert.equal(await page.locator('#premium').inputValue(),'all');
   await page.locator('#search').fill('two-sum');await page.locator('#search-results button').first().waitFor();await clear('search expanded');await page.locator('#search').press('ArrowDown');assert(await page.evaluate(()=>document.activeElement.matches('#search-results button')));await page.keyboard.press('Enter');
   await page.waitForFunction(()=>LeetCodeAtlas.state().selected==='lc:problem:p0001');await clear('search selection and inspector');
   await page.locator('#inspector-pin').click();await clear('pinned inspector');await page.locator('#inspector-pin').click();await page.locator('#inspector-close').click();
   await page.locator('#inspector-toggle').click();assert.equal(await page.locator('#inspector-drawer').getAttribute('hidden'),null);await clear('inspect');await page.locator('#inspector-close').click();
   await page.locator('#fit-subtree').click();await page.locator('#history-back').click();assert.equal(await page.evaluate(()=>LeetCodeAtlas.state().selected),null);await page.locator('#fit').click();await clear('fit and back');
   const k=await page.evaluate(()=>LeetCodeAtlas.state().transform.k);await page.locator('#zoom-in').click();await page.waitForFunction(k=>LeetCodeAtlas.state().transform.k>k,k);const zoomed=await page.evaluate(()=>LeetCodeAtlas.state().transform.k);await page.locator('#zoom-out').click();await page.waitForFunction(k=>LeetCodeAtlas.state().transform.k<k,zoomed);
   await page.locator('#world').focus();const x=await page.evaluate(()=>LeetCodeAtlas.state().transform.x);await page.keyboard.press('ArrowRight');assert.notEqual(await page.evaluate(()=>LeetCodeAtlas.state().transform.x),x);
   await page.locator('#search').focus();await page.keyboard.press('Tab');const focus=await page.evaluate(()=>{const e=document.activeElement,s=getComputedStyle(e);return{visible:e.matches(':focus-visible'),outline:s.outlineStyle,width:parseFloat(s.outlineWidth)};});assert(focus.visible&&focus.outline!=='none'&&focus.width>=2,'Keyboard focus must have a visible outline');
   await page.locator('#refresh-public-progress').click();await page.waitForFunction(()=>!document.getElementById('refresh-public-progress').disabled&&document.body.dataset.publicState==='published');await clear('refresh');assert.equal(await page.evaluate(()=>LeetCodeAtlas.state().progress.uniqueSolved),solvedCount);
   // Category Focus continues to pan the same accepted world; no layout rebuild.
   await page.locator('#branch-menu>summary').click();await page.locator('#taxonomy>details').first().locator('summary').first().click();await page.locator('#taxonomy>details').first().locator('details>summary').first().click();await page.locator('#taxonomy .pattern').first().click();await clear('category focus');assert(await page.evaluate(()=>{const s=LeetCodeAtlas.state();return Boolean(s.activeCategory)&&s.fitIntent.key===s.activeCategory;}));
   const state=await page.evaluate(()=>{const s=LeetCodeAtlas.state(),sizes=s.L.leaves.map(n=>n.width+'x'+n.height);return{same:s.L===__topBaseline.L&&s.index===__topBaseline.index&&s.compiled===__topBaseline.compiled,builds:s.layoutBuilds,cards:s.L.leaves.length,dimensions:Array.from(new Set(sizes))};});
   assert(state.same);assert.equal(state.builds,1);assert.equal(state.cards,3511);assert.deepEqual(state.dimensions,['240x120']);assert.equal(hash(await page.evaluate(geo)),geometry);
   await page.locator('#inspector-close').click();await page.locator('#reset-filters').click();await page.locator('#fit').click();
   if(name!=='webkit')await page.screenshot({path:path.join(workspace,`${phase}-${name}-${width}-final.png`)});
  }
  assert.equal(await page.locator('#nav-atlas').getAttribute('href'),'../knowledge-map/?view=atlas');
  assert.equal(await page.locator('#nav-skill-tree').getAttribute('href'),'../knowledge-map/?view=skill-tree');
  if(width===1440){
   const cpuURL=page.url();await page.locator('#nav-atlas').click();
   await page.waitForFunction(()=>window.AtlasShell&&document.querySelector('#loading').hidden&&AtlasShell.state().activeFrame?.contentWindow.PublicProgress);
   // PublicProgress precedes the accepted renderer's asynchronous worker script
   // bootstrap. Finish that load before this test deliberately leaves the page.
   await page.waitForLoadState('networkidle');
   assert.deepEqual(await page.locator('#application-nav a').allTextContents(),['Atlas','My Skill Tree','LeetCode']);
   assert.equal(await page.evaluate(()=>AtlasShell.state().activeFrame.contentWindow.PublicProgress.global.learned),progress.global.learned);
   await page.goto(cpuURL);await page.waitForFunction(()=>document.body.dataset.publicState==='published');
   await page.waitForLoadState('networkidle');
   await page.locator('#nav-skill-tree').click();
   await page.waitForFunction(()=>window.AtlasShell&&document.querySelector('#loading').hidden&&AtlasShell.state().route.view==='skill-tree'&&AtlasShell.state().activeFrame?.contentWindow.PublicProgress);
   await page.waitForLoadState('networkidle');
   assert.deepEqual(await page.locator('#application-nav a').allTextContents(),['Atlas','My Skill Tree','LeetCode']);
   assert.equal(await page.evaluate(()=>AtlasShell.state().activeFrame.contentWindow.PublicProgress.global.verified),progress.global.verified);
  }
  assert.deepEqual(errors,[]);results.rows.push({browser:name,version:browser.version(),width,geometry,initial,checks,anonymousPublicRequests:requests.length});await context.close();
 }}finally{await browser.close();}
}
(async()=>{fs.mkdirSync(workspace,{recursive:true});await run(chromium,process.env.CPU_CHROME==='1'?'chrome':'chromium',process.env.CPU_CHROME==='1'?{channel:'chrome'}:{});if(phase==='after')await run(webkit,'webkit',{});results.status='PASS';fs.writeFileSync(path.join(workspace,`top-ui-${phase}.json`),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({status:results.status,phase,rows:results.rows.map(r=>({browser:r.browser,width:r.width,collisions:r.initial.collisions.length,checks:r.checks.length,canvasHeight:r.initial.canvas.height}))},null,2));})().catch(e=>{console.error(e);process.exit(1);});
