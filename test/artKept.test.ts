// Art is never discarded, and this is what makes that true rather than intended.
//
// **The rule.** Once a piece of art is accepted it stays, for good. A better painting of the same
// thing does not replace the old one — it is **added as a second take** (`rest.png`, then
// `rest.2.png`) and the game shows one of them. Somebody made that picture; it goes on being seen.
//
// A rule like that is worth nothing written in a document. Deleting a file is one keystroke, the
// game keeps working because every lookup has a fallback, and no type, lint or test would notice —
// which is the same shape as every other silent art fault this repository has paid for. So the rule
// is a list and a check: `src/ui/art-kept.json` records everything ever accepted, and this fails by
// name the moment one of them is gone.
//
// **Adding art means adding a line here.** That is the whole cost, and it is deliberate — an
// automatic list would regenerate itself around a deletion and enforce nothing at all.

import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import kept from '../src/ui/art-kept.json';

const UI = join(__dirname, '..', 'src', 'ui');
const FOLDERS = ['plates', 'marks', 'scenes', 'portraits', 'places', 'things', 'events'];
const IMAGE = /\.(png|jpe?g|webp|svg)$/i;

/** Everything actually on disk, as `folder/file.png`, which is how the manifest names things. */
function onDisk(): string[] {
  const out: string[] = [];
  for (const folder of FOLDERS) {
    const dir = join(UI, folder);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (IMAGE.test(file)) out.push(`${folder}/${file}`);
    }
  }
  return out.sort();
}

describe('nothing that was accepted is ever thrown away', () => {
  it('has a manifest with art in it, so the check below means something', () => {
    // Guards the guard: an empty list makes every assertion vacuous and the failure would read as
    // "all clear" rather than as a manifest that stopped being maintained.
    expect(kept.kept.length).toBeGreaterThan(20);
  });

  /**
   * **The one that matters.** Every file the manifest remembers must still be there.
   *
   * If this fails, art somebody made has been deleted. The fix is to restore the file, never to
   * remove the line — that is what the rule means, and it is why the list is written by hand.
   */
  it.each(kept.kept)('%s is still here', (relative) => {
    expect(
      existsSync(join(UI, relative)),
      `${relative} is in art-kept.json and gone from src/ui/. Art is never discarded: restore the ` +
        `file rather than removing the line. A better painting of the same thing is added as a ` +
        `second take — rest.png, then rest.2.png — and never replaces what is there.`
    ).toBe(true);
  });

  /**
   * And the other direction: art on disk that nobody recorded.
   *
   * Not a fault in the art — it is a fault in the record, and it matters because an unrecorded file
   * is one this guard cannot protect. Deleting it later would go unnoticed, which is the exact
   * thing the manifest exists to prevent.
   */
  it.each(onDisk())('%s is recorded in the manifest', (relative) => {
    expect(
      kept.kept.includes(relative),
      `${relative} is in src/ui/ and not in art-kept.json, so nothing would notice if it were ` +
        `deleted. Add the line.`
    ).toBe(true);
  });

  /**
   * **A second take only means something on an activity plate.**
   *
   * `scenes/` and `events/` are the painting in the middle of the screen when you do something, and
   * showing one of two nights is texture. A species plate is not: it is the record of *that*
   * animal, and swapping between two drawings of a desert fox mid-journey would read as two
   * different foxes. Portraits are a face; a place view is a place; a mark is a glyph.
   *
   * So a `.2` anywhere else is a file that parses as a take and is then never chosen — it will
   * simply never draw. That is the silent kind of fault this repository keeps paying for, so it
   * fails here instead.
   */
  it.each(kept.kept)('%s only carries a take number where takes are used', (relative) => {
    const [folder, file] = relative.split('/');
    if (!/\.\d+\.[^.]+$/.test(file ?? '')) return;
    expect(
      ['scenes', 'events'].includes(folder ?? ''),
      `${relative} is a second take, and only the activity plate picks between takes — ` +
        `scenes/ and events/. In ${folder}/ it will never be chosen and will never draw.`
    ).toBe(true);
  });

  /** Nothing is listed twice — a duplicate line would hide a real deletion behind a passing check. */
  it('records each file exactly once', () => {
    expect(new Set(kept.kept).size).toBe(kept.kept.length);
  });

  /**
   * A kept file must still be a real image rather than an emptied placeholder.
   *
   * Truncating a file to nothing passes an existence check and fails a player, which is a more
   * interesting way to lose a painting than deleting it.
   */
  it.each(kept.kept)('%s is not an empty file', (relative) => {
    const path = join(UI, relative);
    if (!existsSync(path)) return; // the case above already reports this, and better
    expect(statSync(path).size, `${relative} is empty`).toBeGreaterThan(200);
  });
});
