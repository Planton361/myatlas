"""The additive activation is pinned; rollback restores the original disabled release."""
import json
import hashlib
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from scripts.knowledge_atlas.dynamic_index_release import ACTIVATION, ACTIVATION_SHA, MANIFEST, REVIEWED_SHA, release_selection

ROOT=Path(__file__).resolve().parents[2]
SOURCE='src/supplements/hyperskill-index-activation-v1/config.json'

class ActivationReleaseTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        for name in (SOURCE,'src/supplements/hyperskill-index-v1/config.json'):
            p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,p)
        fixture=dict(schema=1,version='hyperskill-index-activation-v1',base_manifest=MANIFEST,base_sha256=REVIEWED_SHA,production_enabled=True,config_source=SOURCE,config_sha256=hashlib.sha256((self.root/SOURCE).read_bytes()).hexdigest())
        p=self.root/ACTIVATION;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(fixture,sort_keys=True,indent=2)+'\n')
        self.assertEqual(hashlib.sha256(p.read_bytes()).hexdigest(),ACTIVATION_SHA)
        self.git('init','-q');self.git('config','user.email','synthetic@example.invalid');self.git('config','user.name','Synthetic test')
        self.commit()
    def git(self,*args):return subprocess.check_output(['git','-C',str(self.root),*args],stderr=subprocess.PIPE)
    def commit(self):self.git('add','.');self.git('commit','-qm','Synthetic release fixture')
    def test_only_flag_changes_and_history_is_preserved(self):
        selected,source=release_selection(self.root)
        self.assertEqual(selected,dict(manifest=ACTIVATION,sha256=ACTIVATION_SHA,production_enabled=True))
        self.assertEqual(source,SOURCE)
        old=json.loads((self.root/'src/supplements/hyperskill-index-v1/config.json').read_bytes())
        self.assertFalse(old['enabled'])
        self.assertEqual(json.loads((self.root/source).read_bytes()),{**old,'enabled':True})
    def test_reviewed_rollback_restores_disabled_base_without_store_writes(self):
        self.git('rm',ACTIVATION);self.commit()
        selected,source=release_selection(self.root)
        self.assertEqual(selected,dict(manifest=MANIFEST,sha256=REVIEWED_SHA,production_enabled=False))
        self.assertFalse(json.loads((self.root/source).read_bytes())['enabled'])
        self.assertNotIn('portfolio',self.git('ls-tree','-r','--name-only','HEAD').decode())
    def test_unreviewed_manifest_config_and_nonregular_files_rejected(self):
        for name in (ACTIVATION,SOURCE):
            with self.subTest(name=name):
                p=self.root/name;raw=p.read_bytes();p.write_bytes(raw+b' ')
                with self.assertRaises(ValueError):release_selection(self.root)
                p.write_bytes(raw)
        p=self.root/SOURCE;raw=p.read_bytes();p.unlink();p.symlink_to(self.root/'src/supplements/hyperskill-index-v1/config.json')
        with self.assertRaises(ValueError):release_selection(self.root)
        p.unlink();p.write_bytes(raw)
    def test_uncommitted_removal_cannot_silently_disable(self):
        (self.root/ACTIVATION).unlink()
        with self.assertRaisesRegex(ValueError,'Uncommitted removal'):release_selection(self.root)
    def test_uncommitted_activation_cannot_be_packaged(self):
        self.git('rm','--cached',ACTIVATION);self.git('commit','-qm','No approved activation')
        with self.assertRaises(subprocess.CalledProcessError):release_selection(self.root)
    def test_workflow_gate_preserves_full_acceptance_and_prohibits_early_deploy(self):
        workflow=(ROOT/'.github/workflows/myatlas-pages.yml').read_text()
        gate=workflow.split('  activation-check:\n',1)[1].split('  project-check:\n',1)[0]
        self.assertIn('contents: read',gate);self.assertNotIn('write',gate)
        self.assertIn('needs: [build, activation-check]',workflow)
        self.assertIn('--expect-current',gate);self.assertNotIn('--allow-missing',gate)
        build=workflow.split('  build:\n',1)[1].split('  deploy:\n',1)[0]
        self.assertIn('validate-pages-candidate.py',build);self.assertIn('GITHUB_REF=refs/heads/main',build)
