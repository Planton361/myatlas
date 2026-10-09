"""External schema-2 Java/Python export contract v1; frozen historical scanner remains intact."""
import hashlib
import json
import re
from datetime import datetime
from pathlib import Path

LEGACY = 'java/Simple Chat Bot with Java'
LEGACY_STATEMENT = 'Completed as part of [Hyperskill](https://hyperskill.org/projects/113).'


def validate_completion(value):
    if not isinstance(value, dict) or set(value) != {'project_id', 'status', 'attested_by', 'observed_at'}:
        raise ValueError('Completion requires exact project_id/status/attested_by/observed_at fields')
    if type(value['project_id']) is not int or value['project_id'] <= 0:
        raise ValueError('Explicit positive Hyperskill Project ID required')
    if value['status'] != 'completed' or value['attested_by'] != 'owner':
        raise ValueError('Explicit owner completion attestation required')
    stamp = value['observed_at']
    if not isinstance(stamp, str) or not stamp.endswith('Z'):
        raise ValueError('UTC observation timestamp required')
    datetime.fromisoformat(stamp.replace('Z', '+00:00'))
    return value


def scan(root, scopes):
    """Only immediate language/project exports with a valid tracked-file manifest.

    The caller selects the published checkout in CI. Working trees are review
    candidates only. No source-name, stage-count or directory inference.
    """
    root = Path(root).resolve()
    projects = {p['scope_id']: p for p in scopes['projects']}
    completed, rejected, statuses = [], [], {}
    for path in sorted([*root.glob('java/*/.hyperskill-import.json'), *root.glob('python/*/.hyperskill-import.json')]):
        relative = path.parent.relative_to(root).as_posix()
        try:
            if path.is_symlink() or any(p.is_symlink() for p in [path.parent, path.parent.parent]):
                raise ValueError('Symlink export refused')
            manifest = json.loads(path.read_text())
            if not isinstance(manifest, dict) or manifest.get('schema') != 2 or not isinstance(manifest.get('files'), dict) or not manifest['files']:
                raise ValueError('Validated schema-2 export manifest required')
            if manifest.get('language') not in ('java', 'python') or manifest.get('language') != path.parent.parent.name or manifest.get('directory_name') != path.parent.name:
                raise ValueError('Export language/directory metadata mismatch')
            required = {'build.gradle.kts', 'settings.gradle.kts', 'gradlew', 'gradlew.bat',
                        'gradle/wrapper/gradle-wrapper.jar', 'gradle/wrapper/gradle-wrapper.properties'}
            if manifest['language'] == 'java' and (not required <= manifest['files'].keys() or not any(n.startswith('src/main/java/') and n.endswith('.java') for n in manifest['files'])):
                raise ValueError('Incomplete standalone Java export')
            if manifest['language'] == 'python':
                if manifest.get('python_version') != '3.12' or manifest.get('dependencies') != [] or manifest.get('entrypoint') not in manifest['files'] or not manifest['entrypoint'].endswith('.py'):
                    raise ValueError('Incomplete standalone Python export')
                if any(not n.startswith('src/') or Path(n).suffix not in ('.py', '.txt', '.json', '.csv') for n in manifest['files']):
                    raise ValueError('Unsupported Python export member')
            for name, digest in manifest['files'].items():
                member = Path(name)
                if member.is_absolute() or '..' in member.parts or str(member) != name or not re.fullmatch(r'[a-f0-9]{64}', str(digest)):
                    raise ValueError('Unsafe manifest path')
                target = path.parent / member
                if any((path.parent / Path(*member.parts[:i])).is_symlink() for i in range(1, len(member.parts) + 1)):
                    raise ValueError('Symlink manifest member refused')
                if hashlib.sha256(target.read_bytes()).hexdigest() != digest:
                    raise ValueError('Export content does not match manifest: ' + name)
            attestation = manifest.get('completion')
            source = path.relative_to(root).as_posix()
            if attestation is None:
                readme = path.parent / 'README.md'
                if relative != LEGACY or readme.is_symlink() or LEGACY_STATEMENT not in readme.read_text().splitlines():
                    continue
                attestation = dict(project_id=113, status='completed', attested_by='owner', observed_at='2026-10-08T00:00:00Z')
                source = relative + '/README.md'
                method = 'reviewed_legacy_completion_statement'
            else:
                method = 'validated_import_completion_attestation'
            revoked = isinstance(attestation, dict) and attestation.get('status') == 'revoked'
            validate_completion(dict(attestation, status='completed') if revoked else attestation)
            pid = attestation['project_id']
            if 'project_id' in manifest and (type(manifest['project_id']) is not int or manifest['project_id'] != pid):
                raise ValueError('Ambiguous Project ID in metadata')
            readme = path.parent / 'README.md'
            if readme.is_symlink():
                raise ValueError('Symlink README refused')
            urls = set(map(int, re.findall(r'https://hyperskill\.org/projects/([0-9]+)(?![0-9])', readme.read_text() if readme.exists() else '')))
            if urls and urls != {pid}:
                raise ValueError('Ambiguous Project ID in README')
            if pid not in projects:
                raise ValueError('Project ID absent from Atlas catalog')
            status = attestation['status']
            if pid in statuses and statuses[pid] != status:
                raise ValueError('Conflicting completion statuses for duplicate Project ID')
            statuses[pid] = status
            if revoked:
                continue
            project = projects.get(attestation['project_id'])
            state = project['state'] if project else 'UNKNOWN'
            ids = sorted(set(project['explicit_topic_ids'])) if state != 'UNKNOWN' else []
            if any(type(i) is not int or i <= 0 for i in ids):
                raise ValueError('Invalid requirement Topic IDs')
            completed.append(dict(attestation, source=source, method=method,
                                  requirements_state=state, topic_ids=ids))
        except (ValueError, OSError, KeyError, TypeError) as error:
            rejected.append(dict(source=relative, reason='Missing/unreadable export evidence' if isinstance(error, OSError) else str(error)))
    unique = {}
    for row in completed:
        pid = row['project_id']
        if pid not in unique or (row['observed_at'], row['source']) > (unique[pid]['observed_at'], unique[pid]['source']):
            unique[pid] = row
    completed = [unique[pid] for pid in sorted(unique)]
    return dict(schema=1, policy='owner-attested-project-requirements-are-learned',
                projects=completed, rejected=rejected,
                learned_topic_ids=sorted({i for p in completed for i in p['topic_ids']}))
