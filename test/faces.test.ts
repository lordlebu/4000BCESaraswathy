// Generic painted faces use the culture, gender and sequence convention.
//
// The pool is read off filenames, so a misnamed file is the one fault it can have -- it matches no
// culture, throws nothing, and is never dealt to anybody. This refuses one by name.

import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { artNames } from '../src/ui/art';
import { STRANGER_CULTURES } from '../src/content/travellers';

const { idFor, KINDS } = createRequire(import.meta.url)('../tools/build-plates.js') as {
  idFor: (file: string, word?: string, keepUnderscores?: boolean) => string;
  KINDS: { face: { word: string; keepUnderscores?: boolean } };
};
const faceId = (file: string) => idFor(file, KINDS.face.word, KINDS.face.keepUnderscores);

// `String.raw`, because in a plain template literal `\d` is not an escape and quietly becomes `d` --
// which is how this pattern demanded the letters "d{2}", matched no name at all, and passed for as
// long as the pool was empty.
const NAME = new RegExp(String.raw`^(?:(?:${STRANGER_CULTURES.join('|')})-[fm]-\d{2}|any-\d{2})$`);

describe('the face pool', () => {
  it('names every face by a culture strangers have, a gender, and a number', () => {
    const bad = artNames('faces').filter((n) => !NAME.test(n));
    expect(bad, 'faces named outside <culture>-<f|m>-NN or any-NN are never dealt').toEqual([]);
  });

  it('builds a raw from any image tool into its place in the pool', () => {
    expect(faceId('Gemini face-harappan-m-01.png')).toBe('harappan-m-01');
    expect(faceId('kia-f-02.png')).toBe('kia-f-02');
    expect(faceId('ChatGPT face any-01.png')).toBe('any-01');
    // Canon's culture ids keep their underscore, or the face is built for a people that is not one.
    expect(faceId('asura_hybrid-m-01.png')).toBe('asura_hybrid-m-01');
  });
});
