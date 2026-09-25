// Re-dyeing a sheet's pixels, free of Phaser.
//
// Split from the scene for the reason `dayNight.ts`, `fatigue.ts` and `frames.ts` are: importing
// Phaser reaches for a real canvas on load and runs under neither Node nor jsdom, and the part
// worth testing is the arithmetic -- that exactly the listed colours change and nothing else does.
// `player.ts` owns the canvas and calls this on its pixels.

/**
 * Replace every pixel whose colour is a key of `table` with its value, in place.
 *
 * **Exact matches only, and that is the safety of it.** The built sheets are quantised to a fixed
 * palette by `build-sprite-sheet.js`, so a garment is a short list of exact colours and an outline
 * is a different exact colour. A tolerance would reach across into the skin or the outline the
 * first time two of them sat close; an exact table cannot. Transparent pixels are skipped, so a
 * keyed-out background never gets dyed.
 *
 * Returns how many pixels changed, which is what the test asserts and what a `0` would give away:
 * a table that matches nothing means the sheet was rebuilt and `assets/looks.json` is stale.
 */
export function recolourPixels(data: Uint8ClampedArray | Uint8Array, table: ReadonlyMap<string, string>): number {
  if (table.size === 0) return 0;
  const lookup = new Map<number, [number, number, number]>();
  for (const [from, to] of table) {
    const f = Number.parseInt(from.slice(1), 16);
    const t = Number.parseInt(to.slice(1), 16);
    lookup.set(f, [(t >> 16) & 255, (t >> 8) & 255, t & 255]);
  }
  let changed = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const key = (data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!;
    const to = lookup.get(key);
    if (!to) continue;
    data[i] = to[0];
    data[i + 1] = to[1];
    data[i + 2] = to[2];
    changed += 1;
  }
  return changed;
}
