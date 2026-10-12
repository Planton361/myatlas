"""Mock transport only in unit tests; executable smoke always uses real HTTPS."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import unittest
from urllib.error import HTTPError
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts'))
spec=importlib.util.spec_from_file_location('public_smoke',ROOT/'scripts/check-public-project-index.py')
smoke=importlib.util.module_from_spec(spec);spec.loader.exec_module(smoke)

class PublicIndexSmokeTests(unittest.TestCase):
    def test_prebootstrap_is_explicitly_absent_not_production_verified(self):
        with patch.object(smoke,'git',return_value=(smoke.REPOSITORY+'.git').encode()),patch.object(smoke,'anonymous_index_read',side_effect=HTTPError(smoke.ENDPOINT,404,'missing',{},None)):
            report=smoke.check(ROOT,browsers=False)
            self.assertEqual(report['status'],'EXPECTED_ABSENT');self.assertIn('approval',report['blocker'])
    def test_non404_and_foreign_repository_fail_closed(self):
        with patch.object(smoke,'git',return_value=b'https://evil.invalid/repo'):
            with self.assertRaisesRegex(ValueError,'Canonical'):smoke.check(ROOT,browsers=False)
        with patch.object(smoke,'git',return_value=smoke.REPOSITORY.encode()),patch.object(smoke,'anonymous_index_read',side_effect=HTTPError(smoke.ENDPOINT,503,'offline',{},None)):
            with self.assertRaises(HTTPError):smoke.check(ROOT,browsers=False)
    def test_bad_canonical_bytes_and_foreign_links_use_existing_wire_validator(self):
        with patch.object(smoke,'git',return_value=smoke.REPOSITORY.encode()):
            for raw in (b'{}\n',b'{}',b'{"schema":1,"index_url":"https://evil.invalid"}\n',b'\xff'):
                with self.subTest(raw=raw),patch.object(smoke,'anonymous_index_read',return_value=raw):
                    with self.assertRaises((ValueError,UnicodeError,subprocess.SubprocessError)):smoke.check(ROOT,browsers=False)
    def test_equal_store_source_and_unexpected_revision_are_rejected(self):
        p={'revision':'a'*40,'index_url':'unused','index_sha256':'b'*64}
        for checked,expected in (({'store_revision':'a'*40},None),({'store_revision':'c'*40},'d'*40)):
            with patch.object(smoke,'git',return_value=smoke.REPOSITORY.encode()),patch.object(smoke,'anonymous_index_read',return_value=b'{}\n'),patch.object(smoke,'contract',side_effect=[p,checked]):
                with self.assertRaises(ValueError):smoke.check(ROOT,expected,browsers=False)
    def test_actual_browser_probe_has_no_mock_or_arbitrary_endpoint(self):
        code=(ROOT/'scripts/knowledge_atlas/public_index_smoke.cjs').read_text()
        self.assertNotIn('route(',code);self.assertNotIn('fulfill(',code)
        self.assertIn("credentials:'omit'",code);self.assertIn("redirect:'error'",code)
        self.assertIn("['chromium',chromium],['webkit',webkit]",code)
