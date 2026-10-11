"""Only synthetic archive bytes, committed in disposable Git repositories.

Use Phase 3's real producer/independent validator to prove wire compatibility.
No executing, compiling or installing imported solutions.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

evidence=Path(os.environ['HYPERSKILL_EVIDENCE_ROOT']).resolve()
sys.path.insert(0,str(evidence/'scripts'))
from tests.test_project_index import ProjectIndexTests
import project_index as index

fixture=ProjectIndexTests()
fixture.setUp()
try:
    pairs=[]
    def pair():
        revision=fixture.git('rev-parse','HEAD').decode().strip()
        raw=index.generate(fixture.root,revision)
        index.validate_index(fixture.root,raw,revision)
        # A separate immutable Git commit represents the store, never source.
        store_revision=subprocess.check_output(['git','-C',str(fixture.root),'commit-tree',fixture.git('rev-parse','HEAD^{tree}').decode().strip()],input=b'Synthetic store\n').decode().strip()
        pairs.append(dict(pointerText=index.pointer(revision,store_revision,raw).decode(),payloadText=raw.decode()))
    pair()
    # Pass trusted catalog choices from the caller. Input affects fixture IDs,
    # never the reader's identity resolution or actual personal records.
    for pid in map(int,sys.argv[1:]):
        path,manifest=fixture.universal(pid)
        manifest['title']='<img src=x onerror=alert(1)> Synthetic & "title"'
        manifest['languages']=['java','python','kotlin']
        (path/'.hyperskill-import.json').write_bytes(index.encode(manifest))
        fixture.commit();pair()
    print(json.dumps(pairs))
finally:
    fixture.doCleanups()
