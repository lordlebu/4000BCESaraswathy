// Slice a sheet of animal views into one PNG per facing.
//
// **The sheets do not share a layout and cannot be split on a grid.** The whale arrived as one row
// of four, Vasuki as a 2x2, and the sivatherium as a row of four whose middle two *touch* -- their
// muzzles meet, so there is no empty column between them. Measured before this was written:
// quartering the sivatherium gives two frames that run edge to edge, cutting both animals in half.
//
// So the frames are found rather than assumed. Each view is a connected run of opaque pixels, so
// this floods from every solid pixel, collects the blobs, discards specks and orders what is left.
// That works for a row, a grid, or an uneven scatter -- which is what "I made up down left and
// right" produces when nobody is holding a template, and asking for a template is the mistake this
// repository has already made once with the windmill sheet.
//
// Ordering is by position, and reading order is the convention:
//   a row of four  -> left to right
//   a 2x2 grid     -> top row left to right, then the bottom row
// which is the order the views were drawn in: right, left, down, up.
//
// CommonJS and hand-rolled PNG, like everything in tools/ -- see tools/sprite-png.js.
//
// **A frame is its own blob, not its bounding box.** Cutting the box alone brought a neighbour in
// wherever one reached into it: the sivatherium's front view shipped with a strip of the side
// view's tail and hind leg down its left edge, and the left view with the tip of another antler in
// its top corner. Every pixel is now labelled with the blob it belongs to, and a frame keeps its own
// blob and the soft glow within `HALO` of it -- nothing else in the box.
//
// Usage: node tools/build-wanderers.js [--force]
//        node tools/build-wanderers.js --tidy    clear strays from the frames already built, whose
//                                                source sheets live in the git-ignored dump

const fs = require('fs');
const path = require('path');
const { decodePng, encodePng } = require('./sprite-png');

const SRC = path.join('assets', 'source', 'dump');
const OUT = path.join('assets', 'wanderers');

/** The facings, in the order the frames are drawn in every sheet so far. */
const FACINGS = ['right', 'left', 'down', 'up'];

/**
 * Opaque enough to be the animal rather than the glow around it.
 *
 * Measured rather than picked: the soft halo these sheets carry sits under alpha 40 and the bodies
 * are 192-254. (Nothing is 255 -- the tool that made them stops one short -- which is invisible in
 * play and not worth a pass to fix.)
 */
const SOLID = 40;

/** A blob under this share of the biggest is a speck of stray glow, not a fifth view. */
const SPECK = 0.06;

/**
 * How far a view's soft glow reaches past its solid outline, in pixels. The halo these sheets carry
 * fades out within four or five; a neighbour's pixels begin well beyond that, which is how a stray
 * is told from an edge.
 */
const HALO = 6;

/** Every connected run of solid pixels, as bounding boxes, with `labels` saying which blob each
 *  pixel is (0 for none). Iterative: these sheets are 1.5 megapixels and a recursive fill blows the
 *  stack. */
function blobs(png) {
  const { width: w, height: h, data } = png;
  const seen = new Int32Array(w * h);
  const found = [];
  const solid = (i) => data[i * 4 + 3] > SOLID;

  for (let start = 0; start < w * h; start += 1) {
    if (seen[start] || !solid(start)) continue;
    let minX = w;
    let maxX = -1;
    let minY = h;
    let maxY = -1;
    let count = 0;
    const label = found.length + 1;
    const stack = [start];
    seen[start] = label;
    while (stack.length) {
      const i = stack.pop();
      const x = i % w;
      const y = (i / w) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      count += 1;
      // Eight-connected: a one-pixel diagonal of outline is still the same animal.
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (seen[j] || !solid(j)) continue;
          seen[j] = label;
          stack.push(j);
        }
      }
    }
    found.push({ label, minX, maxX, minY, maxY, count });
  }
  found.labels = seen;
  return found;
}

/**
 * Every pixel within `HALO` of blob `label`, as a mask: the view itself and its own glow. A
 * breadth-first reach outward from the solid pixels, stopped at `HALO` steps.
 */
function reach(png, labels, label) {
  const { width: w, height: h } = png;
  const dist = new Int16Array(w * h).fill(-1);
  let frontier = [];
  for (let i = 0; i < w * h; i += 1) {
    if (labels[i] === label) {
      dist[i] = 0;
      frontier.push(i);
    }
  }
  for (let d = 1; d <= HALO; d += 1) {
    const next = [];
    for (const i of frontier) {
      const x = i % w;
      const y = (i / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (dist[j] !== -1 || labels[j] !== 0) continue;
        dist[j] = d;
        next.push(j);
      }
    }
    frontier = next;
  }
  return dist;
}

/** Reading order: rows top to bottom, then left to right within a row. */
function inReadingOrder(boxes) {
  const tallest = Math.max(...boxes.map((b) => b.maxY - b.minY + 1));
  const rows = [];
  for (const b of [...boxes].sort((p, q) => p.minY - q.minY)) {
    const mid = (b.minY + b.maxY) / 2;
    const row = rows.find((r) => Math.abs(r.mid - mid) < tallest * 0.5);
    if (row) row.items.push(b);
    else rows.push({ mid, items: [b] });
  }
  return rows.flatMap((r) => r.items.sort((p, q) => p.minX - q.minX));
}

/** Cut one box out, trimmed to its own content, alpha preserved, and nothing in it but `mine`. */
function cut(png, box, mine) {
  const w = box.maxX - box.minX + 1;
  const h = box.maxY - box.minY + 1;
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const from = ((box.minY + y) * png.width + (box.minX + x)) * 4;
      const to = (y * w + x) * 4;
      if (mine[(box.minY + y) * png.width + (box.minX + x)] === -1) continue;
      png.data.copy(data, to, from, from + 4);
    }
  }
  return { width: w, height: h, data };
}

const force = process.argv.includes('--force');
fs.mkdirSync(OUT, { recursive: true });

if (process.argv.includes('--tidy')) {
  // Each built frame is treated as a sheet of one: its biggest blob is the animal, and the box it
  // was cut to stays the box, so the feet stay on the bottom edge and the size in play is unchanged.
  for (const file of fs.readdirSync(OUT).filter((f) => f.endsWith('.png')).sort()) {
    const png = decodePng(path.join(OUT, file));
    const all = blobs(png);
    if (all.length === 0) continue;
    const animal = all.reduce((a, b) => (b.count > a.count ? b : a));
    const whole = { minX: 0, minY: 0, maxX: png.width - 1, maxY: png.height - 1 };
    const out = cut(png, whole, reach(png, all.labels, animal.label));
    // Counted in solid pixels: past `HALO` every sheet carries a faint dust at alpha 4 or less,
    // and a frame is rewritten for a stray somebody could see, not for that.
    const cleared = [...Array(png.width * png.height).keys()].filter(
      (i) => png.data[i * 4 + 3] > SOLID && out.data[i * 4 + 3] === 0
    ).length;
    if (cleared === 0) continue;
    fs.writeFileSync(path.join(OUT, file), encodePng(out.width, out.height, out.data));
    console.log(`  tidied ${file}: ${cleared} stray pixels cleared`);
  }
  process.exit(0);
}

// **Named rather than globbed.** `assets/source/dump` is the shared drop for every kind of art in
// this project -- plates, terrain, portraits, whatever somebody generated last -- so a glob here
// picks up an RGB landscape and dies in the decoder, which is exactly what it did. A sheet joins
// this list when somebody has looked at it and knows it is four views of one animal.
const SHEETS = ['narmada-walking-whale', 'sivatherium', 'vasuki-indicus'];

const sheets = SHEETS.map((id) => `${id}.png`).filter((f) => {
  const there = fs.existsSync(path.join(SRC, f));
  if (!there) console.log(`  -- ${f}: not in ${SRC}, skipped`);
  return there;
});

let built = 0;
let skipped = 0;

for (const sheet of sheets) {
  const id = sheet.replace(/\.png$/, '');
  if (fs.existsSync(path.join(OUT, `${id}-right.png`)) && !force) {
    skipped += 1;
    continue;
  }

  const png = decodePng(path.join(SRC, sheet));
  const all = blobs(png);
  if (all.length === 0) {
    console.log(`  -- ${sheet}: nothing solid found, skipped`);
    continue;
  }
  const biggest = Math.max(...all.map((b) => b.count));
  const kept = inReadingOrder(all.filter((b) => b.count >= biggest * SPECK));

  if (kept.length !== 4) {
    // Four views or nothing. A sheet that does not split cleanly is one to open and look at rather
    // than to guess about, and half a set of facings would silently draw an animal facing wrong.
    console.log(`  !! ${sheet}: found ${kept.length} views, expected 4 -- skipped, open it and look`);
    continue;
  }

  kept.forEach((box, i) => {
    const out = cut(png, box, reach(png, all.labels, box.label));
    const file = path.join(OUT, `${id}-${FACINGS[i]}.png`);
    fs.writeFileSync(file, encodePng(out.width, out.height, out.data));
    console.log(`  ok ${id}-${FACINGS[i]}.png  ${out.width}x${out.height}`);
  });
  built += 1;
}

console.log(`\n${built} sheet(s) split, ${skipped} already there (--force to redo).`);
