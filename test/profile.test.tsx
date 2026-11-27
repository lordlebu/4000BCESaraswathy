// @vitest-environment jsdom
//
// A person's portrait, opened like an animal's plate.
//
// The owner asked for it, for named people and the road's strangers alike, with the drawing as the
// point and never blown up past the size it was painted. These render the card and the button that
// opens it; `e2e/profile.spec.ts` presses a real portrait in a real conversation.

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PROFILE_SIZE, ProfileButton, ProfileCard } from '../src/ui/Profile';
import { npc } from '../src/content/places';
import { strangersMet } from '../src/content/people';
import { travellersOn } from '../src/content/travellers';
import { JourneySeed } from '../src/ui/journeySeed';
import { TWIN_MAP, twinWorldSeed } from '../src/world/twinGeneration';

afterEach(cleanup);

const noop = () => {};
const carrier = travellersOn('field_map_lothal').find((t) => t.id === 'company_carrier')!;
const carrierKey = 'field_map_lothal:company_carrier';

describe('a named person’s card', () => {
  it('shows their portrait at the size it was painted, and what canon says of them', () => {
    const thrali = npc('npc_thrali')!;
    render(<ProfileCard who={{ kind: 'named', npc: thrali, helped: true }} open onClose={noop} />);
    const card = document.body.querySelector('.profile-card')!;
    expect(card).toBeTruthy();
    const portrait = card.querySelector('.person-portrait')!;
    expect(portrait.getAttribute('width')).toBe(String(PROFILE_SIZE));
    expect(screen.getByRole('heading', { name: thrali.name })).toBeTruthy();
    expect(card.textContent).toContain('Drowned Dockyard');
    expect(card.textContent).toContain('You have been some use to them.');
  });
});

describe('a stranger’s card', () => {
  it('says what they are until their name has been learned, then says the name', () => {
    expect(carrier.givenName, 'the carrier has no name in canon').toBeTruthy();
    const { unmount } = render(<ProfileCard who={{ kind: 'stranger', key: carrierKey, known: false }} open onClose={noop} />);
    expect(document.body.querySelector('.profile-card')!.textContent).not.toContain(carrier.givenName!);
    expect(screen.getByRole('heading', { name: carrier.name })).toBeTruthy();
    unmount();

    render(<ProfileCard who={{ kind: 'stranger', key: carrierKey, known: true }} open onClose={noop} />);
    const card = document.body.querySelector('.profile-card')!;
    expect(screen.getByRole('heading', { name: carrier.givenName! })).toBeTruthy();
    expect(card.textContent).toContain('Harappan');
    expect(card.textContent).toMatch(/Walks the road between .+ and .+\./);
    expect(card.querySelector('.stranger-face, .person-portrait')?.getAttribute('width')).toBe(String(PROFILE_SIZE));
  });

  it('keeps a stranger’s face when their name is learned, across maps and journey seeds', () => {
    for(const seed of ['play-test','twin-review','portrait-continuity']){
      for(const map of ['field_map_lothal','field_map_dwarka','field_map_aravali','field_map_narmada',TWIN_MAP]){
        const mapSeed = map === TWIN_MAP ? twinWorldSeed(seed) : seed;
        for(const traveller of travellersOn(map,mapSeed).filter(t=>t.npcId===null)){
          const key=`${map}:${traveller.id}`;
          const view=render(<JourneySeed.Provider value={seed}>
            <ProfileCard who={{kind:'stranger',key,known:false}} open onClose={noop}/>
          </JourneySeed.Provider>);
          const image=document.querySelector('.profile-card .stranger-face');
          const identity=image?.getAttribute('src')??image?.getAttribute('data-look');
          expect(identity).toBeTruthy();
          if(traveller.givenName)expect(document.querySelector('.profile-card')!.textContent).not.toContain(traveller.givenName);
          view.rerender(<JourneySeed.Provider value={seed}>
            <ProfileCard who={{kind:'stranger',key,known:true}} open onClose={noop}/>
          </JourneySeed.Provider>);
          const after=document.querySelector('.profile-card .stranger-face');
          expect(after?.getAttribute('src')??after?.getAttribute('data-look'),`${seed}/${key}`).toBe(identity);
          if(traveller.givenName)expect(screen.getByRole('heading',{name:traveller.givenName})).toBeTruthy();
          view.unmount();
        }
      }
    }
  });

  it('draws nothing for a stranger the roster no longer has', () => {
    expect(strangersMet(['field_map_lothal:company_nobody', 'nonsense'])).toEqual([]);
    const { container } = render(<ProfileCard who={{ kind: 'stranger', key: 'nonsense', known: true }} open onClose={noop} />);
    expect(container.textContent).toBe('');
  });
});

describe('the portrait that opens it', () => {
  it('opens the card on a press, and names what pressing does', () => {
    const thrali = npc('npc_thrali')!;
    render(
      <ProfileButton who={{ kind: 'named', npc: thrali }} name={thrali.name}>
        <span>face</span>
      </ProfileButton>
    );
    expect(document.body.querySelector('.profile-card')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: `${thrali.name} — see their portrait` }));
    expect(document.body.querySelector('.profile-card')).toBeTruthy();
  });
});
