import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from knowledge_atlas.project_completion import scan, validate_completion
from knowledge_atlas.external_export_scan import scan as scan_external

ROOT = Path(__file__).resolve().parents[2]

class CompletionTests(unittest.TestCase):
    def test_real_legacy_and_idempotence(self):
        scopes = json.loads((ROOT/'src/myatlas/knowledge-atlas-scope-pyramid/scope-index.json').read_text())
        first = scan(ROOT, scopes)
        self.assertEqual(first, scan(ROOT, scopes))
        self.assertEqual(first, json.loads((ROOT/'data/myatlas/progress.json').read_text()))
        self.assertEqual([p['project_id'] for p in first['projects']], [113])
        self.assertEqual(len(first['learned_topic_ids']), 26)
        self.assertEqual(first['rejected'], [])

    def test_export_boundaries(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            scopes = {'projects': [dict(scope_id=7, state='KNOWN', explicit_topic_ids=[1, 2, 2]),dict(scope_id=8, state='UNKNOWN', explicit_topic_ids=None),dict(scope_id=9, state='KNOWN_EMPTY', explicit_topic_ids=[])]}
            def export(name, pid, complete=True):
                folder=root/'java'/name;folder.mkdir(parents=True)
                (folder/'source.java').write_text('source')
                names=['build.gradle.kts','settings.gradle.kts','gradlew','gradlew.bat','gradle/wrapper/gradle-wrapper.jar','gradle/wrapper/gradle-wrapper.properties','src/main/java/Main.java']
                for name in names:
                    target=folder/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_text('source')
                meta={'schema':2,'language':'java','directory_name':folder.name,'files':{n:hashlib.sha256(b'source').hexdigest() for n in [*names,'source.java']}}
                if complete:meta['completion']=dict(project_id=pid,status='completed',attested_by='owner',observed_at='2026-10-08T12:00:00Z')
                (folder/'.hyperskill-import.json').write_text(json.dumps(meta))
                return folder
            export('complete',7);export('overlap',7);export('unknown',8);export('empty',9);export('incomplete',7,False)
            arbitrary=root/'java'/'arbitrary';arbitrary.mkdir();(arbitrary/'README.md').write_text('Completed https://hyperskill.org/projects/7')
            result=scan(root,scopes)
            self.assertEqual(result['learned_topic_ids'],[1,2]);self.assertEqual(len(result['projects']),3)
            self.assertEqual(result,scan(root,scopes))
            (root/'java/complete/source.java').write_text('changed')
            self.assertEqual(len(scan(root,scopes)['rejected']),1)
            meta=root/'java/overlap/.hyperskill-import.json'
            value=json.loads(meta.read_text());value['completion']['project_id']=True;meta.write_text(json.dumps(value))
            self.assertEqual(len(scan(root,scopes)['rejected']),2)

    def test_attestation_validation(self):
        for value in ({},dict(project_id=1,status='active',attested_by='owner',observed_at='2026-10-08T12:00:00Z'),dict(project_id=1,status='completed',attested_by='owner',observed_at='yesterday')):
            with self.assertRaises(ValueError):validate_completion(value)

    def test_source_only_export_completes_unknown_project_without_inventing_topics(self):
        scopes = json.loads((ROOT/'src/myatlas/knowledge-atlas-scope-pyramid/scope-index.json').read_text())
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            folder = root/'java'/'Zookeeper with Java'
            source = folder/'src/main/java/Main.java'
            source.parent.mkdir(parents=True)
            source.write_text('// Project topic 999999 is only source text, not Atlas evidence.\nclass Main {}\n')
            readme = '# Zookeeper with Java\n\nhttps://hyperskill.org/projects/229\n'
            (folder/'README.md').write_text(readme)
            raw = source.read_bytes()
            manifest = {
                'schema': 3,
                'mode': 'source-only',
                'language': 'java',
                'directory_name': folder.name,
                'project_id': 229,
                'completion': dict(project_id=229, status='completed', attested_by='owner', observed_at='2026-10-10T11:45:17Z'),
                'files': {'src/main/java/Main.java': hashlib.sha256(raw).hexdigest()},
            }
            (folder/'.hyperskill-import.json').write_text(json.dumps(manifest))
            result = scan_external(root, scopes)
            self.assertEqual(result['rejected'], [])
            project = next(row for row in result['projects'] if row['project_id'] == 229)
            self.assertEqual(project['status'], 'completed')
            self.assertEqual(project['observed_at'], '2026-10-10T11:45:17Z')
            self.assertEqual(project['requirements_state'], 'UNKNOWN')
            self.assertEqual(project['topic_ids'], [])
            self.assertNotIn(999999, result['learned_topic_ids'])

            # The archive inventory is exact; neither an unmanifested file nor
            # a manifest hash that no longer matches can be accepted.
            (folder/'.env').write_text('private=not-for-export')
            self.assertEqual(len(scan_external(root, scopes)['rejected']), 1)
            (folder/'.env').unlink()
            source.write_text(source.read_text()+'// tampered\n')
            self.assertEqual(len(scan_external(root, scopes)['rejected']), 1)
