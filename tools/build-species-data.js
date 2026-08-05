// Regenerates data/creatures.json and data/flora.json from docs/bestiary.md.
//
// The bestiary is authored prose organised by region; the generator places tiles by biome. This
// script bridges the two, so the data files never have to be hand-maintained and cannot drift from
// the canon. Re-run it after editing the bestiary:  node tools/build-species-data.js
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'docs', 'bestiary.md');
const creatureTarget = path.join(root, 'data', 'creatures.json');
const floraTarget = path.join(root, 'data', 'flora.json');

const REGIONS = {
  '1': 'saraswati-godavari-deltas',
  '2': 'narmada-vindhya',
  '3': 'gedrosian-taklamakan',
  '4': 'shattered-sea-mappa-mundi',
  '5': 'ganges-lava-sea',
  '6': 'tethys-sky-routes',
  '7': 'asura-conjurations'
};

// Where a region's species land when nothing more specific is detected in the prose.
const REGION_BIOMES = {
  'saraswati-godavari-deltas': ['wetland', 'river'],
  'narmada-vindhya': ['hills', 'mountains'],
  'gedrosian-taklamakan': ['desert'],
  'shattered-sea-mappa-mundi': ['sea', 'forest'],
  'ganges-lava-sea': ['mountains'],
  'tethys-sky-routes': [],
  'asura-conjurations': []
};

// Read biome first from the prose, which is more reliable than the region heading: Section 1
// alone carries eight species that describe other regions entirely.
const BIOME_HINTS = [
  ['sea', /\b(sea|ocean|marine|oceanic|reef|coral|lagoon|pelagic|open water|whale|abyssal|deep[- ]sea)\b/i],
  ['coast', /\b(coast|coastal|shore|shoreline|beach|estuar\w*|brackish|mangrove|tidal|tide|shorebird|sandy riverbank|salt marsh)\b/i],
  ['river', /\b(river\w*|stream\w*|tributar\w*|riverbed|freshwater|stepwell|riverside)\b/i],
  ['wetland', /\b(marsh\w*|swamp\w*|wetland|reed\w*|bog|delta pool|lotus|mud[- ]?pool|shallow pool)\b/i],
  ['forest', /\b(forest|canopy|canopies|jungle|arboreal|woodland|foliage|leaf litter|tree\w*|thicket|grove|vine)\b/i],
  ['hills', /\b(hill\w*|cliff\w*|ledge\w*|scree|plateau|crag\w*|ridge\w*|foothill\w*)\b/i],
  ['mountains', /\b(mountain\w*|peak\w*|summit|alpine|highland\w*|glacier|glacial|volcanic|basalt|caldera|lava|magma|cave\w*)\b/i],
  ['desert', /\b(desert|dune\w*|sand\w*|arid|salt flat\w*|salt plain\w*|oasis|wastes)\b/i],
  ['settlement', /\b(settlement|village|town|city|street\w*|court\w*|temple\w*|Harappa\w*|fortress|ruins?)\b/i],
  ['plains', /\b(plain\w*|grassland|steppe|meadow|savanna|open grass)\b/i]
];

const MOOD_HINTS = [
  ['uncanny', /\b(asura|mutated|cursed|spectral|construct|corrupt\w*|resurrect\w*|unnatural|wraith|shadow|mantras?)\b/i],
  ['luminous', /\b(glow\w*|glowing|bioluminescen\w*|shimmer\w*|iridescen\w*|phosphor\w*|luminous)\b/i],
  ['fearsome', /\b(venom\w*|toxic|predator\w*|ambush\w*|aggressive|hunts?|hunting|prowl\w*|razor|paralyz\w*|deadly)\b/i],
  ['graceful', /\b(glide\w*|gliding|soar\w*|drift\w*|dances?|dancing|weightless|float\w*)\b/i],
  ['playful', /\b(playful|young|calf|agile|leap\w*|sprint\w*|nimble)\b/i],
  ['patient', /\b(patient\w*|slow\w*|waits?|waiting|burrow\w*|buried|long-lived|camouflag\w*)\b/i],
  ['clever', /\b(intelligent|problem-solving|cognitavi|symbiotic|complex|navigator|wisdom)\b/i]
];

function slug(value) {
  return value.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Sky species have no equivalent among the ten ground biomes, and their prose mentions terrain
// they only fly over ("aero-mangrove", "sky coral"), which would otherwise mis-file them.
const SKY_MARKER = /\b(floating island\w*|sky[- ]\w+|aero[- ]\w+|prana|low[- ]gravity|lodestone|airborne|cloud[- ]weaver)\b/i;

function placeFor(text, region) {
  const detected = [...new Set(
    BIOME_HINTS.filter(([, pattern]) => pattern.test(text)).map(([biome]) => biome)
  )].slice(0, 3);

  if (region === 'tethys-sky-routes' || SKY_MARKER.test(text)) {
    return { biomes: [], placement: 'lore' };
  }
  // Prose keywords bleed across regions: a volcanic moth mentions "ash-banyan trees" and lands in
  // forest, a lava-lake rat mentions "ruins" and lands in a village. When the prose agrees with the
  // species' own region, keep only that agreement. Species whose prose matches nothing in their
  // region keep the prose — that is what re-files the Section 1 strays.
  const home = (REGION_BIOMES[region] || []).filter((biome) => detected.includes(biome));
  if (home.length) {
    return { biomes: home, placement: region === 'asura-conjurations' ? 'lore' : 'encounter' };
  }
  // Asura conjurations keep their detected habitat, but stay out of the encounter tables until
  // the tone question in docs/bestiary.md is settled.
  if (region === 'asura-conjurations') {
    return { biomes: detected, placement: 'lore' };
  }
  const biomes = detected.length ? detected : REGION_BIOMES[region];
  return { biomes, placement: biomes.length ? 'encounter' : 'lore' };
}

function moodFor(text) {
  const hit = MOOD_HINTS.find(([, pattern]) => pattern.test(text));
  return hit ? hit[0] : 'watchful';
}

function rarityFor(text, region) {
  if (region === 'asura-conjurations' || /\b(mythic|legendary|colossal|titan)\b/i.test(text)) return 'mythic';
  if (region === 'ganges-lava-sea' || region === 'tethys-sky-routes') return 'rare';
  if (/\b(giant|massive|elite|rare|hyper-intelligent)\b/i.test(text)) return 'rare';
  return 'common';
}

function parseBestiary(kind) {
  const lines = fs.readFileSync(source, 'utf8').split(/\r?\n/);
  const entries = [];
  let region = null;
  let list = null;

  for (const line of lines) {
    const section = line.match(/^## Section (\d+):/);
    if (section) {
      region = REGIONS[section[1]];
      list = null;
      continue;
    }
    if (/^### Fauna/.test(line)) { list = 'fauna'; continue; }
    if (/^### Flora/.test(line)) { list = 'flora'; continue; }
    if (/^## /.test(line)) { region = null; list = null; continue; }
    if (list !== kind || !region) continue;

    const entry = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s+—\s+(.+)$/);
    if (!entry) continue;

    let [, heading, description] = entry;
    let binomial = null;
    const named = heading.match(/^(.*?)\s*\(\*(.+?)\*\)\s*$/);
    if (named) {
      heading = named[1].trim();
      binomial = named[2].trim();
    }

    const text = `${heading} ${description}`;
    const { biomes, placement } = placeFor(text, region);
    const record = {
      id: slug(heading),
      name: heading,
      binomial,
      region,
      biomes,
      // Creatures are met; plants are simply there. Keeping the vocabularies apart lets the
      // journal ask for one without accidentally drawing the other.
      placement: placement === 'encounter' && kind === 'flora' ? 'flavour' : placement,
      rarity: rarityFor(text, region),
      ...(kind === 'fauna' ? { mood: moodFor(text) } : {}),
      journalPrompt: description.trim()
    };
    entries.push(record);
  }
  return entries;
}

// The six original prototype creatures predate the bestiary and are referenced by the cozy MVP,
// so they are preserved rather than replaced.
const STARTERS = [
  ['river-otter', 'River Otter', 'playful', ['river', 'wetland', 'forest'], 'A slick shape rolls through the shallows, leaving rings of silver water behind.'],
  ['painted-deer', 'Painted Deer', 'gentle', ['plains', 'forest'], 'A small deer watches from the grass, its coat patterned like fallen petals.'],
  ['monsoon-crane', 'Monsoon Crane', 'graceful', ['wetland', 'river', 'coast'], 'Tall white birds step between reeds as if reading the rain.'],
  ['hill-macaque', 'Hill Macaque', 'curious', ['hills', 'forest', 'settlement'], 'A macaque studies your satchel, then pretends it was only admiring the view.'],
  ['shell-turtle', 'Shell Turtle', 'patient', ['coast', 'river'], 'A turtle rests where river sand meets the tide, carrying a map of scratches on its shell.'],
  ['cloud-antelope', 'Cloud Antelope', 'mythic', ['mountains', 'hills'], 'For a breath, an antelope-shaped cloud stands on a ridge before dissolving into mist.']
].map(([id, name, mood, biomes, journalPrompt]) => ({
  id, name, binomial: null, region: 'prototype-starters', biomes,
  placement: 'encounter', rarity: 'common', mood, journalPrompt
}));

// The bestiary was written by region, not by biome, so some biomes have no plant of their own —
// there are no grassland or village species in it. Rather than invent flora, the closest existing
// species is granted that biome as well, and only when the biome would otherwise be empty.
const FLORA_BIOME_FALLBACK = {
  plains: ['tawny-sagebrush', 'golden-sun-barley'],
  settlement: ['sweet-indigo', 'oasis-date-palm'],
  landmark: ['mappa-mundi-banyan', 'silver-leaved-oracle-fig']
};

// Landmarks are the one place the player is guaranteed to stand, so they get something memorable
// rather than "no creature signs yet".
const CREATURE_BIOME_FALLBACK = {
  landmark: ['cloud-antelope', 'indus-unicorn', 'vanga-pearl-guide']
};

function dedupeIds(entries) {
  const seen = new Map();
  for (const entry of entries) {
    const count = (seen.get(entry.id) || 0) + 1;
    seen.set(entry.id, count);
    if (count > 1) entry.id = `${entry.id}-${count}`;
  }
  return entries;
}

function coverage(entries) {
  const byBiome = {};
  for (const entry of entries) {
    if (entry.placement === 'lore') continue;
    for (const biome of entry.biomes) byBiome[biome] = (byBiome[biome] || 0) + 1;
  }
  return byBiome;
}

function report(label, entries) {
  const byBiome = coverage(entries);
  const lore = entries.filter((entry) => entry.placement === 'lore').length;
  console.log(`Wrote ${entries.length} ${label}`);
  console.log(`  in play: ${entries.length - lore} | lore-only: ${lore}`);
  console.log('  per biome:', Object.entries(byBiome).sort((a, b) => b[1] - a[1])
    .map(([biome, count]) => `${biome} ${count}`).join(', '));
}

const creatures = dedupeIds([...STARTERS, ...parseBestiary('fauna')]);
const flora = dedupeIds(parseBestiary('flora'));

const biomeIds = JSON.parse(fs.readFileSync(path.join(root, 'data', 'biomes.json'), 'utf8'))
  .filter((biome) => biome.walkable)
  .map((biome) => biome.id);

function fillGaps(label, entries, fallbacks) {
  for (const biome of biomeIds) {
    if (coverage(entries)[biome]) continue;
    const filled = (fallbacks[biome] || [])
      .map((id) => entries.find((entry) => entry.id === id))
      .filter(Boolean);
    if (filled.length === 0) {
      console.warn(`  ! no ${label} for biome "${biome}" and no fallback defined`);
      continue;
    }
    filled.forEach((entry) => entry.biomes.push(biome));
    console.log(`  filled empty ${label} biome "${biome}" with ${filled.map((e) => e.name).join(', ')}`);
  }
}

fillGaps('flora', flora, FLORA_BIOME_FALLBACK);
fillGaps('creature', creatures, CREATURE_BIOME_FALLBACK);

fs.writeFileSync(creatureTarget, `${JSON.stringify(creatures, null, 2)}\n`, 'utf8');
fs.writeFileSync(floraTarget, `${JSON.stringify(flora, null, 2)}\n`, 'utf8');

report('creatures to data/creatures.json', creatures);
report('flora to data/flora.json', flora);
