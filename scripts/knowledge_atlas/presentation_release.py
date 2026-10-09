"""Versioned, exact presentation supplement; reverse it before every frozen gate."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
from .adaptive_production import require
from .myatlas_guard import REVIEWED_FINGERPRINT
from .external_release import verify_external, inventory

MANIFEST = 'docs/releases/myatlas-progress-scope-v1.json'
REVIEWED_SHA = '8679ddbf7ed18bf78b459aed179ac20a5e09c0b00edacee4944a5d2bc95f4f30'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def approved(root):
    raw = (root / MANIFEST).read_bytes()
    require(sha(raw) == REVIEWED_SHA, 'Unreviewed presentation supplement')
    value = json.loads(raw)
    require(value['schema'] == 1 and value['version'] == 'progress-scope-v1' and value['base_manifest_fingerprint'] == REVIEWED_FINGERPRINT, 'Wrong presentation baseline')
    for name in [MANIFEST, 'scripts/knowledge_atlas/presentation_release.py', 'scripts/build-myatlas-presentation.py', *value['sources']]:
        path = root / name
        require(not path.is_symlink() and path.read_bytes() == subprocess.check_output(['git', '-C', str(root), 'show', 'HEAD:' + name]), 'Uncommitted presentation input: ' + name)
    for name, digest in value['sources'].items():
        require(sha((root / name).read_bytes()) == digest, 'Changed presentation source: ' + name)
    return value


def transform(root, value, name):
    edit = value['edits'][name]
    raw = (root / edit['baseline_source']).read_bytes()
    require(sha(raw) == edit['before'], 'Changed protected presentation baseline')
    if edit['operation'] == 'replace':
        raw = (root / edit['source']).read_bytes()
    elif edit['operation'] == 'append':
        raw += (root / edit['source']).read_bytes()
    elif edit['operation'] == 'insert':
        old = edit['old'].encode()
        require(raw.count(old) == 1, 'Ambiguous presentation entrypoint')
        raw = raw.replace(old, edit['new'].encode())
    else:
        raise ValueError('Unknown presentation operation')
    require(sha(raw) == edit['after'], 'Changed presentation result')
    return raw


def verify_presentation(root, site, evidence_root, ref='HEAD'):
    root, site = Path(root).resolve(), Path(site).resolve()
    value = approved(root)
    actual = inventory(site)
    runtime = json.loads((site / 'runtime-manifest.json').read_bytes())
    require(runtime.get('presentation_release') == {'manifest': MANIFEST, 'sha256': REVIEWED_SHA}, 'Missing presentation provenance')
    require(runtime['inventory'] == {p:s for p,s in actual.items() if p != 'runtime-manifest.json'}, 'Presentation runtime inventory mismatch')
    with tempfile.TemporaryDirectory(prefix='myatlas-presentation-check-') as folder:
        canonical = Path(folder) / 'knowledge-map'
        shutil.copytree(site, canonical)
        for name, edit in value['edits'].items():
            require((site / name).read_bytes() == transform(root, value, name), 'Changed presentation artifact: ' + name)
            (canonical / name).write_bytes((root / edit['baseline_source']).read_bytes())
            runtime['inventory'][name] = edit['before']
        del runtime['presentation_release']
        (canonical / 'runtime-manifest.json').write_text(json.dumps(runtime, sort_keys=True, indent=2) + '\n')
        result = verify_external(root, canonical, evidence_root, ref)
    return {**result, 'presentation_release': REVIEWED_SHA, 'geometry_policy': 'All five accepted structural fingerprints preserved'}


def apply_presentation(root, site, evidence_root, ref='HEAD'):
    root, site = Path(root).resolve(), Path(site).resolve()
    require(root / 'build' in site.parents and not any(p.is_symlink() for p in [site, *site.parents]), 'Unsafe presentation destination')
    value = approved(root)
    verify_external(root, site, evidence_root, ref)
    for name, edit in value['edits'].items():
        require(sha((site / name).read_bytes()) == edit['before'], 'Unexpected presentation input')
    edits = {name: transform(root,value,name) for name in value['edits']}
    runtime = json.loads((site / 'runtime-manifest.json').read_bytes())
    for name, raw in edits.items():
        (site / name).write_bytes(raw)
        runtime['inventory'][name] = sha(raw)
    runtime['presentation_release'] = {'manifest': MANIFEST, 'sha256': REVIEWED_SHA}
    (site / 'runtime-manifest.json').write_text(json.dumps(runtime, sort_keys=True, indent=2)+'\n')
    return verify_presentation(root, site, evidence_root, ref)
