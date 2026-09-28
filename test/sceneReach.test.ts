// Can a player actually see each ground painting?
//
// **A painting can be wired and still never be seen, and nothing else here notices.** The cliff
// scene shipped as `stoop-mountains.png`, every check passed, and it could appear on 5 tiles across
// the four maps -- because mountain ground almost always offers stone, and stone is `work`, not
// `stoop`. It looked broken to the person who painted it, and by any measure that matters it was.
//
// So this walks every tile of every field map, asks what a take there would show, and counts. A
// ground painting (`<gesture>-<biome>` or `<gesture>-<group>`) that no tile reaches fails by name.
// Shelter and process variants are reached by resting and by the bench, not by ground, so they are
// not measured here.
//
// The same shape as `check_playability.py` in canon: not "is this wired" but "can a walker get to
// it". The counts are printed, because a painting reaching 3 tiles passes and is still worth
// knowing about.

import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import biomes from '../data/biomes.json';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap } from '../src/content/places';
import { yieldsAt } from '../src/content/gathering';
import { gestureFor } from '../src/content/gestures';
import { isAnimal, isWaterSpecies } from '../src/content/species';
import { GROUND_GROUP, sceneFor } from '../src/ui/scenes';

const MAPS = ['field_map_lothal', 'field_map_narmada', 'field_map_dwarka', 'field_map_aravali'];
const BIOMES = new Set((biomes as { id: string }[]).map((b) => b.id));
const GROUPS = new Set(Object.values(GROUND_GROUP));

/** Ground paintings on disk, by bare name: `stoop-high`, `stoop-plains`. Takes collapse. */
const ground = [
  ...new Set(
    readdirSync(join(__dirname, '..', 'src', 'ui', 'scenes'))
      .filter((f) => /\.png$/i.test(f))
      .map((f) => f.replace(/\.[^.]+$/, '').replace(/\.\d+$/, ''))
      .filter((name) => {
        // `rest` is never a take: `rest-settlement` is a kind of night that shares a word with a
        // biome, and is reached by resting in a town, not by standing on the ground.
        const [gesture, ...rest] = name.split('-');
        const variant = rest.join('-');
        return gesture !== 'rest' && (BIOMES.has(variant) || GROUPS.has(variant));
      })
  )
].sort();

/** How many tiles would show each scene, keyed by bare name. */
function reach(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of MAPS) {
    const { world } = buildFieldMap(fieldMap(id)!);
    world.tiles.forEach((row, y) =>
      row.forEach((tile, x) => {
        const offered = yieldsAt(world.seed, { x, y }, tile.biome);
        if (offered.length === 0) return;
        const gesture = gestureFor(offered[0]!, isAnimal, isWaterSpecies);
        const url = sceneFor(gesture, tile.biome);
        if (!url) return;
        // Under Vitest the URL is the source path, unhashed: `/src/ui/scenes/stoop-high.png`.
        const name = url.split('/').pop()!.replace(/\.[^.]+$/, '').replace(/\.\d+$/, '');
        counts.set(name, (counts.get(name) ?? 0) + 1);
      })
    );
  }
  return counts;
}

describe('every ground painting can be seen somewhere', () => {
  const counts = reach();

  it('has ground paintings to measure, so the check below means something', () => {
    expect(ground.length).toBeGreaterThan(0);
  });

  it.each(ground)('%s is shown on at least one tile', (name) => {
    const tiles = counts.get(name) ?? 0;
    console.log(`  ${name.padEnd(24)} ${tiles} tiles`);
    expect(
      tiles,
      `${name}.png is wired and no tile on any of the four maps shows it. Either the ground never ` +
        `offers that gesture, or a more specific painting always wins. Widen it to a group in ` +
        `GROUND_GROUP, or ask canon for something to take there.`
    ).toBeGreaterThan(0);
  });
});
