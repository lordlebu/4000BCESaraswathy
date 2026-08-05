// Shared species layer: turns data/*.json into per-tile lookups.
//
// Deliberately free of DOM and framework code so it can be unit-tested under Node and reused by
// the React shell later. buildSpecies is pure; loadSpecies is the only part that touches the
// network.

// Small deterministic hash so a tile always yields the same neighbours. Using the world seed as
// well means a new journey re-populates the map without changing within a single journey.
function tileHash(seed, x, y, salt) {
  let hash = 2166136261;
  for (const char of `${seed}:${x},${y}:${salt}`) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  return (hash ^= hash >>> 16) >>> 0;
}

function pick(list, seed, tile, salt) {
  if (list.length === 0) return null;
  return list[tileHash(seed, tile.x, tile.y, salt) % list.length];
}

function indexByBiome(entries, placement) {
  const index = {};
  for (const entry of entries) {
    if (entry.placement !== placement) continue;
    for (const biome of entry.biomes) {
      (index[biome] = index[biome] || []).push(entry);
    }
  }
  return index;
}

export function buildSpecies({ biomes, creatures, flora }) {
  const biomesById = Object.fromEntries(biomes.map((biome) => [biome.id, biome]));
  const creaturesByBiome = indexByBiome(creatures, 'encounter');
  const floraByBiome = indexByBiome(flora, 'flavour');

  return {
    biomes,
    creatures,
    flora,
    biomeFor: (tile) => biomesById[tile.biome] || null,
    creaturesIn: (biome) => creaturesByBiome[biome] || [],
    floraIn: (biome) => floraByBiome[biome] || [],
    // One creature and one plant per tile, stable across revisits.
    creatureFor: (tile, seed) => pick(creaturesByBiome[tile.biome] || [], seed, tile, 'creature'),
    floraFor: (tile, seed) => pick(floraByBiome[tile.biome] || [], seed, tile, 'flora')
  };
}

export async function loadSpecies() {
  const [biomes, creatures, flora] = await Promise.all(
    ['biomes', 'creatures', 'flora'].map(async (name) => {
      // Resolved against this module, not the page, so the document's URL cannot break it.
      const url = new URL(`../data/${name}.json`, import.meta.url);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Could not load data/${name}.json (${response.status})`);
      return response.json();
    })
  );
  return buildSpecies({ biomes, creatures, flora });
}
