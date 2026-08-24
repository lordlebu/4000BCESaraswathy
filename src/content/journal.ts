// The travel journal: presentation only.
//
// Every string the player reads comes from `data/*.json` through `species.ts`, so the bestiary
// stays the single source of truth and this file holds nothing but phrasing.

import { biomeFor, creatureFor, floraFor } from './species';
import { isPresent, noteFor, routineFor } from './routine';
import { landmarkKindFor, landmarkTitle } from './landmarks';
import { nearestCamp, nearestUnvisited, stepsBetween } from './camps';
import type { PlacedPoi } from '../world/fieldMap';
import type {
  BiomeId, Clade, Creature, Flora, GrowthForm, Point, Tile, World
} from '../world/types';

/**
 * One line of the traveller's field notes: what a thing is called, and what it is.
 *
 * The two are kept apart rather than glued into a sentence. The flora line used to read
 * "Sweet Indigo grows here. A domesticated decorative vine bred by Harappan settlers…", which says
 * the name twice in about half the cases and reads as a sentence fighting a dictionary entry in
 * the rest. Canon writes descriptions, not observations — so the journal presents them as a
 * naturalist would, name above and description beneath, and the register stops being a mismatch.
 *
 * `name` is null where there is nothing to record; `note` then carries the empty-handed line.
 */
export interface FieldNote {
  name: string | null;
  /** Canon's own words, passed through untouched. */
  note: string;
  /**
   * Enough of the species for the panel to draw a mark beside the name, or null when there is
   * nothing here to draw.
   *
   * Deliberately a `Pick` rather than the whole record. The panel needs an id to seed the shape,
   * a name and binomial to choose it, and the biome to colour it -- and nothing else. Passing the
   * full creature would let a component start reading `rarity` or `routine`, which is the kind of
   * drift `journey.ts` exists to prevent.
   */
  species: SpeciesMark | null;
}

export interface JournalEntry {
  title: string;
  description: string;
  creature: FieldNote;
  flora: FieldNote;
  /**
   * What the animal is doing at this hour, kept apart from what it *is*.
   *
   * Separate because it is the only line here that changes while the player stands still, and
   * mixing it into the creature's note made the panel reflow whenever a creature fell asleep.
   * The panel then resized, React reported new insets, and the camera refitted itself — the
   * map twitching because the day turned. Its own line can be given a reserved height.
   */
  doing: string;
}

/**
 * The fields the panel's mark is drawn from, and no more. See `FieldNote.species`.
 *
 * A union rather than one shape, because the two halves are now drawn from different canon facts:
 * an animal's mark comes from its `clade` and a plant's from its `growthForm`. Widening this to
 * one type carrying both optionally would let a plant be handed a clade, which is exactly the kind
 * of thing the old name-matching classifier used to do to itself.
 */
export type SpeciesMark =
  | { id: string; name: string; binomial: string | null; biomes: BiomeId[]; clade: Clade }
  | { id: string; name: string; binomial: string | null; biomes: BiomeId[]; growthForm: GrowthForm };

function markOf(s: Creature): SpeciesMark;
function markOf(s: Flora): SpeciesMark;
function markOf(s: Creature | Flora): SpeciesMark {
  const base = { id: s.id, name: s.name, binomial: s.binomial, biomes: s.biomes };
  return 'clade' in s ? { ...base, clade: s.clade } : { ...base, growthForm: s.growthForm };
}

/** Is this the tile the named place sits on? */
function isAt(place: Point | null, tile: Point): boolean {
  return Boolean(place && place.x === tile.x && place.y === tile.y);
}

/**
 * The heading for a tile.
 *
 * Named places get their name; everything else gets its terrain and coordinates. Grid references
 * are not atmospheric, but on unnamed ground they are the only thing that tells a player they have
 * actually moved, so they stay.
 */
function titleFor(world: World, tile: Tile): string {
  if (isAt(world.landmark, tile)) return landmarkTitle(world.landmark, world.seed);
  if (isAt(world.settlement, tile)) return `${world.settlement!.name}, a settlement`;

  const river = world.rivers.find((r) => r.path.some((p) => p.x === tile.x && p.y === tile.y));
  if (river) return `${river.name.replace(/^the /, 'The ')}, at ${tile.x}, ${tile.y}`;

  const biome = biomeFor(tile.biome);
  return biome ? `${biome.name} at ${tile.x}, ${tile.y}` : `Unmapped ground at ${tile.x}, ${tile.y}`;
}

export function describeTile(
  tile: Tile,
  world: World,
  moment: { timeOfDay: string; weather: string } | null = null
): JournalEntry {
  const seed = world.seed;
  const biome = biomeFor(tile.biome);
  const creature = creatureFor(tile, seed);
  const plant = floraFor(tile, seed);

  // The landmark describes itself rather than falling back to the generic "a memorable place waits
  // here" line, which was written when every landmark was the same.
  const description = isAt(world.landmark, tile)
    ? landmarkKindFor(world.landmark, seed).description
    : (biome?.description ?? 'Unmapped ground, waiting for a name.');

  return {
    title: titleFor(world, tile),
    description,
    // The creature's name was never shown before — the player read "A small deer watches from the
    // grass" and only learned it was a Painted Deer after sketching it. Naming it up front is the
    // whole point of a field note.
    creature: creature
      ? { name: creature.name, note: creature.journalPrompt, species: markOf(creature) }
      : {
          name: null,
          note: 'No creature signs yet, only wind, dust, and the road ahead.',
          species: null
        },
    doing: creature ? noteFor(creature, moment) : '',
    flora: plant
      ? { name: plant.name, note: plant.journalPrompt, species: markOf(plant) }
      : {
          name: null,
          note: 'Nothing is growing here worth pressing between the pages.',
          species: null
        }
  };
}

/**
 * The line written when the player sketches a creature.
 *
 * `mood` used to be read off a table that did not carry the field, so this printed "remember its
 * undefined presence" to the player. It is typed now, and the data is the only source.
 */
export function creatureAction(
  creature: Creature | null,
  moment: { timeOfDay: string; weather: string } | null = null
): string {
  if (!creature) return 'Listen quietly. The road has no creature sign to follow here.';
  if (!isPresent(routineFor(creature, moment))) {
    // A refusal that gives a reason and an hour. Coming back is the mechanic, not a penalty.
    return noteFor(creature, moment);
  }
  return `You make a quiet sketch of the ${creature.name.toLowerCase()} and remember its ${creature.mood} presence.`;
}

const COMPASS = [
  { name: 'east', dx: 1, dy: 0 },
  { name: 'west', dx: -1, dy: 0 },
  { name: 'south', dx: 0, dy: 1 },
  { name: 'north', dx: 0, dy: -1 }
] as const;

/** Which way the landmark lies, for the nudge in the journal. */
export function bearingTo(from: Point, to: Point): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return 'here';
  const parts: string[] = [];
  if (Math.abs(dy) > Math.abs(dx) / 2) parts.push(dy > 0 ? 'south' : 'north');
  if (Math.abs(dx) > Math.abs(dy) / 2) parts.push(dx > 0 ? 'east' : 'west');
  return parts.join('-') || 'here';
}

/**
 * What the traveller can see from where they stand.
 *
 * The map is only legible if the journal talks about more than the single tile under the player's
 * feet — this is what turns a grid of colours into a place.
 */
export function describeSurroundings(world: World, at: Point): string {
  const seen = new Map<string, string[]>();
  for (const { name, dx, dy } of COMPASS) {
    for (let distance = 1; distance <= 4; distance += 1) {
      const x = at.x + dx * distance;
      const y = at.y + dy * distance;
      if (x < 0 || y < 0 || x >= world.width || y >= world.height) break;
      const tile = world.tiles[y]![x]!;
      if (tile.biome === world.tiles[at.y]![at.x]!.biome) continue;
      const biome = biomeFor(tile.biome);
      if (!biome) continue;
      const names = seen.get(biome.name) ?? [];
      if (!names.includes(name)) names.push(name);
      seen.set(biome.name, names);
      break;
    }
  }

  if (seen.size === 0) return 'The same country runs on in every direction.';
  const phrases = [...seen].map(([place, directions]) => `${place.toLowerCase()} to the ${directions.join(' and ')}`);
  const last = phrases.pop()!;
  return phrases.length
    ? `You can make out ${phrases.join(', ')}, and ${last}.`
    : `You can make out ${last}.`;
}

/**
 * The nudge toward the landmark.
 *
 * Named from the start, and named the same way the whole walk, so the goal is a place the player
 * is going to rather than a marker on a grid. Vague at distance, specific up close.
 */
export function landmarkHint(world: World, at: Point): string {
  const steps = Math.abs(world.landmark.x - at.x) + Math.abs(world.landmark.y - at.y);
  const name = world.landmark.name;
  if (steps === 0) return `This is ${name}. Sit a while, and write it down before the light goes.`;

  const bearing = bearingTo(at, world.landmark);
  if (steps <= 3) return `${name} is very close now, just ${bearing} of here.`;
  if (steps <= 10) return `${name} lies ${bearing} of here. You are close.`;
  return `The elders spoke of ${name}, far to the ${bearing}. It will take most of the day.`;
}

/**
 * Where there is still something to go and see, and where the nearest shelter is.
 *
 * **Legibility, not direction.** Nothing here locks, gates or requires anything: the player asked
 * to be less lost, not to be led, and three separate records say this design is deliberately open.
 * So this names a place and gives a bearing, in the same voice `landmarkHint` uses -- and says
 * nothing at all when there is nothing useful to say, rather than filling the line.
 *
 * The camp is only mentioned when it is somewhere else. Standing in one and being told where it
 * is reads as broken.
 */
export function whereNextHint(
  placed: PlacedPoi[],
  at: Point,
  discovered: ReadonlySet<string>
): string {
  const lines: string[] = [];

  const next = nearestUnvisited(placed, at, discovered);
  const steps = next ? stepsBetween(next.at, at) : 0;

  // Nothing to say about the place being stood on. `bearingTo` answers 'here' at distance zero,
  // which the templates below turn into "The Tide Market is just here of here." -- found by
  // printing the line for all four real maps rather than by a unit test, because the fixtures
  // never happened to start the traveller on top of a place. The engine's own fog marks the
  // starting tile, but a save loaded onto a place would land exactly here.
  if (next && steps > 0) {
    const bearing = bearingTo(at, next.at);
    // No distance banding beyond near and far: "just east of here" is the useful thing to say,
    // and a step count would be the map talking rather than the traveller.
    lines.push(
      steps <= 3
        ? `${next.poi.name} is just ${bearing} of here.`
        : `You have not been to ${next.poi.name}, ${bearing} of here.`
    );
  }

  // Not when standing in it, and not when it is the place just named. A camp is also somewhere
  // you have not been, so the nearest unvisited place is often the nearest camp -- and saying
  // "The Camp is just east of here. The Camp would do for the night." names it twice.
  const camp = nearestCamp(placed, at);
  if (camp && stepsBetween(camp.at, at) > 0 && !(next && steps > 0 && camp.poi.id === next.poi.id)) {
    lines.push(`${camp.poi.name} would do for the night.`);
  }

  return lines.join(' ');
}

/**
 * The page written on arrival — the end of the session.
 *
 * This is the one piece of prose the player is meant to stop and read, so it is authored per
 * landmark kind in `data/landmarks.json` rather than assembled from fragments. Everything else in
 * the journal describes; this one is supposed to land.
 */
export function arrivalPage(world: World): { title: string; body: string; closing: string } {
  const kind = landmarkKindFor(world.landmark, world.seed);
  const from = world.settlement ? ` You set out from ${world.settlement.name}.` : '';
  return {
    title: landmarkTitle(world.landmark, world.seed),
    body: kind.arrival,
    closing: `Recorded in the travel journal: ${world.landmark.name}, on the seed "${world.seed}".${from}`
  };
}
