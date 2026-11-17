"""Expand the reviewed NES JRPG dry-country props at the residents' 2x logical-pixel scale."""
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
source=Image.open(ROOT/'assets/source/twins/dry-props-nes-jrpg.png').convert('RGBA')
if source.size!=(64,64):
    raise ValueError('Expected four 32x32 dry-country props in a 2x2 grid')
source.resize((128,128),Image.Resampling.NEAREST).save(
    ROOT/'assets/twins/dry-props-nes-jrpg.png',optimize=True)
