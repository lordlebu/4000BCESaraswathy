// @vitest-environment jsdom
//
// The negotiation card, pressed the way the owner pressed it on 28 September: Drel's rice worry,
// with a satchel and a diary full of answers that all miss. Every press has to change the card, or a
// miss reads as a button that does nothing -- which is exactly what was reported.

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Negotiation } from '../src/ui/Negotiation';
import { homesteadOn, type Holdings } from '../src/content/homestead';

afterEach(() => {
  cleanup();
  document.getElementById('root')?.remove();
});

const lothal = homesteadOn('field_map_lothal')!;
const granary = lothal.grounds.find((g) => g.id === 'ground_granary_edge')!;
const rice = granary.worries[0]!;

// Everything here misses the rice worry: only the red rice, or Bekh vouching, answers it.
const holdings: Holdings = {
  words: ['word_kia_ossu'],
  finished: ['discovery_kiln_draught', 'discovery_tower_collapse'],
  helped: ['npc_thrali'],
  carried: { material_sandstone: 2 }
};

function Card() {
  const [flags, setFlags] = useState<string[]>([]);
  return (
    <Negotiation
      open
      homestead={lothal}
      ground={granary}
      flags={flags}
      holdings={holdings}
      peopleHere={['npc_thrali', 'npc_drel']}
      onFlags={setFlags}
      onClose={() => undefined}
    />
  );
}

function renderCard() {
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
  render(<Card />);
}

const press = (name: RegExp | string) => fireEvent.click(screen.getByRole('button', { name }));
const text = () => document.querySelector('.negotiation')?.textContent ?? '';

describe('talking a holder round', () => {
  it('says what you did before every reply, so a second miss is not a dead button', () => {
    renderCard();
    press(/The Wind That Took the Tower/);
    expect(text()).toContain('You show Drel what you found: The Wind That Took the Tower Will Fire a Kiln.');
    expect(text()).toContain(rice.notThat);

    press(/How the Tower Sat Down/);
    expect(text()).toContain('You show Drel what you found: How the Tower Sat Down.');
    expect(text()).not.toContain('Will Fire a Kiln.');
  });

  it('marks a missed answer as tried, and keeps it pressable', () => {
    renderCard();
    press(/The Wind That Took the Tower/);
    const spent = screen.getByRole('button', { name: /The Wind That Took the Tower/ });
    expect(spent.className).toContain('tried');
    expect(spent.textContent).toContain('tried');
    expect(spent.hasAttribute('disabled')).toBe(false);
  });

  it('keeps what listening drew out on the card after the next answer', () => {
    renderCard();
    press('Listen');
    expect(text()).toContain(rice.hint);
    press(/Thrali speaks for you/);
    expect(text()).toContain('Thrali speaks up for you.');
    expect(text()).toContain(rice.hint);
  });

  it('says plainly when nothing you have answers the worry', () => {
    renderCard();
    expect(text()).not.toContain('Nothing you have answers this yet');
    for (const name of [/Answer in Kia/, /Will Fire a Kiln/, /How the Tower Sat Down/, /Thrali speaks/, /Offer: sandstone/]) {
      press(name);
    }
    expect(text()).toContain('Nothing you have answers this yet');
  });
});
