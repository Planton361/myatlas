const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const directory=path.resolve(__dirname,'../extension');
test('durable package is self-contained, identity-only, and matches the reviewed 3,511-ID index',()=>{
  assert.deepEqual(fs.readdirSync(directory).sort(),['catalog-index.json','content.js','core.js','github-publisher.js','manifest.json','popup.css','popup.html','popup.js','public-schema.js','worker.js']);
  const raw=fs.readFileSync(path.join(directory,'catalog-index.json'));
  assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),'9abac12bfd35ed54fd0abf6861f516019584995346d0faccebea11fe61820474');
  const index=JSON.parse(raw);assert.equal(Object.keys(index).length,3511);assert.equal(new Set(Object.values(index)).size,3511);
  for(const [slug,id]of Object.entries(index)){assert.match(slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);assert.match(id,/^lc:problem:(?:p\d{4}|eval-\d{5})$/);}
  for(const p of require('../../../src/leetcode-atlas/data/catalog.json').problems)assert.equal(index[p.slug],p.id);
});
test('Manifest V3 preserves storage-only permissions and the narrow top-frame match',()=>{
  const m=require('../extension/manifest.json');assert.equal(m.manifest_version,3);assert.deepEqual(m.permissions,['storage']);
  assert.deepEqual(m.content_scripts.map(s=>s.matches),[['https://leetcode.com/problems/*']]);assert.equal(m.content_scripts[0].all_frames,false);
  assert.deepEqual(m.optional_permissions,['alarms']);assert.deepEqual(m.optional_host_permissions,['https://api.github.com/*']);
  for(const key of ['host_permissions','web_accessible_resources','externally_connectable'])assert.equal(m[key],undefined);
  for(const filename of [m.background.service_worker,m.action.default_popup,...m.content_scripts[0].js])assert(fs.existsSync(path.join(directory,filename)),filename);
});
