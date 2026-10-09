/* Compare every structural node against the accepted baseline under arbitrary
   learned counters. Only the reviewed build-time presentation edits are loaded. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),site=path.join(root,'build/pages/knowledge-map'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
const catalog=read('src/myatlas/knowledge-atlas-scope-pyramid/catalog.json'),scopes=read('src/myatlas/knowledge-atlas-scope-pyramid/scope-index.json');
function context(folder,artifact){const ctx=vm.createContext({performance,console});for(const name of ['geometry/measure.js',folder+'/routing.js',folder+'/layout.js',folder==='+global'?'':folder+'/model.js'].filter(Boolean))if(fs.existsSync(path.join(artifact,name)))vm.runInContext(fs.readFileSync(path.join(artifact,name),'utf8'),ctx);return ctx;}
const shape=L=>JSON.stringify([L.nodes.map(n=>[n.key,n.x,n.y,n.width,n.height,n.lines]),L.connectorSegments,L.trays,L.checkpoint]);
const rows=[];
for(const folder of ['knowledge-atlas-v6-global','knowledge-atlas-scope-pyramid']){
 const before=context(folder,path.join(root,'docs/knowledge-map/views')),after=context(folder,path.join(site,'views'));
 if(folder.includes('scope'))for(const ctx of [before,after])vm.runInContext(fs.readFileSync(path.join(root,'src/myatlas',folder,'projection.js'),'utf8'),ctx);
 const cases=folder.includes('global')?[['global',null]]:[['course',8],['project',113],['stage',617]];
 for(const [type,id]of cases){const row=id==null?null:scopes[type+'s'].find(r=>r.scope_id===id);
  const model=ctx=>row?ctx.ScopeProjection.model(ctx.ScopeProjection.project(type,id,row.explicit_topic_ids,row.explicit_category_ids,catalog),catalog):ctx.AtlasModel.model({...catalog,references:[]});
  const expected=shape(before.AtlasLayout.build(model(before),before.AtlasMeasure.width));
  for(const mode of ['none','all','alternating']){const m=model(after);let index=0;for(const n of m.nodes.values())if(n.type==='topic')n.is_learned=mode==='all'||mode==='alternating'&&index++%2===0;const actual=shape(after.AtlasLayout.build(m,after.AtlasMeasure.width));assert.equal(actual,expected,type+' '+mode);}
  rows.push({scope:type,id,hash:crypto.createHash('sha256').update(expected).digest('hex'),counter_states:['none','all','alternating'],status:'PASS'});
 }
}
fs.writeFileSync(path.join(root,'test-results/progress-geometry.json'),JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows));
