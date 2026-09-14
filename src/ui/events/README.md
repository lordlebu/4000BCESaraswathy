# Event paintings

One painting per event, shown across the top of the card when something happens to you — a dream,
an animal at the edge of the firelight, somebody arriving in the dark.

**Empty, and nothing waits for it.** There are no events authored yet either; the framework ships
before the content on purpose. An event with no painting still fires, still reads and still
resolves — the card borrows the night's own scene instead, and failing that draws a blank panel and
keeps its shape.

## Naming

**The event's id**: `event_third_night_dream.png`.

An event may override this with its `art` field when two events share a picture, but the default is
the id, so a file named after the event simply appears. `src/ui/art.ts` globs this folder — no list
to update, no code to change.

## What they are of

Not a specimen and not a bench. An event painting is **a moment with the traveller in it**, the
same register as `src/ui/scenes/` — the difference is that a scene is a thing he is *doing* and this
is a thing that is *happening*. Firelight, weather, an animal at a distance, a figure on a road.

Wide: the card crops to roughly 16:7, so compose for a band rather than a square.

## Fallback order

1. `src/ui/events/<art>.png` — this event
2. `src/ui/scenes/rest-<shelter>.png` — the kind of night it happened in
3. `src/ui/scenes/rest.png` — a night
4. a blank panel, and the card is unchanged in every other respect

See `docs/art-placement.md` for the whole queue and `docs/events-plan.md` for the framework.
