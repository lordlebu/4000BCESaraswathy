// Who else is on the road.
//
// **Canon already said these people move and the game drew them standing still in every place at
// once.** Eleven of canon's fifteen NPCs carry more than one `found_at`, and `npcsAt` answers that
// list as a set of simultaneous positions -- so the Narmada held three Marns. Reading the same
// field as a circuit is the whole of `travellers.ts`.
//
// The assertions are in two halves and the second is the one that matters. The rules are checked
// here; **that the rules reach the screen is `e2e/road-company.spec.ts`**, because a Node test
// cannot see a Phaser sprite and every assertion in this file would pass with the scene calling
// none of it.

import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap, fieldMaps, allNpcs, poi } from '../src/content/places';
import {
  placedCircuit,
  sheetsToUse,
  stopsOf,
  travellerAttributes,
  travellerState,
  travellersOn,
  wayBetween,
  whereabouts,
  ROAD_COMPANY_PER_MAP,
  TRAVELLERS_PER_MAP
} from '../src/content/travellers';
import { lookKey } from '../src/content/looks';
import { isWalkable } from '../src/world/generate';
import { hoursToPhase, skyAt } from '../src/game/dayNight';
import { DEFAULT_SEED } from '../src/ui/seed';

const built = (id: string, seed = DEFAULT_SEED) => buildFieldMap(fieldMap(id)!, { seed });

describe('canon already knows who travels', () => {
  it('reads a circuit off found_at rather than inventing one', () => {
    // The measurement this module exists for: eleven of fifteen people are authored in more than
    // one place. If that stops being true, the derivation is no longer standing on anything and
    // this file should be reconsidered rather than patched.
    const movers = allNpcs().filter((n) => n.foundAt.length >= 2);
    expect(movers.length, 'canon no longer authors anybody in two places').toBeGreaterThanOrEqual(8);

    // Terke the drover is the clearest case: the Nomad Ground and the Vedda Ford, which is a herd
    // and the crossing it uses.
    const terke = allNpcs().find((n) => n.id === 'npc_terke');
    expect(terke?.foundAt).toContain('poi_nomad_ground');
    expect(terke?.foundAt).toContain('poi_vedda_ford');
  });

  it('puts canon’s people first and two strangers beside them on every map', () => {
    for (const map of fieldMaps) {
      const roster = travellersOn(map.id);
      const named = roster.filter((t) => t.npcId !== null);
      const company = roster.filter((t) => t.npcId === null);
      expect(named.length, `${map.id}: nobody canon wrote travels here`).toBeGreaterThan(0);
      expect(named.length, `${map.id}: too many named on the road`).toBeLessThanOrEqual(TRAVELLERS_PER_MAP);
      // **Every map, not only the one canon left room on.** Strangers used to fill what canon left
      // empty, which put them on the Narmada alone and every stranger event with them.
      expect(company.length, `${map.id}: no road company`).toBe(ROAD_COMPANY_PER_MAP);

      // **Canon's own circuit-walkers come first and road company only fills what is left.** A map
      // with people who genuinely move must get those people; only a map without enough of them
      // invents anybody. Reversing this would put strangers on the Aravali, which has five.
      const firstUnnamed = roster.findIndex((t) => t.npcId === null);
      const lastNamed = roster.map((t) => t.npcId !== null).lastIndexOf(true);
      if (firstUnnamed >= 0 && lastNamed >= 0) {
        expect(firstUnnamed, `${map.id}: road company placed ahead of a canon traveller`)
          .toBeGreaterThan(lastNamed);
      }

      for (const t of roster) {
        expect(t.circuit.length, `${map.id}/${t.id}: a circuit of one is not a circuit`)
          .toBeGreaterThanOrEqual(2);
        // Every stop is a place on *this* map. A circuit that left the map would walk somebody off
        // the edge of the world.
        for (const stop of t.circuit) {
          expect(poi(stop)?.fieldMap, `${map.id}/${t.id}: stop ${stop} is on another map`)
            .toBe(map.id);
        }
      }

      // No two drawn as the same figure -- copies of one face read as a bug. Judged by the look now
      // rather than the body, because two carriers in different dyes are two people.
      const drawn = roster.map((t) => (t.look ? lookKey(t.look) : t.art));
      expect(new Set(drawn).size, `${map.id}: two travellers are drawn alike`).toBe(roster.length);
    }
  });

  it('gives road company no words, ever', () => {
    // **Canon owns vocabulary.** A named traveller is somebody canon wrote lines for; road company
    // are the people a road has that nobody wrote down, and inventing words for them here would be
    // the engine writing canon -- the thing this project has declined three times in writing.
    for (const map of fieldMaps) {
      for (const t of travellersOn(map.id)) {
        if (t.npcId !== null) continue;
        expect(allNpcs().some((n) => n.id === t.id), `${t.id} pretends to be a canon person`)
          .toBe(false);
      }
    }
  });
});

describe('where the hour puts them', () => {
  it('walks by the same clock the sky is painted from', () => {
    // **The guard that was missing, and a browser check had to find the bug instead.**
    //
    // `phaseFromClock` shifts the day by a quarter so phase 0 is **first light at six in the
    // morning**, not midnight -- which is what keeps a journey opened at midday from showing an
    // amber afternoon sky. The first version of `SETS_OUT` and `ARRIVES` read those numbers as if
    // zero were midnight and put every traveller on the road from noon until midnight, with the
    // map empty all morning. Every assertion in this file passed: the rules were self-consistent
    // and simply about the wrong hours. `e2e/road-company.spec.ts` reported "nobody is on the road
    // at noon".
    //
    // So the window is asserted against `skyAt`, which is the other reader of the same clock.
    // Whatever either one does, they now have to agree about what daylight is.
    const world = built('field_map_lothal');
    const roster = travellersOn('field_map_lothal').filter(
      (t) => stopsOf(t, world.placed).length >= 2
    );
    expect(roster.length, 'nobody to ask').toBeGreaterThan(0);

    const outAt = (phase: number) =>
      roster.some((t) => whereabouts(world.world, stopsOf(t, world.placed), 0, phase)?.resting === false);

    for (const hour of [7, 9, 12, 15, 17]) {
      const phase = hoursToPhase(hour);
      expect(skyAt(phase).label, `the sky calls ${hour}:00 something unexpected`).not.toBe('night');
      expect(outAt(phase), `nobody is on the road at ${hour}:00`).toBe(true);
    }
    for (const hour of [0, 2, 4, 22, 23]) {
      const phase = hoursToPhase(hour);
      expect(skyAt(phase).label, `the sky calls ${hour}:00 daylight`).toBe('night');
      expect(outAt(phase), `somebody is still walking at ${hour}:00`).toBe(false);
    }
  });

  it('actually gets somewhere across the day', () => {
    // **The assertion a parked sprite would fail.** A traveller whose position never changed would
    // satisfy every other test here: the roster is right, the circuit is right, the resting hours
    // are right, and the figure stands on one tile from dawn to dusk.
    let moved = 0;
    let looked = 0;
    for (const map of fieldMaps) {
      const world = built(map.id);
      for (const t of travellersOn(map.id)) {
        const stops = stopsOf(t, world.placed);
        if (stops.length < 2) continue;
        looked += 1;
        const early = whereabouts(world.world, stops, 0, hoursToPhase(8));
        const late = whereabouts(world.world, stops, 0, hoursToPhase(16));
        if (early && late && (early.at.x !== late.at.x || early.at.y !== late.at.y)) moved += 1;
      }
    }
    expect(looked, 'nobody was examined').toBeGreaterThan(0);
    expect(moved, `${moved} of ${looked} travellers moved between morning and evening`).toBe(looked);
  });

  it('walks the circuit round rather than back and forth on one leg', () => {
    // A three-stop circuit has to reach its third stop. Keyed on the day, so consecutive days walk
    // consecutive legs -- and a two-stop circuit alternates, which is what a drover does.
    const world = built('field_map_narmada');
    const marn = travellersOn('field_map_narmada').find((t) => t.id === 'npc_marn');
    expect(marn, 'Marn is not travelling').toBeTruthy();
    const stops = stopsOf(marn!, world.placed);
    expect(stops.length, 'Marn is authored in three places').toBe(3);

    const reached = new Set<string>();
    for (let day = 0; day < 6; day += 1) {
      const where = whereabouts(world.world, stops, day, hoursToPhase(23));
      if (where) reached.add(`${where.at.x},${where.at.y}`);
    }
    expect(reached.size, 'the circuit never reaches its third stop').toBe(3);
  });

  it('never stands anybody on ground they could not walk to', () => {
    // The path is cost-aware over walkable ground, so this is a property of `findPath` -- but a
    // traveller drawn standing in open sea is exactly the fault the fallback placer shipped twice,
    // and it costs nothing to refuse it here as well.
    for (const map of fieldMaps) {
      const world = built(map.id);
      for (const t of travellersOn(map.id)) {
        const stops = stopsOf(t, world.placed);
        if (stops.length < 2) continue;
        for (let step = 0; step <= 20; step += 1) {
          const where = whereabouts(world.world, stops, step % 4, step / 20);
          if (!where) continue;
          const tile = world.world.tiles[where.at.y]?.[where.at.x];
          expect(tile, `${map.id}/${t.id}: off the map at ${where.at.x},${where.at.y}`).toBeTruthy();
          expect(
            isWalkable(tile!),
            `${map.id}/${t.id}: standing on ${tile!.biome} at ${where.at.x},${where.at.y}`
          ).toBe(true);
        }
      }
    }
  });

  it('prefers the road without insisting on it', () => {
    // **Preferred rather than required, and the ford is why.** A route between two places may cross
    // water where `fieldMap.ts` deliberately refuses the road flag -- "you get your feet wet here"
    // -- and a traveller who would not get their feet wet would stand on the bank for ever.
    const world = built('field_map_lothal').world;
    let onRoad = 0;
    let total = 0;
    for (const t of travellersOn('field_map_lothal')) {
      const stops = stopsOf(t, built('field_map_lothal').placed);
      if (stops.length < 2) continue;
      const way = wayBetween(world, stops[0]!, stops[1]!);
      for (const p of way) {
        total += 1;
        if (world.tiles[p.y]?.[p.x]?.road) onRoad += 1;
      }
    }
    expect(total, 'no way was walked').toBeGreaterThan(0);
    // Measured on the default seed: the ways run mostly on the path they are drawn to prefer. A
    // share rather than a count, because the number moves with the maps and the point does not.
    expect(onRoad / total, `${onRoad} of ${total} steps were on the road`).toBeGreaterThan(0.3);
  });
});

describe('nothing about a traveller is saved', () => {
  it('answers the same for the same seed, day and hour', () => {
    // The whole reason the position is derived: a stored one is a new field on `Journey`, which
    // bumps `SAVE_VERSION` and discards every journey in existence. Determinism is what buys that,
    // and it is the same rule `world/rng.ts` exists to keep.
    const a = built('field_map_dwarka', 'repeatable');
    const b = built('field_map_dwarka', 'repeatable');
    for (const t of travellersOn('field_map_dwarka')) {
      const first = whereabouts(a.world, stopsOf(t, a.placed), 3, 0.42);
      const second = whereabouts(b.world, stopsOf(t, b.placed), 3, 0.42);
      expect(second).toEqual(first);
    }
  });
});

describe('travellers stop wearing the player\'s face', () => {
  // **The switchover is tested before the art exists, not after it lands.** The whole point of
  // `sheetsToUse` being pure and parameterised is that the rule can be proven now -- a test written
  // afterwards describes what happened rather than checking it, and this repository has a documented
  // habit of shipping a rule with no caller and a green suite.

  const PLAYABLE = ['mithra', 'mehtar', 'malacite', 'guyuk', 'varuna'];
  const TRAVELLER = ['traveller-carrier', 'traveller-drover', 'traveller-pilgrim'];

  it('falls back to the playable five while there is no traveller art', () => {
    expect(sheetsToUse([], PLAYABLE, 3)).toEqual(PLAYABLE);
  });

  it('switches the day the third sheet lands, and not before', () => {
    // All or nothing. One or two traveller sheets would put a stranger beside two player faces,
    // which reads as a bug rather than as progress -- and a name in both lists can be dealt twice,
    // which breaks the no-repeat guarantee outright.
    expect(sheetsToUse(TRAVELLER.slice(0, 1), PLAYABLE, 3)).toEqual(PLAYABLE);
    expect(sheetsToUse(TRAVELLER.slice(0, 2), PLAYABLE, 3)).toEqual(PLAYABLE);
    expect(sheetsToUse(TRAVELLER, PLAYABLE, 3)).toEqual(TRAVELLER);
  });

  it('needs exactly TRAVELLERS_PER_MAP sheets, which is why three is the ask', () => {
    // The number in `docs/art-brief.md` Asset 7 is this constant, and if the cap ever rises the
    // brief is wrong rather than the code. Asserted so the two cannot drift apart silently.
    const justUnder = Array.from({ length: TRAVELLERS_PER_MAP - 1 }, (_, i) => `t${i}`);
    const exact = Array.from({ length: TRAVELLERS_PER_MAP }, (_, i) => `t${i}`);
    expect(sheetsToUse(justUnder, PLAYABLE)).toEqual(PLAYABLE);
    expect(sheetsToUse(exact, PLAYABLE)).toEqual(exact);
  });

  it('gives canon’s people on every map three different figures either way', () => {
    // The guarantee that must survive the switch: `sheetFor` walks the list by position, so no two
    // *named* travellers on one map share a sheet while the roster fits. Road company are outside
    // it on purpose -- they wear the body of their trade, and their dyes tell them apart.
    for (const map of fieldMaps) {
      const art = travellersOn(map.id).filter((t) => t.npcId !== null).map((t) => t.art);
      expect(new Set(art).size, `${map.id}: two named travellers share a sheet`).toBe(art.length);
    }
  });

  it('dresses road company as their trade, from the people canon gives it', () => {
    const body: Record<string, string> = {
      company_carrier: 'traveller-carrier',
      company_drover: 'traveller-drover',
      company_pilgrim: 'traveller-pilgrim'
    };
    const culture: Record<string, string> = {
      company_carrier: 'harappan',
      company_drover: 'maru',
      company_pilgrim: 'kia'
    };
    for (const map of fieldMaps) {
      for (const t of travellersOn(map.id).filter((x) => x.npcId === null)) {
        expect(t.art, `${map.id}/${t.id}`).toBe(body[t.id]);
        expect(t.culture, `${map.id}/${t.id}`).toBe(culture[t.id]);
      }
    }
    // The Narmada is canon's Maru country, and the delta is the Kia's.
    const second = (id: string) => travellersOn(id).filter((t) => t.npcId === null).map((t) => t.id);
    expect(second('field_map_narmada')).toContain('company_drover');
    expect(second('field_map_lothal')).toContain('company_pilgrim');
    // And loads go down every road.
    for (const map of fieldMaps) expect(second(map.id)).toContain('company_carrier');
  });
});

describe('what a card says about somebody on the road', () => {
  // Thrali walks Lothal Camp and the Drowned Dockyard, which is the circuit `e2e/talking.spec.ts`
  // meets him on. Using the person the browser test uses keeps the two halves arguing about the
  // same case rather than about two.
  const lothal = built('field_map_lothal');
  const thrali = () => travellersOn('field_map_lothal').find((t) => t.npcId === 'npc_thrali')!;

  const stateOf = (day: number, hour: number) => {
    const t = thrali();
    const circuit = placedCircuit(t, lothal.placed);
    return travellerState(circuit, whereabouts(lothal.world, circuit.map((s) => s.at), day, hoursToPhase(hour)));
  };

  it('names the place somebody is walking to, not the tile', () => {
    const state = stateOf(0, 12);
    expect(state, 'Thrali is not on this map any more').not.toBeNull();
    expect(state!.resting).toBe(false);
    expect(state!.boundFor, 'midday and bound nowhere').not.toBeNull();

    const label = travellerAttributes(thrali(), state).find((a) => a.kind === 'doing')!.label;
    expect(label).toMatch(/^On the road to /);
    // The name canon gives the place, not its id. A card saying `poi_lothal_camp` is a card
    // showing the database to a player.
    expect(label).toContain(poi(state!.boundFor!)!.name);
  });

  it('says where somebody is stopped, once they have stopped', () => {
    const state = stateOf(0, 23);
    expect(state!.resting).toBe(true);
    expect(state!.boundFor, 'nobody stopped is bound anywhere tonight').toBeNull();
    expect(travellerAttributes(thrali(), state)[0]!.label).toMatch(/^Stopped at /);
  });

  it('carries canon\'s role and language verbatim, capitalised and nothing else', () => {
    const traits = travellerAttributes(thrali(), stateOf(0, 12));
    const who = traits.find((a) => a.kind === 'who')!;
    const speaks = traits.find((a) => a.kind === 'speaks')!;
    expect(who.label).toBe('Fisher');
    expect(speaks.label).toBe('Speaks Kia');
  });

  it('never tells a player how a canon person travels', () => {
    // The ruling this replaced the mount art with. `conveyanceFor` reads a vehicle off the ground
    // a circuit crosses, which is a guess -- and for Kunch it guesses a raft while canon has him
    // "road singer, up on a bird". So the derived conveyance stays out of the card and canon's own
    // role is what says it. If a chip ever names a vehicle, this is the rule that broke.
    for (const map of fieldMaps) {
      for (const traveller of travellersOn(map.id)) {
        const labels = travellerAttributes(traveller, null).map((a) => a.label);
        expect(labels.every((l) => !/raft|cart|sled|carriage/i.test(l)), traveller.id).toBe(true);
      }
    }

    const kunch = travellersOn('field_map_lothal').find((t) => t.npcId === 'npc_kunch');
    if (kunch) {
      expect(kunch.conveyance, 'the guess this ruling is about has gone away').not.toBeUndefined();
      expect(travellerAttributes(kunch, null).find((a) => a.kind === 'who')!.label).toContain('bird');
    }
  });

  it('says nothing about where somebody is when nothing has reported it', () => {
    // The state arrives over the EventBus and a card can render before the first one lands. Two
    // chips and no invented whereabouts is the right answer; a "Stopped" chip would be a claim.
    const traits = travellerAttributes(thrali(), null);
    expect(traits.some((a) => a.kind === 'doing')).toBe(false);
    expect(traits.length).toBe(2);
  });
});
