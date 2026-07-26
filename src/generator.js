const BIOME_COLORS = {
  sea: '#2f6f8f',
  coast: '#e8c982',
  plains: '#9fc96b',
  forest: '#4f9a5a',
  wetland: '#6fb7a8',
  hills: '#b89b58',
  mountains: '#8d8796',
  desert: '#d9a95f',
  river: '#4fa3d9',
  settlement: '#c46b4f',
  landmark: '#f2d16b'
};

const BIOME_SYMBOLS = {
  sea: '~', coast: '.', plains: '·', forest: '♣', wetland: '≈', hills: '⌒', mountains: '▲', desert: '∴', river: '≈', settlement: '⌂', landmark: '✦'
};

function hashSeed(seed) {
  let hash = 1779033703 ^ String(seed).length;
  for (let i = 0; i < String(seed).length; i += 1) {
    hash = Math.imul(hash ^ String(seed).charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    return (hash ^= hash >>> 16) >>> 0;
  };
}

function mulberry32(seedNumber) {
  return () => {
    let t = seedNumber += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRandom(seed) {
  return mulberry32(hashSeed(seed)());
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function makeField(width, height, random, passes = 5) {
  const field = Array.from({ length: height }, () => Array.from({ length: width }, () => random()));
  for (let pass = 0; pass < passes; pass += 1) {
    const copy = field.map((row) => row.slice());
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let sum = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              sum += copy[ny][nx];
              count += 1;
            }
          }
        }
        field[y][x] = sum / count;
      }
    }
  }
  return field;
}

function classifyBiome(elevation, moisture, temperature) {
  if (elevation < 0.28) return 'sea';
  if (elevation < 0.34) return 'coast';
  if (elevation > 0.78) return 'mountains';
  if (elevation > 0.64) return 'hills';
  if (moisture > 0.72) return 'wetland';
  if (moisture > 0.55) return 'forest';
  if (temperature > 0.68 && moisture < 0.38) return 'desert';
  return 'plains';
}

function getNeighbors(tile, width, height) {
  return [
    [tile.x + 1, tile.y], [tile.x - 1, tile.y], [tile.x, tile.y + 1], [tile.x, tile.y - 1]
  ].filter(([x, y]) => x >= 0 && x < width && y >= 0 && y < height);
}

function carveRiver(tiles, width, height, start) {
  let current = start;
  const visited = new Set();
  for (let step = 0; step < width + height; step += 1) {
    const key = `${current.x},${current.y}`;
    if (visited.has(key)) break;
    visited.add(key);
    if (!['sea', 'coast', 'settlement', 'landmark'].includes(current.biome)) {
      current.biome = 'river';
    }
    if (current.elevation < 0.34) break;
    const next = getNeighbors(current, width, height)
      .map(([x, y]) => tiles[y][x])
      .sort((a, b) => (a.elevation + a.riverBias) - (b.elevation + b.riverBias))[0];
    if (!next || next.elevation > current.elevation + 0.04) break;
    current = next;
  }
}

function placeFeature(tiles, width, height, biomeOptions, featureBiome, random) {
  const candidates = tiles.flat().filter((tile) => biomeOptions.includes(tile.biome));
  if (candidates.length === 0) return null;
  const chosen = candidates[Math.floor(random() * candidates.length)];
  chosen.biome = featureBiome;
  return chosen;
}

function generateWorld({ seed = 'jambhudweepa', width = 36, height = 24 } = {}) {
  const random = createRandom(seed);
  const elevationField = makeField(width, height, random, 7);
  const moistureField = makeField(width, height, random, 6);
  const tiles = [];

  for (let y = 0; y < height; y += 1) {
    const row = [];
    for (let x = 0; x < width; x += 1) {
      const edgeDistance = Math.min(x, y, width - 1 - x, height - 1 - y) / Math.min(width, height);
      const westSea = 0.22 * (1 - x / width);
      const elevation = clamp((elevationField[y][x] * 0.78) + (edgeDistance * 0.35) - westSea);
      const temperature = clamp(0.35 + (y / height) * 0.45 + random() * 0.12);
      const moisture = clamp(moistureField[y][x] + (x / width) * 0.18 - (temperature * 0.12));
      row.push({
        x, y, elevation, moisture, temperature,
        biome: classifyBiome(elevation, moisture, temperature),
        riverBias: random() * 0.08,
        discovered: false
      });
    }
    tiles.push(row);
  }

  const highTiles = tiles.flat().filter((tile) => ['mountains', 'hills'].includes(tile.biome));
  highTiles.sort(() => random() - 0.5).slice(0, 5).forEach((tile) => carveRiver(tiles, width, height, tile));

  const settlement = placeFeature(tiles, width, height, ['coast', 'plains', 'river'], 'settlement', random);
  const landmark = placeFeature(tiles, width, height, ['forest', 'hills', 'mountains', 'wetland'], 'landmark', random);
  const start = settlement || tiles[Math.floor(height / 2)][Math.floor(width / 2)];
  start.discovered = true;

  return { seed, width, height, tiles, start: { x: start.x, y: start.y }, landmark: landmark && { x: landmark.x, y: landmark.y } };
}

if (typeof module !== 'undefined') {
  module.exports = { BIOME_COLORS, BIOME_SYMBOLS, generateWorld, createRandom };
}
