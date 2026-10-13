/* Local responses only: real Phase-3 fixtures, both engines, no app rebuild. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const s=require('./index-test-support.cjs'),pairs=s.fixtures();
const {chromium,webkit}=require(path.join(s.root,'scripts/knowledge_atlas/node_modules/playwright'));
const base=process.env.ATLAS_PREVIEW||'http://127.0.0.1:8807/myatlas/knowledge-map/';
const fingerprints=JSON.parse(fs.readFileSync(path.join(s.root,'docs/contracts/hyperskill-baseline-v1.json'))).geometry;
const fallbackRegister=s.candidate.completion_register||s.candidate;
const rows=[],baselineAnalytics=require('../../src/myatlas/knowledge-atlas-v6-skill-tree/progress-analytics.js').create({catalog:s.catalog,scopes:s.scopes,completion:s.baseline});
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
(async()=>{for(const [engineName,engine]of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true});try{for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000}}),errors=[];
  let pair=pairs[0],missing=true,requests=0,phase='boot';
  // Check the selected reviewed release flag; isolated HTTP fixtures supply data.
  await context.route('**/hyperskill-index/config.json',async route=>{const response=await route.fetch();const config=await response.json();const active=fs.existsSync(path.join(s.root,'docs/releases/myatlas-hyperskill-index-activation-v1.json'));assert.equal(config.enabled,active);await route.fulfill({json:{...config,enabled:true}});});
  await context.route(s.reader.ENDPOINT,route=>{requests++;return route.fulfill(missing?{status:404,body:'not published'}:{status:200,contentType:'application/json',body:pair.pointerText});});
  await context.route('https://raw.githubusercontent.com/Planton361/hyperskill-projects/**',route=>route.fulfill({status:200,contentType:'application/json',body:pair.payloadText}));
  await context.addInitScript(()=>{addEventListener('unhandledrejection',event=>console.error('Index test unhandled rejection',location.href,String(event.reason)));addEventListener('error',event=>console.error('Index test window error',location.href,event.message,event.filename));});
  const page=await context.newPage();await page.clock.install();page.on('console',message=>{if(message.type()==='error'&&message.text().startsWith('Index test '))console.error(engineName,width,phase,message.text());});page.on('pageerror',error=>{errors.push(error.message);console.error(engineName,width,phase,error.message,error.stack);});
  const state=()=>page.evaluate(()=>{const s=HyperskillPortfolio.state();return {status:s.status,revision:s.revision,count:s.snapshot.register.completed_project_count,learned:s.snapshot.analytics.global().learned,verified:s.snapshot.analytics.global().verified,ids:s.snapshot.register.completed_project_ids,course:s.snapshot.completion.course_completion};});
  async function go(query=''){phase='go '+query;await page.goto(base+query);await page.waitForFunction(()=>window.AtlasShell?.state().activeFrame?.contentWindow.AtlasV6?.state().L||window.AtlasShell?.state().activeFrame?.contentWindow.ScopeApp?.state().L);await page.waitForFunction(()=>window.HyperskillPortfolio?.state());await viewReady();}
  async function viewReady(){await page.waitForFunction(()=>{const w=AtlasShell.state().activeFrame?.contentWindow,r=w?.AtlasV6?.state().renderer;return w?.HyperskillView?.state()?.snapshot===HyperskillPortfolio.state()?.snapshot&&(!r?.worker||r.workerReady);});}
  async function geometry(){return page.evaluate(()=>{const w=AtlasShell.state().activeFrame.contentWindow,L=(w.AtlasV6||w.ScopeApp).state().L;return JSON.stringify([L.nodes.map(n=>[n.key,n.x,n.y,n.width,n.height,n.lines]),L.connectorSegments,L.trays,L.checkpoint]);});}
  await go('?view=skill-tree');await page.waitForFunction(()=>HyperskillPortfolio.state().status==='unavailable'&&HyperskillPortfolio.state().error);assert.deepEqual((await state()).ids,fallbackRegister.completed_project_ids);assert.equal((await state()).count,fallbackRegister.completed_project_count);assert.equal((await state()).learned,s.candidate.global.learned);assert.equal((await state()).verified,12);assert.deepEqual((await state()).course,s.candidate.course_completion);
  assert.equal(await page.locator('#application-header #hyperskill-portfolio-control').count(),1);
  assert.equal(await page.locator('#view-content > #hyperskill-portfolio').count(),0);
  assert.equal(await page.locator('#hyperskill-portfolio').getAttribute('open'),null);
  assert.equal(await page.locator('#hyperskill-portfolio-notice').isVisible(),true);
  assert.match(await page.locator('#hyperskill-portfolio-notice').innerText(),/vorhandene.*Stand bleibt erhalten/s);
  await page.locator('#hyperskill-portfolio summary').click();
  assert.equal(await page.locator('#hyperskill-portfolio-notice').isVisible(),true);
  // Keep the actual candidate fallback check above. The immutable geometry
  // and data-only update exercise starts from the exact accepted static baseline,
  // as in geometry-browser.cjs, even when the outer app candidate has grown.
  await context.route('**/knowledge-map/progress.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(s.baseline)}));
  const accepted={};
  for(const [name,query]of [['global',''],['personal','?view=skill-tree'],['course8','?course=8'],['project113','?project=113'],['stage617','?project=113&stage=617']]){
   await go(query);accepted[name]=await geometry();assert.equal(hash(accepted[name]),fingerprints[name]);
  }
  // Switch once to a full valid snapshot, then add four versioned projects in
  // place. No navigation reload, app build or fixture mutation of progress.json.
  await go('?view=skill-tree');await page.locator('#hyperskill-portfolio summary').click();missing=false;await page.evaluate(()=>HyperskillPortfolio.refresh());
  assert.equal((await state()).status,'current');const original=await geometry();
  assert.equal(await page.locator('#hyperskill-portfolio-notice').isVisible(),false);
  await page.locator('#hyperskill-portfolio summary').click();
  assert.equal(await page.locator('#hyperskill-portfolio').getAttribute('open'),null);
  for(let i=1;i<pairs.length;i++){
   phase='add '+i;pair=pairs[i];await page.evaluate(()=>HyperskillPortfolio.refresh());
   const now=await state();assert.equal(now.count,3+i);assert.equal(now.verified,12);assert.deepEqual(now.course,s.baseline.course_completion);assert.equal(now.revision,JSON.parse(pair.pointerText).revision);
   assert.equal(await page.locator('#hyperskill-portfolio summary').innerText(),'Meine Projekte · '+now.count);
   assert.equal(await page.locator('#hyperskill-portfolio').getAttribute('open'),null);
   assert.equal(await geometry(),original);
   await page.waitForFunction(count=>AtlasShell.state().activeFrame.contentWindow.PublicProgress?.completed_project_count===count,now.count);
   await page.waitForFunction(count=>{const w=AtlasShell.state().activeFrame.contentWindow;return w.SkillProgress&&w.document.querySelector('#progress-overview .overview-metric:nth-child(2) b').textContent===String(count);},now.count);
   assert.match(await page.frameLocator('iframe[data-active=true]').locator('#progress-overview').innerText(),new RegExp(now.learned+' / 3,106'));
   const entries=page.locator('#hyperskill-portfolio li');assert.equal(await entries.count(),now.count);
   const links=await entries.locator('a').evaluateAll(xs=>xs.map(a=>({url:a.href,rel:a.rel,target:a.target})));
   assert.equal(links.length,now.count);assert(links.every(link=>link.url.startsWith('https://github.com/Planton361/hyperskill-projects/blob/'+now.revision+'/')&&link.rel==='noopener noreferrer'&&link.target==='_blank'));
   await page.locator('#hyperskill-portfolio summary').click();
   assert.equal(await entries.last().isVisible(),true);
   assert.equal(await page.locator('#hyperskill-portfolio img').count(),0);assert.match(await entries.last().innerText(),/Synthetic/);
   for(const project of JSON.parse(pair.payloadText).projects){
    const entry=page.locator('#hyperskill-portfolio li[data-project-id="'+project.project_id+'"]');
    assert.equal(await entry.locator('span').innerText(),project.title);
    assert.equal(await entry.locator('small').count(),project.languages?.length?1:0);
    if(project.languages?.length)assert.equal(await entry.locator('small').innerText(),project.languages.join(', '));
   }
   await page.locator('#hyperskill-portfolio summary').click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  const beforeAutomatic=requests;await page.clock.fastForward(300100);
  await page.waitForFunction(()=>HyperskillPortfolio.state().status==='current');assert(requests>beforeAutomatic,'Closed portfolio must keep its automatic refresh');
  assert.equal(await page.locator('#hyperskill-portfolio').getAttribute('open'),null);
  assert((await state()).learned>32);
  await page.evaluate(()=>AtlasShell.navigate({view:'atlas',project:String(window.HyperskillPortfolio.state().snapshot.portfolio.find(p=>p.archive_schema===4&&p.requirements_state==='KNOWN').project_id)}));
  await page.waitForFunction(()=>AtlasShell.state().activeFrame?.contentWindow.ScopeApp?.state().L&&!AtlasShell.state().activeFrame.contentWindow.ScopeApp.state().busy);
  await viewReady();const mapped=await page.evaluate(()=>{const w=AtlasShell.state().activeFrame.contentWindow,s=w.ScopeApp.state();return s.scope.explicit_topic_ids.map(id=>({id,learned:s.ux.topic(id).learned,verified:s.ux.topic(id).verified,painted:w.document.querySelector('[data-key=\"topic:'+id+'\"]').classList.contains('learned')}));});
  assert(mapped.length>0);assert(mapped.every(t=>t.learned===true&&t.painted));assert(mapped.every(t=>t.verified===baselineAnalytics.topic(t.id).verified));
  await page.evaluate(()=>AtlasShell.navigate({view:'skill-tree'}));
  await page.waitForFunction(()=>AtlasShell.state().activeFrame?.contentWindow.SkillProgress);
  assert.equal(await page.locator(`[data-project-id="${s.unmapped}"]`).getAttribute('data-mapping'),'UNMAPPED');
  assert.equal(await page.locator(`[data-project-id="${s.unknown}"]`).getAttribute('data-mapping'),'UNKNOWN');
  assert.equal(await page.locator(`[data-project-id="${s.empty}"]`).getAttribute('data-mapping'),'KNOWN_EMPTY');
  assert.equal(await page.locator('#project-choice option[value="'+s.unmapped+'"]').count(),0);
  const revision=(await state()).revision,count=(await state()).count;
  missing=true;await page.evaluate(()=>HyperskillPortfolio.refresh());assert.equal((await state()).status,'stale');
  assert.equal(await page.locator('#hyperskill-portfolio-notice').isVisible(),true);
  assert.match(await page.locator('#hyperskill-portfolio-notice').innerText(),/letzte geprüfte Stand/);assert.equal((await state()).revision,revision);assert.equal((await state()).count,count);
  // Revisiting uses a fully revalidated cache, with no empty reset offline.
  phase='cache reload';await page.reload();await page.waitForFunction(()=>HyperskillPortfolio.state()?.status==='stale');assert.equal((await state()).count,count);
  await page.waitForFunction(()=>AtlasShell.state().activeFrame?.contentWindow.SkillProgress);
  await page.waitForFunction(count=>AtlasShell.state().activeFrame.contentWindow.document.querySelector('#progress-overview .overview-metric:nth-child(2) b').textContent===String(count),count);
  // Active snapshot applies to existing and newly opened global/scope views.
  missing=false;
  for(const [name,query]of [['global',''],['course8','?course=8'],['project113','?project=113'],['stage617','?project=113&stage=617']]){
   phase='latest '+name;await page.goto(base+query);await page.waitForFunction(()=>HyperskillPortfolio.state()?.status==='current');await page.waitForFunction(()=>{const w=AtlasShell.state().activeFrame?.contentWindow;return w?.AtlasV6?.state().L||w?.ScopeApp?.state().L;});
   await viewReady();assert.equal(await geometry(),accepted[name]);
   if(name==='global'){const flags=await page.evaluate(()=>{const s=AtlasShell.state().activeFrame.contentWindow.AtlasV6.state();return [...s.renderer.byKey.values()].filter(n=>n.type==='topic').map(n=>({id:Number(n.key.split(':')[1]),learned:n.learned,verified:n.verified}));});const learned=new Set(JSON.parse(pair.payloadText).projects.filter(p=>s.scopes.projects.find(r=>r.scope_id===p.project_id)?.state==='KNOWN').flatMap(p=>s.scopes.projects.find(r=>r.scope_id===p.project_id).explicit_topic_ids));assert(flags.filter(t=>learned.has(t.id)).every(t=>t.learned===true));assert(flags.every(t=>Boolean(t.verified)===s.baseline.verified_topic_ids.includes(t.id)));}
   try{await page.waitForFunction(expected=>AtlasShell.state().activeFrame.contentWindow.PublicProgress?.completed_project_count===expected,count);}catch(error){console.error({name,state:await state(),frame:await page.evaluate(()=>{const w=AtlasShell.state().activeFrame.contentWindow;return {publicCount:w.PublicProgress?.completed_project_count,error:w.document.querySelector('#error')?.textContent,source:w.PublicProgress?.source};}),errors});throw error;}
  }
  phase='final personal';await page.goto(base+'?view=skill-tree');await page.waitForFunction(()=>HyperskillPortfolio.state()?.status==='current'&&AtlasShell.state().activeFrame?.contentWindow.SkillProgress);
  await page.locator('#hyperskill-portfolio summary').click();
  const normalText=await page.locator('#hyperskill-portfolio').innerText();
  assert(!normalText.includes((await state()).revision));assert(!/Learned Topic IDs|independently verified|Update:|UNMAPPED|KNOWN_EMPTY/.test(normalText));
  assert.equal(await page.locator('#hyperskill-portfolio [data-learned-topics]').count(),0);
  const boxes=await page.locator('#hyperskill-portfolio summary, #application-nav a').evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
  assert(boxes.every(b=>b.left>=0&&b.right<=width&&b.top>=0),'Navigation controls must fit viewport');
  for(let a=0;a<boxes.length;a++)for(let b=a+1;b<boxes.length;b++)assert(boxes[a].right<=boxes[b].left||boxes[b].right<=boxes[a].left||boxes[a].bottom<=boxes[b].top||boxes[b].bottom<=boxes[a].top,'Navigation controls must not overlap');
  const panelBox=await page.locator('#hyperskill-portfolio .project-list').boundingBox();assert(panelBox.x>=0&&panelBox.x+panelBox.width<=width);
  await page.screenshot({path:path.join(s.root,`test-results/index-${engineName}-${width}.png`)});
  await page.keyboard.press('Escape');assert.equal(await page.locator('#hyperskill-portfolio').getAttribute('open'),null);
  assert.equal(await page.locator('#hyperskill-portfolio summary').evaluate(x=>x===document.activeElement),true);
  assert.deepEqual(errors,[]);rows.push({engine:engineName,width,projects:count,revision,learned:(await state()).learned,verified:12,baseline_geometry_unchanged:true,requests});await context.close();
 }}finally{await browser.close();}
}
fs.writeFileSync(path.join(s.root,'test-results/index-browser.json'),JSON.stringify({status:'PASS',rows},null,2)+'\n');console.log(JSON.stringify({status:'PASS',rows}));
})().catch(error=>{console.error(error);process.exit(1);});
