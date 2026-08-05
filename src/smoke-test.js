import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generateWorld, reachableTiles } from './generator.js';
import { describeTile } from './journal.js';
import { buildSpecies } from './species.js';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const read = (name) => JSON.parse(readFileSync(join(dataDir, `${name}.json`), 'utf8'));

const biomes = read('biomes');
const creatures = read('creatures');
const flora = read('flora');
const species = buildSpecies({ biomes, creatures, flora });

const seeds = ['play-test', 'river-road', 'monsoon-evening', 'highland-path', 'delta-camp'];
const world = generateWorld({ seed: seeds[0], width: 36, height: 24 });
const tiles = world.tiles.flat();
const worldBiomes = new Set(tiles.map((tile) => tile.biome));

if (world.tiles.length !== 24 || world.tiles.some((row) => row.length !== 36)) {
  throw new Error('Generated world dimensions are incorrect.');
}

if (!world.start || world.tiles[world.start.y][world.start.x].biome === 'sea') {
  throw new Error('Player start should exist on walkable terrain.');
}

if (!world.landmark) {
  throw new Error('A restful landmark objective should be generated.');
}

const reachable = reachableTiles(world.tiles, world.width, world.height, world.start);
if (!reachable.has(`${world.landmark.x},${world.landmark.y}`)) {
  throw new Error('Landmark should be reachable from the player start.');
}

seeds.forEach((seed) => {
  const journey = generateWorld({ seed, width: 36, height: 24 });
  const journeyReachable = reachableTiles(journey.tiles, journey.width, journey.height, journey.start);
  if (!journeyReachable.has(`${journey.landmark.x},${journey.landmark.y}`)) {
    throw new Error(`Landmark should be reachable for seed ${seed}.`);
  }
});

if (worldBiomes.size < 5) {
  throw new Error(`Expected at least five biomes, got ${worldBiomes.size}.`);
}

// --- Species data ---------------------------------------------------------

const biomeIds = new Set(biomes.map((biome) => biome.id));

[['creatures', creatures], ['flora', flora]].forEach(([label, entries]) => {
  entries.forEach((entry) => {
    if (!entry.id || !entry.name || !entry.journalPrompt) {
      throw new Error(`${label} entry is missing id, name, or journalPrompt: ${entry.id || entry.name}`);
    }
    entry.biomes.forEach((biome) => {
      if (!biomeIds.has(biome)) {
        throw new Error(`${label} "${entry.name}" references unknown biome "${biome}".`);
      }
    });
  });
  const ids = entries.map((entry) => entry.id);
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicate) throw new Error(`Duplicate ${label} id: ${duplicate}`);
});

creatures.filter((creature) => creature.placement === 'encounter').forEach((creature) => {
  if (!creature.mood) throw new Error(`Encounterable creature "${creature.name}" has no mood.`);
});

// Every biome a player can stand on needs something to see and something growing.
biomes.filter((biome) => biome.walkable).forEach((biome) => {
  if (species.creaturesIn(biome.id).length === 0) {
    throw new Error(`Biome "${biome.id}" has no encounterable creature.`);
  }
  if (species.floraIn(biome.id).length === 0) {
    throw new Error(`Biome "${biome.id}" has no flora.`);
  }
});

// --- Journal --------------------------------------------------------------

const startTile = world.tiles[world.start.y][world.start.x];
const entry = describeTile(startTile, species, world.seed);
['title', 'description', 'creature', 'flora'].forEach((field) => {
  if (!entry[field]) throw new Error(`Journal entry should include ${field}.`);
});

// The same tile must read the same way on every revisit, and must never surface lore-only species.
const loreNames = new Set(
  [...creatures, ...flora].filter((s) => s.placement === 'lore').map((s) => s.name)
);
tiles.forEach((tile) => {
  const first = describeTile(tile, species, world.seed);
  const second = describeTile(tile, species, world.seed);
  if (first.creature !== second.creature || first.flora !== second.flora) {
    throw new Error(`Journal entry for ${tile.x},${tile.y} is not deterministic.`);
  }
  if (loreNames.has(first.creatureName) || loreNames.has(first.floraName)) {
    throw new Error(`Lore-only species surfaced in play at ${tile.x},${tile.y}.`);
  }
});

const described = tiles.filter((tile) => describeTile(tile, species, world.seed).floraName).length;
console.log(`Generated ${world.width}x${world.height} world with ${worldBiomes.size} biomes. Start: ${world.start.x},${world.start.y}.`);
console.log(`Species: ${creatures.length} creatures, ${flora.length} flora. ${described}/${tiles.length} tiles name a plant.`);
