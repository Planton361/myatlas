"""Exercise the real entrypoint's child environment before any build or network I/O."""
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('pages_candidate', ROOT / 'scripts/validate-pages-candidate.py')
candidate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(candidate)


class StopBeforeBuild(Exception):
    pass


class PagesCandidateContextTests(unittest.TestCase):
    def invoke(self, environment):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with patch.object(candidate, '__file__', str(root / 'scripts/validate-pages-candidate.py')), \
                 patch.dict(os.environ, environment, clear=True), \
                 patch('sys.argv', ['validate-pages-candidate.py', '--evidence-root', tmp]), \
                 patch.object(candidate.subprocess, 'check_output', return_value=b'a' * 40), \
                 patch.object(candidate, 'run', side_effect=StopBeforeBuild) as child:
                with self.assertRaises(StopBeforeBuild):
                    candidate.main()
            env = child.call_args.args[2]
            report = json.loads((root / 'test-results/pages-candidate.json').read_text())
            return env, report

    def test_pull_request_keeps_isolated_progress_and_discards_cross_repository_sha(self):
        env, report = self.invoke({'GITHUB_REF': 'refs/pull/3/merge', 'GITHUB_SHA': 'b' * 40,
                                   'MYATLAS_PRE_RELEASE_PROGRESS': '0'})
        self.assertEqual(env['MYATLAS_PRE_RELEASE_PROGRESS'], '1')
        self.assertNotIn('GITHUB_SHA', env)
        self.assertEqual(report['public_progress_mode'], 'isolated-pre-release')

    def test_main_overrides_inherited_fixture_mode_and_preserves_commit_guard(self):
        env, report = self.invoke({'GITHUB_REF': 'refs/heads/main', 'GITHUB_SHA': 'b' * 40,
                                   'MYATLAS_PRE_RELEASE_PROGRESS': '1'})
        self.assertEqual(env['MYATLAS_PRE_RELEASE_PROGRESS'], '0')
        self.assertEqual(env['GITHUB_SHA'], 'b' * 40)
        self.assertEqual(report['public_progress_mode'], 'anonymous-live')

    def test_unpublished_local_and_release_builds_keep_isolated_progress(self):
        for environment in ({}, {'GITHUB_REF': 'refs/heads/release/review'}):
            with self.subTest(environment=environment):
                env, report = self.invoke(environment)
                self.assertEqual(env['MYATLAS_PRE_RELEASE_PROGRESS'], '1')
                self.assertEqual(report['deployment'], 'disabled')


if __name__ == '__main__':
    unittest.main()
