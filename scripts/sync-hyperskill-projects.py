#!/usr/bin/env python3
"""Read-only progress projection from committed public Hyperskill project exports."""
import argparse
import json
from pathlib import Path
from knowledge_atlas.external_completion import project_external

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--evidence-root', type=Path, required=True)
parser.add_argument('--evidence-ref', default='HEAD')
args = parser.parse_args()
print(json.dumps(project_external(ROOT, args.evidence_root, args.evidence_ref), sort_keys=True, indent=2))
