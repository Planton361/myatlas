#!/usr/bin/env python3
"""Package only the four reviewed metadata-free assets as a sibling Pages route."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src/leetcode-progress'
OUTPUT = ROOT / 'build/pages/leetcode-progress'
# Reviewed summary assets; only public source links relocated for the repository split.
ASSETS = {
    'summary.html': ('index.html', '5f8c340cf3d402e299b428a0282921c08743f30af79f5c098976ee1270b299f0'),
    'summary.css': ('summary.css', '045a6d52145fe5d26770a5511a31d5b9fbc6ee6422dc702546883b1f6b815db5'),
    'summary.js': ('summary.js', '0e382168c0f320020eaf1d006327d546bdf8088c7ac14e687286f98870896031'),
    'loader.js': ('loader.js', 'b6fa03e666ba875d01b107e198387f333d5ab996df5ec0b6ab25c6772917e0cd'),
}


def reviewed_assets(source=SOURCE):
    if source.is_symlink() or {p.name for p in source.iterdir()} != set(ASSETS):
        raise ValueError('Unexpected summary source inventory')
    result = {}
    for name, (target, expected) in ASSETS.items():
        path = source / name
        if path.is_symlink() or not path.is_file():
            raise ValueError('Unsafe summary asset: ' + name)
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != expected:
            raise ValueError('Changed reviewed summary asset: ' + name)
        result[target] = raw
    return result


def build():
    # Mirror the production build's committed-source boundary without changing it.
    for name in ['scripts/build-leetcode-progress.py', *('src/leetcode-progress/' + p for p in ASSETS)]:
        committed = subprocess.check_output(['git', '-C', str(ROOT), 'show', 'HEAD:' + name])
        if committed != (ROOT / name).read_bytes():
            raise ValueError('Uncommitted summary implementation refused: ' + name)
    assets = reviewed_assets()
    if any(p.is_symlink() for p in [OUTPUT, *OUTPUT.parents]):
        raise ValueError('Unsafe summary build destination')
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir(parents=True)
    for name, raw in assets.items():
        (OUTPUT / name).write_bytes(raw)
    return {'route': 'leetcode-progress/', 'catalogIncluded': False,
            'assets': {name: hashlib.sha256(raw).hexdigest() for name, raw in assets.items()}}


if __name__ == '__main__':
    print(json.dumps(build(), sort_keys=True, indent=2))
