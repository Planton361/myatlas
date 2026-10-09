/* Installed Google Chrome, fresh disposable profile, and a native action popup.
   LeetCode page responses are supplied locally. This smoke test never marks a solve. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {chromium}=require('../../../tests/myatlas/browser.cjs');
const workspace=path.resolve(process.argv[2]),extension=path.resolve(__dirname,'../extension');
(async()=>{
  fs.mkdirSync(workspace,{recursive:true});
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'myatlas-chrome-pilot-smoke-'));
  let context;const result={status:'RUNNING',extensionDirectory:extension,unexpectedPageRequests:0,realAccountTest:false,progressWrites:0};
  try{
    context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,ignoreDefaultArgs:['--disable-extensions'],args:['--enable-unsafe-extension-debugging','--enable-extension-targets']});
    result.browser=context.browser().version();
    await context.route('**/*',r=>{
      const u=new URL(r.request().url());
      if(u.origin==='https://leetcode.com')return r.fulfill({contentType:'text/html',body:'<!doctype html><title>DISPOSABLE LOCAL SMOKE</title><h1>DISPOSABLE LOCAL SMOKE — no account</h1><button data-e2e-locator="console-submit-button">Submit</button><span role="status">Accepted</span>'});
      if(u.protocol==='chrome-extension:')return r.continue();
      result.unexpectedPageRequests++;return r.abort();
    });
    const cdp=await context.browser().newBrowserCDPSession();
    const {id}=await cdp.send('Extensions.loadUnpacked',{path:extension});
    const sw=context.serviceWorkers().find(w=>w.url().startsWith('chrome-extension://'+id+'/'))||await context.waitForEvent('serviceworker');
    const permissions=await sw.evaluate(()=>chrome.permissions.getAll());
    assert.deepEqual(permissions.permissions,['storage']);assert.deepEqual(permissions.origins,['https://leetcode.com/problems/*']);result.permissions=permissions;
    const {extensions}=await cdp.send('Extensions.getExtensions');const installed=extensions.find(e=>e.id===id);
    assert(installed?.enabled);assert.equal(fs.realpathSync(installed.path),fs.realpathSync(extension));
    const page=await context.newPage();await page.goto('https://leetcode.com/problems/two-sum/');await page.bringToFront();
    const {targetInfos}=await cdp.send('Target.getTargets',{filter:[{type:'tab',exclude:false}]});
    const tabTarget=targetInfos.find(t=>t.url===page.url());assert(tabTarget,'Missing Chrome tab target');
    // Chrome exposes its native extension popup as an "other" target rather
    // than a Playwright page. Observe and inspect only that packaged document.
    await cdp.send('Target.setDiscoverTargets',{discover:true,filter:[{}]});
    const popupURL='chrome-extension://'+id+'/popup.html';
    const popupPromise=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{cdp.off('Target.targetInfoChanged',changed);reject(Error('Native popup target did not load'));},10000);
      function changed({targetInfo}){if(targetInfo.url===popupURL){clearTimeout(timer);cdp.off('Target.targetInfoChanged',changed);resolve(targetInfo);}}
      cdp.on('Target.targetInfoChanged',changed);
    });
    popupPromise.catch(()=>{});
    await cdp.send('Extensions.triggerAction',{id,targetId:tabTarget.targetId});
    const popup=await popupPromise;
    const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:popup.targetId,flatten:false});
    let sequence=0;
    function command(method,params){return new Promise((resolve,reject)=>{
      const messageId=++sequence;
      const timer=setTimeout(()=>{cdp.off('Target.receivedMessageFromTarget',received);reject(Error('Popup command timed out'));},10000);
      function received(event){if(event.sessionId!==sessionId)return;const message=JSON.parse(event.message);if(message.id!==messageId)return;clearTimeout(timer);cdp.off('Target.receivedMessageFromTarget',received);message.error?reject(Error(message.error.message)):resolve(message.result);}
      cdp.on('Target.receivedMessageFromTarget',received);
      cdp.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id:messageId,method,params})}).catch(reject);
    });}
    const observation=await command('Runtime.evaluate',{awaitPromise:true,returnByValue:true,expression:`(async()=>{if(document.readyState!=='complete')await new Promise(resolve=>window.addEventListener('load',resolve,{once:true}));await refresh();return {url:location.href,count:document.getElementById('count').textContent,markEnabled:!document.getElementById('mark').disabled,confirmHidden:document.getElementById('confirm').hidden,current:document.getElementById('current').textContent};})()`});
    assert.equal(observation.exceptionDetails,undefined);
    const popupState=observation.result.value;
    assert.equal(popupState.url,popupURL);assert.equal(popupState.count,'0 solved');assert.equal(popupState.markEnabled,true);assert.equal(popupState.confirmHidden,true);
    assert.match(popupState.current,/lc:problem:p0001 · two-sum/);
    const screenshot=await command('Page.captureScreenshot',{});fs.writeFileSync(path.join(workspace,'chrome-native-popup.png'),Buffer.from(screenshot.data,'base64'));
    const stored=await sw.evaluate(()=>chrome.storage.local.get(null));assert.deepEqual(stored,{});
    result.nativeToolbarPopup=true;result.viewedAcceptedIgnored=true;result.manualMarkAvailable=true;result.initialAndFinalSolved=0;
    assert.equal(result.unexpectedPageRequests,0);result.status='PASS';
  }finally{
    if(context)await context.close();fs.rmSync(profile,{recursive:true,force:true});
  }
  result.disposableProfileDeleted=!fs.existsSync(profile);
  fs.writeFileSync(path.join(workspace,'chrome-smoke-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exit(1);});
