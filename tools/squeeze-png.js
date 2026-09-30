// Make a PNG smaller without changing one pixel of it.
//
// **Run by the build on every painting it ships, and never on the files in the repository.** The
// art here is written by nine different builders, each with its own small PNG encoder, and none of
// them chooses a filter per row or asks zlib for its best effort -- reasonable for tools whose job
// is to get the picture right. Measured on 30 September 2026, that left 28% on the table across
// everything a journey loads before its first frame.
//
// Fixing it in the repository would mean re-encoding 240 tracked binaries, which git keeps for ever
// beside the old ones, and then doing it again whenever a builder is re-run. Fixing it in the build
// touches no art at all: `vite.config.ts` passes each PNG through this on its way into `dist/`.
//
// **Lossless, and it checks.** A PNG row is stored as the difference from its neighbours, by one of
// five rules, and which rule suits a row depends on the row. This tries all five and keeps the one
// whose differences are smallest, which is the heuristic libpng has always used; drops an alpha
// channel that is opaque everywhere; and deflates at the highest level. Then it decodes its own
// output and compares it to what it started with, and hands back the original if they differ or if
// it failed to make the file smaller. A picture it does not understand -- interlaced, sixteen-bit --
// goes back untouched.
const zlib = require('node:zlib');

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
/** Bytes per pixel for each colour type this handles, at eight bits a channel. */
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function chunksOf(png) {
  const chunks = [];
  let at = SIGNATURE.length;
  while (at < png.length) {
    const length = png.readUInt32BE(at);
    const type = png.toString('latin1', at + 4, at + 8);
    chunks.push({ type, data: png.subarray(at + 8, at + 8 + length) });
    at += 12 + length;
  }
  return chunks;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
  return Buffer.concat([head, data, crc]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** The pixels of a PNG as plain rows, or null if it is a kind this does not handle. */
function decode(png) {
  if (png.length < SIGNATURE.length || !png.subarray(0, SIGNATURE.length).equals(SIGNATURE)) return null;
  const chunks = chunksOf(png);
  const header = chunks.find((c) => c.type === 'IHDR');
  if (!header) return null;
  const width = header.data.readUInt32BE(0);
  const height = header.data.readUInt32BE(4);
  const depth = header.data[8];
  const colour = header.data[9];
  const interlaced = header.data[12];
  const bpp = CHANNELS[colour];
  if (depth !== 8 || interlaced !== 0 || !bpp) return null;

  const packed = zlib.inflateSync(Buffer.concat(chunks.filter((c) => c.type === 'IDAT').map((c) => c.data)));
  const stride = width * bpp;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = packed[y * (stride + 1)];
    const from = y * (stride + 1) + 1;
    const to = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= bpp ? pixels[to + x - bpp] : 0;
      const up = y > 0 ? pixels[to + x - stride] : 0;
      const upLeft = x >= bpp && y > 0 ? pixels[to + x - stride - bpp] : 0;
      const predicted =
        filter === 0 ? 0
        : filter === 1 ? left
        : filter === 2 ? up
        : filter === 3 ? (left + up) >> 1
        : paeth(left, up, upLeft);
      pixels[to + x] = (packed[from + x] + predicted) & 0xff;
    }
  }
  return { width, height, colour, bpp, pixels, chunks };
}

/** Rows filtered one at a time, each by whichever of the five rules leaves it smallest. */
function filtered(pixels, width, height, bpp, adaptive) {
  const stride = width * bpp;
  const out = Buffer.alloc((stride + 1) * height);
  const tries = [0, 1, 2, 3, 4].map(() => Buffer.alloc(stride));
  for (let y = 0; y < height; y += 1) {
    const row = y * stride;
    let best = 0;
    if (adaptive) {
      const sums = [0, 0, 0, 0, 0];
      for (let x = 0; x < stride; x += 1) {
        const here = pixels[row + x];
        const left = x >= bpp ? pixels[row + x - bpp] : 0;
        const up = y > 0 ? pixels[row + x - stride] : 0;
        const upLeft = x >= bpp && y > 0 ? pixels[row + x - stride - bpp] : 0;
        const values = [here, here - left, here - up, here - ((left + up) >> 1), here - paeth(left, up, upLeft)];
        for (let f = 0; f < 5; f += 1) {
          const byte = values[f] & 0xff;
          tries[f][x] = byte;
          // A difference is signed: 255 is "one less", and should count as small.
          sums[f] += byte < 128 ? byte : 256 - byte;
        }
      }
      for (let f = 1; f < 5; f += 1) if (sums[f] < sums[best]) best = f;
      tries[best].copy(out, y * (stride + 1) + 1);
    } else {
      pixels.copy(out, y * (stride + 1) + 1, row, row + stride);
    }
    out[y * (stride + 1)] = best;
  }
  return out;
}

/** RGBA to RGB when nothing in the picture is see-through, which is the same picture. */
function withoutOpaqueAlpha(image) {
  if (image.colour !== 6) return image;
  const { pixels } = image;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] !== 255) return image;
  const rgb = Buffer.alloc((pixels.length / 4) * 3);
  for (let i = 0, o = 0; i < pixels.length; i += 4, o += 3) {
    rgb[o] = pixels[i];
    rgb[o + 1] = pixels[i + 1];
    rgb[o + 2] = pixels[i + 2];
  }
  return { ...image, colour: 2, bpp: 3, pixels: rgb };
}

/** The same picture as RGBA bytes, whatever it is stored as. What "unchanged" is measured in. */
function rgbaOf(image) {
  if (image.colour === 6) return image.pixels;
  if (image.colour !== 2) return null;
  const out = Buffer.alloc((image.pixels.length / 3) * 4, 255);
  for (let i = 0, o = 0; i < image.pixels.length; i += 3, o += 4) {
    out[o] = image.pixels[i];
    out[o + 1] = image.pixels[i + 1];
    out[o + 2] = image.pixels[i + 2];
  }
  return out;
}

function squeeze(png) {
  const original = decode(png);
  if (!original) return png;
  const image = withoutOpaqueAlpha(original);
  // A palette index is not a quantity, so the difference between two of them means nothing and
  // filtering a paletted row only makes it harder to compress.
  const rows = filtered(image.pixels, image.width, image.height, image.bpp, image.colour !== 3);
  const header = Buffer.from(original.chunks.find((c) => c.type === 'IHDR').data);
  header[9] = image.colour;

  const parts = [SIGNATURE, chunk('IHDR', header)];
  // Everything that says how to read the pixels -- the palette, its transparency, the colour space
  // -- is carried across as it was. Only the pixel data is rewritten.
  for (const c of original.chunks) {
    if (c.type === 'IHDR' || c.type === 'IDAT' || c.type === 'IEND') continue;
    parts.push(chunk(c.type, c.data));
  }
  parts.push(chunk('IDAT', zlib.deflateSync(rows, { level: 9, memLevel: 9 })), chunk('IEND', Buffer.alloc(0)));
  const squeezed = Buffer.concat(parts);
  if (squeezed.length >= png.length) return png;

  // Trust nothing: read it back. The cost is one more inflate, and what it buys is that a fault in
  // the forty lines above ships the original painting instead of a wrong one.
  const again = decode(squeezed);
  if (!again || again.width !== original.width || again.height !== original.height) return png;
  const before = rgbaOf(original) ?? original.pixels;
  const after = rgbaOf(again) ?? again.pixels;
  return before.equals(after) ? squeezed : png;
}

module.exports = { squeeze, decode, rgbaOf };
