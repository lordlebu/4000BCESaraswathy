"""Expand the reviewed 3x2, 32px NES JRPG prop source without changing RGBA samples."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
source = Image.open(ROOT / 'assets/source/twins/cave-props-nes-jrpg.png').convert('RGBA')
if source.size != (96, 64):
    raise ValueError('Cave props must be six 32x32 cells in a 3x2 grid')
source.resize((384, 256), Image.Resampling.NEAREST).save(
    ROOT / 'assets/twins/cave-props-nes-jrpg.png', optimize=True)
