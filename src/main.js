const canvas = document.querySelector('#world');
const context = canvas.getContext('2d');
const seedInput = document.querySelector('#seed');
const journalTitle = document.querySelector('#journal-title');
const journalText = document.querySelector('#journal-text');
const creatureText = document.querySelector('#creature-text');
const statusText = document.querySelector('#status-text');
const newMapButton = document.querySelector('#new-map');
const observeButton = document.querySelector('#observe-creature');
const memoryText = document.querySelector('#memory-text');

const tileSize = 22;
let world = generateWorld({ seed: seedInput.value });
let player = { ...world.start };
let discoveries = new Set([`${player.x},${player.y}`]);
let observedCreatures = new Set();

function storageKey() {
  return `south-of-tethys:${world.seed}`;
}

function saveJourney() {
  localStorage.setItem(storageKey(), JSON.stringify({
    discoveries: [...discoveries],
    observedCreatures: [...observedCreatures]
  }));
}

function restoreJourney() {
  const saved = localStorage.getItem(storageKey());
  if (!saved) return;
  try {
    const journey = JSON.parse(saved);
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

  context.fillStyle = '#2d1f2f';
  context.beginPath();
  context.arc(player.x * tileSize + 11, player.y * tileSize + 11, 7, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#fff6d5';
  context.font = '12px serif';
  context.fillText('✦', player.x * tileSize + 11, player.y * tileSize + 15);
}

function updateJournal() {
  const tile = currentTile();
  tile.discovered = true;
  discoveries.add(`${tile.x},${tile.y}`);
  const entry = describeTile(tile);
  journalTitle.textContent = entry.title;
  journalText.textContent = entry.description;
  creatureText.textContent = entry.creature;
  const creature = CREATURES.find((candidate) => candidate.biomes.includes(tile.biome));
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
  player = { x: nextX, y: nextY };
  drawWorld();
  updateJournal();
}

function resetWorld() {
  world = generateWorld({ seed: seedInput.value || 'jambhudweepa' });
  player = { ...world.start };
  discoveries = new Set([`${player.x},${player.y}`]);
  observedCreatures = new Set();
  memoryText.textContent = '';
  restoreJourney();
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
  if (keys[event.code]) {
    event.preventDefault();
    movePlayer(...keys[event.code]);
  }
});

newMapButton.addEventListener('click', resetWorld);
observeButton.addEventListener('click', () => {
  const creature = CREATURES.find((candidate) => candidate.biomes.includes(currentTile().biome));
  if (!creature) return;
  observedCreatures.add(creature.name);
  memoryText.textContent = `Sketch recorded: ${creatureAction(creature)}`;
  updateJournal();
});
resetWorld();
