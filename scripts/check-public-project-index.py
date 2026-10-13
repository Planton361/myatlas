#!/usr/bin/env python3
"""Anonymous actual-origin Chromium/WebKit index smoke; never publishes or uses mocks."""
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.error import HTTPError
from knowledge_atlas.index_sync import anonymous_index_read, ENDPOINT, contract
from knowledge_atlas.git_completion import git

ROOT=Path(__file__).resolve().parents[1]
REPOSITORY='https://github.com/Planton361/hyperskill-projects'


def check(evidence, expected_revision=None, expected_ids=(113,229,380), browsers=True):
    if git(evidence,'remote','get-url','origin').decode().strip().removesuffix('.git')!=REPOSITORY:
        raise ValueError('Canonical public evidence repository required')
    report=dict(status='BLOCKED',endpoint=ENDPOINT,credentials='none',mocks=False)
    try: pointer_raw=anonymous_index_read(ENDPOINT)
    except HTTPError as error:
        if error.code!=404:raise
        pointer_raw=None
    if pointer_raw is not None:
        pointer_text=pointer_raw.decode('utf-8',errors='strict')
        p=contract(ROOT,mode='pointer',pointerText=pointer_text)
        payload_raw=anonymous_index_read(p['index_url'])
        checked=contract(ROOT,mode='pair',pointerText=pointer_text,payloadText=payload_raw.decode('utf-8',errors='strict'))
        if checked['store_revision']==p['revision']:raise ValueError('Source/store revisions must differ')
        if expected_revision and p['revision']!=expected_revision:raise ValueError('Unexpected source revision')
        ids=[row['project_id'] for row in json.loads(payload_raw)['projects']]
        if ids!=sorted(expected_ids):raise ValueError('Unexpected complete project register')
        with tempfile.TemporaryDirectory(prefix='public-index-proof-') as folder:
            path=Path(folder)/'index.json';path.write_bytes(payload_raw)
            subprocess.run([sys.executable,'-B',str(evidence/'scripts/validate-project-index.py'),str(path),'--repository',str(evidence),'--revision',p['revision']],check=True,stdout=subprocess.PIPE)
        report.update(source_revision=p['revision'],store_revision=checked['store_revision'],index_sha256=p['index_sha256'],project_ids=ids)
    if browsers:
        result=json.loads(subprocess.check_output(['node',str(ROOT/'scripts/knowledge_atlas/public_index_smoke.cjs')],timeout=180))
        report['browsers']=result['rows']
        if pointer_raw is None:
            if any(r['status']!='EXPECTED_ABSENT' for r in result['rows']):raise ValueError('Pointer appeared during smoke; rerun complete pair')
        elif not result['pair'] or result['pair']['pointerText'].encode()!=pointer_raw or result['pair']['payloadText'].encode()!=payload_raw:
            raise ValueError('Browser/Python pair changed; rerun complete proof')
    report['status']='EXPECTED_ABSENT' if pointer_raw is None else ('PRODUCTION_VERIFIED' if browsers else 'HTTPS_VERIFIED_CORS_NOT_TESTED')
    report['blocker']='Producer bootstrap requires separate owner approval' if pointer_raw is None else None
    return report


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence-root',type=Path,required=True)
    parser.add_argument('--expect-revision')
    parser.add_argument('--expect-current',action='store_true',help='Require complete canonical evidence HEAD, including future projects')
    parser.add_argument('--expect-project-ids',type=int,nargs='+',default=[113,229,380])
    parser.add_argument('--allow-missing',action='store_true',help='Pre-bootstrap observation only; never counts as activation approval')
    parser.add_argument('--output',type=Path,default=ROOT/'test-results/public-index-smoke.json')
    args=parser.parse_args()
    try:
        if args.expect_current:
            args.expect_revision=git(args.evidence_root,'rev-parse','HEAD').decode().strip()
            generated=subprocess.check_output([sys.executable,'-B',str(args.evidence_root/'scripts/build-project-index.py'),'--repository',str(args.evidence_root),'--revision',args.expect_revision])
            args.expect_project_ids=[p['project_id'] for p in json.loads(generated)['projects']]
        report=check(args.evidence_root.resolve(),args.expect_revision,args.expect_project_ids)
    except Exception as error:report=dict(status='BLOCKED',error=str(error),credentials='none',mocks=False)
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
    return 0 if report['status']=='PRODUCTION_VERIFIED' or (args.allow_missing and report['status']=='EXPECTED_ABSENT') else 2


if __name__=='__main__':raise SystemExit(main())
