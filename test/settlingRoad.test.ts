// A map's road to settling: four steps read off the save, and the one thing to do next.

import { describe, expect, it } from 'vitest';
import { settlingRoad } from '../src/content/settlingRoad';
import { homesteadOn } from '../src/content/homestead';
import type { StandingOn } from '../src/content/standing';

const lothal = homesteadOn('field_map_lothal')!;
const stranger: StandingOn = { standing: 'stranger', helped: [], helpable: ['npc_uma', 'npc_hasme'], understood: 0 };
const known: StandingOn = { standing: 'known', helped: ['npc_uma'], helpable: ['npc_uma', 'npc_hasme'], understood: 1 };
const fresh = { ground: null, eased: [], built: [], settled: false };

describe('the road to settling', () => {
  it('starts at being known, and names the holders before you can ask them', () => {
    const road = settlingRoad('field_map_lothal', lothal, { standing: stranger, state: fresh, helpedHere: 0, carried: {} })!;
    expect(road.steps.map((s) => s.state)).toEqual(['now', 'later', 'later', 'later']);
    expect(road.next).toMatch(/Help someone here/);
    expect(road.steps[1]!.detail.join(' ')).toMatch(/Hasme|Drel/);
  });

  it('once known, points at a holder', () => {
    const road = settlingRoad('field_map_lothal', lothal, { standing: known, state: fresh, helpedHere: 1, carried: {} })!;
    expect(road.steps.map((s) => s.state)).toEqual(['done', 'now', 'later', 'later']);
    expect(road.next).toMatch(/^Ask /);
  });

  it('once agreed, says what the next stage still wants and where it comes from', () => {
    const ground = lothal.grounds[0]!;
    const state = { ground: ground.id, eased: ground.worries.map((w) => w.id), built: [], settled: false };
    const road = settlingRoad('field_map_lothal', lothal, { standing: known, state, helpedHere: 0, carried: {} })!;
    expect(road.steps.map((s) => s.state)).toEqual(['done', 'done', 'now', 'later']);
    const build = road.steps[2]!.detail.join(' ');
    expect(build).toMatch(/0 of 3 raised/);
    expect(build).toMatch(/you carry 0: /);
    expect(road.next).toMatch(/^Raise the /);
  });

  it('is done when settled, and has nothing next', () => {
    const ground = lothal.grounds[0]!;
    const state = { ground: ground.id, eased: ground.worries.map((w) => w.id), built: lothal.stages.map((s) => s.id), settled: true };
    const road = settlingRoad('field_map_lothal', lothal, { standing: known, state, helpedHere: 3, carried: {} })!;
    expect(road.steps.every((s) => s.state === 'done')).toBe(true);
    expect(road.next).toBeNull();
  });

  it('says the Aravali is a crossing rather than showing an empty road', () => {
    const road = settlingRoad('field_map_aravali', homesteadOn('field_map_aravali'), { standing: stranger, state: fresh, helpedHere: 0, carried: {} })!;
    expect(road.steps).toEqual([]);
    expect(road.next).toBeNull();
  });
});
