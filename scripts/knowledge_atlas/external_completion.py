"""Read canonical, committed Hyperskill exports without copying them into MyAtlas."""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
from .git_completion import committed_inputs, git
from .project_completion import scan

REPOSITORY = 'Planton361/hyperskill-projects'


def external_inputs(root, evidence_root, ref='HEAD'):
    root, evidence_root = Path(root).resolve(), Path(evidence_root).resolve()
    remote = git(evidence_root, 'remote', 'get-url', 'origin').decode().strip()
    if remote.removesuffix('.git') not in ('https://github.com/' + REPOSITORY, 'git@github.com:' + REPOSITORY):
        raise ValueError('Wrong public evidence repository')
    inputs = committed_inputs(root)
    commit = git(evidence_root, 'rev-parse', '--verify', '--end-of-options', ref + '^{commit}').decode().strip()
    entries = {}
    for item in git(evidence_root, 'ls-tree', '-rz', commit).split(b'\0'):
        if not item:
            continue
        meta, name = item.split(b'\t', 1)
        entries[name.decode()] = meta.decode().split()
    manifests = sorted(n for n in entries if len(n.split('/')) == 3 and n.startswith('java/') and n.endswith('/.hyperskill-import.json'))
    refs = []
    with tempfile.TemporaryDirectory(prefix='myatlas-public-evidence-') as folder:
        for manifest in manifests:
            prefix = manifest.rsplit('/', 1)[0] + '/'
            for name in sorted(n for n in entries if n.startswith(prefix)):
                mode, kind, oid = entries[name]
                if kind != 'blob' or mode not in ('100644', '100755'):
                    raise ValueError('Non-regular committed export')
                raw = git(evidence_root, 'cat-file', 'blob', oid)
                dest = Path(folder) / name
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(raw)
                refs.append(dict(repository=REPOSITORY, commit=commit, path=name, git_blob=oid, sha256=hashlib.sha256(raw).hexdigest()))
        completion = scan(Path(folder), inputs['scopes'])
    if completion['rejected']:
        raise ValueError('Rejected public exports; keep the previous deployment')
    completion['course_completion'] = inputs['completion']['course_completion']
    inputs['completion'] = completion
    inputs['source']['evidence'].extend(refs)
    inputs['source']['evidence'].sort(key=lambda row: (row.get('repository', ''), row['path']))
    inputs['source']['project_repository'] = REPOSITORY
    inputs['source']['project_commit'] = commit
    return inputs


def project_external(root, evidence_root, ref='HEAD'):
    root = Path(root).resolve()
    inputs = external_inputs(root, evidence_root, ref)
    names = ['scripts/sync-project-completion.py', 'scripts/knowledge_atlas/git_completion.py',
             'scripts/knowledge_atlas/project_completion.py', 'scripts/knowledge_atlas/course_completion.py',
             'scripts/knowledge_atlas/completion_projection.cjs',
             'src/myatlas/knowledge-atlas-v6-skill-tree/progress-analytics.js',
             'scripts/knowledge_atlas/external_completion.py', 'scripts/sync-hyperskill-projects.py',
             'scripts/build-myatlas-external.py', 'scripts/knowledge_atlas/external_release.py']
    inputs['source']['implementation_sha256'] = {}
    for name in names:
        raw = (root / name).read_bytes()
        if raw != git(root, 'show', 'HEAD:' + name) or (root / name).is_symlink():
            raise ValueError('Uncommitted progress implementation')
        inputs['source']['implementation_sha256'][name] = hashlib.sha256(raw).hexdigest()
    result = subprocess.check_output(['node', str(root / 'scripts/knowledge_atlas/completion_projection.cjs')], input=json.dumps(inputs).encode())
    return json.loads(result)
