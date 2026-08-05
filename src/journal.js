// Journal text. Every string now comes from data/*.json via the species layer, so the bestiary is
// the single source of truth and this file holds only presentation.

function titleFor(tile, biome) {
  const name = biome ? biome.name : `${tile.biome[0].toUpperCase()}${tile.biome.slice(1)}`;
  return `${name} at ${tile.x}, ${tile.y}`;
}

export function describeTile(tile, species, seed) {
  const biome = species.biomeFor(tile);
  const creature = species.creatureFor(tile, seed);
  const plant = species.floraFor(tile, seed);

  return {
    title: titleFor(tile, biome),
    description: biome ? biome.description : 'Unmapped ground, waiting for a name.',
    creature: creature
      ? creature.journalPrompt
      : 'No creature signs yet, only wind, dust, and the road ahead.',
    flora: plant
      ? `${plant.name} grows here. ${plant.journalPrompt}`
      : 'Nothing is growing here worth pressing between the pages.',
    creatureName: creature ? creature.name : null,
    floraName: plant ? plant.name : null
  };
}

export function creatureAction(creature) {
  if (!creature) return 'Listen quietly. The road has no creature sign to follow here.';
  return `You make a quiet sketch of the ${creature.name.toLowerCase()} and remember its ${creature.mood} presence.`;
}
