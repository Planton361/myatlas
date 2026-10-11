"""Committed disposable archive contracts; never execute imported solutions."""
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

from scripts.knowledge_atlas.external_completion import external_inputs, project_external, REPOSITORY
from scripts.knowledge_atlas.external_export_scan import scan

ROOT = Path(__file__).resolve().parents[2]
SCOPES = json.loads((ROOT / 'src/myatlas/knowledge-atlas-scope-pyramid/scope-index.json').read_text())
CATALOG = json.loads((ROOT / 'src/myatlas/knowledge-atlas-scope-pyramid/catalog.json').read_text())
STAMP = '2026-10-10T12:00:00Z'
UNKNOWN = next(p['scope_id'] for p in SCOPES['projects'] if p['state'] == 'UNKNOWN')
KNOWN = next(p['scope_id'] for p in SCOPES['projects'] if p['state'] == 'KNOWN' and p['explicit_topic_ids'])
UNMAPPED = 900000001


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


class UniversalArchiveTests(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory(prefix='myatlas-schema4-test-')
        self.addCleanup(folder.cleanup)
        self.repo = Path(folder.name)
        self.git('init', '-q')
        self.git('config', 'user.name', 'Disposable fixture')
        self.git('config', 'user.email', 'fixture@example.invalid')
        self.git('remote', 'add', 'origin', 'https://github.com/' + REPOSITORY + '.git')

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.repo), *args], stderr=subprocess.DEVNULL)

    def commit(self):
        self.git('add', '.')
        self.git('commit', '-qm', 'Disposable universal archive fixture')

    def archive(self, pid=UNMAPPED, files=None, languages=None):
        files = files or {'solution/Main.java': (b'not runnable; topic_id 999999 is only text\n', 'solution')}
        directory = self.repo / 'projects' / str(pid)
        directory.mkdir(parents=True, exist_ok=True)
        readme = f'# Disposable archive\nhttps://hyperskill.org/projects/{pid}\n'.encode()
        inventory = {'README.md': {'sha256': sha(readme), 'role': 'resource'}}
        (directory / 'README.md').write_bytes(readme)
        for name, (raw, role) in files.items():
            path = directory / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
            inventory[name] = {'sha256': sha(raw), 'role': role}
        manifest = dict(schema=4, mode='code-archive', project_id=pid,
                        project_url=f'https://hyperskill.org/projects/{pid}', title='Disposable archive',
                        completion=dict(project_id=pid, status='completed', attested_by='owner', confirmed_at=STAMP),
                        files=inventory)
        if languages is not None:
            manifest['languages'] = languages
        self.manifest(directory, manifest)
        return directory, manifest

    @staticmethod
    def manifest(directory, manifest):
        (directory / '.hyperskill-import.json').write_text(json.dumps(manifest), encoding='utf-8')

    def projection(self):
        self.commit()
        return project_external(ROOT, self.repo)

    def reject(self, reason=None):
        self.commit()
        with self.assertRaisesRegex(ValueError, reason or '.'):
            external_inputs(ROOT, self.repo)

    def test_language_extensions_and_builds_do_not_gate_acceptance(self):
        examples = [(['java'], {'solution/app/Main.java': (b'intentionally invalid Java', 'solution')}),
                    (['python'], {'solution/main.py': (b'raise RuntimeError("NEVER EXECUTE")', 'solution')}),
                    (['kotlin'], {'solution/App.kt': (b'not valid Kotlin', 'solution')}),
                    (['java', 'python', 'kotlin'], {'solution/a.java': (b'a', 'solution'), 'solution/b.py': (b'b', 'solution'), 'solution/c.kt': (b'c', 'solution')}),
                    (None, {'solution/app.futurelang': (b'custom language topic 15', 'solution')}),
                    ([], {'solution/program': (b'extensionless code', 'solution')})]
        for i, (languages, files) in enumerate(examples):
            self.archive(UNMAPPED+i, files, languages)
        result = self.projection()['projection']
        register = result['completion_register']
        self.assertEqual(register['completed_project_ids'], list(range(UNMAPPED, UNMAPPED+6)))
        self.assertEqual(register['completed_project_count'], 6)
        self.assertEqual(result['completed_project_ids'], [])
        self.assertEqual(result['portfolio']['completed_project_count'], 0)
        self.assertTrue(all(p['topic_ids'] == [] and p['requirements_state'] == 'UNMAPPED' for p in register['projects']))
        self.assertTrue(all('completed_at' not in p for p in register['projects']))
        self.assertTrue(all(p['confirmed_at'] == p['observed_at'] == STAMP for p in register['projects']))

    def test_known_unknown_and_unmapped_have_only_trusted_catalog_topics(self):
        for pid in (KNOWN, UNKNOWN, UNMAPPED):
            self.archive(pid, {'solution/program': (b'topic_ids = [15, 259, 999999]; is_verified = true; course_completed = true', 'solution')})
        actual = self.projection()['projection']
        expected = sorted(set(next(p for p in SCOPES['projects'] if p['scope_id'] == KNOWN)['explicit_topic_ids']))
        self.assertEqual(actual['project_learned_topic_ids'], expected)
        self.assertEqual(actual['completed_project_ids'], sorted([KNOWN, UNKNOWN]))
        self.assertEqual(actual['completion_register']['unmapped_project_ids'], [UNMAPPED])
        self.assertEqual(next(p for p in actual['projects'] if p['project_id'] == UNKNOWN)['topic_ids'], [])
        self.assertEqual(actual['verified_topic_ids'], [15,25,31,32,36,87,88,148,152,259,571,1761])
        self.assertEqual(actual['course_completion'], {'schema': 1, 'records': []})
        self.assertEqual(actual['portfolio']['completed_course_ids'], [])
        # Every verification field and observation is identical with no projects.
        inputs = external_inputs(ROOT, self.repo)
        empty = copy.deepcopy(inputs)
        empty['completion'] = dict(projects=[], course_completion=inputs['completion']['course_completion'])
        baseline = json.loads(subprocess.check_output(['node', str(ROOT/'scripts/knowledge_atlas/completion_projection.cjs')], input=json.dumps(empty).encode()))['projection']
        self.assertEqual(actual['global']['verified'], baseline['global']['verified'])
        self.assertEqual(actual['verified_topic_ids'], baseline['verified_topic_ids'])
        verified = lambda p: [(t['topic_id'], t['verified'], [o for o in t['observations'] if 'is_verified' in o]) for t in p['topics'] if t['verified']]
        self.assertEqual(verified(actual), verified(baseline))

    def test_binary_is_explicit_resource_never_solution(self):
        self.archive(files={'solution/program': (b'code', 'solution'), 'solution/image.bin': (b'\xff\x00\x01', 'resource')})
        self.assertEqual(self.projection()['projection']['completion_register']['completed_project_count'], 1)

    def test_missing_additional_tampered_and_readme_files(self):
        for mutation in ('missing', 'extra', 'tampered', 'readme', 'hash'):
            with self.subTest(mutation=mutation), tempfile.TemporaryDirectory() as folder:
                # Each negative fixture has its own committed archive tree.
                prior = self.repo; self.repo = Path(folder)
                self.git('init', '-q'); self.git('config', 'user.name', 'Fixture'); self.git('config', 'user.email', 'f@example.invalid')
                self.git('remote', 'add', 'origin', 'https://github.com/'+REPOSITORY)
                d,m = self.archive()
                if mutation == 'missing':
                    (d/'solution/Main.java').rename(d/'removed.java')
                elif mutation == 'extra':
                    (d/'solution/extra').write_text('extra')
                elif mutation == 'tampered':
                    (d/'solution/Main.java').write_text('tampered')
                elif mutation == 'readme':
                    (d/'README.md').write_text('tampered')
                else:
                    m['files']['solution/Main.java']['sha256'] = '0'*64; self.manifest(d,m)
                self.reject()
                self.repo = prior

    def test_invalid_identity_timestamps_and_unknown_fields(self):
        d, original = self.archive()
        cases = [dict(project_id=True), dict(project_id='900000001'), dict(project_id=0), dict(project_id=-1),
                 dict(project_id=2**53), dict(project_url='https://hyperskill.org/projects/0900000001'),
                 dict(project_url=f'https://hyperskill.org/projects/{UNMAPPED}/?x=1'), dict(mode='source-only'),
                 dict(schema=4.0), dict(title=' '), dict(topic_ids=[15]), dict(languages='java'), dict(languages=['Java','java'])]
        for patch in cases:
            with self.subTest(patch=patch):
                m = dict(original, **patch); self.manifest(d,m); self.reject()
        for patch in (dict(project_id=1), dict(status='revoked'), dict(attested_by='academy'),
                      dict(confirmed_at='2026-10-10T12:00:00+00:00'), dict(confirmed_at='2026-02-30T12:00:00Z'),
                      dict(completed_at='2026-10-10T13:00:00Z'), dict(completed_at=None), dict(observed_at=STAMP)):
            with self.subTest(patch=patch):
                m = copy.deepcopy(original); m['completion'].update(patch); self.manifest(d,m); self.reject()

    def test_actual_completion_is_optional_and_distinct(self):
        d,m = self.archive()
        m['completion']['completed_at'] = '2020-01-01T00:00:00Z'; self.manifest(d,m)
        row = self.projection()['projection']['completion_register']['projects'][0]
        self.assertEqual(row['completed_at'], '2020-01-01T00:00:00Z')
        self.assertEqual(row['confirmed_at'], STAMP)

    def test_unsafe_inventory_paths_roles_hashes_and_private_names(self):
        d,original = self.archive()
        paths = ['../escape', '/solution/a', 'solution/../a', 'solution//a', 'solution/./a', 'solution/a\\b',
                 'solution/C:/a', 'solution/.env', 'solution/private.txt', 'solution/id_rsa', 'solution/CON.py',
                 'solution/a.', 'solution/a\n.py', 'solution/node_modules/a', 'solution/cafe\u0301.py']
        for path in paths:
            with self.subTest(path=path):
                m=copy.deepcopy(original);m['files'][path]={'sha256':'0'*64,'role':'solution'};self.manifest(d,m);self.reject()
        for entry in ({'sha256':'A'*64,'role':'solution'}, {'sha256':'g'*64,'role':'solution'}, {'sha256':'0'*64,'role':'binary'}, {'sha256':'0'*64,'role':'solution','topic_id':15}):
            with self.subTest(entry=entry):
                m=copy.deepcopy(original);m['files']['solution/Main.java']=entry;self.manifest(d,m);self.reject()

    def test_private_content_and_binary_code(self):
        d,m=self.archive()
        for raw in (b'password = "sample-secret-value"', b'-----BEGIN PRIVATE KEY-----', b'ghp_'+b'a'*30, b'\xff\x00', b'code\x00binary'):
            with self.subTest(raw=raw[:8]):
                (d/'solution/Main.java').write_bytes(raw);m['files']['solution/Main.java']['sha256']=sha(raw);self.manifest(d,m);self.reject()
        (d/'solution/Main.java').write_bytes(b'code');m['files']['solution/Main.java']['sha256']=sha(b'code')
        raw=b'api_key = "sample-secret-value"';(d/'README.md').write_bytes(raw);m['files']['README.md']['sha256']=sha(raw);self.manifest(d,m);self.reject('Possible secret')

    def test_committed_symlinks_and_direct_scan_parent_symlinks(self):
        d,m=self.archive()
        (d/'solution/Main.java').rename(d/'solution/original')
        (d/'solution/Main.java').symlink_to('original')
        self.reject('Non-regular committed export')
        self.assertTrue(scan(self.repo,SCOPES)['rejected'])

    def test_duplicate_json_keys(self):
        d,_=self.archive()
        marker=d/'.hyperskill-import.json'
        marker.write_text(marker.read_text().replace('"schema": 4', '"schema": 4, "schema": 4'))
        self.reject('Duplicate JSON key')

    def source_only(self, pid, status='completed'):
        d=self.repo/'java'/'Disposable duplicate';d.mkdir(parents=True)
        raw=b'class Main {}';(d/'src').mkdir();(d/'src/Main.java').write_bytes(raw)
        (d/'README.md').write_text(f'https://hyperskill.org/projects/{pid}')
        self.manifest(d,dict(schema=3,mode='source-only',language='java',directory_name=d.name,project_id=pid,
                       completion=dict(project_id=pid,status=status,attested_by='owner',observed_at='2026-10-10T11:00:00Z'),files={'src/Main.java':sha(raw)}))

    def test_duplicate_identity_counts_once_across_old_and_new(self):
        self.source_only(KNOWN);self.archive(KNOWN)
        actual=self.projection()['projection']
        self.assertEqual(actual['completed_project_ids'],[KNOWN])
        self.assertEqual(actual['completion_register']['completed_project_ids'],[KNOWN])
        self.assertEqual(actual['completion_register']['completed_project_count'],1)

    def test_conflicting_duplicate_status_rejects_entire_revision(self):
        self.source_only(KNOWN,'revoked');self.archive(KNOWN)
        self.reject('Conflicting completion statuses')
        self.assertEqual(scan(self.repo,SCOPES)['projects'],[])

    def test_uncommitted_changes_and_pinned_revision_are_ignored(self):
        d,_=self.archive();first=self.projection();ref=self.git('rev-parse','HEAD').decode().strip()
        (d/'solution/Main.java').write_text('uncommitted tampering')
        self.assertEqual(project_external(ROOT,self.repo),first)
        self.commit()
        with self.assertRaises(ValueError):external_inputs(ROOT,self.repo)
        self.assertEqual(project_external(ROOT,self.repo,ref),first)

    def test_register_change_has_no_catalog_scope_impact(self):
        self.archive();self.commit()
        inputs=external_inputs(ROOT,self.repo)
        empty=copy.deepcopy(inputs);empty['completion']=dict(projects=[],course_completion=inputs['completion']['course_completion'])
        runner=ROOT/'scripts/knowledge_atlas/external_completion_projection.cjs'
        base=json.loads(subprocess.check_output(['node',str(runner)],input=json.dumps(empty).encode()))['projection']
        inputs['previous']=base
        result=json.loads(subprocess.check_output(['node',str(runner)],input=json.dumps(inputs).encode()))
        self.assertTrue(result['changes']['semantic_change'])
        self.assertEqual(result['changes']['newly_registered_project_ids'],[UNMAPPED])
        self.assertTrue(all(not ids for ids in result['changes']['impacted_scopes'].values()))
        for key in ('topics','global','portfolio','coverage','verified_topic_ids','course_project_completion','effective_learned_topic_ids'):
            self.assertEqual(result['projection'][key],base[key])
        inputs['completion']['projects']=inputs['completion']['completion_register']['projects']
        refused=subprocess.run(['node',str(runner)],input=json.dumps(inputs).encode(),capture_output=True)
        self.assertNotEqual(refused.returncode,0)
        self.assertIn(b'Unmapped completion',refused.stderr)

    def test_missing_manifest_and_unsupported_root_fail_closed(self):
        (self.repo/'projects/42/solution').mkdir(parents=True)
        (self.repo/'projects/42/solution/program').write_text('code')
        self.reject('missing export manifest')

    def test_frozen_production_archives_113_380_229(self):
        evidence = os.environ.get('HYPERSKILL_EVIDENCE_ROOT')
        if not evidence:
            self.skipTest('Pinned archive baseline requires HYPERSKILL_EVIDENCE_ROOT')
        baseline=json.loads((ROOT/'docs/contracts/hyperskill-baseline-v1.json').read_text())
        ref=baseline['archive_commit']
        for name,digest in baseline['archive_sha256'].items():
            raw=subprocess.check_output(['git','-C',evidence,'show',ref+':'+name])
            self.assertEqual(sha(raw),digest,name)
            path=self.repo/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)
        actual=self.projection()['projection']
        semantic={k:v for k,v in actual.items() if k!='source'}
        self.assertEqual(sha(json.dumps(semantic,sort_keys=True,separators=(',',':')).encode()),baseline['semantic_projection_sha256'])
        self.assertEqual(actual['completed_project_ids'],[113,229,380])
        self.assertEqual(actual['global'],baseline['global_progress'])
        self.assertEqual(actual['verified_topic_ids'],baseline['verified_topic_ids'])
        self.assertNotIn('completion_register',actual)
        self.assertEqual(json.loads((ROOT/'docs/releases/myatlas-v6.6.json').read_text())['geometry'],baseline['geometry'])
        (self.repo/'java/Simple Chat Bot with Java/src/main/java/unlisted.java').write_text('unlisted code')
        self.reject('Legacy inventory')

    def test_source_only_python_still_accepts(self):
        d=self.repo/'python/Disposable Python';(d/'src').mkdir(parents=True)
        raw=b'not runnable Python';(d/'src/app.py').write_bytes(raw)
        (d/'README.md').write_text(f'https://hyperskill.org/projects/{UNKNOWN}')
        self.manifest(d,dict(schema=3,mode='source-only',language='python',directory_name=d.name,project_id=UNKNOWN,
            completion=dict(project_id=UNKNOWN,status='completed',attested_by='owner',observed_at=STAMP),files={'src/app.py':sha(raw)}))
        self.assertEqual(self.projection()['projection']['completed_project_ids'],[UNKNOWN])

    def test_parent_symlink_is_rejected_before_opening_code(self):
        d,_=self.archive()
        # Isolate the symlink violation from forbidden archive directories so
        # rejection does not depend on filesystem traversal order.
        with tempfile.TemporaryDirectory(prefix='myatlas-symlink-target-') as folder:
            target=Path(folder)/'original-solution'
            (d/'solution').rename(target)
            (d/'solution').symlink_to(target,target_is_directory=True)
            self.assertRegex(scan(self.repo,SCOPES)['rejected'][0]['reason'],'Symlink')
            self.reject('Non-regular committed export')

    def test_unexpected_archive_directory_is_rejected(self):
        d,_=self.archive()
        unexpected=d/'original-solution'
        unexpected.mkdir()
        (unexpected/'Main.java').write_bytes(b'unlisted solution')
        self.assertRegex(scan(self.repo,SCOPES)['rejected'][0]['reason'],
                         'Universal members must stay below solution/')
        self.reject('Universal members must stay below solution/')

    def test_case_aliases_empty_inventory_and_invalid_readme_inventory(self):
        d,original=self.archive()
        for files in ({}, {'README.md':'invalid'}, {'README.md':{'sha256':'0'*64,'role':'solution'}}):
            m=copy.deepcopy(original);m['files']=files;self.manifest(d,m);self.reject()
        # Directory aliases are rejected before source hashing, also on systems
        # where both names would otherwise refer to the same directory.
        m=copy.deepcopy(original)
        m['files']['solution/main.java']=m['files']['solution/Main.java']
        self.manifest(d,m);self.reject()

    def test_private_resource_metadata_and_readme_are_refused(self):
        d,m=self.archive(files={'solution/app':(b'code','solution'),'solution/data.bin':(b'password = "sensitive-value"','resource')})
        self.reject('Possible secret')
        raw=b'resource';(d/'solution/data.bin').write_bytes(raw);m['files']['solution/data.bin']['sha256']=sha(raw)
        m['title']='password = "sensitive-value"';self.manifest(d,m);self.reject('Possible secret')

    def test_register_rejects_topic_injection_and_duplicates(self):
        self.archive();self.commit();original=external_inputs(ROOT,self.repo)
        runner=ROOT/'scripts/knowledge_atlas/external_completion_projection.cjs'
        for mutation in ('topics','mapping','duplicate'):
            with self.subTest(mutation=mutation):
                inputs=copy.deepcopy(original);r=inputs['completion']['completion_register']
                if mutation=='topics':r['projects'][0]['topic_ids']=[15]
                elif mutation=='mapping':r['unmapped_project_ids']=[]
                else:r['projects'].append(copy.deepcopy(r['projects'][0]))
                result=subprocess.run(['node',str(runner)],input=json.dumps(inputs).encode(),capture_output=True)
                self.assertNotEqual(result.returncode,0)

    def test_schema1_baseline_deduplicates_registered_old_project(self):
        self.archive(113);self.archive(UNMAPPED)
        result=self.projection()
        self.assertNotIn(113,result['changes']['newly_registered_project_ids'])
        self.assertEqual(result['projection']['completion_register']['completed_project_count'],2)

    def test_unknown_archive_root_and_noncanonical_directory_are_rejected(self):
        d,m=self.archive()
        moved=self.repo/'rust/Example';moved.parent.mkdir();d.rename(moved)
        self.reject('Unsupported canonical archive root')
        moved.rename(self.repo/'projects'/('0'+str(UNMAPPED)))
        self.reject('canonical projects')

    def test_no_solution_role_is_not_a_code_archive(self):
        d,m=self.archive()
        m['files']['solution/Main.java']['role']='resource';self.manifest(d,m)
        self.reject('explicitly selected solution')

    def test_hash_valid_inventory_with_private_path_is_rejected(self):
        self.archive(files={'solution/credentials.txt':(b'own code','solution')})
        self.reject('Unsafe/private')


if __name__ == '__main__':
    unittest.main()
