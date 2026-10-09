/* Persistent cross-route navigation, keyboard access and narrow layouts. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||path.join(root,'scripts/knowledge_atlas/node_modules/playwright'));
const base=process.env.ATLAS_PREVIEW||'http://127.0.0.1:8807/myatlas/knowledge-map/';
const publicURL=require('../../src/leetcode-progress/loader.js').URL;
const out=process.env.NAV_ARTIFACT_DIR||path.join(root,'test-results/navigation');
const widths=[2048,1440,1280,1024,768,390],results=[];
fs.mkdirSync(out,{recursive:true});
async function run(engine,name,options){
 const browser=await engine.launch({headless:true,...options});
 try{for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000}});
  const page=await context.newPage(),errors=[],bad=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
  await context.route('**/*',route=>{
   const request=route.request(),url=request.url();
   assert.equal(request.method(),'GET');
   if(url===publicURL){
    assert.equal(request.headers().authorization,undefined);assert.equal(request.headers().cookie,undefined);
    if(!process.env.NAV_LIVE_PROGRESS)return route.fulfill({json:{schemaVersion:1,updatedAt:new Date().toISOString(),solved:[{problemId:'lc:problem:p0001',source:'manual-owner-attestation'}]}});
   }else assert.equal(new URL(url).origin,new URL(base).origin);
   return route.continue();
  });
  const ready=()=>page.waitForFunction(()=>{
   if(!window.AtlasShell||!document.querySelector('#loading').hidden||!AtlasShell.state().activeFrame?.contentWindow.PublicProgress)return false;
   // Wait for the actual frames and worker bootstrap, including retained views.
   // Network-idle lifecycle events can remain unsettled after iframe switches.
   return [...document.querySelectorAll('iframe')].every(frame=>{
    if(frame.contentDocument?.readyState!=='complete')return false;
    const renderer=frame.contentWindow.AtlasV6?.state().renderer;
    return !renderer?.worker||renderer.workerReady===true;
   });
  });
  async function header(view){
   assert.deepEqual(await page.locator('#application-nav a').allTextContents(),['Atlas','My Skill Tree','LeetCode']);
   const boxes=await page.evaluate(()=>[document.querySelector('#application-header h1'),...document.querySelectorAll('#application-nav a')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,overflow:e.scrollWidth>e.clientWidth};}));
   for(const b of boxes){assert(b.left>=0&&b.right<=width+.5,'Header bounds');assert(!b.overflow,'Readable header text');}
   for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert(Math.min(boxes[i].right,boxes[j].right)<=Math.max(boxes[i].left,boxes[j].left)+.5,'Header collision');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(name!=='webkit'&&[1440,390].includes(width))await page.screenshot({path:path.join(out,`${name}-${view}-${width}.png`)});
   results.push({engine:name,width,view,links:3,collisions:0,overflow:false});
  }
  await page.goto(base+'?view=atlas');await ready();await header('atlas');
  await page.locator('#nav-skill-tree').click();await ready();assert.equal(await page.evaluate(()=>AtlasShell.state().route.view),'skill-tree');await header('skill-tree');
  await page.locator('#nav-skill-tree').focus();
  await page.keyboard.press('Tab');
  // Native WebKit link traversal can use Option+Tab, depending on platform.
  if(name==='webkit'&&await page.evaluate(()=>document.activeElement.id)!=='nav-leetcode'){
   await page.locator('#nav-skill-tree').focus();await page.keyboard.press('Alt+Tab');
  }
  assert.equal(await page.evaluate(()=>document.activeElement.id),'nav-leetcode');
  assert.notEqual(await page.locator('#nav-leetcode').evaluate(e=>getComputedStyle(e).outlineStyle),'none');
  await page.keyboard.press('Enter');await page.waitForFunction(()=>window.LeetCodeAtlas&&document.body.dataset.publicState==='published');
  assert.equal(new URL(page.url()).pathname,new URL('../leetcode-atlas/',base).pathname);await page.waitForLoadState('load');await header('leetcode');
  await page.locator('#nav-atlas').click();await ready();assert.equal(await page.evaluate(()=>AtlasShell.state().route.view),'atlas');
  // Directly test the return link from Atlas as well as Skill Tree.
  await page.locator('#nav-leetcode').click();await page.waitForFunction(()=>window.LeetCodeAtlas&&document.body.dataset.publicState==='published');await page.waitForLoadState('load');
  await page.locator('#nav-skill-tree').click();await ready();assert.equal(await page.evaluate(()=>AtlasShell.state().route.view),'skill-tree');
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  await context.close();
 }}finally{await browser.close();}
}
(async()=>{
 await run(chromium,process.env.NAV_CHROME?'chrome':'chromium',process.env.NAV_CHROME?{channel:'chrome'}:{});
 await run(webkit,'webkit',{});
 fs.writeFileSync(process.env.NAV_ARTIFACT||path.join(root,'test-results/myatlas-navigation.json'),JSON.stringify({status:'PASS',results},null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',states:results.length,widths,engines:[process.env.NAV_CHROME?'chrome':'chromium','webkit']}));
})().catch(e=>{console.error(e);process.exitCode=1;});
