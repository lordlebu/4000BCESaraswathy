# Conversation

How talking to somebody works, why it is paced the way it is, and what was found in the writing
while building it.

The sprint plan is **[Eight People Worth Talking To](https://claude.ai/code/artifact/617c8617-0130-4234-92fb-5e1e611f50ba)**.
Private artifact; ask the repo owner if the link 404s.

## What canon holds

Eight people, forty-four lines, averaging thirty-eight words each. Nineteen of those lines are
ungated introductions; twenty-four unlock from a discovery and one from a word. Everyone stands in
one to three of the twenty points of interest, and eleven of those twenty have somebody in them.

| | lines | free at a first meeting | gives something |
|---|---:|---:|---:|
| Bekh, keeper of what is left | 8 | 3 | 3 |
| Thrali, fisher | 6 | 2 | 4 |
| Uma, roofer | 6 | 3 | 2 |
| Pell, wall-keeper and sweeper | 5 | 3 | 4 |
| Marn, herder | 5 | 2 | 3 |
| Okhi, senior copyist | 5 | 2 | 3 |
| Sura, bone-picker | 5 | 2 | 3 |
| Vessa, junior archivist | 4 | 2 | 3 |

**The writing was never the problem.** The panel rendered one line of it as a finished paragraph
that was already complete when the player arrived, answering a question nobody had asked. That is a
caption. The difference between a caption and a conversation is delivery, and it costs one timer.

## The three rules

**One beat at a time, paced by the player.** `Dialogue` types a beat out and waits. This is the
device every cozy game in the genre uses — *Stardew*, *Spiritfarer*, *A Short Hike* — and it is
doing something specific: text that arrives at reading speed reads as *being told*, and the same
text arriving instantly reads as being handed a note.

**A click completes the beat; it never skips it.** An impatient player gets the whole sentence at
once, not the next sentence. Nobody should be able to lose a line by being quick.

**Finishing is what counts as heard — and leaving still counts.** The diary is Varuna's and he does
not need permission to use it, so nothing asks the player to write anything down. A line is recorded
when its last beat lands. Walking out mid-exchange reports the rest anyway; see the second fault
below for why that matters.

## Four things found by measuring

Each of these was believed to be settled before it was checked. Two more, found later by CI, are below.

**1. The comment claiming everybody has one opening line was wrong.** `conversation.ts` carried
"almost everybody has exactly *one* line available on arrival", which is why `saysNow` returns one
line. Re-run against the shipped bundle: **nobody has one.** Bekh, Pell and Uma open with three and
everybody else with two. About **two fifths of the introductions were authored, exported, and never
shown to anybody.** `meeting()` now plays the whole introduction on a first meeting and hands back
to `saysNow` afterwards. `test/dialogue.test.ts` asserts nobody opens with a single line, so if
canon is rewritten that way the behaviour gets reconsidered rather than silently degrading.

**2. Recording only on completion silently took progress away.** Reporting a line when its beats
finished fixed a real bug — a line counted as heard before it was legible — but added a rule nobody
asked for: close the panel early and everything still to be said is lost. Thrali's first line gives
the silver-water question, so a player who stood there while he spoke and then left would find the
question was never given. **That is worse than the bug it replaced, because it removes progress
rather than granting it early.** `keepOnLeave` (default true) reports the remainder on unmount. Two
browser tests in `e2e/questions.spec.ts` caught this; no unit test could have.

**3. `listen` had a stale-closure bug that only a multi-line exchange could expose.** It read
`progress` from its closure, so several calls in one tick each started from the *same* state and
only the last survived. With one line per meeting this was invisible. It now reads through a ref
that is synced after commit — the comment on `latest` in `App.tsx` explains why a ref rather than a
functional update, which cannot work here because `hear` needs the satchel and the progress
together.

**4. Canon uses `--` for two different things.** Mid-clause it is an aside inside one thought:
Marn's *"Not step -- khet."* is a single breath of teaching and splitting it would make him stutter
over the word he is correcting. But *after* sentence punctuation it is **time passing, with Varuna
doing something in the gap** — Uma says *"Sit."*, the player tries, and she says *"-- No, like that,
butt the reeds against the frame"*. Six lines use the first form and five the second. Splitting on
both breaks Marn; splitting on neither loses all five of those silences. `beats()` splits only where
a dash follows `.`/`?`/`!`, and drops the dash, which is stage direction.

## Two more, found by CI

Both were invisible locally and both were caught by the browser suite on a runner with no GPU,
where software rendering stretches the typing out by roughly 3.7x. Neither could have been found by
reading the code.

**5. A click completed the sentence and the reveal put it back.** `advance()` set the text to the
whole beat, and the `setInterval` still running for that beat overwrote it on its very next tick
with the handful of characters it had reached. So the documented behaviour — *a click completes the
beat* — did nothing a player could see, and no number of clicks advanced the exchange until the
typing finished on its own. Locally a beat types out in about a second and the window is too narrow
to notice. On CI it is wide enough that `e2e/talking.spec.ts` clicked, got nothing, and timed out.
The interval is now held in a ref and stopped before the text is completed.

**The unit test that should have caught it passed, and guarded nothing.** It clicked mid-typing and
asserted the text was whole — but never let the clock run afterwards, so it never saw the overwrite.
The fix to the test is a 100ms advance, and the size matters in both directions: the first attempt
advanced 2000ms, by which time the beat has typed itself out anyway, and the sabotage check passed
against deliberately broken code. **A generous wait hid the bug exactly as the missing wait did.**

**6. Under StrictMode, mounting reported every line as heard.** React runs each effect's cleanup
once on mount in development to prove it is safe to run twice, and the leave path is an unmount
cleanup — so walking up to somebody marked all of their lines heard before a character of the first
was drawn. That is the original bug, reintroduced through the fix for fault 2, and it lived in
development only, which is exactly where the browser suite runs. Nothing has been typed at that
moment and something always has been by the time a player can leave, so the reveal being empty is
the discriminator.

## Beats

`beats()` splits a line into the pieces it arrives in. Sentence-final punctuation only, plus the
scene break above. Forty-four lines become **128 beats, averaging 2.9**, and none exceeds 220
characters.

A fragment under 24 characters joins the sentence before it rather than flashing past on its own —
except where it opens a scene, because that pause is exactly what is worth showing. "Mask Family,
yes." is seventeen characters and stands alone because it *starts* its line and has nothing to join.

Never a character count. A split at sixty characters cuts mid-clause and turns a considered pause
into a stutter.

## What this deliberately does not do

**No branching trees.** Canon authors lines as a sequence gated on discoveries, and that *is* the
branching — it branches on what the player has seen, not on what they picked from a menu. A dialogue
tree would put story structure in the game repo, which is the one boundary the project is built on.

**No new writing.** Forty-four lines is enough to prove the machinery. A person who feels thin is a
canon question, answered in canon.

## Still open

**Portraits are wired and unpainted.** A person is now drawn at 96px beside what they are saying
rather than as a 26px mark beside their name, and `src/ui/portraits.ts` swaps in a painting the
moment one exists. `tools/build-plates.js --portraits` builds them — the same tool as the species
plates, because a portrait *is* a plate of a person and that code has already been beaten into
shape by three image tools disagreeing about all of it.

The eight prompts are written and grounded: `docs/portrait-prompts.md`. Canon records no appearance
for anybody, so the trade, the tool, the pronoun and the age band in each one are derived from what
canon *does* say — and the pronouns for Pell, Sura and Uma had to be looked up in the discoveries
that mention them (`his son`, `hers`, `her life`) rather than their own entities.

**Varuna speaks once, and it is the gift.** Canon prices two lines — Uma will show you a bedroll
once she has one of her own mats back, Pell will show you the span once he has a hawser — and both
teach a recipe canon marks `taught_by` that person and nobody else.

**Neither was reachable.** `linesFor` refuses to offer a priced line unless the item is in hand, and
the panel called it without a satchel, so it asked what Uma says to somebody carrying nothing —
every time. A bedroll and a rope span could not be got, and the whole suite was green throughout,
because nothing had ever rendered the panel with something in the satchel.

The fix is the prop; the *design* is that the gift is now something Varuna does. `meeting()` refuses
to auto-play a priced line and `offerIn()` hands it to the panel as an offer, so the item leaves the
satchel only when the player accepts. Playing it automatically would spend a mat on a line nobody
chose to buy.

It sits exactly where the writing already put it. Both priced lines are scene-break lines: Uma says
*"Is that one of mine?"*, and after the pause, *"It is one of yours. Good."* The dash is the moment
the mat changes hands.

One thing checked and found harmless: `hear()` recomputes `linesFor` **with** the satchel and
indexes into that, while the panel indexed a list computed without it. Two different lists, one
index. It never misfired only because both priced lines sort last in canon order, so including one
appends rather than shifts — luck, not design, and now moot since both lists are built the same
way.

**There is nowhere to look somebody up.** Eight people met across twenty places and no record of who
said what. Phase 5 adds a People tab to `Records`, where `would_settle` — authored on every person
and already driving the ending — would become legible before the ending arrives.

**`sarv` draws nothing.** `PersonPortrait` defines an ink for it; the string appears nowhere in
canon — no speaker, no word. Kept as a spare rather than deleted, and noted at the constant.
