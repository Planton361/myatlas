"""Scheduled decision tests use committed disposable evidence and fake deployed bytes."""
import hashlib
import json
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch
from scripts.tests import test_external_completion as fixtures
from scripts.knowledge_atlas.external_completion import project_external, REPOSITORY
from scripts.knowledge_atlas.project_sync import decide, deployed_revisions

ROOT=Path(__file__).resolve().parents[2]


def deployed(app,project):
    progress=json.dumps({'source':{'commit':app,'project_repository':REPOSITORY,'project_commit':project}}).encode()
    manifest={'schema':1,'edition':'myatlas-v6.6','source_commit':app,'project_source':{'repository':REPOSITORY,'commit':project},'inventory':{'progress.json':hashlib.sha256(progress).hexdigest()}}
    return {'runtime-manifest.json':json.dumps(manifest).encode(),'progress.json':progress}


class ProjectSyncTests(unittest.TestCase):
    def setUp(self):
        self.fixture=fixtures.ExternalCompletionTests('test_exact_pre_split_progress_and_source_repository')
        self.fixture.setUp();self.addCleanup(self.fixture.doCleanups)
        self.repo=self.fixture.repo
        self.projection=project_external(ROOT,self.repo)['projection']
        self.app=self.projection['source']['commit'];self.project=self.projection['source']['project_commit']
        self.bytes=deployed(self.app,self.project)
        main_patch=patch('scripts.knowledge_atlas.project_sync.latest_main',return_value=self.app)
        main_patch.start();self.addCleanup(main_patch.stop)

    def test_daily_unchanged_pair_skips_build_after_exact_evidence_validation(self):
        result=decide(ROOT,self.repo,'schedule',self.bytes.__getitem__)
        self.assertFalse(result['build']);self.assertEqual(result['project_commit'],self.project)

    def test_daily_new_project_commit_builds_and_push_reads_latest_committed_evidence(self):
        path=self.repo/'java/Simple Chat Bot with Java/README.md'
        path.write_text(path.read_text()+'\nReviewed project documentation.\n');self.fixture.commit()
        latest=self.fixture.git('rev-parse','HEAD').decode().strip()
        for event in ('schedule','push'):
            result=decide(ROOT,self.repo,event,self.bytes.__getitem__)
            self.assertTrue(result['build']);self.assertEqual(result['project_commit'],latest)

    def test_daily_application_revision_change_alone_requires_build(self):
        old=deployed('a'*40,self.project)
        self.assertTrue(decide(ROOT,self.repo,'schedule',old.__getitem__)['build'])

    def test_main_advancing_or_unavailable_during_check_cannot_skip_build(self):
        with patch('scripts.knowledge_atlas.project_sync.latest_main',return_value='c'*40):
            self.assertTrue(decide(ROOT,self.repo,'schedule',self.bytes.__getitem__)['build'])
        with patch('scripts.knowledge_atlas.project_sync.latest_main',side_effect=OSError('offline')):
            self.assertTrue(decide(ROOT,self.repo,'schedule',self.bytes.__getitem__)['build'])

    def test_manual_and_push_never_skip_or_require_deployed_comparison(self):
        def unavailable(_):raise AssertionError('Push/manual must not fetch deployed provenance')
        for event in ('push','workflow_dispatch'):
            self.assertTrue(decide(ROOT,self.repo,event,unavailable)['build'])

    def test_missing_invalid_stale_or_inconsistent_deployed_provenance_falls_back(self):
        for broken in (b'{}',b'not JSON',b'[]',json.dumps({'schema':1,'edition':'myatlas-v6.6','source_commit':'main','project_source':{'repository':REPOSITORY,'commit':self.project}}).encode()):
            data=dict(self.bytes);data['runtime-manifest.json']=broken
            self.assertTrue(decide(ROOT,self.repo,'schedule',data.__getitem__)['build'])
        data=dict(self.bytes);data['progress.json']=b'{}'
        self.assertTrue(decide(ROOT,self.repo,'schedule',data.__getitem__)['build'])
        data=deployed(self.app,self.project);manifest=json.loads(data['runtime-manifest.json']);manifest['project_source']['repository']='wrong/repo';data['runtime-manifest.json']=json.dumps(manifest).encode()
        self.assertTrue(decide(ROOT,self.repo,'schedule',data.__getitem__)['build'])
        def offline(_):raise OSError('offline')
        self.assertTrue(decide(ROOT,self.repo,'schedule',offline)['build'])

    def test_rejected_project_evidence_blocks_every_event_before_comparison(self):
        (self.repo/'java/Simple Chat Bot with Java/src/main/java/bot/SimpleBot.java').write_text('tampered committed evidence')
        self.fixture.commit()
        for event in ('schedule','push','workflow_dispatch'):
            with self.assertRaisesRegex(ValueError,'Rejected public exports'):
                decide(ROOT,self.repo,event,lambda _:self.fail('Invalid evidence must never read/skip deployment'))

    def test_deployed_partial_or_wrong_projection_is_not_conclusive(self):
        for progress in ([],{'source':{}},{'source':{'commit':self.app,'project_repository':REPOSITORY,'project_commit':'b'*40}}):
            data=dict(self.bytes);raw=json.dumps(progress).encode();manifest=json.loads(data['runtime-manifest.json']);manifest['inventory']['progress.json']=hashlib.sha256(raw).hexdigest();data.update({'progress.json':raw,'runtime-manifest.json':json.dumps(manifest).encode()})
            self.assertTrue(decide(ROOT,self.repo,'schedule',data.__getitem__)['build'])

    def test_workflow_retains_all_build_gates_and_safe_triggers(self):
        current=(ROOT/'.github/workflows/myatlas-pages.yml').read_text()
        previous=subprocess.check_output(['git','-C',str(ROOT),'show','HEAD:.github/workflows/myatlas-pages.yml']).decode()
        self.assertIn("branches: [main, 'release/**']",current)
        self.assertIn("paths-ignore: ['progress/leetcode/**']",current)
        self.assertIn('  workflow_dispatch:',current);self.assertIn('cron: "23 5 * * *"',current)
        # The complete existing validated build and artifact path remains exact.
        self.assertEqual(current.split('  build:\n',1)[1].split('    steps:\n',1)[1].split('  deploy:\n',1)[0],previous.split('  build:\n',1)[1].split('    steps:\n',1)[1].split('  deploy:\n',1)[0])
        self.assertIn("if: needs.project-check.outputs.build == 'true'",current)
        self.assertIn('needs: project-check',current)
        self.assertIn("github.event_name == 'schedule'",current.split('  deploy:\n',1)[1])
        self.assertIn('needs: build',current.split('  deploy:\n',1)[1])
        self.assertEqual(current.count('repository: Planton361/hyperskill-projects'),2)
        self.assertNotIn('secrets.',current);self.assertNotIn('contents: write',current)
        self.assertIn('ref: main',current)
