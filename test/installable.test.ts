// Can the game still be installed?
//
// Being installable is four files agreeing with each other: a manifest, the icons it names, the
// page that links it, and a service worker template the build can stamp. None of them is imported
// by anything, so the type checker sees none of them, and a browser's answer to a broken manifest
// is to silently stop offering to install -- nothing fails and nobody is told. These hold the
// agreement under Node. Whether the worker actually serves the game with the connection gone is a
// browser question, answered by hand in `docs/publishing.md`.

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file: string) => readFileSync(join(ROOT, file), 'utf8');

interface Icon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}
const manifest = JSON.parse(read('public/manifest.webmanifest')) as {
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  icons: Icon[];
};

/** Width and height out of a PNG's header, which is all a size check needs. */
function pngSize(file: string): string {
  const bytes = readFileSync(join(ROOT, file));
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
}

describe('the manifest', () => {
  it('says enough for a browser to offer the install', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name.length).toBeLessThanOrEqual(15);
    expect(manifest.display).toBe('standalone');
  });

  it('starts relative to itself, because the game is served from a path nobody chooses', () => {
    // An absolute `/` would open the root of github.io or of itch.io's file host, not the game.
    expect(manifest.start_url).toBe('.');
    expect(manifest.scope).toBe('.');
    for (const icon of manifest.icons) expect(icon.src.startsWith('/')).toBe(false);
  });

  it('names icons that exist, at the size it claims for them', () => {
    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    for (const icon of manifest.icons) {
      const file = join('public', icon.src);
      expect(existsSync(join(ROOT, file)), `${icon.src} is missing`).toBe(true);
      expect(pngSize(file), icon.src).toBe(icon.sizes);
    }
  });

  it('offers one icon a device may crop to its own shape', () => {
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });
});

describe('the page and the worker', () => {
  it('links the manifest from the page', () => {
    expect(read('index.html')).toContain('rel="manifest"');
  });

  it('leaves the build a stamp to fill in', () => {
    // `vite.config.ts` replaces this once. Without it every release would share one cache name and
    // the old release's files would never be thrown away.
    expect(read('tools/service-worker.js').match(/__BUILD__/g)).toHaveLength(1);
    expect(read('vite.config.ts')).toContain("replace('__BUILD__'");
  });

  it('registers the worker against the base path and only in production', () => {
    const main = read('src/main.tsx');
    expect(main).toContain('import.meta.env.PROD');
    expect(main).toContain('${import.meta.env.BASE_URL}sw.js');
  });
});
