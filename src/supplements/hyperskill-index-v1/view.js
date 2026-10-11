/* Additive status overlay. Retains model membership, coordinates and layout. */
(function(g){
'use strict';
const callbacks=new Set();let current;
g.HyperskillView={subscribe(fn){callbacks.add(fn);if(current)fn(current);}};
(async()=>{
 if(parent===g||!parent.HyperskillPortfolio||!await parent.HyperskillPortfolio.ready)return;
 while((!g.AtlasV6&&!g.ScopeApp)||g.ScopeApp?.state().busy)await new Promise(resolve=>setTimeout(resolve,30));
 parent.HyperskillPortfolio.subscribe(state=>{
  current=state;
  const a=state.snapshot.analytics;
  g.PublicProgress={...g.PublicProgress,source:{...g.PublicProgress?.source,project_commit:state.revision},global:a.global(),completed_project_count:state.snapshot.register.completed_project_count,completed_project_ids:state.snapshot.register.completed_project_ids};
  if(g.ScopeApp){
   const s=g.ScopeApp.state();
   // Existing UX closures retain this analytics object. Replace its accepted
   // methods, not its catalog or navigation maps; clear cached coverage via a
   // fresh accepted UX model for presentation only.
   Object.assign(s.ux.analytics,a);
   const ux=g.ScopeUXModel.create(s.index,{...s.catalog,projectCompletion:state.snapshot.completion},[],[]);
   s.ux.topic=ux.topic;s.ux.categoryProgress=ux.categoryProgress;
   g.ScopeApp.navigate(s.nav,{historyMode:'none',restore:g.ScopeApp.snapshotView()}).catch(console.error);
  }else{
   const s=g.AtlasV6.state(),m=s.m;m.analytics=a;
   for(const n of m.registry.values())if(n.type==='topic'){const topic=a.topic(n.id);n.is_learned=topic.learned;if(topic.learned)n.is_next=false;}
   // Independent observations/verified flags are deliberately retained.
   if(m.raw.counts&&location.pathname.includes('knowledge-atlas-v6-skill-tree')){
    m.raw.counts.learned=a.global().learned;
    const mode=g.document.querySelector('#mode-summary');if(mode)mode.textContent=`My Skill Tree · ${a.global().learned} learned · ${a.global().verified} verified · fixed accepted map`;
   }else{const mode=g.document.querySelector('#mode-summary');if(mode)mode.textContent=`Global Atlas · ${a.global().learned} learned · ${a.global().verified} verified`;}
   g.AtlasV6.draw();if(s.selected)g.AtlasV6.select(s.selected,false);
  }
  for(const callback of callbacks)callback(state);
 });
})();
})(globalThis);
