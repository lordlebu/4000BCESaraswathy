"""Rebuild the reviewed compact NES JRPG terrain sources; resize only, preserve RGBA."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
for name in ('highland-ground', 'highland-forms'):
    source = ROOT / 'assets/source/twins' / f'{name}-nes-jrpg.png'
    image = Image.open(source)
    image.resize((image.width * 4, image.height * 4), Image.Resampling.NEAREST).save(
        ROOT / 'assets/twins' / source.name, optimize=True)
