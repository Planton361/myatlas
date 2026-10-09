"""Conservative daily build decision; evidence validation is never a skip condition."""
import hashlib
import json
import os
import subprocess
import re
from urllib.request import Request, build_opener, HTTPRedirectHandler
from .external_completion import project_external, REPOSITORY

PUBLIC_BASE = 'https://planton361.github.io/myatlas/knowledge-map/'
SHA = re.compile(r'[a-f0-9]{40}')
MAX_BYTES = 2 * 1024 * 1024


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def public_read(name):
    # Anonymous, fixed public origin. No personal PAT or cross-repo write token.
    request = Request(PUBLIC_BASE + name, headers={
        'Accept': 'application/json', 'Cache-Control': 'no-cache',
        'User-Agent': 'MyAtlas-daily-project-check'})
    with build_opener(NoRedirect).open(request, timeout=15) as response:
        body = response.read(MAX_BYTES + 1)
    if len(body) > MAX_BYTES:
        raise ValueError('Public provenance exceeds size limit')
    return body


def latest_main():
    # Anonymous reference read, with credential helpers and prompts disabled.
    raw = subprocess.check_output(['git', '-c', 'credential.helper=', 'ls-remote',
        'https://github.com/Planton361/myatlas.git', 'refs/heads/main'],
        env=dict(os.environ, GIT_TERMINAL_PROMPT='0'), timeout=15).decode().split()
    if len(raw) != 2 or raw[1] != 'refs/heads/main' or not SHA.fullmatch(raw[0]):
        raise ValueError('Current public main revision unavailable')
    return raw[0]


def deployed_revisions(read=public_read):
    raw = read('runtime-manifest.json')
    manifest = json.loads(raw)
    if not isinstance(manifest, dict) or type(manifest.get('schema')) is not int or manifest['schema'] != 1 or manifest.get('edition') != 'myatlas-v6.6':
        raise ValueError('Unsupported deployed runtime manifest')
    app = manifest.get('source_commit')
    source = manifest.get('project_source')
    if not isinstance(app, str) or not SHA.fullmatch(app) or not isinstance(source, dict) or source.get('repository') != REPOSITORY or not isinstance(source.get('commit'), str) or not SHA.fullmatch(source['commit']):
        raise ValueError('Missing/invalid deployed revision')
    # Bind the deployed revision pair to the actual deployed projection. A
    # partially cached deployment cannot accidentally suppress a validated build.
    progress_raw = read('progress.json')
    inventory = manifest.get('inventory')
    if not isinstance(inventory, dict) or inventory.get('progress.json') != hashlib.sha256(progress_raw).hexdigest():
        raise ValueError('Deployed progress/manifest mismatch')
    progress = json.loads(progress_raw)
    evidence = progress.get('source', {})
    if evidence.get('commit') != app or evidence.get('project_repository') != REPOSITORY or evidence.get('project_commit') != source['commit']:
        raise ValueError('Deployed projection provenance mismatch')
    return app, source['commit']


def decide(root, evidence_root, event, read=public_read):
    if event not in ('schedule', 'push', 'workflow_dispatch'):
        raise ValueError('Unsupported workflow event')
    # This is the existing exact committed evidence scanner/projection, not a
    # new inference engine. Rejections propagate and block the pipeline.
    projection = project_external(root, evidence_root)['projection']
    source = projection['source']
    app, project = source['commit'], source['project_commit']
    result = dict(build=True, application_commit=app, project_commit=project,
                  reason='Push/manual run uses the full validated build')
    if event != 'schedule':
        return result
    try:
        deployed_app, deployed_project = deployed_revisions(read)
        current_main = latest_main()
    except (OSError, ValueError, TypeError, KeyError, AttributeError, subprocess.SubprocessError):
        result['reason'] = 'Deployed comparison unavailable or invalid; full validated build required'
        return result
    unchanged = deployed_app == app == current_main and deployed_project == project
    result.update(build=not unchanged,
                  reason='Both deployed revisions conclusively unchanged' if unchanged else
                  'Application or project evidence revision changed; full validated build required')
    return result
