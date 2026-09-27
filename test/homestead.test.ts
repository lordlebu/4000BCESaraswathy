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
  type Holdings,
  type Option
} from '../src/content/homestead';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap, fieldMaps } from '../src/content/places';
import { isWalkable } from '../src/world/generate';

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
  it('stands beside every ground, on walkable ground off the road, on real Lothal maps', () => {
    for (let s = 0; s < 10; s += 1) {
      const built = buildFieldMap(fieldMap(MAP)!, { seed: `homestead-${s}` });
      for (const ground of lothal.grounds) {
        const at = built.placed.find((p) => p.poi.id === ground.at)?.at;
        expect(at, `${ground.at} was not placed on seed ${s}`).toBeTruthy();
        const tiles = buildingTiles(built.world, at!, built.placed.map((p) => p.at));
        expect(tiles, `nowhere to build beside ${ground.at} on seed ${s}`).not.toBeNull();
        for (const p of [tiles!.mill, tiles!.greenhouse]) {
          const tile = built.world.tiles[p.y]![p.x]!;
          expect(isWalkable(tile)).toBe(true);
          expect(tile.road).toBeFalsy();
          expect(Math.max(Math.abs(p.x - at!.x), Math.abs(p.y - at!.y))).toBe(1);
        }
      }
    }
  });
});
