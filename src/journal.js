const BIOME_DESCRIPTIONS = {
  sea: 'The Tethyan water breathes in slow teal bands. A ferry would be needed to cross safely.',
  coast: 'Sand, shells, and salt grass mark the meeting place of land and old sea.',
  plains: 'Open grassland rolls ahead, warm and easy on tired feet.',
  forest: 'Rounded canopies gather into green shade, full of birdsong and hidden paths.',
  wetland: 'Reeds and shallow pools shine with patient life.',
  hills: 'Ochre hills rise and fall like sleeping cattle beneath the sun.',
  mountains: 'Lavender-gray peaks hold the horizon and turn every step into a vista.',
  desert: 'Gold dust, low stones, and long quiet make this a place for careful travel.',
  river: 'A bright river line braids the land together and makes the air feel cooler.',
  settlement: 'A welcoming cluster of clay roofs, flags, and evening cook-smoke offers rest.',
  landmark: 'A memorable place waits here, asking to be named in your travel journal.'
};

const CREATURES = [
  { name: 'River Otter', biomes: ['river', 'wetland', 'forest'], prompt: 'A slick shape rolls through the shallows, leaving rings of silver water behind.' },
  { name: 'Painted Deer', biomes: ['plains', 'forest'], prompt: 'A small deer watches from the grass, its coat patterned like fallen petals.' },
  { name: 'Monsoon Crane', biomes: ['wetland', 'river', 'coast'], prompt: 'Tall white birds step between reeds as if reading the rain.' },
  { name: 'Hill Macaque', biomes: ['hills', 'forest', 'settlement'], prompt: 'A macaque studies your satchel, then pretends it was only admiring the view.' },
  { name: 'Shell Turtle', biomes: ['coast', 'river'], prompt: 'A turtle rests where river sand meets the tide, carrying a map of scratches on its shell.' },
  { name: 'Cloud Antelope', biomes: ['mountains', 'hills'], prompt: 'For a breath, an antelope-shaped cloud stands on a ridge before dissolving into mist.' }
];

function describeTile(tile) {
  const possibleCreatures = CREATURES.filter((creature) => creature.biomes.includes(tile.biome));
  const creature = possibleCreatures[(tile.x + tile.y) % Math.max(possibleCreatures.length, 1)];
  return {
    title: `${tile.biome[0].toUpperCase()}${tile.biome.slice(1)} at ${tile.x}, ${tile.y}`,
    description: BIOME_DESCRIPTIONS[tile.biome],
    creature: creature ? creature.prompt : 'No creature signs yet, only wind, dust, and the road ahead.'
  };
}

if (typeof module !== 'undefined') {
  module.exports = { BIOME_DESCRIPTIONS, CREATURES, describeTile };
}
