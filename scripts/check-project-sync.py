#!/usr/bin/env python3
"""Validate canonical project evidence and decide whether a daily Pages build is needed."""
import argparse
import json
import os
from pathlib import Path
from knowledge_atlas.project_sync import decide

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence-root', type=Path, required=True)
    parser.add_argument('--event', choices=('schedule', 'push', 'workflow_dispatch'), required=True)
    parser.add_argument('--github-output', type=Path)
    args = parser.parse_args()
    # Evidence failures intentionally exit nonzero: never convert rejection to
    # an unchanged result or a new deployment with zero project completions.
    try:
        result = decide(ROOT, args.evidence_root, args.event)
    except Exception as error:
        result = dict(build=False, build_status='blocked', deploy_status='blocked', error=str(error))
        Path('project-sync-report.json').write_text(json.dumps(result, indent=2)+'\n')
        if os.environ.get('GITHUB_STEP_SUMMARY'):
            with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as output:
                output.write('Project sync blocked: ' + str(error) + '\n')
        raise
    Path('project-sync-report.json').write_text(json.dumps(result, indent=2)+'\n')
    if os.environ.get('GITHUB_SHA', result['application_commit']) != result['application_commit']:
        raise ValueError('Check does not match workflow application revision')
    print(json.dumps(result, sort_keys=True, indent=2))
    if args.github_output:
        with args.github_output.open('a') as output:
            output.write('build=' + str(result['build']).lower() + '\n')
            output.write('application_commit=' + result['application_commit'] + '\n')
            output.write('project_commit=' + result['project_commit'] + '\n')
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as output:
            output.write('### Daily project evidence check\n\n' + result['reason'] + '\n\n')
            output.write('- MyAtlas revision: `' + result['application_commit'] + '`\n')
            output.write('- Project-source revision: `' + result['project_commit'] + '`\n')
            output.write('\n```json\n' + json.dumps(result, indent=2) + '\n```\n')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
