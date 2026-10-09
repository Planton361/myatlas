"""Separate public project evidence: exact semantics, Git-only reads and failures."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from scripts.knowledge_atlas.external_completion import project_external, REPOSITORY

ROOT = Path(__file__).resolve().parents[2]
BASE = 'b0983b1dc4739c5465865903e18a4347e78a1f4d'


class ExternalCompletionTests(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.repo = Path(folder.name)
        self.git('init', '-q')
        self.git('config', 'user.name', 'Disposable fixture')
        self.git('config', 'user.email', 'fixture@example.invalid')
        self.git('remote', 'add', 'origin', 'https://github.com/' + REPOSITORY + '.git')
        names = subprocess.check_output(['git', '-C', str(ROOT), 'ls-tree', '-r', '--name-only', BASE, 'java']).decode().splitlines()
        for name in names:
            dest = self.repo / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(subprocess.check_output(['git', '-C', str(ROOT), 'show', BASE + ':' + name]))
        self.commit()

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.repo), *args], stderr=subprocess.DEVNULL)

    def commit(self):
        self.git('add', '.')
        self.git('commit', '-qm', 'Disposable public-export fixture')

    def test_exact_pre_split_progress_and_source_repository(self):
        actual = project_external(ROOT, self.repo)['projection']
        old = json.loads(subprocess.check_output(['python3', '-B', str(ROOT / 'scripts/sync-project-completion.py'), '--ref', BASE]))['projection']
        self.assertEqual({k:v for k,v in actual.items() if k!='source'}, {k:v for k,v in old.items() if k!='source'})
        self.assertEqual(actual['source']['project_repository'], REPOSITORY)
        self.assertEqual(actual['completed_project_ids'], [113])

    def test_uncommitted_files_are_not_progress(self):
        before = project_external(ROOT, self.repo)
        (self.repo / 'java/Simple Chat Bot with Java/src/main/java/bot/SimpleBot.java').write_text('uncommitted')
        self.assertEqual(project_external(ROOT, self.repo), before)

    def test_committed_tampering_is_rejected(self):
        (self.repo / 'java/Simple Chat Bot with Java/src/main/java/bot/SimpleBot.java').write_text('tampered')
        self.commit()
        with self.assertRaises(ValueError): project_external(ROOT, self.repo)

    def test_wrong_repository_and_missing_ref_do_not_become_zero(self):
        self.git('remote', 'set-url', 'origin', 'https://github.com/example/wrong')
        with self.assertRaises(ValueError): project_external(ROOT, self.repo)
        self.git('remote', 'set-url', 'origin', 'https://github.com/' + REPOSITORY)
        with self.assertRaises(subprocess.CalledProcessError): project_external(ROOT, self.repo, 'missing-fixture-ref')
