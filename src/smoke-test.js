const { generateWorld } = require('./generator');
const { describeTile } = require('./journal');

const world = generateWorld({ seed: 'play-test', width: 36, height: 24 });
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

if (biomes.size < 5) {
  throw new Error(`Expected at least five biomes, got ${biomes.size}.`);
}

const entry = describeTile(world.tiles[world.start.y][world.start.x]);
if (!entry.title || !entry.description || !entry.creature) {
  throw new Error('Journal entry should include title, description, and creature text.');
}

console.log(`Generated ${world.width}x${world.height} world with ${biomes.size} biomes. Start: ${world.start.x},${world.start.y}.`);
