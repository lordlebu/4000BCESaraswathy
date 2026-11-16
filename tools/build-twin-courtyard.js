// Build the courtyard's single tree silhouette from its tracked source.
// Sampling onto a 96px art grid then doubling preserves deliberate pixel clusters.
const fs = require('node:fs');
const path = require('node:path');
const { decodePng, encodePng } = require('./sprite-png');
const root = path.resolve(__dirname, '..');
const input = decodePng(path.join(root, 'assets/source/twins/harappa-neem.png'));
const logical = 96, size = logical * 2;
const pixels = Buffer.alloc(size * size * 4);
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const sx = Math.min(input.width - 1, Math.floor((Math.floor(x / 2) + .5) * input.width / logical));
    const sy = Math.min(input.height - 1, Math.floor((Math.floor(y / 2) + .5) * input.height / logical));
    const source = (sy * input.width + sx) * 4;
    input.data.copy(pixels, (y * size + x) * 4, source, source + 4);
  }
}
const out = path.join(root, 'assets/twins/courtyard-neem.png');
fs.writeFileSync(out, encodePng(size, size, pixels));
console.log(`Built ${path.relative(root, out)} (${size}x${size})`);
