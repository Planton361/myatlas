"""Preserve the exact V6.6 runtime while binding progress to its separate source repo."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from .adaptive_production import bound_tree, digest, require
from .external_completion import project_external, REPOSITORY
from .navigation_release import verify_navigation


def baseline(root):
    return json.loads(subprocess.check_output([sys.executable, '-B', str(root / 'scripts/sync-project-completion.py')]))['projection']


def inventory(site):
    tree = bound_tree(site.parent, site.name)['inventory']
    return {Path(p).relative_to(site.name).as_posix(): sha for p, sha in tree.items()}


def verify_external(root, site, evidence_root, ref='HEAD'):
    root, site = Path(root).resolve(), Path(site).resolve()
    expected = project_external(root, evidence_root, ref)['projection']
    require(json.loads((site / 'progress.json').read_bytes()) == expected, 'Public project progress mismatch')
    runtime = json.loads((site / 'runtime-manifest.json').read_bytes())
    require(runtime.get('project_source') == {'repository': REPOSITORY, 'commit': expected['source']['project_commit']}, 'Project provenance mismatch')
    require(runtime['source_input_digest'] == digest({k: expected['source'][k] for k in ['evidence', 'implementation_sha256']}), 'External input digest mismatch')
    actual = inventory(site)
    require(runtime['inventory'] == {p: sha for p, sha in actual.items() if p != 'runtime-manifest.json'}, 'External runtime inventory mismatch')
    # Preserve every old guard. Only the already-dynamic progress/provenance
    # files are normalized in a disposable copy for the immutable runtime gate.
    original = baseline(root)
    with tempfile.TemporaryDirectory(prefix='myatlas-external-check-') as folder:
        canonical = Path(folder) / 'knowledge-map'
        shutil.copytree(site, canonical)
        raw = (json.dumps(original, sort_keys=True, indent=2) + '\n').encode()
        (canonical / 'progress.json').write_bytes(raw)
        runtime['inventory']['progress.json'] = hashlib.sha256(raw).hexdigest()
        runtime['source_input_digest'] = digest({k: original['source'][k] for k in ['evidence', 'implementation_sha256']})
        del runtime['project_source']
        (canonical / 'runtime-manifest.json').write_text(json.dumps(runtime, sort_keys=True, indent=2) + '\n')
        result = verify_navigation(root, canonical, current_head=True)
    return {**result, 'project_repository': REPOSITORY, 'project_commit': expected['source']['project_commit'],
            'completed_projects': expected['completed_project_count'], 'learned': expected['global']['learned'],
            'verified': expected['global']['verified']}


def apply_external(root, site, evidence_root, ref='HEAD'):
    root, site = Path(root).resolve(), Path(site).resolve()
    require(root / 'build' in site.parents, 'Unsafe external build destination')
    verify_navigation(root, site, current_head=True)
    projection = project_external(root, evidence_root, ref)['projection']
    raw = (json.dumps(projection, sort_keys=True, indent=2) + '\n').encode()
    runtime = json.loads((site / 'runtime-manifest.json').read_bytes())
    runtime['inventory']['progress.json'] = hashlib.sha256(raw).hexdigest()
    runtime['source_input_digest'] = digest({k: projection['source'][k] for k in ['evidence', 'implementation_sha256']})
    runtime['project_source'] = {'repository': REPOSITORY, 'commit': projection['source']['project_commit']}
    (site / 'progress.json').write_bytes(raw)
    (site / 'runtime-manifest.json').write_text(json.dumps(runtime, sort_keys=True, indent=2) + '\n')
    return verify_external(root, site, evidence_root, ref)
