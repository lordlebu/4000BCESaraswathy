// Can a player finish a map with what that map gives them?
//
// **Why this exists.** The owner played Lothal and could neither raise the settlement nor make half
// of what it offers, with every gate on both sides green. Canon's `check_playability.py` asks
// whether a material is obtainable *somewhere*; nothing asked whether a player standing on one map
// can actually get there from that map's own ground and that map's own teachers. The causes were
// three -- 27 plants never placed, sinew as the only lashing, no salt on Lothal -- and none of them
// was visible to a test that only asks "is it in the data".
//
// **What it measures.** For every field map, across twelve seeds, which materials the ground
// *reliably* offers: on at least `RELIABLE_SEEDS` of them, on at least `MIN_TILES` tiles each. A
// material that turns up on two tiles of one seed in three is not something a player can be asked
// to find -- see the memory of the Vasuki skin, which was obtainable and on zero tiles. Then, from
// plenty of exactly those, it makes everything it can with the recipes known from the start or
// taught by somebody on that map, at any kind of place that map has, until nothing new opens.
//
// **What it holds.** Every recipe a map's own people teach, and every stage of the map's
// homestead, must come out of that closure. Where one does not yet, it is listed in `KNOWN_GAPS`
// below with the reason, and the list is a ratchet: a new gap fails, and a gap that closes fails
// too until it is struck off -- so the list only ever gets shorter, and Phase 1 of the Roads and
// Hands plan is the work of emptying it.

import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap, fieldMaps, npcsAt, poi } from '../src/content/places';
import { yieldsAt } from '../src/content/gathering';
import { canMake } from '../src/content/crafting';
import { recipes } from '../src/content/making';
import { add, count, emptySatchel, type Satchel } from '../src/content/satchel';
import { homesteadOn } from '../src/content/homestead';

const SEEDS = Array.from({ length: 12 }, (_, i) => `critical-path-${i}`);
/** A material counts as findable if it is on this many of the twelve seeds... */
const RELIABLE_SEEDS = 10;
/** ...on at least this many tiles each time. Two reed beds on a whole map is not "findable". */
const MIN_TILES = 3;
/** "Plenty", for the closure. Counts are not what this test is about; reaching is. */
const PLENTY = 99;

/**
 * What is still out of reach, map by map, and why. **Strike a line when it closes**: the test fails
 * on a stale entry exactly as it fails on a new one.
 */
const KNOWN_GAPS: Record<string, string[]> = {
  // Empty since canon 2.41.0 (Roads and Hands, Phase 1), which closed every gap measured on 1 October
  // 2026: fibre cord as the first lashing and reed rope twisted by hand; sea salt on the coast; deer
  // hide for Uma's bedroll; fish bone from the river fish; Bekh's salt box in any timber; the palmyra
  // palm and fossil ammonite on Dwarka, whose sails now take husk and sandstone; Okhi teaching the
  // bone awl and the storage jar on the Narmada. A new entry here is a regression.
};

/** Which materials this map's ground offers on enough seeds to ask a player to find them. */
function reliableMaterials(mapId: string): Set<string> {
  const map = fieldMap(mapId)!;
  const seedsWith = new Map<string, number>();
  for (const seed of SEEDS) {
    const { world } = buildFieldMap(map, { seed });
    const tiles = new Map<string, number>();
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const tile = world.tiles[y]![x]!;
        for (const m of yieldsAt(world.seed, { x, y }, tile.biome)) tiles.set(m.id, (tiles.get(m.id) ?? 0) + 1);
      }
    }
    for (const [id, n] of tiles) if (n >= MIN_TILES) seedsWith.set(id, (seedsWith.get(id) ?? 0) + 1);
  }
  return new Set([...seedsWith].filter(([, n]) => n >= RELIABLE_SEEDS).map(([id]) => id));
}

/** Everything this map's own people teach, and what is known from the start. */
function knownOn(mapId: string): { known: (id: string) => boolean; taughtHere: string[] } {
  const people = new Set(fieldMap(mapId)!.pointsOfInterest.flatMap((p) => npcsAt(p).map((n) => n.id)));
  const taughtHere = recipes.filter((r) => r.taughtBy.some((t) => people.has(t))).map((r) => r.id);
  const here = new Set(taughtHere);
  return { known: (id) => recipes.some((r) => r.id === id && (r.taughtBy.length === 0 || here.has(id))), taughtHere };
}

/** Make everything makeable from plenty of `raw`, at any kind of place this map has. */
function closure(mapId: string, raw: Set<string>, known: (id: string) => boolean): Satchel {
  const kinds = [null, ...new Set(fieldMap(mapId)!.pointsOfInterest.map((p) => poi(p)?.kind ?? null))];
  let satchel = emptySatchel();
  for (const id of raw) satchel = add(satchel, id, PLENTY);
  for (let grew = true; grew; ) {
    grew = false;
    for (const r of recipes) {
      if (!known(r.id)) continue;
      const outputs = r.outputs.map((o) => o.item ?? o.material ?? '').filter(Boolean);
      if (outputs.every((id) => count(satchel, id) > 0)) continue;
      if (!kinds.some((kind) => canMake(satchel, r.id, { kind }))) continue;
      for (const id of outputs) satchel = add(satchel, id, PLENTY);
      grew = true;
    }
  }
  return satchel;
}

/** Each gap as `recipe_x` or `stage:<id>:<need>`, sorted, so a diff reads as a list. */
function gapsOn(mapId: string): string[] {
  const raw = reliableMaterials(mapId);
  const { known, taughtHere } = knownOn(mapId);
  const made = closure(mapId, raw, known);
  const gaps: string[] = [];
  for (const id of taughtHere) {
    const r = recipes.find((x) => x.id === id)!;
    const outputs = r.outputs.map((o) => o.item ?? o.material ?? '').filter(Boolean);
    if (!outputs.every((o) => count(made, o) > 0)) gaps.push(id);
  }
  for (const stage of homesteadOn(mapId)?.stages ?? []) {
    for (const need of stage.needs) if (count(made, need.id) === 0) gaps.push(`stage:${stage.id}:${need.id}`);
  }
  return gaps.sort();
}

describe('every map can be finished from its own ground', () => {
  for (const map of fieldMaps) {
    // **Its own timeout, because it builds twelve whole maps.** Measured on 2 October 2026: 4 to 9
    // seconds a map alone, and 21 for the Narmada with the rest of the suite running beside it --
    // past the 20-second default, so it failed for load while every gap was closed.
    it(`${map.id}: what its people teach and what its homestead needs`, { timeout: 120_000 }, () => {
      expect(gapsOn(map.id)).toEqual(KNOWN_GAPS[map.id] ?? []);
    });
  }
});
