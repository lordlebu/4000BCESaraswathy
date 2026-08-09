// The travel journal: presentation only.
//
// Every string the player reads comes from `data/*.json` through `species.ts`, so the bestiary
// stays the single source of truth and this file holds nothing but phrasing.

import { biomeFor, creatureFor, floraFor } from './species';
import type { Creature, Point, Tile, World } from '../world/types';

export interface JournalEntry {
  title: string;
  description: string;
  creature: string;
  flora: string;
  creatureName: string | null;
  floraName: string | null;
}

export function describeTile(tile: Tile, seed: string): JournalEntry {
  const biome = biomeFor(tile.biome);
  const creature = creatureFor(tile, seed);
  const plant = floraFor(tile, seed);

  return {
    title: biome ? `${biome.name} at ${tile.x}, ${tile.y}` : `Unmapped ground at ${tile.x}, ${tile.y}`,
    description: biome ? biome.description : 'Unmapped ground, waiting for a name.',
    creature: creature
      ? creature.journalPrompt
      : 'No creature signs yet, only wind, dust, and the road ahead.',
    flora: plant
      ? `${plant.name} grows here. ${plant.journalPrompt}`
      : 'Nothing is growing here worth pressing between the pages.',
    creatureName: creature?.name ?? null,
    floraName: plant?.name ?? null
  };
}

/**
 * The line written when the player sketches a creature.
 *
 * `mood` used to be read off a table that did not carry the field, so this printed "remember its
 * undefined presence" to the player. It is typed now, and the data is the only source.
 */
export function creatureAction(creature: Creature | null): string {
  if (!creature) return 'Listen quietly. The road has no creature sign to follow here.';
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

export function landmarkHint(world: World, at: Point): string {
  const steps = Math.abs(world.landmark.x - at.x) + Math.abs(world.landmark.y - at.y);
  if (steps === 0) {
    return 'This is the place. Sit a while, and write it down before the light goes.';
  }
  const bearing = bearingTo(at, world.landmark);
  if (steps <= 3) return `Something worth seeing is very close, just ${bearing} of here.`;
  if (steps <= 10) return `The elders spoke of a place ${bearing} of here. You are close now.`;
  return `The elders spoke of a place far to the ${bearing}. It will take most of the day.`;
}
