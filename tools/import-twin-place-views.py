"""Intake generated place panoramas: crop/resize only, full RGB/alpha, no palette reduction.

python tools/import-twin-place-views.py dump/twin-city-art-review/place-views/imports.json
Raw generations remain in the existing ignored events source directory; only final art is tracked.
"""
import argparse
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'tools/twin-place-views.json'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('imports', type=Path, nargs='?')
    args = parser.parse_args()
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8')) if MANIFEST.exists() else {
        'generator': 'built-in imagegen', 'size': [512, 224],
        'delivery': 'crop / Lanczos resize only; PNG; no palette or colour reduction', 'paintings': []}
    records = {item['id']: item for item in manifest['paintings']}
    manifest['size'] = [512, 224]
    manifest['delivery'] = 'crop / Lanczos resize only; PNG; no palette or colour reduction'
    imports = json.loads(args.imports.read_text(encoding='utf-8')) if args.imports else [
        {**item, 'original': str(ROOT / item['source'])} for item in manifest['paintings']]
    for item in imports:
        name = item['id']
        if not name.startswith('poi_') or not name.replace('_', '').isalnum():
            raise ValueError(f'Invalid place id: {name}')
        raw = ROOT / 'assets/source/events/twin-place-views' / f'{name}.png'
        raw.parent.mkdir(parents=True, exist_ok=True)
        original = Path(item['original'])
        if original.resolve() != raw.resolve():
            shutil.copy2(original, raw)
        image = Image.open(raw)
        native_size = list(image.size)
        crop = item.get('crop')
        if crop:
            image = image.crop(tuple(crop))
        mode = 'RGBA' if 'A' in image.getbands() and image.getchannel('A').getextrema() != (255, 255) else 'RGB'
        final = ROOT / 'src/ui/places' / f'{name}-painted.png'
        ImageOps.fit(image.convert(mode), (512, 224), method=Image.Resampling.LANCZOS).save(final, optimize=True)
        records[name] = {**records.get(name, {}), 'id': name, 'source': raw.relative_to(ROOT).as_posix(),
            'original_file': item.get('original_file', original.name), 'native_size': native_size, 'crop': crop, 'source_sha256': digest(raw),
            'file': final.relative_to(ROOT).as_posix(), 'sha256': digest(final), 'bytes': final.stat().st_size,
            'prompt': item['prompt']}
        print(f'{name}: {image.size} -> 512x224 {mode}, {final.stat().st_size:,} bytes')
    manifest['paintings'] = [records[key] for key in sorted(records)]
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    main()
