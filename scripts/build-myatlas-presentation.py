#!/usr/bin/env python3
"""Package/check the reviewed Progress scope presentation after evidence binding."""
import argparse
import json
from pathlib import Path
from knowledge_atlas.presentation_release import apply_presentation, verify_presentation
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check', action='store_true')
parser.add_argument('--evidence-root', required=True, type=Path)
parser.add_argument('--evidence-ref', default='HEAD')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
print(json.dumps((verify_presentation if args.check else apply_presentation)(root, root/'build/pages/knowledge-map', args.evidence_root, args.evidence_ref), indent=2))
