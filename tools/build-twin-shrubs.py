"""Rebuild the reviewed NES JRPG shrubs with nearest-neighbour resizing only."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
image = Image.open(root / 'assets/source/twins/shrubs-nes-jrpg.png')
image.resize((256, 256), Image.Resampling.NEAREST).save(
    root / 'assets/twins/shrubs-nes-jrpg.png', optimize=True)
