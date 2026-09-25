// The stranger face pool: named by culture and gender, dealt by hash, never registered.
//
// The pool is read off filenames, so a misnamed file is the one fault it can have -- it matches no
// culture, throws nothing, and is never dealt to anybody. This refuses one by name.

import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { artNames } from '../src/ui/art';
import { facesFor } from '../src/ui/StrangerFace';
import { STRANGER_CULTURES } from '../src/content/travellers';

const { idFor } = createRequire(import.meta.url)('../tools/build-plates.js') as {
  idFor: (file: string, word?: string) => string;
};

// `String.raw`, because in a plain template literal `\d` is not an escape and quietly becomes `d` --
// which is how this pattern demanded the letters "d{2}", matched no name at all, and passed for as
// long as the pool was empty.
const NAME = new RegExp(String.raw`^(?:(?:${STRANGER_CULTURES.join('|')})-[fm]-\d{2}|any-\d{2})$`);

describe('the face pool', () => {
  it('names every face by a culture strangers have, a gender, and a number', () => {
    const bad = artNames('faces').filter((n) => !NAME.test(n));
    expect(bad, 'faces named outside <culture>-<f|m>-NN or any-NN are never dealt').toEqual([]);
  });

  it('deals a stranger their own people’s faces, and the ones that could be anybody', () => {
    const pool = ['any-01', 'any-02', 'harappan-f-01', 'harappan-m-01', 'kia-m-01', 'maru-f-01'];
    expect(facesFor('kia', pool)).toEqual(['kia-m-01', 'any-01', 'any-02']);
    expect(facesFor('harappan', pool)).toEqual(['harappan-f-01', 'harappan-m-01', 'any-01', 'any-02']);
    // A people with no faces yet still gets the ones that could be anybody.
    expect(facesFor('maru', ['any-01', 'kia-m-01'])).toEqual(['any-01']);
    // And nobody gets another people's face.
    expect(facesFor('maru', pool)).not.toContain('kia-m-01');
  });

  it('builds a raw from any image tool into its place in the pool', () => {
    expect(idFor('Gemini face-harappan-m-01.png', 'face')).toBe('harappan-m-01');
    expect(idFor('kia-f-02.png', 'face')).toBe('kia-f-02');
    expect(idFor('ChatGPT face any-01.png', 'face')).toBe('any-01');
  });
});
