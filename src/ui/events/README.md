# Event paintings

One painting per kind of event, shown across the top of the card when something happens to you — a
dream, an animal at the edge of the lamplight, somebody arriving in the dark.

**Empty, and nothing waits for it.** Thirteen kinds of woven event happen today with no painting at
all: the card borrows the night's own scene instead, and failing that draws a blank panel and keeps
its shape. A painting replaces that the moment it lands.

## Naming

**Woven events**: `woven-<kind>.png` — `woven-tracks.png`, `woven-knock.png`. One painting serves
every event of that kind, whichever animal or stranger it is about, so none of them should show a
particular species or a particular face. The kinds are the keys of `data/happenings.json`.

**Authored events**, when there are any: the event's id, `event_third_night_dream.png`. An event may
override this with its `art` field when two events share a picture.

`src/ui/art.ts` globs this folder — no list to update, no code to change. A second take is
`woven-tracks.2.png`, and the card chooses between takes on a seeded hash.

## Getting one in

Save what a tool gives you into `assets/source/events/` under the name above, then:

```bash
node tools/build-plates.js --events
```

It crops to **4:3** — the card's own shape, the same as `src/ui/scenes/` — and writes 512 px wide.
The prompts are in `docs/event-prompts.md`.

## What they are of

Not a specimen and not a bench. An event painting is **a moment with the traveller in it**, or just
out of frame, the same register as `src/ui/scenes/` — the difference is that a scene is a thing the
traveller is *doing* and this is a thing that is *happening*. Firelight, weather, an animal at a
distance, a figure on a road.

## Fallback order

1. `src/ui/events/<art>.png` — this event
2. `src/ui/scenes/rest-<shelter>.png` — the kind of night it happened in
3. `src/ui/scenes/rest.png` — a night
4. a blank panel, and the card is unchanged in every other respect

See `docs/art-placement.md` for the whole queue and `docs/events-plan.md` for the framework.
