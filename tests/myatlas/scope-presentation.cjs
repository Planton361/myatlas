/* Exercise the real supplement in both browser engines without changing evidence. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const {chromium,webkit}=require(path.join(root,'scripts/knowledge_atlas/node_modules/playwright'));
const scopes=JSON.parse(fs.readFileSync(path.join(root,'src/myatlas/knowledge-atlas-scope-pyramid/scope-index.json')));
const projection=JSON.parse(fs.readFileSync(path.join(root,'build/pages/knowledge-map/progress.json')));
const base=process.env.ATLAS_PREVIEW||'http://127.0.0.1:8807/myatlas/knowledge-map/';
const out=path.join(root,'test-results/scope');fs.mkdirSync(out,{recursive:true});
const rows=[];
(async()=>{for(const [name,engine]of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true});try{for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:width===390?844:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  async function open(){await page.goto(base+'?view=skill-tree');await page.waitForFunction(()=>window.AtlasShell?.state().activeFrame?.contentWindow.SkillProgress);await page.frameLocator('iframe[data-active=true]').locator('#progress-expand').click();}
  await open();const frame=page.frameLocator('iframe[data-active=true]');
  const state=()=>page.evaluate(()=>AtlasShell.state().activeFrame.contentWindow.SkillProgress.state());
  const geometry=()=>page.evaluate(()=>{const L=AtlasShell.state().activeFrame.contentWindow.AtlasV6.state().L;return JSON.stringify([L.nodes.map(n=>[n.key,n.x,n.y,n.width,n.height,n.lines]),L.connectorSegments,L.trays,L.checkpoint]);});
  const original=await geometry();
  async function check(type,id){
   const expected=[...new Set(scopes[type+'s'].find(r=>r.scope_id===id)?.explicit_topic_ids||[])];
   const actual=await page.evaluate(()=>{const w=AtlasShell.state().activeFrame.contentWindow,nodes=[...w.document.querySelectorAll('#graph .node.topic[data-key]')];return {all:nodes.map(n=>Number(n.dataset.key.split(':')[1])),marked:nodes.filter(n=>n.classList.contains('in-progress-scope')).map(n=>Number(n.dataset.key.split(':')[1])),status:nodes.filter(n=>n.classList.contains('in-progress-scope')).map(n=>({id:Number(n.dataset.key.split(':')[1]),learned:n.classList.contains('learned'),verified:!!n.querySelector('.ring')})),global:w.PublicProgress.global};});
   assert.deepEqual([...new Set(actual.marked)].sort((a,b)=>a-b),[...new Set(actual.all.filter(i=>expected.includes(i)))].sort((a,b)=>a-b));
   for(const node of actual.status){const topic=projection.topics.find(t=>t.topic_id===node.id);assert.equal(node.learned,topic?.learned===true);assert.equal(node.verified,topic?.verified===true);}
   assert.deepEqual(actual.global,projection.global);assert.equal(await geometry(),original);
   await assert.doesNotReject(()=>frame.locator('#progress-scope-legend').getByText(`Topics in selected scope · ${new Set(actual.marked).size} visible / ${expected.length} assigned`,{exact:true}).waitFor());
  }
  await frame.locator('#progress-reset').click();assert.equal(await frame.locator('#progress-project option').count(),scopes.projects.length+1);assert.equal(await frame.locator('.in-progress-scope').count(),0);
  await frame.locator('#progress-course').selectOption('8');assert.equal(await frame.locator('#progress-project option').count(),12);await check('course',8);
  await frame.locator('#progress-project').selectOption('113');await check('project',113);
  const stages=scopes.stages.filter(s=>s.project_id===113);assert.deepEqual((await frame.locator('#progress-stage option').evaluateAll(xs=>xs.slice(1).map(x=>+x.value))).sort((a,b)=>a-b),stages.map(s=>s.scope_id).sort((a,b)=>a-b));
  await frame.locator('#progress-stage').selectOption('617');await check('stage',617);
  if(width===1440){await frame.locator('#progress-close').click();await page.evaluate(()=>AtlasShell.state().activeFrame.contentWindow.AtlasV6.select('topic:36',true));await page.waitForTimeout(300);await page.screenshot({path:path.join(out,`${name}-${width}-highlight.png`)});await frame.locator('#progress-expand').click();}
  await page.screenshot({path:path.join(out,`${name}-${width}-controls.png`)});
  const empty=scopes.course_project_associations.courses.find(c=>c.state==='KNOWN_EMPTY');
  await frame.locator('#progress-course').selectOption(String(empty.course_id));assert.equal((await state()).project,null);assert.equal((await state()).stage,null);assert.equal(await frame.locator('#progress-project option').count(),1);await check('course',empty.course_id);
  await frame.locator('#progress-reset').click();assert.equal(await frame.locator('.in-progress-scope').count(),0);assert(await frame.locator('#progress-scope-legend').isHidden());
  // Known zero-match scope and a zero-match Stage exercise the highest-priority scope.
  const present=new Set(await page.evaluate(()=>[...AtlasShell.state().activeFrame.contentWindow.document.querySelectorAll('#graph .node.topic')].map(n=>+n.dataset.key.split(':')[1])));
  for(const type of ['course','project','stage']){const row=scopes[type+'s'].find(r=>r.state==='KNOWN'&&r.explicit_topic_ids.every(id=>!present.has(id)));assert(row);await frame.locator('#progress-reset').click();if(type==='course')await frame.locator('#progress-course').selectOption(String(row.scope_id));else await frame.locator('#progress-project').selectOption(String(type==='project'?row.scope_id:row.project_id));if(type==='stage')await frame.locator('#progress-stage').selectOption(String(row.scope_id));await check(type,row.scope_id);}
  await frame.locator('#progress-reset').click();await frame.locator('#progress-course').selectOption('8');await frame.locator('#progress-project').selectOption('113');await frame.locator('#progress-stage').selectOption('617');await frame.locator('#progress-stage').selectOption('');await check('project',113);await frame.locator('#progress-project').selectOption('');await check('course',8);
  await frame.locator('#progress-reset').click();const unknownRequirements=scopes.projects.find(p=>p.state==='UNKNOWN');await frame.locator('#progress-project').selectOption(String(unknownRequirements.scope_id));assert.equal(await frame.locator('.in-progress-scope').count(),0);assert.equal(await frame.locator('#progress-scope-legend').innerText(),'Topics in selected scope · Requirements unknown');
  const duplicated=structuredClone(scopes);for(const type of ['courses','projects','stages'])for(const row of duplicated[type])if(row.explicit_topic_ids?.length)row.explicit_topic_ids.push(row.explicit_topic_ids[0]);await page.route('**/scope-index.json',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(duplicated)}));await open();await frame.locator('#progress-course').selectOption('8');await check('course',8);await page.unroute('**/scope-index.json');
  const unknown=structuredClone(scopes);delete unknown.course_project_associations;
  await page.route('**/scope-index.json',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(unknown)}));await open();await frame.locator('#progress-course').selectOption('8');assert.equal(await frame.locator('#progress-project option').count(),1);assert.equal(await frame.locator('#progress-associations').innerText(),'Project associations unknown');
  assert.equal(await frame.locator('#progress-panel').evaluate(p=>p.scrollWidth<=p.clientWidth),true);assert.deepEqual(errors,[]);
  rows.push({engine:name,width,status:'PASS',completed_project_ids:projection.completed_project_ids,learned:projection.global.learned,verified:projection.global.verified,geometry_unchanged:true});await page.close();
 }}finally{await browser.close();}
}fs.writeFileSync(path.join(out,'acceptance.json'),JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows));})().catch(e=>{console.error(e);process.exit(1)});
