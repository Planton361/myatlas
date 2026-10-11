"""Activation proof is mandatory; unhealthy activated data blocks, disabled mode preserves static sync."""
import hashlib
import json
import subprocess
import unittest
from unittest.mock import patch
from scripts.tests.test_project_sync import ProjectSyncTests, deployed, ROOT
from scripts.knowledge_atlas.index_sync import activation_proven, CONFIG, RELEASE, ENDPOINT, current_index
from scripts.knowledge_atlas.project_sync import decide, IndexSyncBlocked

class IndexTransitionTests(ProjectSyncTests):
    def test_real_disabled_configuration_never_skips_changed_static_evidence(self):
        data=deployed(self.app,'a'*40)
        self.assertTrue(decide(ROOT,self.repo,'schedule',data.__getitem__)['build'])

    def test_proved_activation_with_valid_current_index_skips_build(self):
        from scripts.tests.test_project_sync import ROOT
        for index_revision in (self.project,'d'*40):
            health=dict(index_revision=index_revision,index_sha256='b'*64,store_revision='c'*40)
            with patch('scripts.knowledge_atlas.project_sync.activation_proven',return_value=True),patch('scripts.knowledge_atlas.project_sync.current_index',return_value=health):
                result=decide(ROOT,self.repo,'schedule',self.bytes.__getitem__)
                self.assertFalse(result['build']);self.assertEqual(result['mode'],'dynamic');self.assertEqual(result['index_sha256'],'b'*64)

    def test_activated_network_invalid_interrupted_or_stale_index_blocks_without_empty_success(self):
        from scripts.tests.test_project_sync import ROOT
        for failure in (OSError('offline'),ValueError('wrong digest'),TimeoutError('interrupted'),ValueError('stale pointer')):
            with patch('scripts.knowledge_atlas.project_sync.activation_proven',return_value=True),patch('scripts.knowledge_atlas.project_sync.current_index',side_effect=failure):
                with self.assertRaises(IndexSyncBlocked) as caught:decide(ROOT,self.repo,'schedule',self.bytes.__getitem__)
                report=caught.exception.report
                self.assertFalse(report['build']);self.assertEqual(report['build_status'],'blocked')
                self.assertEqual(report['completed_project_ids'],[113]);self.assertIn('last-known-good',str(caught.exception))

    def test_unproved_activation_keeps_changed_static_sync(self):
        from scripts.tests.test_project_sync import ROOT
        data=deployed(self.app,'a'*40)
        for proof in (False,):
            with patch('scripts.knowledge_atlas.project_sync.activation_proven',return_value=proof),patch('scripts.knowledge_atlas.project_sync.current_index',side_effect=AssertionError('Must not fetch unactivated index')):
                self.assertTrue(decide(ROOT,self.repo,'schedule',data.__getitem__)['build'])

class ActivationProofTests(unittest.TestCase):
    def test_configuration_release_inventory_and_deployed_bytes_all_required(self):
        config=b'{"enabled":true,"schema":1}\n';release=b'{"production_enabled":true}\n'
        manifest={'dynamic_index_release':dict(manifest=RELEASE,sha256=hashlib.sha256(release).hexdigest(),production_enabled=True),
                  'inventory':{'hyperskill-index/config.json':hashlib.sha256(config).hexdigest()}}
        def committed(_,*args):return config if args[-1]=='HEAD:'+CONFIG else release
        with patch('scripts.knowledge_atlas.index_sync.git',side_effect=committed):
            self.assertTrue(activation_proven('.',manifest,lambda _:config))
            self.assertFalse(activation_proven('.',manifest,lambda _:b'{}'))
            self.assertFalse(activation_proven('.',{},lambda _:config))
        with patch('scripts.knowledge_atlas.index_sync.git',return_value=b'{"enabled":false}'):
            self.assertFalse(activation_proven('.',manifest,lambda _:self.fail('Disabled config must not fetch activation proof')))

    def test_pointer_source_is_checked_before_payload_fetch(self):
        pointer=b'{}\n'
        with patch('scripts.knowledge_atlas.index_sync.contract',return_value={'revision':'a'*40}):
            with self.assertRaisesRegex(ValueError,'has not reached'):
                current_index('.', '.', 'b'*40, lambda url: pointer if url==ENDPOINT else self.fail('Must not fetch mismatching payload'))

    def test_foreign_redirect_and_oversize_inputs_fail_closed(self):
        from scripts.knowledge_atlas.index_sync import anonymous_index_read
        for url in ('http://planton361.github.io/hyperskill-projects/portfolio/current.json','https://evil.invalid/index.json','https://raw.githubusercontent.com/Planton361/hyperskill-projects/main/index.json'):
            with self.assertRaisesRegex(ValueError,'Foreign'):anonymous_index_read(url)
        with self.assertRaisesRegex(ValueError,'too large'):current_index('.', '.', 'a'*40,lambda _:b'x'*4097)

    def test_real_pointer_payload_crypto_and_independent_validator_binding(self):
        # Synthetic fixture only: wire validation is real, Git CLI is recorded separately.
        from scripts.knowledge_atlas.index_sync import contract
        source='a'*40;store='b'*40;prefix='projects/900000001';oid='c'*40
        digest='d'*64
        files=[{'path':prefix+'/.hyperskill-import.json','git_blob':oid,'sha256':digest,'role':'metadata'},
               {'path':prefix+'/README.md','git_blob':oid,'sha256':digest,'role':'resource'},
               {'path':prefix+'/solution/program','git_blob':oid,'sha256':digest,'role':'solution',
                'code_url':'https://github.com/Planton361/hyperskill-projects/blob/'+source+'/'+prefix+'/solution/program'}]
        row=dict(project_id=900000001,project_url='https://hyperskill.org/projects/900000001',title='Synthetic fixture',archive_schema=4,archive_path=prefix,
                 manifest={k:files[0][k] for k in ('path','git_blob','sha256')},
                 completion=dict(project_id=900000001,status='completed',attested_by='owner',confirmed_at='2026-10-08T12:00:00Z'),files=files,evidence_id='hyperskill:900000001')
        def encode(v):return (json.dumps(v,sort_keys=True,ensure_ascii=False,separators=(',',':'))+'\n').encode()
        payload=encode(dict(schema=1,kind='hyperskill-project-index',repository='Planton361/hyperskill-projects',revision=source,
                            validator=dict(version='1.0',implementation_revision=oid),projects=[row]))
        pointer=dict(schema=1,repository='Planton361/hyperskill-projects',revision=source,index_url='https://raw.githubusercontent.com/Planton361/hyperskill-projects/'+store+'/portfolio/revisions/'+source+'/index.json',index_sha256=hashlib.sha256(payload).hexdigest())
        raw=encode(pointer)
        def read(url):return raw if url==ENDPOINT else payload
        real_run=subprocess.run
        def run(command, **kwargs):
            if any(str(arg).endswith('/validate-project-index.py') for arg in command): return subprocess.CompletedProcess(command,0)
            return real_run(command,**kwargs)
        with patch('scripts.knowledge_atlas.index_sync.subprocess.run',side_effect=run) as independent:
            checked=current_index(ROOT,ROOT,source,read)
            self.assertEqual(checked['store_revision'],store)
            command=next(call.args[0] for call in independent.call_args_list if any(str(arg).endswith('/validate-project-index.py') for arg in call.args[0]))
            self.assertEqual(command[-2:],['--revision',source]);self.assertIn('--repository',command)
        for mutated in (raw+b' ',encode(dict(pointer,index_sha256='e'*64)),encode(dict(pointer,index_url=pointer['index_url'].replace(store,'main')))):
            with self.assertRaises((ValueError,subprocess.SubprocessError)):
                current_index(ROOT,ROOT,source,lambda url:mutated if url==ENDPOINT else payload)
