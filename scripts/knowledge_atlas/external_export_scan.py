"""Validate committed legacy, source-only and universal Hyperskill archives."""
import hashlib
import json
import re
import unicodedata
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



# Schema 4 is selected by explicit identity and roles, never language/extensions.
MAX_PROJECT_ID = 2**53 - 1  # Exact across Python, JSON and the browser.
PRIVATE_NAME = re.compile(
    r'^(?:\.env(?:\..*)?|id_(?:rsa|ed25519)|.*\.(?:pem|key))$|'
    r'(?:^|[._-])(?:secrets?|credentials?|private|passwords?|tokens?)(?:[._-]|$)', re.I)
SECRETS = re.compile(
    r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|'
    r'\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16})\b|'
    r"(?i:(?:password|passwd|api[_-]?key|access[_-]?token|secret)\s*[=:]\s*[\"'][^\"'\n]{4,}[\"'])")
EXCLUDED = {'node_modules', '__pycache__', 'venv', 'env', 'target', 'dist'}
RESERVED = {'CON', 'PRN', 'AUX', 'NUL', *(f'COM{i}' for i in range(1, 10)),
            *(f'LPT{i}' for i in range(1, 10))}


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('Duplicate JSON key in export manifest')
        result[key] = value
    return result


def _universal_path(name):
    if not isinstance(name, str) or not name or unicodedata.normalize('NFC', name) != name:
        raise ValueError('Unsafe universal archive path')
    member = PurePosixPath(name)
    if name == 'README.md':
        return member
    if member.is_absolute() or member.as_posix() != name or len(member.parts) < 2 or member.parts[0] != 'solution':
        raise ValueError('Universal members must stay below solution/')
    for part in member.parts:
        if (part.startswith('.') or part.endswith((' ', '.')) or
                any(unicodedata.category(c).startswith('C') or c in '\\<>:"|?*' for c in part) or
                part.split('.', 1)[0].upper() in RESERVED or
                part.casefold() in EXCLUDED or PRIVATE_NAME.search(part)):
            raise ValueError('Unsafe/private universal archive path')
    return member


def _public_text(raw, label, *, code=False):
    # Resource bytes remain resources; they never become code or Topic evidence.
    try:
        text = raw.decode('utf-8')
    except UnicodeDecodeError as error:
        if code:
            raise ValueError('Solution code must be UTF-8 text: ' + label) from error
        text = raw.decode('utf-8', errors='replace')
    if code and any(unicodedata.category(c) == 'Cc' and c not in '\n\r\t' for c in text):
        raise ValueError('Binary/control content is not solution code: ' + label)
    if SECRETS.search(text):
        raise ValueError('Possible secret in archive (contents withheld): ' + label)
    return text


def _universal_files(directory, manifest):
    required = {'schema', 'mode', 'project_id', 'project_url', 'title', 'completion', 'files'}
    if not required <= set(manifest) or set(manifest) - required - {'languages'}:
        raise ValueError('Exact universal schema-4 manifest fields required')
    if type(manifest['schema']) is not int or manifest['schema'] != 4 or manifest['mode'] != 'code-archive':
        raise ValueError('Universal schema 4 / code-archive mode required')
    pid = manifest['project_id']
    if type(pid) is not int or not 0 < pid <= MAX_PROJECT_ID or directory.name != str(pid):
        raise ValueError('Exact positive Project ID and canonical projects/<ID> required')
    if manifest['project_url'] != f'https://hyperskill.org/projects/{pid}':
        raise ValueError('Exact Hyperskill Project URL required')
    title = manifest['title']
    if not isinstance(title, str) or not title.strip() or title != title.strip() or any(unicodedata.category(c).startswith('C') for c in title):
        raise ValueError('Non-empty public project title required')
    languages = manifest.get('languages', [])
    if not isinstance(languages, list) or any(not isinstance(v, str) or not v.strip() or v != v.strip() or any(unicodedata.category(c).startswith('C') for c in v) for v in languages):
        raise ValueError('Languages must be optional descriptive strings')
    if len({v.casefold() for v in languages}) != len(languages):
        raise ValueError('Duplicate language metadata')
    completion = manifest['completion']
    fields = {'project_id', 'status', 'attested_by', 'confirmed_at'}
    if not isinstance(completion, dict) or not fields <= set(completion) or set(completion) - fields - {'completed_at'}:
        raise ValueError('Exact universal owner completion fields required')
    validate_completion(dict(project_id=completion['project_id'], status=completion['status'],
                             attested_by=completion['attested_by'], observed_at=completion['confirmed_at']))
    if completion['project_id'] != pid:
        raise ValueError('Ambiguous Project ID in completion')
    if 'completed_at' in completion:
        validate_completion(dict(project_id=pid, status='completed', attested_by='owner', observed_at=completion['completed_at']))
        if datetime.fromisoformat(completion['completed_at'].replace('Z', '+00:00')) > datetime.fromisoformat(completion['confirmed_at'].replace('Z', '+00:00')):
            raise ValueError('Actual completion cannot follow owner confirmation')
    files = manifest['files']
    if not isinstance(files, dict) or not files:
        raise ValueError('Non-empty universal file inventory required')
    if not isinstance(files.get('README.md'), dict) or files['README.md'].get('role') != 'resource':
        raise ValueError('README.md must be inventoried as a resource')
    # Inspect the entire tree before opening any members (including parents).
    actual = set()
    for item in directory.rglob('*'):
        if item.is_symlink() or not (item.is_file() or item.is_dir()):
            raise ValueError('Symlink/special universal archive member refused')
        name = item.relative_to(directory).as_posix()
        if name not in ('README.md', '.hyperskill-import.json', 'solution'):
            _universal_path(name)
        if item.is_file():
            actual.add(name)
    if actual != set(files) | {'.hyperskill-import.json'}:
        raise ValueError('Universal inventory must cover every archived file exactly')
    # Reject aliases on case-insensitive/Unicode-normalizing filesystems,
    # including directories shared by otherwise distinct file names.
    aliases = {}
    code_count = 0
    for name, entry in files.items():
        member = _universal_path(name)
        for i in range(1, len(member.parts) + 1):
            prefix = '/'.join(member.parts[:i])
            alias = prefix.casefold()
            if alias in aliases and aliases[alias] != prefix:
                raise ValueError('Case-colliding universal archive paths')
            aliases[alias] = prefix
        if not isinstance(entry, dict) or set(entry) != {'sha256', 'role'} or entry['role'] not in ('solution', 'resource'):
            raise ValueError('Exact sha256/role inventory entry required')
        if not isinstance(entry['sha256'], str) or not HASH.fullmatch(entry['sha256']):
            raise ValueError('Invalid SHA-256 inventory entry')
        raw = directory.joinpath(*member.parts).read_bytes()
        if hashlib.sha256(raw).hexdigest() != entry['sha256']:
            raise ValueError('Export content does not match manifest: ' + name)
        code = entry['role'] == 'solution'
        _public_text(raw, name, code=code)
        code_count += code
    if not code_count:
        raise ValueError('At least one explicitly selected solution file required')
    _public_text((directory / 'README.md').read_bytes(), 'README.md', code=True)
    _public_text(json.dumps(manifest, ensure_ascii=False).encode('utf-8'), 'manifest', code=True)
    return dict(project_id=pid, status='completed', attested_by='owner', observed_at=completion['confirmed_at'])


def scan(root, scopes):
    """Read validated archives; derive learned Topics only from the Atlas catalog.

    Schema 2 is the frozen build-capable format. Schemas 3 and 4 have no build or execution requirements.
    Universal completions stay separate from catalog-bound Topic evidence. The Git caller rejects
    non-regular blobs before this scanner sees extracted files.
    """
    root = Path(root).resolve()
    projects = {p['scope_id']: p for p in scopes['projects']}
    completed, rejected, statuses = [], [], {}
    has_register = False
    manifests = sorted([*root.glob('java/*/.hyperskill-import.json'), *root.glob('python/*/.hyperskill-import.json'), *root.glob('projects/*/.hyperskill-import.json')])
    for path in manifests:
        relative = path.parent.relative_to(root).as_posix()
        language = path.parent.parent.name
        try:
            if language not in ('java', 'python', 'projects'):
                raise ValueError('Unsupported canonical export language')
            if path.is_symlink() or any(p.is_symlink() for p in [path.parent, path.parent.parent]):
                raise ValueError('Symlink export refused')
            manifest = json.loads(path.read_text(encoding='utf-8'), object_pairs_hook=_unique_object)
            if not isinstance(manifest, dict):
                raise ValueError('Export manifest must be an object')
            schema = manifest.get('schema')
            if language == 'projects':
                attestation = _universal_files(path.parent, manifest)
                has_register = True
            elif schema == 3:
                _source_only_files(path.parent, manifest, language)
            elif schema == 2:
                _legacy_files(path.parent, manifest, language)
            else:
                raise ValueError('Validated schema-2 or source-only schema-3 export manifest required')

            if language != 'projects':
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
                method = {4: 'validated_code_archive_completion_attestation', 3: 'validated_source_only_completion_attestation', 2: 'validated_import_completion_attestation'}[schema]
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
            if not 0 < pid <= MAX_PROJECT_ID:
                raise ValueError('Project ID outside exact JSON integer range')
            if pid not in projects:
                has_register = True
            status = attestation['status']
            if pid in statuses and statuses[pid] != status:
                statuses[pid] = 'CONFLICT'
                raise ValueError('Conflicting completion statuses for duplicate Project ID')
            statuses[pid] = status
            if revoked:
                continue
            project = projects.get(pid)
            state = project['state'] if project else 'UNMAPPED'
            ids = sorted(set(project['explicit_topic_ids'])) if state not in ('UNKNOWN', 'UNMAPPED') else []
            if any(type(i) is not int or i <= 0 for i in ids):
                raise ValueError('Invalid requirement Topic IDs')
            row = dict(attestation, source=source, method=method, requirements_state=state, topic_ids=ids)
            if schema == 4:
                row.update(archive_schema=4, project_url=manifest['project_url'], title=manifest['title'],
                           confirmed_at=manifest['completion']['confirmed_at'], languages=manifest.get('languages', []))
                if 'completed_at' in manifest['completion']:
                    row['completed_at'] = manifest['completion']['completed_at']
            completed.append(row)
        except (ValueError, OSError, KeyError, TypeError, UnicodeError) as error:
            rejected.append(dict(source=relative, reason='Missing/unreadable export evidence' if isinstance(error, OSError) else str(error)))
    unique = {}
    for row in completed:
        pid = row['project_id']
        if pid not in unique or (datetime.fromisoformat(row['observed_at'].replace('Z', '+00:00')), row['source']) > (datetime.fromisoformat(unique[pid]['observed_at'].replace('Z', '+00:00')), unique[pid]['source']):
            unique[pid] = row
    completed = [unique[pid] for pid in sorted(unique)]
    # On conflicting duplicate evidence no winner is accepted, even in scan()
    # review output. The committed reader rejects the entire revision.
    conflicts = {pid for pid, status in statuses.items() if status == 'CONFLICT'}
    completed = [p for p in completed if p['project_id'] not in conflicts]
    result = dict(schema=1, policy='owner-attested-project-requirements-are-learned',
                  projects=[p for p in completed if p['project_id'] in projects], rejected=rejected,
                  learned_topic_ids=sorted({i for p in completed for i in p['topic_ids']}))
    if has_register:
        result['completion_register'] = dict(schema=1, projects=completed,
            completed_project_ids=[p['project_id'] for p in completed], completed_project_count=len(completed),
            unmapped_project_ids=[p['project_id'] for p in completed if p['project_id'] not in projects])
    return result
