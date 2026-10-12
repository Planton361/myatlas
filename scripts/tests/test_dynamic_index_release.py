"""Full reversal, disabled rollout, source provenance and baseline invariants."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from scripts.knowledge_atlas.dynamic_index_release import verify_dynamic, release_selection
from scripts.knowledge_atlas.external_completion import project_external

ROOT=Path(__file__).resolve().parents[2]


class DynamicIndexReleaseTests(unittest.TestCase):
    def setUp(self):
        self.evidence=Path(os.environ['HYPERSKILL_EVIDENCE_ROOT'])
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.site=Path(self.tmp.name)/'knowledge-map'
        shutil.copytree(ROOT/'build/pages/knowledge-map',self.site)

    def verify(self):
        return verify_dynamic(ROOT,self.site,self.evidence)

    def mutate(self,name,raw):
        (self.site/name).write_bytes(raw)
        runtime=json.loads((self.site/'runtime-manifest.json').read_bytes())
        runtime['inventory'][name]=hashlib.sha256(raw).hexdigest()
        (self.site/'runtime-manifest.json').write_text(json.dumps(runtime))

    def test_complete_reversal_preserves_all_existing_release_gates(self):
        result=self.verify()
        self.assertEqual(result['status'],'PASS')
        self.assertEqual(result['dynamic_index_enabled'],release_selection(ROOT)[0]['production_enabled'])
        self.assertTrue(result['historical_evidence_unchanged'])

    def test_activation_cannot_change_even_with_matching_inventory(self):
        config=json.loads((self.site/'hyperskill-index/config.json').read_bytes())
        self.assertIs(config['enabled'],release_selection(ROOT)[0]['production_enabled'])
        config['enabled']=not config['enabled']
        self.mutate('hyperskill-index/config.json',json.dumps(config).encode())
        with self.assertRaisesRegex(ValueError,'Changed dynamic index asset'):
            self.verify()

    def test_reader_or_entrypoint_tampering_rejected(self):
        for name in ['hyperskill-index/reader.js','index.html']:
            with self.subTest(name=name):
                raw=(self.site/name).read_bytes()
                self.mutate(name,raw+b'\n// unauthorized\n')
                with self.assertRaises(ValueError):self.verify()
                self.mutate(name,raw)

    def test_geometry_tampering_still_reaches_frozen_guard(self):
        name='views/knowledge-atlas-v6-skill-tree/layout.js'
        self.mutate(name,(self.site/name).read_bytes()+b'\n// changed geometry\n')
        with self.assertRaisesRegex(ValueError,'Changed accepted application'):
            self.verify()

    def test_extra_assets_and_symlinks_rejected(self):
        (self.site/'hyperskill-index/unreviewed.js').write_bytes(b'// unexpected\n')
        with self.assertRaises(ValueError):self.verify()
        # New temp copy, preserving all real local/source files.
        other=Path(self.tmp.name)/'symlink-candidate'
        shutil.copytree(ROOT/'build/pages/knowledge-map',other)
        (other/'linked-code').symlink_to(ROOT/'src/myatlas/knowledge-atlas-v6-skill-tree/app.js')
        with self.assertRaises(ValueError):verify_dynamic(ROOT,other,self.evidence)

    def test_real_archives_progress_courses_and_trusted_inputs_unchanged(self):
        baseline=json.loads((ROOT/'docs/contracts/hyperskill-baseline-v1.json').read_bytes())
        actual={name:hashlib.sha256(subprocess.check_output(['git','-C',str(self.evidence),'show','HEAD:'+name])).hexdigest() for name in baseline['archive_sha256']}
        self.assertEqual(len(actual),22);self.assertEqual(actual,baseline['archive_sha256'])
        for name,digest in baseline['trusted_input_sha256'].items():
            self.assertEqual(hashlib.sha256((ROOT/name).read_bytes()).hexdigest(),digest,name)
        # Compare the frozen baseline at its exact revision, while the full
        # candidate may legitimately contain additional synthetic completions.
        progress=project_external(ROOT,self.evidence,baseline['archive_commit'])['projection']
        candidate=project_external(ROOT,self.evidence)['projection']
        self.assertEqual(candidate['verified_topic_ids'],baseline['verified_topic_ids'])
        self.assertEqual(candidate['course_completion'],baseline['course_completion'])
        self.assertEqual(progress['completed_project_ids'],[113,229,380])
        self.assertEqual(progress['global'],baseline['global_progress'])
        self.assertEqual(progress['verified_topic_ids'],baseline['verified_topic_ids'])
        self.assertEqual(progress['course_completion'],baseline['course_completion'])
        semantic={k:v for k,v in progress.items() if k!='source'}
        self.assertEqual(hashlib.sha256(json.dumps(semantic,sort_keys=True,separators=(',',':')).encode()).hexdigest(),baseline['semantic_projection_sha256'])
        report=dict(candidate_project_ids=(candidate.get('completion_register') or candidate)['completed_project_ids'],baseline_project_revision=baseline['archive_commit'],archive_sha256=actual,completed_project_ids=progress['completed_project_ids'],global_progress=progress['global'],verified_topic_ids=progress['verified_topic_ids'],course_completion=progress['course_completion'],accepted_geometry=baseline['geometry'])
        (ROOT/'test-results/index-baseline.json').write_text(json.dumps(report,sort_keys=True,indent=2)+'\n')
