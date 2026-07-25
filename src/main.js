const canvas = document.querySelector('#world');
const context = canvas.getContext('2d');
const seedInput = document.querySelector('#seed');
const journalTitle = document.querySelector('#journal-title');
const journalText = document.querySelector('#journal-text');
const creatureText = document.querySelector('#creature-text');
const statusText = document.querySelector('#status-text');
const newMapButton = document.querySelector('#new-map');

const tileSize = 22;
let world = generateWorld({ seed: seedInput.value });
let player = { ...world.start };
let discoveries = new Set([`${player.x},${player.y}`]);

function currentTile() {
  return world.tiles[player.y][player.x];
}

function drawWorld() {
  canvas.width = world.width * tileSize;
  canvas.height = world.height * tileSize;
  world.tiles.flat().forEach((tile) => {
    context.fillStyle = BIOME_COLORS[tile.biome];
    context.fillRect(tile.x * tileSize, tile.y * tileSize, tileSize, tileSize);
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
  const reachedLandmark = world.landmark && player.x === world.landmark.x && player.y === world.landmark.y;
  statusText.textContent = reachedLandmark
    ? `Landmark recorded. ${discoveries.size} places discovered. Take a breath before generating another journey.`
    : `${discoveries.size} places discovered. Find the ✦ landmark and record it in your journal.`;
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
resetWorld();
