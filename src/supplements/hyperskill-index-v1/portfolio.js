/* The shell owns one complete data snapshot shared by every Atlas frame. */
(async()=>{
'use strict';
const listeners=new Set();let reader,enabled=false,resolveReady;
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
 const panel=document.createElement('details');panel.id='hyperskill-portfolio';const summary=document.createElement('summary');summary.textContent='Hyperskill portfolio';panel.append(summary);document.querySelector('#view-content').prepend(panel);
 function render(state){
  const fragment=document.createDocumentFragment(),snapshot=state.snapshot;
  const text=(tag,value)=>{const node=document.createElement(tag);node.textContent=value;return node;};
  summary.textContent=`Hyperskill portfolio · ${snapshot.register.completed_project_count} completed`;
  panel.dataset.status=state.status;panel.dataset.revision=state.revision;
  const global=snapshot.analytics.global();fragment.append(text('p',`${global.learned} learned Topics · ${global.verified} independently verified`));
  fragment.append(text('p',`${state.status} · source ${state.revision}${state.status==='current'?'':' · Update unavailable; using the last accepted snapshot.'}`));
  if(state.error)fragment.append(text('p','Update: '+state.error));
  const refresh=text('button','Refresh project data');refresh.type='button';refresh.onclick=()=>reader.refresh();fragment.append(refresh);
  const list=document.createElement('ul');
  for(const project of snapshot.portfolio){
   const li=text('li',`${project.title} · Hyperskill ${project.project_id} · ${project.requirements_state}${project.languages?.length?' · '+project.languages.join(', '):''}`);li.dataset.projectId=project.project_id;li.dataset.mapping=project.requirements_state;
   if(project.code_url){const link=text('a','View archived code');link.href=project.code_url;link.target='_blank';link.rel='noopener noreferrer';li.append(' ',link);}
   list.append(li);
  }
  fragment.append(list);
  const learned=document.createElement('p');learned.dataset.learnedTopics='true';learned.textContent='Learned Topic IDs: '+snapshot.completion.effective_learned_topic_ids.join(', ');fragment.append(learned);
  // All rows and counters are replaced together, after complete validation.
  while(panel.children.length>1)panel.lastElementChild.remove();panel.append(fragment);
 }
 reader=HyperskillIndex.create({fallback:projection.fallback,derive:projection.snapshot,storage,onChange:state=>{for(const fn of listeners)fn(state);render(state);}});
 window.addEventListener('pagehide',()=>reader.cancel(),{once:true});
 render(reader.state());resolveReady(true);await reader.restore();await reader.refresh();
 let last=Date.now();const refresh=()=>{if(document.visibilityState==='visible'&&Date.now()-last>=60000){last=Date.now();reader.refresh();}};
 document.addEventListener('visibilitychange',refresh);setInterval(refresh,300000);
}catch(error){resolveReady(false);const message=document.createElement('p');message.id='hyperskill-index-error';message.textContent='Project index unavailable: '+error.message;document.querySelector('#view-content').prepend(message);}
})();
