"""Import ImageGen contact sheets for the western caravan using crop and point resize."""
import argparse
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "assets/twins/caravan"
PEOPLE = ROOT / "assets/source/twins/people"
ROLES = ("master", "handler", "seal-keeper", "textile-merchant", "artisan", "apprentice")


def cells(path, columns, rows):
    sheet = Image.open(path).convert("RGBA")
    return [
        sheet.crop((round(x * sheet.width / columns), round(y * sheet.height / rows),
                    round((x + 1) * sheet.width / columns), round((y + 1) * sheet.height / rows)))
        for y in range(rows) for x in range(columns)
    ]


def sprite(cell):
    # Ignore faint background specks when framing the image. Preserve the cropped RGBA.
    bounds = cell.getchannel("A").point(lambda alpha: 255 if alpha >= 200 else 0).getbbox()
    if bounds is None:
        raise ValueError("An asset cell is empty")
    return cell.crop(bounds)


def centred(cell, width, height, scale, lift=0):
    art = cell.resize((max(1, round(cell.width * scale)), max(1, round(cell.height * scale))),
                      Image.Resampling.NEAREST)
    frame = Image.new("RGBA", (width, height))
    frame.paste(art, ((width - art.width) // 2, height - 1 - art.height - lift))
    return frame


def directions(path):
    pictures = cells(path, 4, 3)
    for row, name in enumerate(("croc", "covered", "open")):
        # The approved contact sheet presents the west side before the east side.
        views = [sprite(pictures[row * 4 + i]) for i in (0, 1, 3, 2)]
        size = (112, 88)
        scale = min((size[0]-4) / max(i.width for i in views), (size[1]-4) / max(i.height for i in views))
        atlas = Image.new("RGBA", (size[0] * 4, size[1]))
        for facing, image in enumerate(views):
            atlas.paste(centred(image, *size, scale), (facing * size[0], 0))
        atlas.save(ART / f"{name}.png", optimize=True)


def people(path):
    pictures = cells(path, 4, 6)
    for row, role in enumerate(ROLES):
        views = [sprite(pictures[row * 4 + i]) for i in range(4)]
        scale = min(24 / max(i.width for i in views), 36 / max(i.height for i in views))
        atlas = Image.new("RGBA", (104, 200))
        for facing, image in enumerate(views):
            # Small baseline shifts animate the standing poses during brief campsite walks.
            for pose, lift in enumerate((0, 0, 1, 0)):
                atlas.paste(centred(image, 26, 40, scale, lift), (pose * 26, facing * 40))
            atlas.paste(centred(image, 26, 40, scale * .85), (facing * 26, 160))
        atlas.save(PEOPLE / f"elamite-{role}-nes-jrpg.png", optimize=True)


def portraits(path):
    folder = ART / "portraits"
    folder.mkdir(parents=True, exist_ok=True)
    for role, image in zip(ROLES, cells(path, 3, 2), strict=True):
        image.convert("RGB").resize((256, 256), Image.Resampling.NEAREST).save(
            folder / f"elamite-{role}.webp", lossless=True)


def props(path):
    for name, cell in zip(("canopy", "trough", "storage", "bedding"), cells(path, 2, 2), strict=True):
        art = sprite(cell)
        art.thumbnail((145, 145) if name == "canopy" else (80, 80), Image.Resampling.NEAREST)
        art.save(ART / f"{name}.png", optimize=True)


def croc_walk(path):
    poses = [sprite(cell) for cell in cells(path, 4, 4)]
    size = (112, 88)
    scale = min((size[0]-4) / max(p.width for p in poses), (size[1]-4) / max(p.height for p in poses))
    atlas = Image.new("RGBA", (size[0] * 4, size[1] * 4))
    for i, pose in enumerate(poses):
        atlas.paste(centred(pose, *size, scale), ((i % 4) * size[0], (i // 4) * size[1]))
    atlas.save(ART / "croc-walk.png", optimize=True)


def pose_strip(path, name, count, size):
    poses = [sprite(cell) for cell in cells(path, count, 1)]
    scale = min((size[0]-2) / max(p.width for p in poses), (size[1]-2) / max(p.height for p in poses))
    atlas = Image.new("RGBA", (size[0] * count, size[1]))
    for index, pose in enumerate(poses):
        atlas.paste(centred(pose, *size, scale), (index * size[0], 0))
    atlas.save(ART / f"{name}.png", optimize=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sheet_type", choices=("directions", "people", "portraits", "props", "croc-pose", "croc-walk", "enkidu-gestures"))
    parser.add_argument("input_image")
    args = parser.parse_args()
    ART.mkdir(parents=True, exist_ok=True)
    PEOPLE.mkdir(parents=True, exist_ok=True)
    if args.sheet_type == "croc-pose":
        pose_strip(args.input_image, args.sheet_type, 3, (112, 88))
    elif args.sheet_type == "croc-walk":
        croc_walk(args.input_image)
    elif args.sheet_type == "enkidu-gestures":
        pose_strip(args.input_image, args.sheet_type, 4, (40, 40))
    else:
        {"directions": directions, "people": people, "portraits": portraits, "props": props}[args.sheet_type](args.input_image)
