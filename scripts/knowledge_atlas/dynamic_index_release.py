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

PORTFOLIO = 'docs/releases/myatlas-hyperskill-portfolio-v2.json'
PORTFOLIO_SHA = '857c4761d9f208baee8abfa527351ccd3ef7be981849012cd9bfa09b3392d605'
MANIFEST = 'docs/releases/myatlas-hyperskill-index-v1.json'
ACTIVATION = 'docs/releases/myatlas-hyperskill-index-activation-v1.json'
ACTIVATION_SHA = '5c01912d54af5fd6dc783710250b9abbc3de1b38b16fe2b04814ac23223c2323'
REVIEWED_SHA = '03666d1be1b6657f1ed00acf480bd02ae83498ab3fd2ea490af8c2770c16edef'


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
        require(not any(p.is_symlink() for p in [path,*path.parents]) and path.read_bytes() == subprocess.check_output(['git','-C',str(root),'show','HEAD:'+name]), 'Uncommitted dynamic index input: '+name)
    for name, digest in value['sources'].items():
        require(sha((root/name).read_bytes()) == digest, 'Changed dynamic index source: '+name)
    return value


def release_selection(root):
    """Only a separately pinned additive release can change the packaged flag."""
    root = Path(root).resolve()
    if not (root/ACTIVATION).exists():
        require(not subprocess.check_output(['git','-C',str(root),'ls-tree','HEAD','--',ACTIVATION]), 'Uncommitted removal of activation release')
        return dict(manifest=MANIFEST, sha256=REVIEWED_SHA, production_enabled=False), 'src/supplements/hyperskill-index-v1/config.json'
    raw = (root/ACTIVATION).read_bytes()
    require(sha(raw) == ACTIVATION_SHA, 'Unreviewed activation release')
    value = json.loads(raw)
    require(set(value) == {'schema','version','base_manifest','base_sha256','production_enabled','config_source','config_sha256'}, 'Invalid activation release fields')
    require(value['schema'] == 1 and value['version'] == 'hyperskill-index-activation-v1' and value['production_enabled'] is True and value['base_manifest'] == MANIFEST and value['base_sha256'] == REVIEWED_SHA, 'Invalid activation release')
    source = 'src/supplements/hyperskill-index-activation-v1/config.json'
    require(value['config_source'] == source, 'Unapproved activation source')
    for name in (ACTIVATION, source):
        path = root/name
        require(not any(p.is_symlink() for p in [path,*path.parents]) and path.read_bytes() == subprocess.check_output(['git','-C',str(root),'show','HEAD:'+name]), 'Uncommitted activation input: '+name)
        require(subprocess.check_output(['git','-C',str(root),'ls-tree','HEAD','--',name]).split(b'\t')[0].split()[:2] == [b'100644',b'blob'], 'Nonregular activation input')
    config_raw = (root/source).read_bytes()
    require(sha(config_raw) == value['config_sha256'], 'Changed activation config')
    disabled = json.loads((root/'src/supplements/hyperskill-index-v1/config.json').read_bytes())
    require(json.loads(config_raw) == {**disabled,'enabled':True}, 'Activation changes more than the enabled flag')
    return dict(manifest=ACTIVATION, sha256=ACTIVATION_SHA, production_enabled=True), source


def release_assets(root, value):
    attestation, config = release_selection(root)
    assets = {**value['assets'], 'hyperskill-index/config.json':config}
    path = root/PORTFOLIO
    if not path.exists():
        require(not subprocess.check_output(['git','-C',str(root),'ls-tree','HEAD','--',PORTFOLIO]), 'Uncommitted removal of portfolio presentation')
        return attestation, assets, None
    raw = path.read_bytes()
    require(sha(raw) == PORTFOLIO_SHA, 'Unreviewed portfolio presentation')
    presentation = json.loads(raw)
    replacements = {f'hyperskill-index/portfolio.{suffix}':f'src/supplements/hyperskill-portfolio-v2/portfolio.{suffix}' for suffix in ('js','css')}
    require(set(presentation) == {'schema','version','base_manifest','base_sha256','assets','sources'} and presentation['schema'] == 1 and presentation['version'] == 'hyperskill-portfolio-v2' and presentation['base_manifest'] == MANIFEST and presentation['base_sha256'] == REVIEWED_SHA and presentation['assets'] == replacements and set(presentation['sources']) == set(replacements.values()), 'Invalid portfolio presentation contract')
    for name in (PORTFOLIO, *presentation['sources']):
        source = root/name
        require(not any(p.is_symlink() for p in [source,*source.parents]) and source.read_bytes() == subprocess.check_output(['git','-C',str(root),'show','HEAD:'+name]), 'Uncommitted portfolio input: '+name)
        require(subprocess.check_output(['git','-C',str(root),'ls-tree','HEAD','--',name]).split(b'\t')[0].split()[:2] == [b'100644',b'blob'], 'Nonregular portfolio input')
    for name,digest in presentation['sources'].items():
        require(sha((root/name).read_bytes()) == digest, 'Changed portfolio source: '+name)
    return attestation, {**assets,**replacements}, dict(manifest=PORTFOLIO,sha256=PORTFOLIO_SHA)


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
    attestation, assets, presentation = release_assets(root, value)
    actual = inventory(site)
    runtime = json.loads((site/'runtime-manifest.json').read_bytes())
    require(runtime.get('dynamic_index_release') == attestation, 'Missing dynamic index provenance')
    require(runtime.get('hyperskill_portfolio_release') == presentation, 'Missing portfolio presentation provenance')
    require(runtime['inventory'] == {p:s for p,s in actual.items() if p!='runtime-manifest.json'}, 'Dynamic index inventory mismatch')
    with tempfile.TemporaryDirectory(prefix='myatlas-dynamic-check-') as folder:
        canonical = Path(folder)/'knowledge-map'
        shutil.copytree(site, canonical)
        for name, source in assets.items():
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
        if presentation is not None:
            del runtime['hyperskill_portfolio_release']
        (canonical/'runtime-manifest.json').write_text(json.dumps(runtime,sort_keys=True,indent=2)+'\n')
        result = verify_presentation(root,canonical,evidence_root,ref)
    return {**result,'dynamic_index_release':attestation['sha256'],'dynamic_index_enabled':attestation['production_enabled']}


def apply_dynamic(root, site, evidence_root, ref='HEAD'):
    root, site = Path(root).resolve(), Path(site).resolve()
    require(root/'build' in site.parents and not any(p.is_symlink() for p in [site,*site.parents]), 'Unsafe dynamic index destination')
    value = approved(root)
    attestation, assets, presentation = release_assets(root, value)
    verify_presentation(root,site,evidence_root,ref)
    edits = {name:transform(root,name,edit) for name,edit in value['edits'].items()}
    for name, edit in value['edits'].items():
        require((site/name).read_bytes() == baseline(root,name), 'Unexpected dynamic index input')
    require(not (site/'hyperskill-index').exists(), 'Unexpected dynamic index assets')
    runtime = json.loads((site/'runtime-manifest.json').read_bytes())
    for name, source in assets.items():
        destination=site/name;destination.parent.mkdir(parents=True,exist_ok=True)
        destination.write_bytes((root/source).read_bytes())
        runtime['inventory'][name]=sha(destination.read_bytes())
    for name, raw in edits.items():
        (site/name).write_bytes(raw);runtime['inventory'][name]=sha(raw)
    runtime['dynamic_index_release']=attestation
    if presentation is not None:
        runtime['hyperskill_portfolio_release']=presentation
    (site/'runtime-manifest.json').write_text(json.dumps(runtime,sort_keys=True,indent=2)+'\n')
    return verify_dynamic(root,site,evidence_root,ref)
