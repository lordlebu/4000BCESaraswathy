// The journey's seed, for the panels that name road company by themselves.
//
// Road company are dealt names, dyes and faces per journey (`travellersOn`, `givenNameFor`), so a
// panel that resolves a met stranger from the save's key -- the People list, a profile card -- needs
// the seed too. A context rather than a prop through every panel that can open a profile: `App`
// provides it once. With no provider it is the empty seed, which is the old, unseeded deal.

import { createContext } from 'react';

export const JourneySeed = createContext('');
