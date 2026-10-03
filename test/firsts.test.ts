// The firsts: Thrali lends the dugout from the third day, Hesh sees you onto the line once.
//
// The owner's rulings of 3 October 2026. These are the rules the dock and the scene ask; the card and
// the boat in the kit are checked in a browser by `e2e/firsts.spec.ts`.

import { describe, expect, it } from 'vitest';
import {
  askAboutBoat,
  boatOn,
  firstEvent,
  firstRide,
  lentFlag,
  lentFromSearch,
  lentVehicles,
  seenFlag
} from '../src/content/firsts';
import { DUGOUT } from '../src/content/kit';
import { fieldMap, fieldMaps, npc, poi } from '../src/content/places';
import { LEND_FROM_DAY } from '../src/content/tiers';

const LOTHAL = 'field_map_lothal';
const ARAVALI = 'field_map_aravali';
const ask = (over: Partial<Parameters<typeof askAboutBoat>[0]> = {}) =>
  askAboutBoat({ fieldMapId: LOTHAL, npcId: 'npc_thrali', poiId: 'poi_lothal_camp', day: LEND_FROM_DAY, flags: [], ...over });

describe("canon's firsts, as the game reads them", () => {
  it('has Thrali lend the dugout on Lothal, at the camp or the dockyard, with a not-yet', () => {
    const [first] = fieldMap(LOTHAL)!.firsts;
    expect(first?.vehicle).toBe(DUGOUT.id);
    expect(first?.npc).toBe('npc_thrali');
    expect(first?.at.sort()).toEqual(['poi_drowned_dockyard', 'poi_lothal_camp']);
    expect(first?.notYet).toBeTruthy();
  });

  it('has Hesh see you onto the line on the Aravali, with no wait', () => {
    const [first] = fieldMap(ARAVALI)!.firsts;
    expect(first?.npc).toBe('npc_hesh');
    expect(first?.notYet).toBeNull();
  });

  it('names people, places and paintings that exist', () => {
    for (const map of fieldMaps) {
      for (const f of map.firsts) {
        expect(npc(f.npc), `${f.id}: ${f.npc}`).toBeTruthy();
        for (const p of f.at) expect(poi(p), `${f.id}: ${p}`).toBeTruthy();
        expect(f.art).toMatch(/^first-/);
        // The lender has to be somewhere they will be asked.
        for (const p of f.at) expect(npc(f.npc)!.foundAt, `${f.npc} is never at ${p}`).toContain(p);
      }
    }
  });
});

describe('the boat on Lothal is lent, not carried', () => {
  it('is not in the kit until Thrali lends it', () => {
    expect(boatOn(LOTHAL, [])).toBeNull();
    expect(boatOn(LOTHAL, [DUGOUT.id])).toBe(DUGOUT);
  });

  it('is nowhere else, lent or not', () => {
    for (const map of fieldMaps.filter((m) => m.id !== LOTHAL)) expect(boatOn(map.id, [DUGOUT.id])).toBeNull();
  });

  it('is read out of the save by its flag', () => {
    expect(lentVehicles(['spoke:npc_thrali', lentFlag(DUGOUT.id)])).toEqual([DUGOUT.id]);
    expect(lentFromSearch('?lent=dugout')).toEqual([DUGOUT.id]);
    expect(lentFromSearch('?lent=raft')).toEqual([]);
  });
});

describe('asking Thrali for it', () => {
  it('is "not yet" before the third day, in canon\'s words', () => {
    expect(LEND_FROM_DAY).toBe(2);
    const early = ask({ day: 0 });
    expect(early?.kind).toBe('not-yet');
    expect(early && early.kind === 'not-yet' ? early.line : '').toBe(fieldMap(LOTHAL)!.firsts[0]!.notYet);
    expect(ask({ day: LEND_FROM_DAY - 1 })?.kind).toBe('not-yet');
  });

  it('lends it from the third day, at either place', () => {
    expect(ask()?.kind).toBe('lend');
    expect(ask({ poiId: 'poi_drowned_dockyard' })?.kind).toBe('lend');
  });

  it('is nothing to ask of somebody else, somewhere else, or once lent', () => {
    expect(ask({ npcId: 'npc_uma' })).toBeNull();
    expect(ask({ poiId: 'poi_kavik_tower' })).toBeNull();
    expect(ask({ poiId: null })).toBeNull();
    expect(ask({ flags: [lentFlag(DUGOUT.id)] })).toBeNull();
    expect(ask({ fieldMapId: 'field_map_narmada' })).toBeNull();
  });
});

describe('the first ride', () => {
  it('has a card until it has been seen', () => {
    const first = firstRide(ARAVALI, 'vehicle_lodestone_train', []);
    expect(first?.id).toBeTruthy();
    expect(firstRide(ARAVALI, 'vehicle_lodestone_train', [seenFlag(first!)])).toBeNull();
    expect(firstRide(LOTHAL, 'vehicle_lodestone_train', [])).toBeNull();
  });

  it("is told as an event card: canon's prose, the painting, one choice in the person's words", () => {
    const first = firstRide(ARAVALI, 'vehicle_lodestone_train', [])!;
    const event = firstEvent(first, 'The line', 'Board');
    expect(event.art).toBe(first.art);
    expect(event.prose).toBe(first.prose.join(' '));
    expect(event.choices).toHaveLength(1);
    expect(event.choices[0]!.label).toBe('Board');
    expect(event.choices[0]!.line).toBe(first.line);
  });
});
