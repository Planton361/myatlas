/* Historical input for unit/geometry fixtures only. Production UI expectations
   always read the generated candidate projection (see release/scope suites). */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
const manifest=read('docs/releases/myatlas-v6.6.json'),raw=fs.readFileSync(path.join(root,'docs/knowledge-map/progress.json'));
assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),manifest.committed_snapshot.projection_sha256);
const projection=JSON.parse(raw),catalog=read('src/myatlas/knowledge-atlas-scope-pyramid/catalog.json');
const learned=new Set(projection.effective_learned_topic_ids),verified=new Set(projection.verified_topic_ids);
const negative=new Set(catalog.progress.topics.filter(t=>t.is_learned===false).map(t=>t.topic_id));
const observed=new Set(catalog.progress.topics.map(t=>t.topic_id));
function fields(ids){const set=[...new Set(ids)],l=set.filter(id=>learned.has(id)).length,n=set.filter(id=>negative.has(id)&&!learned.has(id)).length,v=set.filter(id=>verified.has(id)).length,u=set.filter(id=>!observed.has(id)).length;return[l,set.length,n,set.length-l-n,v,u,set.length-l];}
module.exports={projection,fields,learned,verified,negative,observed};
