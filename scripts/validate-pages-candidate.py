#!/usr/bin/env python3
"""Full Pages acceptance, local artifacts only. No deployment or Git writes."""
import argparse
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
import urllib.request


def run(root, command, env):
    print('+ ' + ' '.join(map(str, command)), flush=True)
    subprocess.run(list(map(str, command)), cwd=root, env=env, check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence-root', required=True, type=Path)
    parser.add_argument('--install-browsers', action='store_true')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    evidence = args.evidence_root.resolve(strict=True)
    env = dict(os.environ, HYPERSKILL_EVIDENCE_ROOT=str(evidence), MYATLAS_PRE_RELEASE_PROGRESS='1')
    # GITHUB_SHA refers to Hyperskill when invoked cross-repository.
    env.pop('GITHUB_SHA', None)
    report = dict(status='RUNNING', deployment='disabled', evidence_commit=subprocess.check_output(['git','-C',str(evidence),'rev-parse','HEAD']).decode().strip())
    out = root/'test-results/pages-candidate.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    try:
        run(root,[sys.executable,'-B','-m','unittest',
            'scripts.tests.test_course_completion','scripts.tests.test_git_project_completion',
            'scripts.tests.test_myatlas_release','scripts.tests.test_myatlas_navigation',
            'scripts.tests.test_external_completion','scripts.tests.test_project_sync',
            'scripts.tests.test_leetcode_progress','scripts.tests.test_leetcode_cpu'],env)
        for test in ('progress-analytics','universal-progress','completion','portfolio','copy','geometry-measurements'):
            run(root,['node','tests/myatlas/'+test+'.cjs'],env)
        run(root,['node','--test','tests/leetcode-progress/loader.cjs'],env)
        run(root,['node','--test',*['tools/chrome-tracker/tests/'+n+'.cjs' for n in ('core','worker','package','public-sync')]],env)
        for script in ('check-myatlas-production.py', 'build-myatlas.py'):
            run(root, [sys.executable,'-B','scripts/'+script],env)
        run(root,[sys.executable,'-B','scripts/check-myatlas-production.py','--site','build/pages/knowledge-map','--current-head'],env)
        for script in ('build-myatlas-navigation.py', 'build-myatlas-external.py', 'build-myatlas-presentation.py'):
            extra = [] if script=='build-myatlas-navigation.py' else ['--evidence-root',evidence]
            for check in ([],['--check']):
                run(root,[sys.executable,'-B','scripts/'+script,*check,*extra],env)
        run(root,[sys.executable,'-B','-m','unittest','scripts.tests.test_presentation_release'],env)
        run(root,['node','tests/myatlas/progress-geometry.cjs'],env)
        for script in ('build-leetcode-progress.py','build-leetcode-atlas.py'):
            run(root,[sys.executable,'-B','scripts/'+script],env)
        if not (root/'scripts/knowledge_atlas/node_modules/playwright').exists():
            run(root,['npm','ci','--prefix','scripts/knowledge_atlas','--ignore-scripts'],env)
        if args.install_browsers:
            run(root,['scripts/knowledge_atlas/node_modules/.bin/playwright','install','chromium','webkit'],env)
        (root/'build/pages/.nojekyll').write_text('')
        preview=root/'build/preview';preview.mkdir(exist_ok=True)
        link=preview/'myatlas'
        if not link.exists():link.symlink_to('../pages',target_is_directory=True)
        with socket.socket() as sock:
            sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
        base=f'http://127.0.0.1:{port}/myatlas/'
        env.update(ATLAS_PREVIEW=base+'knowledge-map/', LEETCODE_PREVIEW=base+'leetcode-progress/', CPU_PREVIEW=base+'leetcode-atlas/', CPU_SITE_PREVIEW=base)
        # Existing route suites support their own URL variable; default server
        # port remains 8807 for those until all consumers migrate below.
        env['MYATLAS_PREVIEW']=base
        server=subprocess.Popen([sys.executable,'-B','-m','http.server',str(port),'--bind','127.0.0.1','--directory',str(preview)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        try:
            for attempt in range(100):
                try:
                    urllib.request.urlopen(base+'knowledge-map/',timeout=1).close();break
                except OSError:time.sleep(.1)
            for name in ('release','navigation','geometry-browser','scope-presentation'):
                run(root,['node',f'tests/myatlas/{name}.cjs'],env)
            for script in ('tests/leetcode-progress/browser.cjs','tests/leetcode-atlas/progress.cjs','tests/leetcode-atlas/top-ui.cjs'):
                run(root,['node',script,'test-results/leetcode-cpu','after'],env)
        finally:
            server.terminate();server.wait(timeout=10)
        progress=json.loads((root/'build/pages/knowledge-map/progress.json').read_text())
        report.update(status='PASS',application_commit=progress['source']['commit'],completed_project_ids=progress['completed_project_ids'],learned=progress['global']['learned'],verified=progress['global']['verified'],newly_learned_topic_ids=sorted(set(progress['effective_learned_topic_ids'])-set(progress['direct_learned_topic_ids'])))
    except Exception as error:
        report.update(status='FAIL',error=str(error));raise
    finally:
        out.write_text(json.dumps(report,indent=2)+'\n')


if __name__=='__main__':main()
