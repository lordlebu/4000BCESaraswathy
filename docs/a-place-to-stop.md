# A Place to Stop

The plan for where a sitting ends, built on 2 October 2026 after Satchel and Hearth closed. The
owner chose it over three other directions (a cross-repository contract test, loading panels on
demand, a play round first).

## Why

**Each map is two sittings, and nothing said where one ends.** `test/minutes.test.ts` puts each map
at 18 to 23 minutes as a floor, against the ten to fifteen of focus a cozy session aims for. The
owner ruled that this is not too long, so a map is two sittings. That only works if a sitting has
somewhere natural to stop, and the retrospective recorded that nothing checked for one.

**A night already falls in the middle.** `DAY_OF_WALKING_MS` in `game/fatigue.ts` was sized so
camping is "a thing you do once or twice" a map, so the night was already where a sitting divides.
It just did not say so. Cozy games close the day on a page: Stardew Valley's evening tally,
Spiritfarer's bed, A Short Hike's campfire.

**Unlike Stardew, there is no house** (the owner's point, the same day). The traveller sleeps on a
bedroll, at a camp, under a roof or in a tent they pitched, and never goes home. So the page comes
with any night, wherever it falls, and nothing on it says home. That also makes the return matter
more: with no house to come back to, a returning player has to be told where they are.

## What shipped

**The day behind you.** When a night is slept, the card shows a page under the dawn painting:
- what the day added: a building stage raised, a ground agreed, a question settled, entries that
  grew, words learned, recipes shown, first makings, living things met, strangers fallen in with,
  new questions to settle;
- one line for tomorrow: the pinned thing and what it still wants, or the next step the dock would
  give;
- "Your diary is kept. A good place to stop, if you want one."

A day that added nothing says "A quiet day" rather than inventing something.

**Where you left off.** The front door, above "Go on walking", says which map the traveller was on,
what they were working towards (the pin, or the next building stage), and how much the diary holds.

## How it works

- `content/daybook.ts` holds every rule, pure and tested under Node (`test/daybook.test.ts`):
  - `readingOf` takes a reading of what the traveller knows;
  - `dayLines` compares two readings;
  - `tomorrowLine` reads the same two answers the dock does (`goals.wanting`, `guide.nextStep`), so
    the page and the dock cannot disagree;
  - `leftOffLines` is the front door's.
- **The morning's reading is kept in memory, not saved.** A reload starts the day's page from the
  reload. That avoids a `KNOWLEDGE_VERSION` bump, and loses only a recap the diary already holds.
- **The night is spent on closing the card, so the morning resets on closing it too**, pressed or
  not. Otherwise the next night would tell two days.
- `ActivityModal` draws the page only for a night (`gesture === 'rest'`), however it is called.
- On a short screen the dawn painting shrinks to a band once the page is showing (`data-told`), as
  the negotiation card's does. Before this, the page sat below the fold on a landscape phone.

## Checks

- `test/daybook.test.ts`: every line, its order, the quiet day, the reading being a copy, tomorrow,
  and where you left off.
- `test/activityModal.test.tsx`: the page appears after the night and not before, never for anything
  but a night, and never says home.
- `test/frontDoor.test.tsx`: where you left off sits above "Go on walking", and is absent with no
  walk to continue.
- `e2e/a-place-to-stop.spec.ts`: a night at a camp reaches the page with "Start the day" still
  reachable, and a reload's door says where you left off. Broken on purpose once: with the page
  unwired, the spec fails.

## Not done, on purpose

- **No end-of-day prompt to quit or save.** The game saves every three seconds and on leaving;
  asking would suggest otherwise.
- **No day count on the page.** `travelled` counts the world's days across every map, and "the
  ninth day" on a map first entered yesterday reads wrong.
- **Nothing forces a night.** Fatigue still only slows the walk (`game/fatigue.ts`, invariant 4).
