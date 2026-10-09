"""Fail closed on any change to the reviewed four-file publication boundary."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('leetcode_summary_build', ROOT / 'scripts/build-leetcode-progress.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class SummaryBoundary(unittest.TestCase):
    def test_exact_reviewed_inventory_and_no_catalog_or_credentials(self):
        assets = builder.reviewed_assets()
        self.assertEqual(set(assets), {'index.html', 'loader.js', 'summary.js', 'summary.css'})
        # Approved byte hashes establish provenance; these checks also name the boundary.
        for raw in assets.values():
            text = raw.decode()
            for forbidden in ['localhost', '127.0.0.1', 'catalog.json', 'taxonomy.json',
                              'chrome.', 'Authorization', 'github_pat_', 'ghp_', 'solutionCode']:
                self.assertNotIn(forbidden, text)
        self.assertIn("credentials:'omit'", assets['loader.js'].decode())
        self.assertIn("method:'GET'", assets['loader.js'].decode())
        self.assertNotIn('3511', assets['index.html'].decode())
        self.assertIn('href="summary.css"', assets['index.html'].decode())
        self.assertIn('src="loader.js"', assets['index.html'].decode())

    def test_changed_asset_and_extra_file_are_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder)
            for name in builder.ASSETS:
                (source / name).write_bytes((builder.SOURCE / name).read_bytes())
            (source / 'catalog.json').write_text('{}')
            with self.assertRaisesRegex(ValueError, 'inventory'):
                builder.reviewed_assets(source)
            (source / 'catalog.json').unlink()
            (source / 'loader.js').write_text('changed')
            with self.assertRaisesRegex(ValueError, 'Changed reviewed'):
                builder.reviewed_assets(source)

    def test_readme_discovery_and_frozen_shell_separation(self):
        self.assertIn('https://planton361.github.io/myatlas/leetcode-progress/', (ROOT / 'README.md').read_text())
        self.assertEqual(builder.OUTPUT, ROOT / 'build/pages/leetcode-progress')
        self.assertNotIn(ROOT / 'src/myatlas', builder.SOURCE.parents)


if __name__ == '__main__':
    unittest.main()
