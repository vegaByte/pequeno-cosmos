set -eu
cd "$(dirname "$0")"
node --check docs/game.js
node --check docs/sw.js
python3 - <<'CHECK'
import json
from pathlib import Path
root = Path('docs')
manifest = json.loads((root / 'manifest.webmanifest').read_text())
for icon in manifest['icons']:
    path = root / icon['src']
    assert path.read_bytes().startswith(b'\x89PNG\r\n\x1a\n'), path
for file in ['index.html', 'style.css', 'game.js', 'sw.js', 'icon-180.png', '.nojekyll']:
    assert (root / file).is_file(), file
print('OK: JavaScript syntax, manifest, icons and static app files')
CHECK
