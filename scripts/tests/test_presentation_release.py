"""Exercise supplement reversal and tamper rejection on the actual built Pages artifact."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import tempfile
import unittest
from scripts.knowledge_atlas.presentation_release import verify_presentation

ROOT=Path(__file__).resolve().parents[2]


class PresentationReleaseTests(unittest.TestCase):
    def setUp(self):
        self.evidence=Path(os.environ['HYPERSKILL_EVIDENCE_ROOT'])
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.site=Path(self.tmp.name)/'knowledge-map'
        shutil.copytree(ROOT/'build/pages/knowledge-map',self.site)

    def verify(self):return verify_presentation(ROOT,self.site,self.evidence)

    def mutate(self,name,raw):
        (self.site/name).write_bytes(raw)
        runtime=json.loads((self.site/'runtime-manifest.json').read_text())
        runtime['inventory'][name]=hashlib.sha256(raw).hexdigest()
        (self.site/'runtime-manifest.json').write_text(json.dumps(runtime))

    def test_exact_supplement_reverses_into_all_original_release_guards(self):
        result=self.verify();self.assertEqual(result['status'],'PASS');self.assertTrue(result['historical_evidence_unchanged'])

    def test_modified_supplement_rejected_even_with_matching_runtime_hash(self):
        name='views/knowledge-atlas-v6-skill-tree/progress-ui.js'
        self.mutate(name,(self.site/name).read_bytes()+b'\n// unreviewed\n')
        with self.assertRaisesRegex(ValueError,'Changed presentation artifact'):self.verify()

    def test_layout_tampering_rejected_even_with_matching_runtime_hash(self):
        name='views/knowledge-atlas-v6-skill-tree/layout.js'
        self.mutate(name,(self.site/name).read_bytes()+b'\n// unreviewed geometry\n')
        with self.assertRaisesRegex(ValueError,'Changed accepted application'):self.verify()

    def test_extra_runtime_asset_and_unattested_progress_rejected(self):
        self.mutate('unreviewed.js',b'// unexpected asset\n')
        with self.assertRaises(ValueError):self.verify()

    def test_progress_tampering_rejected_even_with_matching_runtime_hash(self):
        progress=json.loads((self.site/'progress.json').read_text());progress['global']['learned']+=1
        self.mutate('progress.json',json.dumps(progress).encode())
        with self.assertRaisesRegex(ValueError,'Public project progress mismatch'):self.verify()
