const { generateWorld, reachableTiles } = require('./generator');
const { describeTile } = require('./journal');

const seeds = ['play-test', 'river-road', 'monsoon-evening', 'highland-path', 'delta-camp'];
const world = generateWorld({ seed: seeds[0], width: 36, height: 24 });
const tiles = world.tiles.flat();
const biomes = new Set(tiles.map((tile) => tile.biome));

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

if (biomes.size < 5) {
  throw new Error(`Expected at least five biomes, got ${biomes.size}.`);
}

const entry = describeTile(world.tiles[world.start.y][world.start.x]);
if (!entry.title || !entry.description || !entry.creature) {
  throw new Error('Journal entry should include title, description, and creature text.');
}

console.log(`Generated ${world.width}x${world.height} world with ${biomes.size} biomes. Start: ${world.start.x},${world.start.y}.`);
