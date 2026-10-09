/* Optional personal analytics chrome. Reads shared catalogs; never rebuilds a map. */
(async()=>{
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=async url=>{const r=await fetch(url);if(!r.ok)throw Error('Progress data unavailable');return r.json();};
try{
 const [catalog,scopes]=await Promise.all([read('../knowledge-atlas-scope-pyramid/catalog.json'),read('../knowledge-atlas-scope-pyramid/scope-index.json')]);
 catalog.projectCompletion=await read('../../progress.json');
 if(!catalog.projectCompletion.course_completion)catalog.projectCompletion.course_completion=await read('../project-completion/course-completions.json');
 const analytics=ProgressAnalytics.create({catalog,scopes});let course=analytics.courseObserved(8)?8:scopes.courses[0]?.scope_id,project=null,stage=null;
 const ux=ScopeUXModel.create(scopes,catalog,[],[]);
 const {card,scopeCard,panelDetails}=ProgressPresentation;
 const canvas=document.querySelector('#canvas'),overview=document.createElement('section'),panel=document.createElement('section');
 overview.id='progress-overview';overview.setAttribute('aria-label','Personal knowledge and portfolio overview');panel.id='progress-panel';panel.hidden=true;panel.setAttribute('aria-label','Progress analysis');
 const global=analytics.global();overview.innerHTML=`${ProgressPresentation.overview(analytics,course)}<button id="progress-expand" aria-expanded="false" aria-controls="progress-panel">Progress analysis</button>`;
 const key=document.createElement('p');key.id='progress-scope-key';key.hidden=true;key.setAttribute('aria-live','polite');
 canvas.append(overview,panel,key);
 const expand=overview.querySelector('button');function toggle(open){panel.hidden=!open;expand.setAttribute('aria-expanded',String(open));if(!open)expand.focus({preventScroll:true});}
 expand.onclick=()=>toggle(panel.hidden);panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();toggle(false);}});
 const options=(type,selected,rows=null)=>`<option value="">Select ${type}</option>`+(rows||[...analytics.scopeMaps[type].values()]).map(r=>`<option value="${r.scope_id}" ${r.scope_id===selected?'selected':''}>${r.scope_id} · ${esc(r.title)}${r.state==='UNKNOWN'?' · Requirements unknown':''}</option>`).join('');
 function selection(){return {course_id:course,project_id:project,stage_id:stage};}
 function highlight(){
  const scope=ux.current(selection()),ids=new Set(scope?.state==='KNOWN'?scope.explicit_topic_ids:[]),visible=new Set();
  for(const node of document.querySelectorAll('#graph .node.topic[data-key]')){
   const id=Number(node.dataset.key.split(':')[1]),match=ids.has(id);
   node.classList.toggle('in-progress-scope',!!scope&&match);
   if(match)visible.add(id);
   node.setAttribute('aria-label',node.dataset.baseName+(match?'; in selected scope':''));
  }
  for(const legend of [document.querySelector('#progress-scope-legend'),key])if(legend){legend.hidden=!scope;legend.textContent=scope?`Topics in selected scope · ${visible.size} visible / ${ids.size} assigned${scope.state==='UNKNOWN'?' · Requirements unknown':''}`:'';}
 }
 function renderPanel(){
  const association=course==null?null:ux.association(course);

  panel.innerHTML=`<div class="progress-heading"><h2>Progress</h2><button id="progress-close" aria-label="Close progress analysis">×</button></div><div class="progress-controls"><label>Course<select id="progress-course">${options('course',course)}</select></label><label>Project<select id="progress-project">${options('project',project,ux.projectChoices(selection()))}</select></label><label>Stage<select id="progress-stage" ${project==null?'disabled':''}>${options('stage',stage,ux.stageChoices(project))}</select></label></div><p id="progress-associations" role="status">${association?.state==='UNKNOWN'?'Project associations unknown':association?.state==='KNOWN_EMPTY'?'No associated projects':''}</p><button id="progress-reset">Clear scope selection</button><p id="progress-scope-legend" role="status"></p><div class="progress-grid">${card('Global Topics',global,'All globally catalogued Topic IDs',{details:false})}${course!=null?scopeCard(analytics,'course',course,{details:false}):''}${project!=null?scopeCard(analytics,'project',project,{details:false}):''}${stage!=null?scopeCard(analytics,'stage',stage,{details:false}):''}</div>${panelDetails(analytics,{course,project,stage,topicIds:catalog.topics.map(t=>t.id)})}`;
  highlight();
  panel.querySelector('#progress-reset').onclick=()=>{course=project=stage=null;renderPanel();overview.querySelector('.overview-metrics').outerHTML=ProgressPresentation.overview(analytics,course);renderCategory(true);};
  panel.querySelector('#progress-close').onclick=()=>toggle(false);
  panel.querySelector('#progress-course').onchange=e=>{course=e.target.value?Number(e.target.value):null;const next=ux.normalize(selection());project=next.project_id;stage=null;renderPanel();overview.querySelector('.overview-metrics').outerHTML=ProgressPresentation.overview(analytics,course);renderCategory(true);};
  panel.querySelector('#progress-project').onchange=e=>{project=e.target.value?Number(e.target.value):null;stage=null;renderPanel();};
  panel.querySelector('#progress-stage').onchange=e=>{stage=e.target.value?Number(e.target.value):null;renderPanel();};
 }
 function navigate(id){const key='category:'+id;if(window.AtlasV6?.state().m.nodes.has(key))window.AtlasV6.select(key,false);else window.parent.AtlasShell.showGlobal(key);}
 let categoryId=null;
 function renderCategory(force=false){
  const inspector=document.querySelector('#inspector'),key=window.AtlasV6?.state().selected;
  const id=key?.startsWith('category:')?Number(key.split(':')[1]):null;
  if(id==null){inspector.querySelector('.category-progress')?.remove();categoryId=null;return;}
  if(!force&&categoryId===id&&inspector.querySelector('.category-progress'))return;categoryId=id;inspector.querySelector('.category-progress')?.remove();
  const template=document.createElement('template');
  template.innerHTML=ProgressPresentation.category(analytics,id,course!=null?analytics.scopeMaps.course.get(course):null);const section=template.content.firstElementChild;
  inspector.insertBefore(section,inspector.querySelector('.path')?.nextSibling||inspector.firstChild);
  section.querySelectorAll('[data-progress-category]').forEach(b=>b.onclick=()=>navigate(Number(b.dataset.progressCategory)));
 }
 const graphObserver=new MutationObserver(highlight);graphObserver.observe(document.querySelector('#graph'),{childList:true,subtree:true});
 renderPanel();const observer=new MutationObserver(()=>renderCategory());observer.observe(document.querySelector('#inspector'),{childList:true});renderCategory();
 window.SkillProgress=Object.freeze({analytics,state:()=>({course,project,stage,categoryId}),renderCategory});
}catch(error){const message=document.createElement('p');message.id='progress-overview';message.textContent='Progress analysis unavailable: '+error.message;document.querySelector('#canvas').append(message);console.error(error);}
})();
