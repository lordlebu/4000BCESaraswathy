// Boarding the Lodestone Line.
//
// `src/content/vehicles.ts` had **zero importers** before this: `railSpan`, `trackRoute` and
// `canBoardAt` all existed, were all tested, and nothing built or boarded anything. That is the
// exact shape of the three bugs `CLAUDE.md` records under "the rules layer" -- a rule written,
// tested, and with no caller, so the mechanic did not exist in the shipped game while every test
// passed. So the last case here is the one that matters most: it asserts the ride reaches
// `App.tsx` at all.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { buildFieldMap, startTileFor } from '../src/world/fieldMap';
import { fieldMaps } from '../src/content/places';
import { trackRoute, canBoardAt, railSpan } from '../src/world/crossing';
import { isWalkable } from '../src/world/generate';
import { rideFrom, carriageFor, crosses, RIDE_SHARE } from '../src/content/vehicles';

const worlds = fieldMaps.map((map) => ({ id: map.id, built: buildFieldMap(map, {}) }));
const only = (id: string) => worlds.find((w) => w.id === id)!.built.world;

describe('the line can be ridden', () => {
  it('carries a traveller from one island to the other', () => {
    const world = only('field_map_aravali');
    const stations = trackRoute(world).filter((p) => canBoardAt(world, p));
    expect(stations.length, 'the Aravali should have stations to board at').toBeGreaterThan(1);

    const north = stations[0]!;
    const south = stations[stations.length - 1]!;

    const out = rideFrom(world, north);
    expect(out, 'boarding at the north station should offer a ride').not.toBeNull();
    expect(out!.to, 'north should ride to the far end').toEqual(south);

    const back = rideFrom(world, south);
    expect(back, 'the line runs both ways').not.toBeNull();
    expect(back!.to, 'south should ride back').toEqual(north);

    expect(out!.tiles, 'a ride covers the span').toBeGreaterThan(10);
  });

  it('refuses to board from the span, from the shore, and from open ground', () => {
    const world = only('field_map_aravali');
    const route = trackRoute(world);
    const span = railSpan(world)!;

    // Out over the water: already aboard, nothing to step onto.
    const overWater = route.find((p) => {
      const t = world.tiles[p.y]![p.x]!;
      return t.biome === 'sea' || t.biome === 'sky_underside';
    })!;
    expect(rideFrom(world, overWater), 'no boarding out on the span').toBeNull();

    // A rope ladder is not a rail: tracked, but outside the span the carriage runs.
    const onRope = world.tiles
      .flat()
      .find((t) => t.track && (t.y < span.from || t.y > span.to));
    if (onRope) {
      expect(rideFrom(world, { x: onRope.x, y: onRope.y }), 'a rope is not a rail').toBeNull();
    }

    // Ordinary ground, nowhere near the line.
    const offLine = world.tiles.flat().find((t) => !t.track && t.biome === 'coast')!;
    expect(rideFrom(world, { x: offLine.x, y: offLine.y }), 'no line here').toBeNull();
  });

  it('offers nothing on the three maps with no line', () => {
    // Named rather than counted map-wide: a suite that only asserted "some map offers a ride"
    // would pass while a railway quietly appeared on the Narmada.
    for (const { id, built } of worlds) {
      if (id === 'field_map_aravali') continue;
      const world = built.world;
      expect(trackRoute(world), `${id} should have no line`).toEqual([]);
      for (const t of world.tiles.flat().slice(0, 200)) {
        expect(rideFrom(world, { x: t.x, y: t.y }), `${id} offered a ride`).toBeNull();
      }
    }
  });

  it('does not ask whether the carriage crosses the ground under the rail', () => {
    // The trap this whole design avoids, asserted so nobody "fixes" it back.
    //
    // The route is 10 tiles of sea, 3 of sky_underside and 9 of sky_island; the Lodestone
    // carriage's canon `crosses` list omits both sea and open_sky. Gating the ride on the biome
    // would refuse to run the carriage on its own line over 13 of its 22 tiles.
    const world = only('field_map_aravali');
    const route = trackRoute(world);
    const carriage = carriageFor(world, route)!;
    expect(carriage, 'the line should have a carriage').toBeTruthy();

    const unsupported = route.filter((p) => !crosses(carriage.id, world.tiles[p.y]![p.x]!.biome));
    expect(
      unsupported.length,
      'this test is pointless if canon starts listing every ground under the rail'
    ).toBeGreaterThan(0);

    // And yet both ends board, because the line is a flag rather than a biome.
    const stations = route.filter((p) => canBoardAt(world, p));
    expect(rideFrom(world, stations[0]!), 'boarding must not consult crosses()').not.toBeNull();
  });

  it('is a convenience, not a gate: the whole line is walkable anyway', () => {
    // The measurement the design rests on. If this ever fails, riding has become the only way
    // across and the decision in `vehicles.ts` -- no gate in front of the only journey -- has
    // been reversed by accident rather than on purpose.
    const world = only('field_map_aravali');
    const tracked = world.tiles.flat().filter((t) => t.track);
    expect(tracked.length, 'the Aravali should still carry a line').toBeGreaterThan(50);
    expect(
      tracked.every((t) => isWalkable(t)),
      'every tracked tile must stay walkable, or the ride became a gate'
    ).toBe(true);
  });

  it('saves daylight without making the crossing free', () => {
    expect(RIDE_SHARE).toBeGreaterThan(0);
    expect(RIDE_SHARE).toBeLessThan(1);
  });

  it('reaches the player, which is the whole reason this file exists', () => {
    // `vehicles.ts` had zero importers and a full set of passing tests. The guard against that is
    // not another unit test of the rule -- it is asserting the rule is *wired*, the same argument
    // `test/adapterCoverage.test.ts` makes for canon fields.
    const app = readFileSync(new URL('../src/ui/App.tsx', import.meta.url), 'utf8');
    expect(app, 'App must ask the rule').toContain('rideFrom');
    expect(app, 'App must offer a row for it').toContain("id: 'ride'");
    expect(app, 'the row must send the scene somewhere').toContain("emitEvent('ride'");

    const scene = readFileSync(
      new URL('../src/game/scenes/WorldScene.ts', import.meta.url),
      'utf8'
    );
    expect(scene, 'the scene must listen').toContain("onEvent('ride'");
    expect(scene, 'and must re-check the rule rather than trust the event').toContain('rideFrom');
  });
});

describe('the debug anchor the browser suite boards from', () => {
  it('puts the traveller somewhere the line can actually be boarded', () => {
    // **This exists because a coordinate is a searched seed with extra steps.**
    // `e2e/riding.spec.ts` stood at `23,23`, which was rail on the northern island of a 44 x 66
    // map. The map grew to 52 x 78, the line moved, and the spec came up standing on grass with
    // the ride row correctly disabled -- one red browser job whose message said nothing about the
    // map having changed size.
    //
    // `?at=board` resolves through `canBoardAt`, the same rule the ride row asks, so the anchor
    // and the offer cannot drift apart. This is the assertion that says so under Node, in
    // milliseconds, rather than in a nine-minute browser run.
    const built = buildFieldMap(fieldMaps.find((m) => m.id === 'field_map_aravali')!, {});
    const at = startTileFor(built, '?at=board');
    const tile = built.world.tiles[at.y]![at.x]!;
    expect(canBoardAt(built.world, tile), `${at.x},${at.y} is not a boarding point`).toBe(true);
  });

  it('boards at the near end, so the ride is a crossing rather than a step', () => {
    // Both islands are boardable and the rail runs between them. Taking the northernmost means a
    // ride from the anchor spans the strait, which is what the browser spec asserts by watching
    // the journal heading move more than ten rows.
    const built = buildFieldMap(fieldMaps.find((m) => m.id === 'field_map_aravali')!, {});
    const at = startTileFor(built, '?at=board');
    const span = railSpan(built.world)!;
    expect(Math.abs(span.to - at.y), 'the far end of the line is not a crossing away')
      .toBeGreaterThan(10);
  });

  it('falls back to the real start on a map with no line', () => {
    // The hook must never be able to break the game for a player who types one in.
    for (const map of fieldMaps) {
      if (map.id === 'field_map_aravali') continue;
      const built = buildFieldMap(map, {});
      expect(startTileFor(built, '?at=board')).toEqual(built.world.start);
    }
  });
});
