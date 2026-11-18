"""Rebuild approved rail-bridge art by nearest-neighbour resizing, retaining full RGBA."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1]
source = Image.open(root / 'assets/source/twins/rail-bridge-jrpg.png')
assert source.size == (96, 40) and source.mode == 'RGBA'
source.resize((384, 160), Image.Resampling.NEAREST).save(root / 'assets/twins/rail-bridge-jrpg.png', optimize=True)
