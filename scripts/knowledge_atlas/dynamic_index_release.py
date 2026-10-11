"""Exact reversible index supplement; keep every earlier release gate intact."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
from .adaptive_production import require
from .external_release import inventory
from .navigation_release import transform as navigation_transform
from .presentation_release import transform as presentation_transform, verify_presentation

MANIFEST = 'docs/releases/myatlas-hyperskill-index-v1.json'
REVIEWED_SHA = 'fa0528c9360ab5613cb6ce8e85d7a2f6116a157dfaa13a2ffaeb2a526a93020a'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def baseline(root, name):
    if name == 'index.html':
        navigation = json.loads((root/'docs/releases/myatlas-leetcode-navigation.json').read_bytes())
        return navigation_transform((root/'docs/knowledge-map/index.html').read_bytes(), navigation['patches'][name])
    if name == 'views/knowledge-atlas-v6-skill-tree/index.html':
        presentation = json.loads((root/'docs/releases/myatlas-progress-scope-v1.json').read_bytes())
        return presentation_transform(root, presentation, name)
    if name == 'views/knowledge-atlas-v6-skill-tree/progress-ui.js':
        return (root/'src/supplements/progress-scope-v1/progress-ui.js').read_bytes()
    return (root/'docs/knowledge-map'/name).read_bytes()


def approved(root):
    raw = (root/MANIFEST).read_bytes()
    require(sha(raw) == REVIEWED_SHA, 'Unreviewed dynamic index supplement')
    value = json.loads(raw)
    require(value['schema'] == 1 and value['version'] == 'hyperskill-index-v1' and value['production_enabled'] is False, 'Unapproved dynamic index activation')
    for name in [MANIFEST, 'scripts/knowledge_atlas/dynamic_index_release.py', 'scripts/build-myatlas-dynamic-index.py', *value['sources']]:
        path = root/name
        require(not path.is_symlink() and path.read_bytes() == subprocess.check_output(['git','-C',str(root),'show','HEAD:'+name]), 'Uncommitted dynamic index input: '+name)
    for name, digest in value['sources'].items():
        require(sha((root/name).read_bytes()) == digest, 'Changed dynamic index source: '+name)
    return value


def transform(root, name, edit):
    raw = baseline(root, name)
    require(sha(raw) == edit['before'], 'Changed dynamic index baseline: '+name)
    if edit['operation'] == 'replace':
        raw = (root/edit['source']).read_bytes()
    else:
        old = edit['old'].encode()
        require(raw.count(old) == 1, 'Ambiguous dynamic index entrypoint')
        raw = raw.replace(old, edit['new'].encode())
    require(sha(raw) == edit['after'], 'Changed dynamic index result: '+name)
    return raw


def verify_dynamic(root, site, evidence_root, ref='HEAD'):
    root, site = Path(root).resolve(), Path(site).resolve()
    value = approved(root)
    actual = inventory(site)
    runtime = json.loads((site/'runtime-manifest.json').read_bytes())
    require(runtime.get('dynamic_index_release') == {'manifest':MANIFEST, 'sha256':REVIEWED_SHA, 'production_enabled':False}, 'Missing dynamic index provenance')
    require(runtime['inventory'] == {p:s for p,s in actual.items() if p!='runtime-manifest.json'}, 'Dynamic index inventory mismatch')
    with tempfile.TemporaryDirectory(prefix='myatlas-dynamic-check-') as folder:
        canonical = Path(folder)/'knowledge-map'
        shutil.copytree(site, canonical)
        for name, source in value['assets'].items():
            require((site/name).read_bytes() == (root/source).read_bytes(), 'Changed dynamic index asset: '+name)
        # Only the pinned additive directory is removed from a disposable copy.
        shutil.rmtree(canonical/'hyperskill-index')
        for name in value['assets']:
            del runtime['inventory'][name]
        for name, edit in value['edits'].items():
            require((site/name).read_bytes() == transform(root,name,edit), 'Changed dynamic index artifact: '+name)
            (canonical/name).write_bytes(baseline(root,name))
            runtime['inventory'][name] = edit['before']
        del runtime['dynamic_index_release']
        (canonical/'runtime-manifest.json').write_text(json.dumps(runtime,sort_keys=True,indent=2)+'\n')
        result = verify_presentation(root,canonical,evidence_root,ref)
    return {**result,'dynamic_index_release':REVIEWED_SHA,'dynamic_index_enabled':False}


def apply_dynamic(root, site, evidence_root, ref='HEAD'):
    root, site = Path(root).resolve(), Path(site).resolve()
    require(root/'build' in site.parents and not any(p.is_symlink() for p in [site,*site.parents]), 'Unsafe dynamic index destination')
    value = approved(root)
    verify_presentation(root,site,evidence_root,ref)
    edits = {name:transform(root,name,edit) for name,edit in value['edits'].items()}
    for name, edit in value['edits'].items():
        require((site/name).read_bytes() == baseline(root,name), 'Unexpected dynamic index input')
    require(not (site/'hyperskill-index').exists(), 'Unexpected dynamic index assets')
    runtime = json.loads((site/'runtime-manifest.json').read_bytes())
    for name, source in value['assets'].items():
        destination=site/name;destination.parent.mkdir(parents=True,exist_ok=True)
        destination.write_bytes((root/source).read_bytes())
        runtime['inventory'][name]=sha(destination.read_bytes())
    for name, raw in edits.items():
        (site/name).write_bytes(raw);runtime['inventory'][name]=sha(raw)
    runtime['dynamic_index_release']={'manifest':MANIFEST,'sha256':REVIEWED_SHA,'production_enabled':False}
    (site/'runtime-manifest.json').write_text(json.dumps(runtime,sort_keys=True,indent=2)+'\n')
    return verify_dynamic(root,site,evidence_root,ref)
