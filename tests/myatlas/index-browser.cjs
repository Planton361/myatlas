/* Local responses only: real Phase-3 fixtures, both engines, no app rebuild. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const s=require('./index-test-support.cjs'),pairs=s.fixtures();
const {chromium,webkit}=require(path.join(s.root,'scripts/knowledge_atlas/node_modules/playwright'));
const base=process.env.ATLAS_PREVIEW||'http://127.0.0.1:8807/myatlas/knowledge-map/';
const fingerprints=JSON.parse(fs.readFileSync(path.join(s.root,'docs/contracts/hyperskill-baseline-v1.json'))).geometry;
const rows=[];
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
(async()=>{for(const [engineName,engine]of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true});try{for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000}}),errors=[];
  let pair=pairs[0],missing=true,requests=0;
  // The packaged, pinned production flag stays false. Only this isolated HTTP
  // fixture opts in, without GitHub variables, URL parameters or real endpoint.
  await context.route('**/hyperskill-index/config.json',async route=>{const response=await route.fetch();const config=await response.json();assert.equal(config.enabled,false);await route.fulfill({json:{...config,enabled:true}});});
  await context.route(s.reader.ENDPOINT,route=>{requests++;return route.fulfill(missing?{status:404,body:'not published'}:{status:200,contentType:'application/json',body:pair.pointerText});});
  await context.route('https://raw.githubusercontent.com/Planton361/hyperskill-projects/**',route=>route.fulfill({status:200,contentType:'application/json',body:pair.payloadText}));
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  const state=()=>page.evaluate(()=>{const s=HyperskillPortfolio.state();return {status:s.status,revision:s.revision,count:s.snapshot.register.completed_project_count,learned:s.snapshot.analytics.global().learned,verified:s.snapshot.analytics.global().verified,ids:s.snapshot.register.completed_project_ids,course:s.snapshot.completion.course_completion};});
  async function go(query=''){await page.goto(base+query);await page.waitForFunction(()=>window.AtlasShell?.state().activeFrame?.contentWindow.AtlasV6?.state().L||window.AtlasShell?.state().activeFrame?.contentWindow.ScopeApp?.state().L);await page.waitForFunction(()=>window.HyperskillPortfolio?.state());}
  async function geometry(){return page.evaluate(()=>{const w=AtlasShell.state().activeFrame.contentWindow,L=(w.AtlasV6||w.ScopeApp).state().L;return JSON.stringify([L.nodes.map(n=>[n.key,n.x,n.y,n.width,n.height,n.lines]),L.connectorSegments,L.trays,L.checkpoint]);});}
  await go('?view=skill-tree');await page.waitForFunction(()=>HyperskillPortfolio.state().status==='unavailable');assert.deepEqual((await state()).ids,[113,229,380]);assert.equal((await state()).learned,32);
  await page.locator('#hyperskill-portfolio summary').click();assert.match(await page.locator('#hyperskill-portfolio').innerText(),/unavailable.*Update unavailable/s);
  const accepted={};
  for(const [name,query]of [['global',''],['personal','?view=skill-tree'],['course8','?course=8'],['project113','?project=113'],['stage617','?project=113&stage=617']]){
   await go(query);accepted[name]=await geometry();if(name!=='personal')assert.equal(hash(accepted[name]),fingerprints[name]);
  }
  // Switch once to a full valid snapshot, then add four versioned projects in
  // place. No navigation reload, app build or fixture mutation of progress.json.
  await go('?view=skill-tree');await page.locator('#hyperskill-portfolio summary').click();missing=false;await page.evaluate(()=>HyperskillPortfolio.refresh());
  assert.equal((await state()).status,'current');const original=await geometry();
  for(let i=1;i<pairs.length;i++){
   pair=pairs[i];await page.evaluate(()=>HyperskillPortfolio.refresh());
   const now=await state();assert.equal(now.count,3+i);assert.equal(now.verified,12);assert.deepEqual(now.course,s.baseline.course_completion);assert.equal(now.revision,JSON.parse(pair.pointerText).revision);
   assert.equal(await geometry(),original);
   await page.waitForFunction(count=>AtlasShell.state().activeFrame.contentWindow.PublicProgress?.completed_project_count===count,now.count);
   await page.waitForFunction(count=>{const w=AtlasShell.state().activeFrame.contentWindow;return w.SkillProgress&&w.document.querySelector('#progress-overview .overview-metric:nth-child(2) b').textContent===String(count);},now.count);
   assert.match(await page.frameLocator('iframe[data-active=true]').locator('#progress-overview').innerText(),new RegExp(now.learned+' / 3,106'));
   const entries=page.locator('#hyperskill-portfolio li');assert.equal(await entries.count(),now.count);
   const links=await entries.locator('a').evaluateAll(xs=>xs.map(a=>({url:a.href,rel:a.rel,target:a.target})));
   assert.equal(links.length,now.count);assert(links.every(link=>link.url.startsWith('https://github.com/Planton361/hyperskill-projects/blob/'+now.revision+'/')&&link.rel==='noopener noreferrer'&&link.target==='_blank'));
   assert.equal(await page.locator('#hyperskill-portfolio img').count(),0);assert.match(await entries.last().innerText(),/Synthetic/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  assert((await state()).learned>32);
  await page.evaluate(()=>AtlasShell.navigate({view:'atlas',project:String(window.HyperskillPortfolio.state().snapshot.portfolio.find(p=>p.archive_schema===4&&p.requirements_state==='KNOWN').project_id)}));
  await page.waitForFunction(()=>AtlasShell.state().activeFrame?.contentWindow.ScopeApp?.state().L&&!AtlasShell.state().activeFrame.contentWindow.ScopeApp.state().busy);
  const mapped=await page.evaluate(()=>{const w=AtlasShell.state().activeFrame.contentWindow,s=w.ScopeApp.state();return s.scope.explicit_topic_ids.map(id=>({id,learned:s.ux.topic(id).learned,verified:s.ux.topic(id).verified}));});
  assert(mapped.length>0);assert(mapped.every(t=>t.learned===true));assert(mapped.every(t=>t.verified===s.baseline.verified_topic_ids.includes(t.id)));
  await page.evaluate(()=>AtlasShell.navigate({view:'skill-tree'}));
  await page.waitForFunction(()=>AtlasShell.state().activeFrame?.contentWindow.SkillProgress);
  assert.equal(await page.locator(`[data-project-id="${s.unmapped}"]`).getAttribute('data-mapping'),'UNMAPPED');
  assert.equal(await page.locator(`[data-project-id="${s.unknown}"]`).getAttribute('data-mapping'),'UNKNOWN');
  assert.equal(await page.locator(`[data-project-id="${s.empty}"]`).getAttribute('data-mapping'),'KNOWN_EMPTY');
  assert.equal(await page.locator('#project-choice option[value="'+s.unmapped+'"]').count(),0);
  const revision=(await state()).revision,count=(await state()).count;
  missing=true;await page.evaluate(()=>HyperskillPortfolio.refresh());assert.equal((await state()).status,'stale');assert.equal((await state()).revision,revision);assert.equal((await state()).count,count);
  // Revisiting uses a fully revalidated cache, with no empty reset offline.
  await page.reload();await page.waitForFunction(()=>HyperskillPortfolio.state()?.status==='stale');assert.equal((await state()).count,count);
  await page.waitForFunction(()=>AtlasShell.state().activeFrame?.contentWindow.SkillProgress);
  await page.waitForFunction(count=>AtlasShell.state().activeFrame.contentWindow.document.querySelector('#progress-overview .overview-metric:nth-child(2) b').textContent===String(count),count);
  // Active snapshot applies to existing and newly opened global/scope views.
  missing=false;
  for(const [name,query]of [['global',''],['course8','?course=8'],['project113','?project=113'],['stage617','?project=113&stage=617']]){
   await page.goto(base+query);await page.waitForFunction(()=>HyperskillPortfolio.state()?.status==='current');await page.waitForFunction(()=>{const w=AtlasShell.state().activeFrame?.contentWindow;return w?.AtlasV6?.state().L||w?.ScopeApp?.state().L;});
   assert.equal(await geometry(),accepted[name]);
   if(name==='global'){const flags=await page.evaluate(()=>{const s=AtlasShell.state().activeFrame.contentWindow.AtlasV6.state();return [...s.renderer.byKey.values()].filter(n=>n.type==='topic').map(n=>({id:Number(n.key.split(':')[1]),learned:n.learned,verified:n.verified}));});const learned=new Set(JSON.parse(pair.payloadText).projects.filter(p=>s.scopes.projects.find(r=>r.scope_id===p.project_id)?.state==='KNOWN').flatMap(p=>s.scopes.projects.find(r=>r.scope_id===p.project_id).explicit_topic_ids));assert(flags.filter(t=>learned.has(t.id)).every(t=>t.learned===true));assert(flags.every(t=>Boolean(t.verified)===s.baseline.verified_topic_ids.includes(t.id)));}
   await page.waitForFunction(expected=>AtlasShell.state().activeFrame.contentWindow.PublicProgress?.completed_project_count===expected,count);
  }
  await page.goto(base+'?view=skill-tree');await page.waitForFunction(()=>HyperskillPortfolio.state()?.status==='current'&&AtlasShell.state().activeFrame?.contentWindow.SkillProgress);
  await page.locator('#hyperskill-portfolio summary').click();await page.screenshot({path:path.join(s.root,`test-results/index-${engineName}-${width}.png`)});
  assert.deepEqual(errors,[]);rows.push({engine:engineName,width,projects:count,revision,learned:(await state()).learned,verified:12,baseline_geometry_unchanged:true,requests});await context.close();
 }}finally{await browser.close();}
}
fs.writeFileSync(path.join(s.root,'test-results/index-browser.json'),JSON.stringify({status:'PASS',rows},null,2)+'\n');console.log(JSON.stringify({status:'PASS',rows}));
})().catch(error=>{console.error(error);process.exit(1);});
