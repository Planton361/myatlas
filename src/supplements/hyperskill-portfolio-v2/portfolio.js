/* The shell owns one complete data snapshot shared by every Atlas frame. */
(async()=>{
'use strict';
const listeners=new Set();let reader,enabled=false,resolveReady,closed=false,interval=null,last=Date.now();
const ready=new Promise(resolve=>{resolveReady=resolve;});
window.HyperskillPortfolio=Object.freeze({ready,get enabled(){return enabled;},state:()=>reader?.state(),subscribe(fn){listeners.add(fn);if(reader)fn(reader.state());return()=>listeners.delete(fn);},refresh:()=>reader?.refresh()});
try{
 const response=await fetch('hyperskill-index/config.json');if(!response.ok)throw Error('Missing index activation configuration');const config=await response.json();
 if(config.enabled!==true){resolveReady(false);return;}enabled=true;
 const read=async p=>{const r=await fetch(p);if(!r.ok)throw Error('Missing trusted Atlas input');return r.text();};
 const [catalogText,scopesText,baselineText,runtimeText]=await Promise.all(['views/knowledge-atlas-scope-pyramid/catalog.json','views/knowledge-atlas-scope-pyramid/scope-index.json','progress.json','runtime-manifest.json'].map(read));
 if(await HyperskillIndex.digest(new TextEncoder().encode(catalogText))!==config.catalog_sha256||await HyperskillIndex.digest(new TextEncoder().encode(scopesText))!==config.scopes_sha256)throw Error('Trusted catalog digest mismatch');
 const binding=Object.freeze({application_revision:JSON.parse(runtimeText).source_commit,catalog_sha256:config.catalog_sha256,scopes_sha256:config.scopes_sha256});
 const projection=HyperskillProjection.create({catalog:JSON.parse(catalogText),scopes:JSON.parse(scopesText),baseline:JSON.parse(baselineText),catalogBinding:binding});
 let storage;try{storage=window.localStorage;}catch{storage=null;}
 const control=document.createElement('div');control.id='hyperskill-portfolio-control';
 const panel=document.createElement('details');panel.id='hyperskill-portfolio';
 const summary=document.createElement('summary');summary.textContent='Meine Projekte';panel.append(summary);
 const body=document.createElement('div');body.className='project-list';panel.append(body);
 const notice=document.createElement('p');notice.id='hyperskill-portfolio-notice';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');notice.hidden=true;
 control.append(panel,notice);document.querySelector('#application-header').append(control);document.body.classList.add('has-hyperskill-portfolio');
 panel.addEventListener('toggle',()=>{if(panel.open)body.prepend(notice);else control.append(notice);});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&panel.open){panel.open=false;summary.focus();}});
 document.addEventListener('click',event=>{if(panel.open&&!control.contains(event.target))panel.open=false;});
 function render(state){
  const fragment=document.createDocumentFragment(),snapshot=state.snapshot;
  const text=(tag,value)=>{const node=document.createElement(tag);node.textContent=value;return node;};
  summary.textContent=`Meine Projekte · ${snapshot.register.completed_project_count}`;
  panel.dataset.status=state.status;panel.dataset.revision=state.revision;
  notice.hidden=!state.error;
  notice.textContent=state.status==='stale'
   ? 'Projektliste nicht aktuell. Der letzte geprüfte Stand bleibt erhalten.'
   : 'Projektliste konnte nicht aktualisiert werden. Der vorhandene Stand bleibt erhalten.';
  const list=document.createElement('ul');
  for(const project of snapshot.portfolio){
   const li=document.createElement('li');li.dataset.projectId=project.project_id;li.dataset.mapping=project.requirements_state;
   li.append(text('span',project.title));
   if(project.languages?.length){const languages=text('small',project.languages.join(', '));li.append(languages);}
   if(project.code_url){const link=text('a','Code ansehen');link.href=project.code_url;link.target='_blank';link.rel='noopener noreferrer';li.append(link);}
   list.append(li);
  }
  if(panel.open)fragment.append(notice);else control.append(notice);
  fragment.append(list);
  // Replace the complete list from the same reader snapshot; retain open/focus state.
  body.replaceChildren(fragment);
 }

 reader=HyperskillIndex.create({fallback:projection.fallback,derive:projection.snapshot,storage,onChange:state=>{for(const fn of listeners)fn(state);render(state);}});
 window.addEventListener('pagehide',()=>{closed=true;reader.cancel();clearInterval(interval);});
 window.addEventListener('pageshow',event=>{if(event.persisted){closed=false;reader.refresh();clearInterval(interval);interval=setInterval(refresh,300000);}});
 render(reader.state());resolveReady(true);await reader.restore();await reader.refresh();
 last=Date.now();function refresh(){if(!closed&&document.visibilityState==='visible'&&Date.now()-last>=60000){last=Date.now();reader.refresh();}}
 document.addEventListener('visibilitychange',refresh);clearInterval(interval);if(!closed)interval=setInterval(refresh,300000);
}catch(error){resolveReady(false);const message=document.createElement('p');message.id='hyperskill-index-error';message.setAttribute('role','status');message.textContent='Projektliste kann gerade nicht geladen werden. Dein bisheriger Lernfortschritt bleibt erhalten.';document.querySelector('#application-header').append(message);}
})();
