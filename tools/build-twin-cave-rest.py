"""Copy the approved compact full-colour rest paintings, with no colour reduction."""
from pathlib import Path
from shutil import copyfile

root = Path(__file__).resolve().parents[1]
for moment in ('midnight', 'dawn'):
    name = f'rest-windward-cave-{moment}.png'
    copyfile(root / 'assets/source/twins/rest-cave' / name, root / 'src/ui/scenes' / name)
