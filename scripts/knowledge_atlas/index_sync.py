"""Prove deployed activation and current index health before suppressing static sync."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
from urllib.request import Request, build_opener
from .git_completion import git

ENDPOINT='https://planton361.github.io/hyperskill-projects/portfolio/current.json'
RAW=re.compile(r'https://raw\.githubusercontent\.com/Planton361/hyperskill-projects/[a-f0-9]{40}/portfolio/revisions/[a-f0-9]{40}/index\.json')
CONFIG='src/supplements/hyperskill-index-v1/config.json'
RELEASE='docs/releases/myatlas-hyperskill-index-v1.json'


def activation_proven(root, manifest, read):
    from .dynamic_index_release import release_selection
    selected, config_source = release_selection(root)
    config_raw=git(root,'show','HEAD:'+config_source)
    config=json.loads(config_raw)
    if config.get('enabled') is not True:
        return False
    release_raw=git(root,'show','HEAD:'+selected['manifest'])
    release=json.loads(release_raw)
    if release.get('production_enabled') is not True:
        return False
    deployed=manifest.get('dynamic_index_release',{})
    if deployed != dict(manifest=selected['manifest'],sha256=hashlib.sha256(release_raw).hexdigest(),production_enabled=True):
        return False
    asset='hyperskill-index/config.json'
    digest=hashlib.sha256(config_raw).hexdigest()
    return manifest.get('inventory',{}).get(asset)==digest and read(asset)==config_raw


def anonymous_index_read(url):
    from .project_sync import NoRedirect
    if url!=ENDPOINT and not RAW.fullmatch(url):
        raise ValueError('Foreign index URL refused')
    limit=4096 if url==ENDPOINT else 16*1024*1024
    request=Request(url,headers={'Accept':'application/json','Cache-Control':'no-cache','User-Agent':'MyAtlas-index-health'})
    with build_opener(NoRedirect).open(request,timeout=15) as response:
        if response.status!=200 or response.geturl()!=url:
            raise ValueError('Unexpected index HTTP response')
        body=response.read(limit+1)
    if len(body)>limit: raise ValueError('Index download exceeds size limit')
    return body


def contract(root, **input):
    raw=subprocess.check_output(['node',str(Path(root)/'scripts/knowledge_atlas/index_contract.cjs')],
                                input=json.dumps(input).encode(),timeout=30)
    return json.loads(raw)


def current_index(root, evidence_root, revision, read=anonymous_index_read):
    pointer_raw=read(ENDPOINT)
    if len(pointer_raw)>4096: raise ValueError('Pointer too large')
    pointer_text=pointer_raw.decode('utf-8',errors='strict')
    pointer=contract(root,mode='pointer',pointerText=pointer_text)
    if pointer['revision']!=revision:
        raise ValueError('Published index has not reached canonical project main; retry producer before claiming data sync')
    payload_raw=read(pointer['index_url'])
    if len(payload_raw)>16*1024*1024: raise ValueError('Payload too large')
    checked=contract(root,mode='pair',pointerText=pointer_text,payloadText=payload_raw.decode('utf-8',errors='strict'))
    # Separate committed inventory validator. It never executes archived sources.
    import tempfile
    with tempfile.TemporaryDirectory(prefix='index-health-') as folder:
        path=Path(folder)/'index.json';path.write_bytes(payload_raw)
        subprocess.run(['python3.12','-B',str(Path(evidence_root)/'scripts/validate-project-index.py'),str(path),
                        '--repository',str(evidence_root),'--revision',revision],check=True,timeout=60)
    return dict(index_revision=revision,index_sha256=pointer['index_sha256'],store_revision=checked['store_revision'])
