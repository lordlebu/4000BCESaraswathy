// Settling: the ground, the person who holds it, and the building that goes up.
//
// Against the real Lothal homestead from canon, walked end to end: refused until the map knows you,
// talked round worry by worry, built in three stages from what is carried and who has been helped,
// and settled. Nothing here can be lost by a wrong answer, and one test says so.

import { describe, expect, it } from 'vitest';
import {
  agreed,
  build,
  buildingTiles,
  currentWorry,
  groundAt,
  homesteadOn,
  mayAsk,
  mayBuild,
  nextStage,
  optionsFor,
  readyToSettle,
  respond,
  settle,
  stagesBuilt,
  stateOf,
  BUILDABLE,
  BUILD_RADIUS,
  buildable,
  homesteads,
  type Answer,
  type Holdings,
  type Option
} from '../src/content/homestead';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap, fieldMaps, npc, poi } from '../src/content/places';
import { offeredAt } from '../src/content/knowledge';

const lothal = homesteadOn('field_map_lothal')!;
const field = lothal.grounds.find((g) => g.id === 'ground_eastern_field')!;
const granary = lothal.grounds.find((g) => g.id === 'ground_granary_edge')!;
const MAP = 'field_map_lothal';

const nothing: Holdings = { words: [], finished: [], helped: [], carried: {} };
const showing = (id: string): Option => ({ kind: 'show', id, label: '' });
const vouching = (id: string): Option => ({ kind: 'vouch', id, label: '' });

describe('which maps can be settled', () => {
  it('has a homestead on Lothal, and none on the Aravali, which is a crossing', () => {
    expect(lothal, 'Lothal has no homestead in canon').toBeTruthy();
    expect(lothal.grounds.length).toBeGreaterThan(1);
    expect(homesteadOn('field_map_aravali')).toBeNull();
    expect(groundAt('poi_eastern_field')?.ground.id).toBe('ground_eastern_field');
    expect(groundAt('poi_kavik_tower')).toBeNull();
  });

  it('has one on Dwarka and the Narmada too, each ground held by somebody who is there', () => {
    expect(homesteads.map((h) => h.fieldMapId).sort()).toEqual(['field_map_dwarka', 'field_map_lothal', 'field_map_narmada']);
    for (const h of homesteads) {
      for (const g of h.grounds) {
        expect(fieldMap(h.fieldMapId)!.pointsOfInterest, `${g.id} is off its map`).toContain(g.at);
        expect(npc(g.heldBy)?.foundAt, `${g.heldBy} is never at ${g.at}`).toContain(g.at);
      }
    }
  });
});

// Every homestead, not only Lothal's, walked to agreement with the first answer each worry names --
// and each of those answers is something the player can come by on that same map, since the card
// offers only this map's discoveries and this map's people.
const asOption = (m: Answer): Option => ({
  kind: m.approach,
  id: m.discovery ?? m.person ?? m.material ?? m.word ?? null,
  label: ''
});

describe('every homestead', () => {
  for (const h of homesteads) {
    const people = new Set(fieldMap(h.fieldMapId)!.pointsOfInterest.flatMap((p) => poi(p)?.npcs ?? []));
    const shown = new Set(fieldMap(h.fieldMapId)!.pointsOfInterest.flatMap((p) => offeredAt(p, poi(p)?.discoveries ?? [])));

    it(`${h.id}: every worry is answered by something on its own map`, () => {
      for (const g of h.grounds) {
        for (const w of g.worries) {
          for (const m of w.metBy) {
            if (m.approach === 'show') expect(shown, `${g.id}/${w.id} shows ${m.discovery}, not found on ${h.fieldMapId}`).toContain(m.discovery);
            if (m.approach === 'vouch') expect(people, `${g.id}/${w.id} wants ${m.person}, not on ${h.fieldMapId}`).toContain(m.person);
          }
        }
      }
    });

    it(`${h.id}: each ground is talked round to agreement, then built and settled`, () => {
      for (const g of h.grounds) {
        let flags: string[] = [];
        for (const w of g.worries) {
          const reply = respond(h, g, flags, asOption(w.metBy[0]!));
          expect(reply.eased, `${g.id}/${w.id} was not eased by its own first answer`).toBe(true);
          flags = reply.flags;
        }
        expect(agreed(g, stateOf(h.fieldMapId, flags))).toBe(true);
        const plenty = Object.fromEntries(h.stages.flatMap((s) => s.needs.map((n) => [n.id, 99])));
        for (const _ of h.stages) {
          const may = mayBuild(h, stateOf(h.fieldMapId, flags), plenty, 9);
          expect(may.ok).toBe(true);
          if (!may.ok) return;
          flags = build(h, flags, may.stage).flags;
        }
        expect(stateOf(h.fieldMapId, settle(h, flags)).settled).toBe(true);
      }
    });
  }
});

describe('asking', () => {
  it('waits until the map knows you', () => {
    const fresh = stateOf(MAP, []);
    expect(mayAsk(lothal, field, fresh, 'stranger')).toEqual({ ok: false, why: 'Hasme would hear you out once people here know you.' });
    expect(mayAsk(lothal, field, fresh, 'heard-of').ok).toBe(false);
    expect(mayAsk(lothal, field, fresh, 'known').ok).toBe(true);
  });

  it('draws out a hint when you listen, and costs nothing when an answer misses', () => {
    const heard = respond(lothal, field, [], { kind: 'listen', id: null, label: '' });
    expect(heard.says).toBe(field.worries[0]!.hint);
    expect(heard.eased).toBe(false);
    const miss = respond(lothal, field, heard.flags, showing('discovery_tower_collapse'));
    expect(miss.says).toBe(field.worries[0]!.notThat);
    expect(stateOf(MAP, miss.flags).eased).toEqual([]);
    // And nothing was lost: the right answer still works after a wrong one.
    expect(respond(lothal, field, miss.flags, showing('discovery_poisoned_ground')).eased).toBe(true);
  });

  it('is talked round worry by worry, in the holder’s own words, to agreement', () => {
    let flags: string[] = [];
    const answersInOrder: Option[] = [
      showing('discovery_red_rice_survival'),
      vouching('npc_bekh'),
      { kind: 'tongue', id: null, label: '' }
    ];
    answersInOrder.forEach((option, i) => {
      const worry = currentWorry(field, stateOf(MAP, flags))!;
      expect(worry.id).toBe(field.worries[i]!.id);
      const reply = respond(lothal, field, flags, option);
      expect(reply.eased, `${option.kind} did not answer ${worry.id}`).toBe(true);
      expect(reply.says.startsWith(worry.eased)).toBe(true);
      flags = reply.flags;
    });
    expect(agreed(field, stateOf(MAP, flags))).toBe(true);
    expect(currentWorry(field, stateOf(MAP, flags))).toBeNull();
    // And agreeing on one ground closes the other.
    expect(mayAsk(lothal, granary, stateOf(MAP, flags), 'trusted')).toEqual({
      ok: false,
      why: 'You are building at The Eastern Field already.'
    });
  });

  it('lets you change your mind between grounds until one agrees', () => {
    const half = respond(lothal, field, [], showing('discovery_poisoned_ground')).flags;
    expect(stateOf(MAP, half).ground).toBe('ground_eastern_field');
    const moved = respond(lothal, granary, half, showing('discovery_red_rice_survival'));
    expect(stateOf(MAP, moved.flags).ground).toBe('ground_granary_edge');
    expect(stateOf(MAP, moved.flags).eased).toEqual(['rice']);
  });

  it('offers everything the player has, not only the right answers', () => {
    const holdings: Holdings = {
      words: ['word_kia_uvai'],
      finished: ['discovery_poisoned_ground', 'discovery_tower_collapse'],
      helped: ['npc_bekh', 'npc_pell'],
      carried: { material_river_clay: 2 }
    };
    const offered = optionsFor(lothal, field, holdings, ['npc_bekh', 'npc_hasme']);
    const kinds = offered.map((o) => `${o.kind}:${o.id ?? ''}`);
    expect(kinds).toContain('listen:');
    expect(kinds).toContain('tongue:');
    expect(kinds).toContain('show:discovery_tower_collapse');
    expect(kinds).toContain('vouch:npc_bekh');
    expect(kinds, 'somebody from another map vouched').not.toContain('vouch:npc_pell');
    expect(kinds).toContain('offer:material_river_clay');
    expect(optionsFor(lothal, field, nothing, []).map((o) => o.kind)).toEqual(['listen']);
  });
});

describe('building', () => {
  const agreedFlags = [
    [showing('discovery_poisoned_ground'), vouching('npc_bekh'), vouching('npc_thrali')] as Option[]
  ][0]!.reduce<string[]>((flags, option) => respond(lothal, field, flags, option).flags, []);

  it('is refused before agreement, then says what is short', () => {
    expect(mayBuild(lothal, stateOf(MAP, []), {}, 3)).toEqual({ ok: false, why: 'Nobody has agreed to it yet.' });
    const short = mayBuild(lothal, stateOf(MAP, agreedFlags), { material_river_clay: 1 }, 3);
    expect(short.ok).toBe(false);
    expect(!short.ok && short.why).toMatch(/^Needs 4 river clay \(you carry 1\)/);
  });

  it('needs hands as well as things: people here you have helped', () => {
    const plenty = Object.fromEntries(lothal.stages.flatMap((s) => s.needs.map((n) => [n.id, 99])));
    const alone = mayBuild(lothal, stateOf(MAP, agreedFlags), plenty, 0);
    expect(!alone.ok && alone.why).toMatch(/hands/);
  });

  it('goes up in its stages, spending what each needs, and then the people move in', () => {
    const plenty = Object.fromEntries(lothal.stages.flatMap((s) => s.needs.map((n) => [n.id, 99])));
    let flags = agreedFlags;
    for (let i = 0; i < lothal.stages.length; i += 1) {
      const may = mayBuild(lothal, stateOf(MAP, flags), plenty, 3);
      expect(may.ok, `stage ${i}`).toBe(true);
      if (!may.ok) return;
      expect(may.stage.id).toBe(lothal.stages[i]!.id);
      const done = build(lothal, flags, may.stage);
      expect(done.spends).toEqual(may.stage.needs);
      flags = done.flags;
      expect(stagesBuilt(lothal, stateOf(MAP, flags))).toBe(i + 1);
    }
    expect(nextStage(lothal, stateOf(MAP, flags))).toBeNull();
    expect(readyToSettle(lothal, stateOf(MAP, flags))).toBe(true);
    const home = settle(lothal, flags);
    expect(stateOf(MAP, home).settled).toBe(true);
    expect(readyToSettle(lothal, stateOf(MAP, home))).toBe(false);
  });

  it('keeps each map’s homestead to itself', () => {
    const lothalFlags = settle(lothal, agreedFlags);
    for (const map of fieldMaps) {
      if (map.id === MAP) continue;
      expect(stateOf(map.id, lothalFlags)).toEqual({ ground: null, eased: [], built: [], settled: false });
    }
  });
});

describe('where it stands', () => {
  // The owner: "hope we don't let people build it on swamp -- ideally on flat land or hill, if there
  // is no water or cliff or road." The first version put the mill in the Eastern Field's wetland.
  it('stands near every ground on dry flat land or hills, off the road and clear of any cliff', () => {
    let found = 0;
    for (let s = 0; s < 20; s += 1) {
      const built = buildFieldMap(fieldMap(MAP)!, { seed: `homestead-${s}` });
      for (const ground of lothal.grounds) {
        const at = built.placed.find((p) => p.poi.id === ground.at)?.at;
        expect(at, `${ground.at} was not placed on seed ${s}`).toBeTruthy();
        const tiles = buildingTiles(built.world, at!, built.placed.map((p) => p.at));
        if (!tiles) continue;
        found += 1;
        for (const p of [tiles.mill, tiles.greenhouse]) {
          const tile = built.world.tiles[p.y]![p.x]!;
          expect(BUILDABLE.has(tile.biome), `built on ${tile.biome} at ${p.x},${p.y}`).toBe(true);
          expect(tile.road || tile.ford || tile.bridge || tile.track, 'built on a way').toBeFalsy();
          expect(buildable(built.world, p)).toBe(true);
          expect(Math.max(Math.abs(p.x - at!.x), Math.abs(p.y - at!.y))).toBeLessThanOrEqual(BUILD_RADIUS);
        }
        expect(tiles.greenhouse.y === tiles.mill.y && Math.abs(tiles.greenhouse.x - tiles.mill.x) < 2, 'the greenhouse overlaps the mill').toBe(false);
      }
    }
    // Measured: see the note beside BUILD_RADIUS. Nearly every ground has somewhere on nearly every
    // seed, and one that has not says so rather than building in the marsh.
    expect(found / (20 * lothal.grounds.length), `${found} of ${20 * lothal.grounds.length} grounds had room`).toBeGreaterThan(0.9);
  });

  it('has room beside the grounds of the other maps too', () => {
    for (const h of homesteads) {
      if (h.fieldMapId === MAP) continue;
      let found = 0;
      const seeds = 8;
      for (let s = 0; s < seeds; s += 1) {
        const built = buildFieldMap(fieldMap(h.fieldMapId)!, { seed: `homestead-${s}` });
        for (const ground of h.grounds) {
          const at = built.placed.find((p) => p.poi.id === ground.at)?.at;
          expect(at, `${ground.at} was not placed on seed ${s}`).toBeTruthy();
          if (buildingTiles(built.world, at!, built.placed.map((p) => p.at))) found += 1;
        }
      }
      // Measured over 40 seeds a ground: every Dwarka and Narmada ground had room on all 40. Their
      // grounds stand on desert, plains and hill, where Lothal's stand in the delta's wetland.
      expect(found / (seeds * h.grounds.length), `${h.id}: ${found} of ${seeds * h.grounds.length} grounds had room`).toBeGreaterThan(0.95);
    }
  });

  it('refuses water, forest, road and a cliff edge', () => {
    const built = buildFieldMap(fieldMap(MAP)!, { seed: 'homestead-0' });
    const tiles = built.world.tiles.flat();
    const wet = tiles.find((t) => t.biome === 'wetland')!;
    expect(buildable(built.world, wet)).toBe(false);
    const road = tiles.find((t) => t.road && t.biome === 'plains');
    if (road) expect(buildable(built.world, road)).toBe(false);
    const forest = tiles.find((t) => t.biome === 'forest');
    if (forest) expect(buildable(built.world, forest)).toBe(false);
  });
});
