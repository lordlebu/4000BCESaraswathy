// The plate encoder, round-tripped.
//
// `tools/build-plates.js` writes PNGs by hand — chunk headers, CRCs, per-row filters, and a
// median-cut palette — because the alternative is a native image dependency for a build step that
// runs a few dozen times in the life of the project. That is a fair trade, but it means the bytes
// are only as correct as the arithmetic, and a mistake in it does not throw. It produces a file
// that opens fine in some decoders and shows garbage in others, or quietly loses the picture.
//
// This is exactly what happened one layer up: an overdraw sheet exceeded the WebGL texture limit,
// the upload failed silently, and the sprites rendered black with no error anywhere. Encoders fail
// quietly. So these tests decode the output independently of the code that wrote it and compare
// pixels — the one check that cannot pass on a broken file.

import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import zlib from 'node:zlib';

const require = createRequire(import.meta.url);
const { encodePng, filterRows, squareBox, borderInset, idFor } = require('../tools/build-plates.js');

/** Decode a PNG using nothing from the encoder. Handles colour type 2 (RGB) and 3 (indexed). */
function decode(buf: Buffer): { width: number; height: number; colour: number; rgb: Buffer } {
  expect([...buf.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const depth = buf[24];
  const colour = buf[25];
  expect(depth).toBe(8);

  const idat: Buffer[] = [];
  let plte: Buffer | null = null;
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const body = buf.subarray(off + 8, off + 8 + len);

    // Every chunk carries a CRC of its type and body. A wrong one is how a hand-written encoder
    // produces a file that some decoders accept and others reject outright.
    expect(buf.readInt32BE(off + 8 + len)).toBe(
      crc(Buffer.concat([Buffer.from(type, 'ascii'), body]))
    );
    if (type === 'IDAT') idat.push(body);
    if (type === 'PLTE') plte = body;
    off += 12 + len;
  }

  const channels = colour === 3 ? 1 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rows = Buffer.alloc(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos];
    pos += 1;
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? rows[y * stride + x - channels] : 0;
      const b = y > 0 ? rows[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? rows[(y - 1) * stride + x - channels] : 0;
      let v = raw[pos + x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      rows[y * stride + x] = v & 0xff;
    }
    pos += stride;
  }

  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i += 1) {
    if (colour === 3) {
      const q = rows[i] * 3;
      rgb[i * 3] = plte![q];
      rgb[i * 3 + 1] = plte![q + 1];
      rgb[i * 3 + 2] = plte![q + 2];
    } else {
      rgb[i * 3] = rows[i * 3];
      rgb[i * 3 + 1] = rows[i * 3 + 1];
      rgb[i * 3 + 2] = rows[i * 3 + 2];
    }
  }
  return { width, height, colour, rgb };
}

function crc(buf: Buffer): number {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) {
    let x = (c ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k += 1) x = x & 1 ? 0xedb88320 ^ (x >>> 1) : x >>> 1;
    c = x ^ (c >>> 8);
  }
  return c ^ -1;
}

/** Mean absolute difference per channel byte, 0–255. */
function error(a: Buffer, b: Buffer): number {
  let total = 0;
  for (let i = 0; i < a.length; i += 1) total += Math.abs(a[i] - b[i]);
  return total / a.length;
}

/**
 * Something shaped like a plate: paper, sky, ground, a subject, and scrub, with pigment noise.
 *
 * The first version of this had two tones and a gradient, and it was useless. Cutting the palette
 * from 256 colours to **four** still passed it — dithering two tones against four wells gives a low
 * mean error, so the test measured nothing about the quantiser at all.
 *
 * A real plate has separated hues that no small palette can span: warm cream paper, ochre ground,
 * a brown animal, olive scrub, a cool grey sky band. Those are what force the median cut to
 * actually divide the colour cube, and starving it now shows up immediately.
 */
function plateLike(size: number): Buffer {
  const rgb = Buffer.alloc(size * size * 3);
  let seed = 12345;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 0xffffffff - 0.5) * 14;

  const sky = [206, 212, 214];
  const paper = [238, 228, 205];
  const ground = [204, 174, 124];
  const subject = [124, 92, 58];
  const scrub = [110, 118, 74];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let base = y < size * 0.35 ? sky : y < size * 0.55 ? paper : ground;
      if ((x - size / 2) ** 2 + (y - size * 0.5) ** 2 < (size * 0.26) ** 2) base = subject;
      else if (y > size * 0.8 && (x * 7) % 23 < 4) base = scrub;

      const lift = (y / size) * 18; // a wash gradient down the page
      const p = (y * size + x) * 3;
      for (let c = 0; c < 3; c += 1) {
        rgb[p + c] = Math.max(0, Math.min(255, Math.round(base[c] - lift + rand())));
      }
    }
  }
  return rgb;
}

describe('the plate encoder writes a PNG another decoder can read', () => {
  it('round-trips a plate-like image within the tolerance dithering allows', () => {
    const size = 96;
    const source = plateLike(size);
    const out = decode(encodePng(size, size, source));

    expect(out.width).toBe(size);
    expect(out.height).toBe(size);

    // 256 colours plus Floyd–Steinberg is lossy by design, but only just, and the bound is measured
    // rather than guessed. On this image the encoder scores 2.22/255 — the real dromedary plate
    // scored 2.34 against its truecolour twin — and some of that is the ±7 pigment noise, which no
    // palette can reproduce exactly. Starving the quantiser walks it straight out: 64 colours give
    // 2.58, 16 give 5.08, 4 give 9.89.
    //
    // 3 sits about 35% above the real figure: tight enough that a broken palette, a wrong stride or
    // a mis-chosen filter cannot hide under it, loose enough not to trip on a rounding change.
    expect(error(source, out.rgb)).toBeLessThan(3);
  });

  it('takes the indexed path on art that suits it, which is the whole saving', () => {
    const size = 96;
    const png = encodePng(size, size, plateLike(size));

    // Colour type 3 *is* the assertion, and it is a strong one: `encodePng` encodes the image both
    // ways and returns whichever came out smaller, so type 3 means indexed genuinely beat
    // truecolour on this art rather than being preferred by a flag.
    //
    // The first plate went 595 KB → 251 KB on per-row filtering and 251 KB → 101 KB on this. If the
    // truecolour branch ever starts winning here, fifty-six plates quietly go back to megabytes.
    expect(decode(png).colour).toBe(3);
    expect(png.length).toBeLessThan(size * size * 3);
  });

  it.each([
    ['indexed', 1],
    ['truecolour', 3]
  ])('filters %s rows reversibly', (_name, bpp) => {
    // The filter chooser picks per row and the decoder must undo whichever it picked. This is the
    // one piece of the encoder that is pure arithmetic with no tolerance: it is exactly reversible
    // or the file is wrong. `filterRows` was generalised from a fixed 3 bytes per pixel to take
    // `bpp` when the indexed path arrived, and off-by-one on that is silent.
    const width = 37; // deliberately not a round number, to catch stride errors
    const height = 23;
    const src = Buffer.alloc(width * height * bpp);
    let seed = 999;
    for (let i = 0; i < src.length; i += 1) {
      src[i] = (seed = (seed * 1103515245 + 12345) >>> 0) & 0xff;
    }

    const filtered = filterRows(width, height, src, bpp);
    expect(filtered.length).toBe((width * bpp + 1) * height);

    // Unfilter it back by hand and demand byte equality.
    const stride = width * bpp;
    const back = Buffer.alloc(height * stride);
    let pos = 0;
    for (let y = 0; y < height; y += 1) {
      const filter = filtered[pos];
      pos += 1;
      expect(filter).toBeGreaterThanOrEqual(0);
      expect(filter).toBeLessThanOrEqual(4);
      for (let x = 0; x < stride; x += 1) {
        const a = x >= bpp ? back[y * stride + x - bpp] : 0;
        const b = y > 0 ? back[(y - 1) * stride + x] : 0;
        const c = x >= bpp && y > 0 ? back[(y - 1) * stride + x - bpp] : 0;
        let v = filtered[pos + x];
        if (filter === 1) v += a;
        else if (filter === 2) v += b;
        else if (filter === 3) v += (a + b) >> 1;
        else if (filter === 4) {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        }
        back[y * stride + x] = v & 0xff;
      }
      pos += stride;
    }
    expect(back.equals(src)).toBe(true);
  });
});

describe('the crop takes the bottom edge only when that is free', () => {
  // This is here because it went wrong on the very first plate. The rule was "always discard the
  // bottom tenth", to remove the corner signatures two of the three tools add. On a portrait that
  // is free — squaring has to drop that height anyway. On a source that is *already square* it is
  // not free at all: holding the aspect means taking a twentieth off each side as well, and on the
  // ChatGPT dromedary that cut the camel's feet off and narrowed the frame.
  //
  // A watermark is a few hundred pixels in a corner. Feet are the picture.

  it('leaves a square source completely alone', () => {
    expect(squareBox(1254, 1254)).toEqual({ x: 0, y: 0, side: 1254, trimmed: 0, inset: 0 });
  });

  it('leaves a landscape source at full height, cropping only the sides', () => {
    const box = squareBox(1600, 900);
    expect(box).toEqual({ x: 350, y: 0, side: 900, trimmed: 0, inset: 0 });
  });

  it('drops the bottom of a portrait, where the signature is and the height is spare', () => {
    // Grok's actual output. 1176 - 788 = 388px of slack, far more than the 118px tenth it wants.
    const box = squareBox(788, 1176);
    expect(box.side).toBe(788);
    expect(box.x).toBe(0);
    expect(box.trimmed).toBe(118);

    // The kept square must end clear of the trimmed strip.
    expect(box.y + box.side).toBeLessThanOrEqual(1176 - box.trimmed);
  });

  it('never trims more than the slack a barely-portrait source actually has', () => {
    // 1000x1020 has only 20px spare — less than a tenth. Trimming the full tenth here would mean
    // cropping the sides again, which is the bug this whole rule exists to avoid.
    const box = squareBox(1000, 1020);
    expect(box.side).toBe(1000);
    expect(box.x).toBe(0);
    expect(box.trimmed).toBe(20);
  });

  it('biases the kept square upward, so a tall subject keeps its head', () => {
    // 800 wide, 1600 tall: 800px of slack, 160 of it trimmed off the bottom, 640 left to place.
    // A centred crop would start at 320 and behead the animal; a third of the way down is 213.
    const box = squareBox(800, 1600);
    expect(box.trimmed).toBe(160);
    expect(box.y).toBe(213);
    expect(box.y).toBeLessThan(320);
  });
});

describe('the species id is read off the file name, whatever the tool called it', () => {
  // Three tools, three naming habits, one subject. Getting this wrong means the plate lands under
  // a name `src/ui/plates.ts` never looks up and silently does nothing — which already happened
  // once, when plates were filed under canon ids instead of engine ids.
  it.each([
    ['ChatGPTplate-caravan-dromedary.png', 'caravan-dromedary'],
    ['Gemini_plate-caravan-dromedary.png', 'caravan-dromedary'],
    ['Grokplate-caravan-dromedary.jpg', 'caravan-dromedary'],
    ['plate-desert-fox.png', 'desert-fox'],
    ['desert-fox.png', 'desert-fox'],
    // A species whose own name starts with "plate". The prefix strip used to allow zero
    // separators, so this came back as `au-wolf` -- and because a *built* plate is named exactly
    // its id, the sweep then decided a finished plateau-wolf.png was a stray raw and moved it out
    // of the output folder. Canon has two of these, both on the Narmada Plateau.
    ['plateau-wolf.png', 'plateau-wolf'],
    ['plateau-ibex.png', 'plateau-ibex'],
    ['ChatGPTplate-plateau-wolf.png', 'plateau-wolf'],
    ['Grok saltwater gator turtle.png', 'saltwater-gator-turtle']
  ])('%s -> %s', (file, id) => {
    expect(idFor(file)).toBe(id);
  });
});

/** A flat field, optionally with a pictorial region painted into it. */
function field(size: number, tone: number[]): { width: number; height: number; data: Buffer } {
  const data = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i += 1) {
    for (let c = 0; c < 3; c += 1) data[i * 3 + c] = tone[c];
  }
  return { width: size, height: size, data };
}

/** Scribble noise into a rectangle, so it reads as picture rather than paper. */
function paint(
  img: { width: number; height: number; data: Buffer },
  x0: number,
  y0: number,
  x1: number,
  y1: number
): void {
  let seed = 7;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const p = (y * img.width + x) * 3;
      for (let c = 0; c < 3; c += 1) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        img.data[p + c] = 60 + (seed % 160);
      }
    }
  }
}

describe('a painted border is stripped, and a pale sky is not', () => {
  // Hard requirement 2 of docs/plate-prompts.md is "no border or frame" — the panel draws its own,
  // and a painted one inside it reads as a picture of a picture. Gemini ignored it and returned
  // the desert fox in a cream frame, so the build enforces what the prompt only asks for.
  //
  // The danger in enforcing it is obvious the moment you look at the other three plates: the
  // dromedary has 43px of flat pale sky along its top edge and the macaque 36px. A rule that
  // trimmed flat edges would cut the sky off both. What separates them is that a frame is flat on
  // *all four* edges and the same colour on each, which no plate here has by accident.

  it('strips a frame that surrounds the picture', () => {
    const img = field(200, [247, 244, 236]);
    paint(img, 30, 30, 170, 170);
    // Detected depth is the shallowest edge, and never more than the margin actually present.
    expect(borderInset(img)).toBeGreaterThan(0);
    expect(borderInset(img)).toBeLessThanOrEqual(30);
  });

  it('leaves a flat sky alone, which is the whole reason for the four-edge rule', () => {
    // The dromedary and macaque shape: flat across the top, picture everywhere else.
    const img = field(200, [223, 221, 210]);
    paint(img, 0, 60, 200, 200);
    expect(borderInset(img)).toBe(0);
  });

  it('ignores four flat edges that are not the same colour', () => {
    // Flatness alone is not a frame. Four different flat edges is some other kind of picture, and
    // guessing at it would be how this rule eventually eats something it should not.
    const img = field(200, [240, 240, 240]);
    paint(img, 40, 40, 160, 160);
    for (let y = 0; y < 20; y += 1) {
      for (let x = 0; x < 200; x += 1) {
        const p = (y * 200 + x) * 3;
        img.data[p] = 120;
        img.data[p + 1] = 120;
        img.data[p + 2] = 120;
      }
    }
    expect(borderInset(img)).toBe(0);
  });

  it('finds nothing in a picture that reaches every edge', () => {
    const img = field(200, [200, 190, 170]);
    paint(img, 0, 0, 200, 200);
    expect(borderInset(img)).toBe(0);
  });

  it('does not bother with a frame too thin to matter', () => {
    // The crop is uniform and takes the shallowest of the four edges, so an asymmetric frame
    // collapses to its thinnest corner. The cloud antelope measured 50/22/35/3 and had three
    // pixels of a 1024px image removed -- a rebuild that changed nothing while reporting that a
    // border had been dealt with, which is worse than saying nothing.
    const img = field(400, [244, 241, 233]);
    paint(img, 3, 3, 400, 400); // picture reaches within 3px on two sides
    expect(borderInset(img)).toBe(0);
  });

  it('never claims more than MAX_BORDER of the picture', () => {
    // A blank image is flat all the way through, and without the cap the rule would happily crop
    // it to nothing. Losing the trim is always cheaper than losing the plate.
    const img = field(200, [245, 242, 235]);
    expect(borderInset(img)).toBeLessThanOrEqual(Math.floor(200 * 0.15));
  });

  it('shifts the square out by the inset it was given', () => {
    // A 1000px source with a 100px frame leaves an 800px picture, taken whole and offset by 100.
    expect(squareBox(1000, 1000, 100)).toEqual({ x: 100, y: 100, side: 800, trimmed: 0, inset: 100 });
    // And with no inset, nothing changes from the unframed case.
    expect(squareBox(1000, 1000, 0)).toEqual({ x: 0, y: 0, side: 1000, trimmed: 0, inset: 0 });
  });
});
