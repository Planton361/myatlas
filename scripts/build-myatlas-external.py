#!/usr/bin/env python3
"""Apply/check real public project evidence after the frozen build/navigation gates."""
import argparse
import json
from pathlib import Path
from knowledge_atlas.external_release import apply_external, verify_external

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check', action='store_true')
parser.add_argument('--evidence-root', type=Path, required=True)
parser.add_argument('--evidence-ref', default='HEAD')
args = parser.parse_args()
action = verify_external if args.check else apply_external
print(json.dumps(action(ROOT, ROOT / 'build/pages/knowledge-map', args.evidence_root, args.evidence_ref), sort_keys=True, indent=2))
