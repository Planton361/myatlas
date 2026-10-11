/* Additive status overlay. Retains model membership, coordinates and layout. */
(function(g){
'use strict';
const callbacks=new Set();let current,originalNext=null,lastSnapshot=null;
function publish(state){g.PublicProgress={...state.snapshot.completion,source:{...state.snapshot.completion.source,project_commit:state.revision},global:state.snapshot.completion.global,completed_project_count:state.snapshot.register.completed_project_count,completed_project_ids:state.snapshot.register.completed_project_ids};}
g.HyperskillView={subscribe(fn){callbacks.add(fn);if(current){fn(current);publish(current);}}};
(async()=>{
 if(parent===g||!parent.HyperskillPortfolio||!await parent.HyperskillPortfolio.ready)return;
 while((!g.AtlasV6&&!g.ScopeApp)||g.ScopeApp?.state().busy)await new Promise(resolve=>setTimeout(resolve,30));
 parent.HyperskillPortfolio.subscribe(state=>{
  current=state;if(lastSnapshot===state.snapshot)return;lastSnapshot=state.snapshot;
  const a=state.snapshot.analytics;
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
   if(m.next&&originalNext===null)originalNext=new Map(m.next);
   for(const n of m.registry.values())if(n.type==='topic'){
    const topic=a.topic(n.id);n.is_learned=topic.learned;
    if(originalNext)n.is_next=originalNext.has(n.key)&&topic.learned!==true&&n.nextEvidence.required.every(key=>a.topic(Number(key.split(':')[1])).learned===true);
   }
   if(originalNext)m.next=new Map([...originalNext].filter(([key])=>m.nodes.get(key)?.is_next));
   // Independent observations/verified flags are deliberately retained.
   if(m.raw.counts&&location.pathname.includes('knowledge-atlas-v6-skill-tree')){
    m.raw.counts.learned=a.global().learned;
    m.raw.counts.next=m.next.size;
    const mode=g.document.querySelector('#mode-summary');if(mode)mode.textContent=`My Skill Tree · ${a.global().learned} learned · ${a.global().verified} verified · ${m.next.size} Next`;
   }else{const mode=g.document.querySelector('#mode-summary');if(mode)mode.textContent=`Global Atlas · ${a.global().learned} learned · ${a.global().verified} verified`;}
   if(s.renderer){
    const r=s.renderer,descendants=n=>[n,...n.children.flatMap(descendants)];
    // The frozen renderer compiles status into tiles. Recompile its paint scene
    // with the same fixed L and original drawing constants, never its layout.
    const CARD={RADIUS:5,TOPIC_RADIUS:3,HEADER_MAIN:8,HEADER_CATEGORY:5,LABEL_X:34,DISCLOSURE_X:15,META_BOTTOM:7,STATUS_X:12,TOPIC_LABEL_X:24,EVIDENCE_RIGHT:10};
    const compiled=g.AtlasTiled.compile(m,s.L,descendants,CARD,r.styles);
    r.scene=compiled.scene;r.byKey=compiled.byKey;
    r.entityIds=Object.freeze(r.scene.entities.filter(e=>e.type!=='context').map(e=>e.key));
    r.commandIds=Object.freeze([...r.scene.commands,...r.scene.inks].map(c=>c.id));
    r.paths=new Map(r.scene.inks.filter(c=>c.d||['outline','tray','progress-row'].includes(c.kind)).map(c=>{const path=c.d?new Path2D(c.d):new Path2D();if(!c.d)g.AtlasTilePaint.rounded(path,c.x,c.y,c.w,c.h,c.r);return[c.id,path];}));
    // This worker is intentionally retired. WebKit can report an aborted
    // script load while it is being terminated; never let its late error touch
    // the replacement worker. The new worker retains the frozen error handler.
    if(r.worker)r.worker.onerror=event=>event.preventDefault();
    r.invalidateStyles();
   }
   g.AtlasV6.draw();if(s.selected)g.AtlasV6.select(s.selected,false);
  }
  for(const callback of callbacks)callback(state);publish(state);
 });
})();
})(globalThis);
