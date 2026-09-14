# Events

Something happening to you, as opposed to something you did.

**Status: framework shipped, content not written.** That order is deliberate and this document is
mostly about why.

---

## What it is for

A dream on the third night. An animal at the edge of the firelight. Somebody arriving in the dark
with a question. A find on the road. None of those are written. What is written is the shape they
arrive in, so that adding one is **a row of data and a painting**, not a feature.

## Why the framework came first

Every mechanic in this game that arrived content-first grew its own surface. The diary has one, a
conversation has one, the activity card has one — and three of them turned out to be the same
screen wearing different code: **a painting, a passage, and a short list of plain choices.**

An event wants exactly that screen. So `EventCard` reuses `ActivityModal`'s furniture down to the
class names, and the reuse is the point rather than a shortcut — if an event ever needs something
that card cannot do, the honest fix is to change the shared card, not fork it.

## It answers a question the shelter ladder could not

There are six kinds of night — `bedroll`, `tent`, `camp`, `roof`, `settlement`, `palace` — and
`NIGHT_RESTORES` is **flat**. Every one of them is worth the same rest. Only sitting it out with no
shelter at all is worth nothing, because that is not sleeping.

A graded version was built and taken back out. It read plausibly — a bedroll worth a third of a
night in town — and it was answering a question nobody had asked. **The shelter kinds exist to be
different places, not different amounts.** What you get out of where you slept is going to be an
*event*, and an event is a scene and a choice, which is a far better axis than a percentage.

So `Conditions.shelter` is the payoff: a dream that only comes in the woods, a visitor who only
knocks in a town. That is why the ladder has six rungs and a flat table behind it.

## The shape

| Piece | What it holds |
|---|---|
| `Occasion` | `night`, `arriving`, `road` — a closed set, so an author can *read* the trigger |
| `Conditions` | shelter kinds, field maps, earliest day, ids the player must hold |
| `Choice` | a label, what it needs, the line it writes, and what it grants |
| `GameEvent` | id, title, occasion, conditions, prose, art, choices, `once` |

Two rules are design rulings rather than fields to tune:

**Every option offered must be takeable.** No option fails, none is gated behind a check the player
cannot see, and none leaves them worse off than not having been there. An option needing something
they lack is simply **not offered** — the opposite of the action rail's convention, and deliberately
so: a greyed row in the rail teaches that a mechanic exists, where a greyed choice in a scene
teaches that you have already lost something.

**An event can never strand a player.** If every choice is gated, `choicesFor` offers the last one
anyway. A scene with a picture, a passage and no buttons is a soft lock, and it is worse than an
event bending its own rule.

## What it is wired to

`night-passed` — which **had no listener at all** until this. It was emitted every time somebody
slept, carrying where they were, what shelter they had and what the diary should say, and nothing
anywhere read it: the fourth instance in this codebase of a thing built, tested, believed and wired
to nothing. So the framework is not bolted onto the night, it is plugged into a socket that was
already there and unused.

Grants reach `Progress` through `journey.receiveAll` — the same door a conversation uses, so there
is not a second place for the rules about what a `word_` prefix means.

Choosing is **seeded**, from `tileHash` on the tile and the day. The determinism rule is absolute:
the same seed must produce the same world and the same journal text.

## Where the content will live, and the question that is open

The registry is a TypeScript array in `content/events.ts`, and that is deliberately a holding
position. An event carries prose, and every other body of prose in this game lives in **canon** — so
when these stop being placeholders the question is whether an event is canon's (a thing that is true
of the world) or the game's (a thing that happens to one player).

A dream and an encounter are arguably the first. A find on the road is the second. Keeping them in
an array leaves that open and cheap to answer; a JSON file in `data/` would look like a decision
that had been made.

## What is still to do

- **Author events.** The framework is unexercised until there is one.
- **`seen` belongs in the save.** It is a `useRef` today, because adding a field to `Journey` bumps
  `SAVE_VERSION` and discards every existing journey — and there are no events yet to have seen. It
  moves in the same change that authors the first one.
- **The other two occasions have no caller.** `night` is wired; `arriving` and `road` are declared
  and unused, which is the fault this document keeps naming. They get one when they get content.
- **Side quests need no new machinery.** A chain of events granting each other's `requires` is one,
  and that was the test the `grants`/`requires` pair was designed against.
