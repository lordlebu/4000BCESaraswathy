// Measure every sprite sheet and write docs/sprite-heights.md.
//
// The heights matter and kept being re-measured by hand. Whether a thing is drawn over the
// traveller or under him turns on how tall it is and what it is, and twice now that has been
// worked out in a throwaway command whose output went nowhere -- so the same numbers got looked up
// again a week later, and once got assumed instead.
//
// Generated rather than written, so it cannot drift from the art. Re-run it whenever a builder
// changes and commit the result:
//
//   node tools/measure-sprites.js
//
// CommonJS, like everything in tools/ -- see tools/package.json.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const SOLID = 128;

// --- PNG in ---------------------------------------------------------------

function decodePng(file) {
  const buf = fs.readFileSync(file);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const chunks = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    if (buf.toString('ascii', off + 4, off + 8) === 'IDAT') chunks.push(buf.subarray(off + 8, off + 8 + len));
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(chunks));
  const stride = width * 4;
  const rows = Buffer.alloc(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos];
    pos += 1;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= 4 ? rows[y * stride + x - 4] : 0;
      const up = y > 0 ? rows[(y - 1) * stride + x] : 0;
      const upLeft = x >= 4 && y > 0 ? rows[(y - 1) * stride + x - 4] : 0;
      let v = raw[pos + x];
      if (filter === 1) v += left;
      else if (filter === 2) v += up;
      else if (filter === 3) v += (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        v += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      rows[y * stride + x] = v & 0xff;
    }
    pos += stride;
  }
  return { width, height, rows, stride };
}

/** Top row, height and horizontal centre of mass for one frame. */
function measure(img, frame, cellW, cellH) {
  let top = cellH;
  let sum = 0;
  let n = 0;
  for (let y = 0; y < cellH; y += 1) {
    for (let x = frame * cellW; x < (frame + 1) * cellW; x += 1) {
      if (img.rows[y * img.stride + x * 4 + 3] < SOLID) continue;
      if (y < top) top = y;
      sum += x - frame * cellW;
      n += 1;
    }
  }
  return n === 0 ? null : { top, height: cellH - top, centre: sum / n, pixels: n };
}

// --- what each sheet holds ------------------------------------------------

/**
 * Frame names per sheet, in sheet order.
 *
 * Duplicated from the builders rather than imported, because the builders are the thing being
 * checked: a name list that came from the same source could not catch the two drifting apart. The
 * counts are asserted below, so a sheet that grows without this being updated fails loudly.
 */
const SHEETS = [
  {
    file: 'terrain.png', cell: [32, 32],
    names: ['sea', 'coast', 'plains', 'forest', 'wetland', 'hills', 'mountains', 'desert', 'river', 'settlement', 'landmark']
  },
  {
    file: 'huts.png', cell: [20, 22],
    names: ['hut 1', 'hut 2', 'hut 3', 'hut 4']
  },
  {
    file: 'landmarks.png', cell: [32, 32],
    names: ['great-banyan', 'hot-spring', 'shell-beach', 'hill-shrine', 'standing-stones', 'heron-pool', 'salt-pan']
  },
  {
    file: 'places.png', cell: [32, 40],
    names: [
      'kavik-tower', 'silted-granary', 'long-archive', 'mooring-stones', 'drowned-seawall',
      'customs-house', 'bone-midden', 'basalt-quarry',
      'kind: eco-site', 'kind: anomaly', 'kind: settlement', 'kind: wilderness', 'kind: travel-node'
    ]
  },
  {
    file: 'features.png', cell: [32, 32],
    names: [
      'neem', 'neem', 'anthill', 'anthill', 'bamboo', 'bamboo', 'bees', 'bees', 'log',
      'mangrove (wetland)', 'mangrove (wetland)', 'lotus', 'tussock', 'stepping-stones',
      'date-palm', 'date-palm', 'tulsi', 'woodpile', 'mangrove (coast)', 'mangrove (coast)',
      'driftwood', 'pine', 'pine', 'boulder', 'cactus', 'cactus'
    ]
  },
  {
    file: 'overdraw.png', cell: [32, 32],
    names: (() => {
      const plants = [
        'grass', 'reeds', 'paddy', 'rushes', 'barley', 'sagebrush',
        'ferns', 'vine', 'saltgrass', 'moss', 'saltbush'
      ];
      const out = [];
      for (const state of ['rest', 'lean']) {
        for (const p of plants) for (let s = 1; s <= 3; s += 1) out.push(`${p} ${state} ${s}`);
      }
      out.push('fence', 'footprints', 'splash');
      return out;
    })()
  }
];

/** Sprites the code draws below the traveller. Kept in step with `UNDERFOOT_*` in frames.ts. */
const UNDERFOOT = new Set([
  'moss', 'lotus', 'stepping-stones', 'anthill', 'log', 'driftwood', 'boulder', 'woodpile',
  'tussock', 'footprints', 'splash'
]);

function main() {
  const lines = [];
  lines.push('# Sprite heights');
  lines.push('');
  lines.push('Generated by `node tools/measure-sprites.js`. Do not edit by hand.');
  lines.push('');
  lines.push('Every sprite is measured from the **bottom** of its cell, because that is where things');
  lines.push('stand. `top` is the first row that has any opaque pixel in it, so a 32-pixel cell with a');
  lines.push('top of 21 holds an eleven-pixel plant.');
  lines.push('');
  lines.push('## Why the heights matter');
  lines.push('');
  lines.push('The traveller is 40 pixels in a 32-pixel cell and sorts into the `walker` slot of his row.');
  lines.push('What draws over him and what draws under him is the difference between wading through');
  lines.push('grass and sinking into the ground, and it is decided two ways:');
  lines.push('');
  lines.push('* **Height** bounds what the common overdraw may do. Nothing in `overdraw.png` may start');
  lines.push('  above row 16 of 32 -- grass to the knee reads as depth, grass to the chest loses the');
  lines.push('  character behind it. `test/frames.test.ts` asserts this against the built sheet.');
  lines.push('* **What the thing is** decides the rest, and height alone is the wrong rule. Moss is three');
  lines.push('  pixels and lies flat; sagebrush is ten and is waded through. Lotus pads are the tallest');
  lines.push('  thing on the feature sheet at sixteen pixels and lie flat on water. So the underfoot set');
  lines.push('  is a list, and this table is the evidence for what belongs in it.');
  lines.push('');

  let failures = 0;
  for (const sheet of SHEETS) {
    const file = path.join(ROOT, 'assets', sheet.file);
    const img = decodePng(file);
    const [cellW, cellH] = sheet.cell;
    const frames = img.width / cellW;
    if (frames !== sheet.names.length) {
      console.error(`${sheet.file}: ${frames} frames but ${sheet.names.length} names -- update SHEETS`);
      failures += 1;
    }

    lines.push(`## ${sheet.file}`);
    lines.push('');
    lines.push(`${frames} frames of ${cellW}x${cellH}, ${(fs.statSync(file).size / 1024).toFixed(1)} KB.`);
    lines.push('');
    lines.push('| # | sprite | top | height | drawn |');
    lines.push('|---|---|---|---|---|');
    const seen = new Set();
    for (let i = 0; i < frames; i += 1) {
      const name = sheet.names[i] ?? `frame ${i}`;
      // Variants of one thing measure the same; list the first and skip the rest.
      const base = name.replace(/ (rest|lean) \d$/, '');
      if (seen.has(name) || (sheet.file === 'features.png' && seen.has(base))) continue;
      seen.add(name);
      seen.add(base);
      const m = measure(img, i, cellW, cellH);
      if (!m) {
        lines.push(`| ${i} | ${name} | — | empty | — |`);
        continue;
      }
      const key = base.replace(/ \(.*\)$/, '');
      const under = UNDERFOOT.has(key) || UNDERFOOT.has(name);
      const drawn = sheet.file === 'terrain.png' ? 'ground' : under ? 'under the traveller' : 'over him';
      lines.push(`| ${i} | ${name} | ${m.top} | ${m.height} px | ${drawn} |`);
    }
    lines.push('');
  }

  const out = path.join(ROOT, 'docs', 'sprite-heights.md');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, lines.join('\n') + '\n');
  console.log(`Wrote ${path.relative(ROOT, out)}`);
  if (failures) process.exit(1);
}

main();
