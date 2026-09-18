// Which bench a place has, and the one property that must never break.
//
// **The safety property is that this layer only ever opens things.** Canon's
// `check_playability.py` decides a recipe is performable from `performed_at` alone, so a narrowing
// made game-side is invisible to it -- the two repositories would disagree about what is makeable
// while every check on both sides stayed green. That is the cross-repo blind spot `session-craft`
// names, and it has bitten this project before.
//
// So the first describe block is not a nicety. It is the thing that lets this ship without canon
// having to know about it, and it is asserted against the real bundle rather than a fixture.

import { describe, expect, it } from 'vitest';
import {
  STATIONS,
  type StationId,
  processesAt,
  station,
  stationForProcess,
  stationsAt,
  stationsMissing,
  worksProcess
} from '../src/content/stations';
import { npcsAt, pointsOfInterest } from '../src/content/places';
import { processes } from '../src/content/making';
import { placeAllows } from '../src/content/crafting';
import { recipes } from '../src/content/making';

describe('the layer only ever opens things', () => {
  /**
   * **The guard that makes this safe to ship without a canon release.**
   *
   * For every recipe at every place: if canon's `performed_at` allows it, the station layer must
   * also allow it. The reverse is fine and is the whole point -- Ila's bench at the Quiet Atelier
   * opens a process `performed_at: [settlement]` would refuse.
   *
   * If this ever fails, some recipe has become unmakeable somewhere canon believes it is makeable,
   * and canon's own gate cannot see it.
   */
  it('never refuses a process canon already allows there', () => {
    let checked = 0;
    for (const poi of pointsOfInterest) {
      for (const r of recipes) {
        if (!placeAllows(r.id, { kind: poi.kind })) continue;
        const p = r.process;
        // A process with no bench is not a narrowing: `process_gathering` has none on purpose and
        // no recipe uses it. What would be a narrowing is a bench existing and excluding this place.
        if (!stationForProcess(p)) continue;
        checked += 1;
        expect(
          worksProcess(poi, p),
          `${poi.id} allows ${r.id} by canon's performed_at but has no bench for ${p}`
        ).toBe(true);
      }
    }
    // Guards the guard: if the loop ever stops finding pairs, every assertion above passes
    // vacuously and the failure reads as "all clear".
    expect(checked, 'no place/recipe pair was checked at all').toBeGreaterThan(100);
  });

  /**
   * Reachability, which is the other half -- and it is asserted of **processes, not benches**.
   *
   * The first version asked whether every bench existed on every map and failed on Dwarka, which
   * has no apothecary anywhere. That is not a fault: purifying and drying name no site, so they are
   * performable on Dwarka regardless, and a map simply having no apothecary to *show* is true and
   * fine. What would be a fault is a process nobody on that map can perform.
   *
   * The distinction is the whole reason this test exists rather than the tidier one.
   */
  it('leaves every process performable somewhere on every field map', () => {
    const maps = [...new Set(pointsOfInterest.map((p) => p.fieldMap))];
    expect(maps.length, 'no field maps to check').toBeGreaterThan(2);

    for (const map of maps) {
      const here = pointsOfInterest.filter((p) => p.fieldMap === map);
      for (const p of processes) {
        if (p.id === 'process_gathering') continue;
        expect(
          here.some((poi) => worksProcess(poi, p.id)),
          `${p.id} can be performed nowhere on ${map}, so every recipe needing it is dead there`
        ).toBe(true);
      }
    }
  });
});

describe('the eight benches', () => {
  it('covers every process canon holds, once, except the one that is not a bench job', () => {
    const mapped = STATIONS.flatMap((s) => s.processes);
    expect(new Set(mapped).size, 'a process is on two benches').toBe(mapped.length);

    for (const p of processes) {
      // `process_gathering` is the deliberate exception: canon names it so a recipe chain has a
      // bottom, no recipe uses it, and picking a thing up is not a bench job.
      if (p.id === 'process_gathering') {
        expect(stationForProcess(p.id), 'gathering was given a bench').toBeNull();
        continue;
      }
      expect(stationForProcess(p.id), `${p.id} belongs to no bench`).not.toBeNull();
    }
  });

  /**
   * The table names processes by id; the bundle is what actually exists. Asserting they agree is
   * what turns a canon rename into a failing test rather than a row that quietly offers nothing.
   */
  it('names only processes the bundle actually carries', () => {
    const known = new Set(processes.map((p) => p.id));
    for (const s of STATIONS) {
      for (const p of s.processes) {
        expect(known.has(p), `${s.id} names ${p}, which canon does not hold`).toBe(true);
      }
      expect(processesAt(s.id).length, `${s.id} works nothing`).toBeGreaterThan(0);
    }
  });

  it('gives every bench a name and a line to say about itself', () => {
    for (const s of STATIONS) {
      expect(s.name.length).toBeGreaterThan(2);
      expect(s.description.length, `${s.id} says nothing about itself`).toBeGreaterThan(20);
      expect(station(s.id)).toEqual(s);
    }
    expect(station('not-a-bench' as StationId)).toBeNull();
  });
});

describe('what a place has', () => {
  const at = (id: string) => pointsOfInterest.find((p) => p.id === id)!;

  /**
   * **The row that proves the derivation is a reading and not an invention.**
   *
   * Canon put Ila the apothecary in `poi_quiet_atelier`, which is an `archaeological_site` --
   * somewhere `performed_at: [settlement]` says cannot work anything. Canon broke its own flat
   * model before this module existed; this is the game catching up to its data.
   */
  it('gives the Quiet Atelier an apothecary, because Ila is standing in it', () => {
    const atelier = at('poi_quiet_atelier');
    expect(atelier.kind).toBe('archaeological_site');
    expect(stationsAt(atelier).map((s) => s.id)).toContain('apothecary');
    // And the place next door, with nobody, does not get one for free.
    expect(stationsAt(at('poi_bone_midden')).map((s) => s.id)).not.toContain('apothecary');
  });

  it('gives a settlement everything it could already do', () => {
    // The additive floor. A settlement keeps its kiln whether or not anybody is standing in it,
    // which is what stops this narrowing anything canon allows.
    const kilns = at('poi_lothal_camp');
    const ids = stationsAt(kilns).map((s) => s.id);
    for (const expected of ['kiln', 'loom', 'quern', 'tannery', 'hearth', 'bench']) {
      expect(ids, `a settlement lost its ${expected}`).toContain(expected);
    }
  });

  /**
   * Open country gets a seat and a fire from its kind -- and whatever the people standing in it
   * bring. The Vedda Ford has Terke the drover and Marn the herder on it, so it has a tannery, and
   * that is the derivation working rather than leaking: a herder at a ford does imply hides.
   *
   * This test asserted `['bench','hearth']` flat at first and was wrong about the game rather than
   * about the code.
   */
  it('gives open country a seat and a fire, plus whatever its people bring', () => {
    const empty = pointsOfInterest.find(
      (p) => p.kind === 'wilderness' && npcsAt(p.id).length === 0
    );
    if (empty) {
      expect(stationsAt(empty).map((s) => s.id).sort()).toEqual(['bench', 'hearth']);
    }
    const ford = pointsOfInterest.find((p) => p.id === 'poi_vedda_ford');
    if (ford) {
      expect(stationsAt(ford).map((s) => s.id)).toContain('tannery');
    }
  });

  it('lists benches in a stable order, whatever order they were found in', () => {
    const order = STATIONS.map((s) => s.id);
    for (const p of pointsOfInterest) {
      const got = stationsAt(p).map((s) => s.id);
      expect(got, `${p.id} listed its benches out of order`).toEqual(
        order.filter((id) => got.includes(id))
      );
    }
  });

  it('accounts for every bench as either here or missing', () => {
    for (const p of pointsOfInterest) {
      expect(stationsAt(p).length + stationsMissing(p).length).toBe(STATIONS.length);
    }
  });

  /**
   * The point of the whole feature, asserted: places must actually differ. If this fails somebody
   * has flattened the derivation and the board is back to saying the same thing everywhere.
   */
  it('makes places differ from one another', () => {
    const shapes = new Set(
      pointsOfInterest.map((p) => stationsAt(p).map((s) => s.id).join(','))
    );
    expect(shapes.size, 'every place has the same benches').toBeGreaterThan(3);
  });
});
