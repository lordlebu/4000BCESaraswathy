import { BIOME_COLORS, BIOME_SYMBOLS, generateWorld } from './generator.js';
import { describeTile, creatureAction } from './journal.js';
import { loadSpecies } from './species.js';

const canvas = document.querySelector('#world');
const context = canvas.getContext('2d');
const seedInput = document.querySelector('#seed');
const journalTitle = document.querySelector('#journal-title');
const journalText = document.querySelector('#journal-text');
const creatureText = document.querySelector('#creature-text');
const floraText = document.querySelector('#flora-text');
const statusText = document.querySelector('#status-text');
const newMapButton = document.querySelector('#new-map');
const observeButton = document.querySelector('#observe-creature');
const memoryText = document.querySelector('#memory-text');

const tileSize = 22;
let species = null;
let world = null;
let player = { x: 0, y: 0 };
let discoveries = new Set();
let observedCreatures = new Set();
let facing = 1;

// Source crop for the sprite sheet. The artwork carries faint layout guides in its margins,
// so we draw only the region that holds the figure itself.
const PLAYER_SPRITE = { src: '../assets/Varuna.png', x: 139, y: 0, width: 621, height: 867 };
const playerImage = new Image();
let playerImageReady = false;
playerImage.addEventListener('load', () => {
  playerImageReady = true;
  if (world) drawWorld();
});
playerImage.addEventListener('error', () => {
  playerImageReady = false;
  console.warn(`Player sprite failed to load from ${PLAYER_SPRITE.src}; using the marker instead.`);
});
playerImage.src = PLAYER_SPRITE.src;

function storageKey() {
  return `south-of-tethys:${world.seed}`;
}

const SAVE_VERSION = 1;

function saveJourney() {
  localStorage.setItem(storageKey(), JSON.stringify({
    version: SAVE_VERSION,
    discoveries: [...discoveries],
    observedCreatures: [...observedCreatures]
  }));
}

function restoreJourney() {
  const saved = localStorage.getItem(storageKey());
  if (!saved) return;
  try {
    const journey = JSON.parse(saved);
    if (journey.version !== SAVE_VERSION) {
      localStorage.removeItem(storageKey());
      return;
    }
    discoveries = new Set(journey.discoveries || []);
    observedCreatures = new Set(journey.observedCreatures || []);
  } catch (_) {
    localStorage.removeItem(storageKey());
  }
}

function currentTile() {
  return world.tiles[player.y][player.x];
}

function drawWorld() {
  canvas.width = world.width * tileSize;
  canvas.height = world.height * tileSize;
  world.tiles.flat().forEach((tile) => {
    const known = discoveries.has(`${tile.x},${tile.y}`) || Math.abs(tile.x - player.x) + Math.abs(tile.y - player.y) <= 1;
    context.fillStyle = BIOME_COLORS[tile.biome];
    context.fillRect(tile.x * tileSize, tile.y * tileSize, tileSize, tileSize);
    if (!known) {
      context.fillStyle = 'rgba(45, 31, 47, 0.76)';
      context.fillRect(tile.x * tileSize, tile.y * tileSize, tileSize, tileSize);
      return;
    }
    context.fillStyle = 'rgba(255, 255, 255, 0.52)';
    context.font = '14px serif';
    context.textAlign = 'center';
    context.fillText(BIOME_SYMBOLS[tile.biome], tile.x * tileSize + 11, tile.y * tileSize + 15);
  });

  drawPlayer();
}

function drawPlayer() {
  const centerX = player.x * tileSize + tileSize / 2;
  const groundY = player.y * tileSize + tileSize - 1;

  if (!playerImageReady) {
    context.fillStyle = '#2d1f2f';
    context.beginPath();
    context.arc(centerX, player.y * tileSize + 11, 7, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#fff6d5';
    context.font = '12px serif';
    context.textAlign = 'center';
    context.fillText('✦', centerX, player.y * tileSize + 15);
    return;
  }

  // Varuna stands taller than one tile, so anchor him by the feet and let the hat overhang.
  const drawWidth = tileSize;
  const drawHeight = drawWidth * (PLAYER_SPRITE.height / PLAYER_SPRITE.width);

  context.save();
  context.fillStyle = 'rgba(45, 31, 47, 0.28)';
  context.beginPath();
  context.ellipse(centerX, groundY - 1, drawWidth * 0.32, drawWidth * 0.12, 0, 0, Math.PI * 2);
  context.fill();

  context.imageSmoothingEnabled = false;
  context.translate(centerX, groundY);
  context.scale(facing, 1);
  context.drawImage(
    playerImage,
    PLAYER_SPRITE.x, PLAYER_SPRITE.y, PLAYER_SPRITE.width, PLAYER_SPRITE.height,
    -drawWidth / 2, -drawHeight, drawWidth, drawHeight
  );
  context.restore();
}

function updateJournal() {
  const tile = currentTile();
  tile.discovered = true;
  discoveries.add(`${tile.x},${tile.y}`);
  const entry = describeTile(tile, species, world.seed);
  journalTitle.textContent = entry.title;
  journalText.textContent = entry.description;
  creatureText.textContent = entry.creature;
  floraText.textContent = entry.flora;
  // Same lookup the Observe button uses, so the sketch always matches what was just described.
  const creature = species.creatureFor(tile, world.seed);
  observeButton.disabled = !creature || observedCreatures.has(creature.name);
  observeButton.textContent = creature && observedCreatures.has(creature.name) ? 'Creature sketch recorded' : 'Observe creature';
  const reachedLandmark = world.landmark && player.x === world.landmark.x && player.y === world.landmark.y;
  statusText.textContent = reachedLandmark
    ? `Landmark recorded. ${discoveries.size} places discovered. Take a breath before generating another journey.`
    : `${discoveries.size} places discovered. Find the ✦ landmark and record it in your journal.`;
  saveJourney();
}

function movePlayer(dx, dy) {
  const nextX = player.x + dx;
  const nextY = player.y + dy;
  if (nextX < 0 || nextX >= world.width || nextY < 0 || nextY >= world.height) return;
  const nextTile = world.tiles[nextY][nextX];
  if (nextTile.biome === 'sea') return;
  if (dx !== 0) facing = dx > 0 ? 1 : -1;
  player = { x: nextX, y: nextY };
  drawWorld();
  updateJournal();
}

// resume is for returning to a journey already in progress, on page load. Asking for a new map is
// a deliberate fresh start, so it must not restore the fog the player already lifted.
function resetWorld({ resume = false } = {}) {
  world = generateWorld({ seed: seedInput.value || 'jambhudweepa' });
  player = { ...world.start };
  discoveries = new Set([`${player.x},${player.y}`]);
  observedCreatures = new Set();
  memoryText.textContent = '';
  if (resume) restoreJourney();
  drawWorld();
  updateJournal();
}

window.addEventListener('keydown', (event) => {
  const keys = {
    ArrowUp: [0, -1], KeyW: [0, -1],
    ArrowDown: [0, 1], KeyS: [0, 1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowRight: [1, 0], KeyD: [1, 0]
  };
  if (world && keys[event.code]) {
    event.preventDefault();
    movePlayer(...keys[event.code]);
  }
});

newMapButton.addEventListener('click', () => {
  if (species) resetWorld({ resume: false });
});
observeButton.addEventListener('click', () => {
  const creature = species && species.creatureFor(currentTile(), world.seed);
  if (!creature) return;
  observedCreatures.add(creature.name);
  memoryText.textContent = `Sketch recorded: ${creatureAction(creature)}`;
  updateJournal();
});

// The bestiary lives in data/*.json, so the first journey waits on the fetch.
(async function start() {
  observeButton.disabled = true;
  statusText.textContent = 'Reading the field notes…';
  try {
    species = await loadSpecies();
  } catch (error) {
    statusText.textContent = `Could not load the field notes. ${error.message}`;
    console.error(error);
    return;
  }
  resetWorld({ resume: true });
}());
