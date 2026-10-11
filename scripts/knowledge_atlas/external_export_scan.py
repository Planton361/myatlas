"""Validate committed legacy and source-only Hyperskill project archives."""
import hashlib
import json
import re
from datetime import datetime
from pathlib import Path, PurePosixPath

LEGACY = 'java/Simple Chat Bot with Java'
LEGACY_STATEMENT = 'Completed as part of [Hyperskill](https://hyperskill.org/projects/113).'
HASH = re.compile(r'[a-f0-9]{64}')
SOURCE_SUFFIXES = {
    'java': {'.java'},
    'python': {'.py'},
}
RESOURCE_SUFFIXES = {'.txt', '.json', '.csv'}


def validate_completion(value):
    if not isinstance(value, dict) or set(value) != {'project_id', 'status', 'attested_by', 'observed_at'}:
        raise ValueError('Completion requires exact project_id/status/attested_by/observed_at fields')
    if type(value['project_id']) is not int or value['project_id'] <= 0:
        raise ValueError('Explicit positive Hyperskill Project ID required')
    if value['status'] != 'completed' or value['attested_by'] != 'owner':
        raise ValueError('Explicit owner completion attestation required')
    stamp = value['observed_at']
    # Match the publisher's owner-confirmed UTC contract (whole seconds or up to
    # six fractional digits). Reject offsets and ambiguous timestamps.
    if not isinstance(stamp, str) or not re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z', stamp):
        raise ValueError('UTC observation timestamp required')
    try:
        datetime.fromisoformat(stamp.replace('Z', '+00:00'))
    except ValueError as error:
        raise ValueError('Invalid UTC observation timestamp') from error
    return value


def _safe_path(name):
    if not isinstance(name, str) or not name or '\\' in name or '\x00' in name or ':' in name:
        raise ValueError('Unsafe manifest path')
    member = PurePosixPath(name)
    if member.is_absolute() or member.as_posix() != name or any(part in ('', '.', '..') or part.startswith('.') for part in member.parts):
        raise ValueError('Unsafe manifest path')
    if len(member.parts) < 2 or member.parts[0] != 'src':
        raise ValueError('Source-only members must stay below src/')
    return member


def _source_only_files(directory, manifest, language):
    required = {'schema', 'mode', 'language', 'directory_name', 'project_id', 'completion', 'files'}
    if set(manifest) != required or manifest.get('schema') != 3 or manifest.get('mode') != 'source-only':
        raise ValueError('Exact source-only schema-3 manifest required')
    if manifest.get('language') != language or manifest.get('directory_name') != directory.name:
        raise ValueError('Export language/directory metadata mismatch')
    readme = directory / 'README.md'
    if not readme.is_file() or readme.is_symlink():
        raise ValueError('Source-only export requires a regular README.md')
    if type(manifest.get('project_id')) is not int or manifest['project_id'] <= 0:
        raise ValueError('Explicit positive Hyperskill Project ID required')
    files = manifest.get('files')
    if not isinstance(files, dict) or not files:
        raise ValueError('Non-empty source-only file inventory required')

    source_count = 0
    for name, digest in files.items():
        member = _safe_path(name)
        suffix = member.suffix.lower()
        if suffix in SOURCE_SUFFIXES[language]:
            source_count += 1
        elif suffix not in RESOURCE_SUFFIXES:
            raise ValueError('Unsupported source-only archive member: ' + name)
        if not isinstance(digest, str) or not HASH.fullmatch(digest):
            raise ValueError('Invalid SHA-256 file inventory entry: ' + name)
        target = directory.joinpath(*member.parts)
        if not target.is_file() or target.is_symlink():
            raise ValueError('Missing or unsafe source-only member: ' + name)
        if hashlib.sha256(target.read_bytes()).hexdigest() != digest:
            raise ValueError('Export content does not match manifest: ' + name)
    if source_count == 0:
        raise ValueError('At least one final language source file is required')

    actual = set()
    for item in directory.rglob('*'):
        if item.is_symlink():
            raise ValueError('Symlink source-only member refused')
        if item.is_file():
            relative = item.relative_to(directory).as_posix()
            if relative not in ('README.md', '.hyperskill-import.json'):
                actual.add(relative)
    if actual != set(files):
        raise ValueError('Source-only manifest must cover every archived file exactly')
    return files


def _legacy_files(directory, manifest, language):
    if not isinstance(manifest.get('files'), dict) or not manifest['files']:
        raise ValueError('Validated schema-2 export manifest required')
    if manifest.get('language') != language or manifest.get('directory_name') != directory.name:
        raise ValueError('Export language/directory metadata mismatch')
    if language == 'java':
        required = {'build.gradle.kts', 'settings.gradle.kts', 'gradlew', 'gradlew.bat',
                    'gradle/wrapper/gradle-wrapper.jar', 'gradle/wrapper/gradle-wrapper.properties'}
        if not required <= manifest['files'].keys() or not any(n.startswith('src/main/java/') and n.endswith('.java') for n in manifest['files']):
            raise ValueError('Incomplete standalone Java export')
    else:
        if manifest.get('python_version') != '3.12' or manifest.get('dependencies') != [] or manifest.get('entrypoint') not in manifest['files'] or not manifest['entrypoint'].endswith('.py'):
            raise ValueError('Incomplete standalone Python export')
        if any(not n.startswith('src/') or Path(n).suffix not in ('.py', '.txt', '.json', '.csv') for n in manifest['files']):
            raise ValueError('Unsupported Python export member')
    for name, digest in manifest['files'].items():
        member = Path(name)
        if member.is_absolute() or '..' in member.parts or str(member) != name or not isinstance(digest, str) or not HASH.fullmatch(digest):
            raise ValueError('Unsafe manifest path')
        target = directory / member
        if any((directory / Path(*member.parts[:i])).is_symlink() for i in range(1, len(member.parts) + 1)):
            raise ValueError('Symlink manifest member refused')
        if hashlib.sha256(target.read_bytes()).hexdigest() != digest:
            raise ValueError('Export content does not match manifest: ' + name)
    return manifest['files']


def scan(root, scopes):
    """Read validated archives; derive learned Topics only from the Atlas catalog.

    Schema 2 is the frozen build-capable format. Schema 3 is a source-only
    archive and has no build or execution requirements. The Git caller rejects
    non-regular blobs before this scanner sees extracted files.
    """
    root = Path(root).resolve()
    projects = {p['scope_id']: p for p in scopes['projects']}
    completed, rejected, statuses = [], [], {}
    manifests = sorted([*root.glob('java/*/.hyperskill-import.json'), *root.glob('python/*/.hyperskill-import.json')])
    for path in manifests:
        relative = path.parent.relative_to(root).as_posix()
        language = path.parent.parent.name
        try:
            if language not in ('java', 'python'):
                raise ValueError('Unsupported canonical export language')
            if path.is_symlink() or any(p.is_symlink() for p in [path.parent, path.parent.parent]):
                raise ValueError('Symlink export refused')
            manifest = json.loads(path.read_text())
            if not isinstance(manifest, dict):
                raise ValueError('Export manifest must be an object')
            schema = manifest.get('schema')
            if schema == 3:
                _source_only_files(path.parent, manifest, language)
            elif schema == 2:
                _legacy_files(path.parent, manifest, language)
            else:
                raise ValueError('Validated schema-2 or source-only schema-3 export manifest required')

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
                method = 'validated_source_only_completion_attestation' if schema == 3 else 'validated_import_completion_attestation'
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
            project = projects.get(pid)
            state = project['state']
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
