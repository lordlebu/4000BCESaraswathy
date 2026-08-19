# How this project tests, and what it cost to learn

Written after a run of failures that were each fixed twice before being fixed once. The
specific bugs matter less than the shapes, which recur.

## The rule that would have saved the most time

**Measure the instrument before tuning the threshold.**

The zoom spec inferred the camera's zoom from the byte length of a PNG of the canvas, and
allowed 5% drift. It failed locally, then on a PR, then on `main`. Three fixes went into
making the symptom stop: blaming the code, rewriting the test, then fixing a real but partial
cause underneath.

What settled it was one experiment — *how much does a real zoom step move that number?* The
answer was **6.6%**, against a 5% tolerance and observed noise of 6–9%. The signal and the
noise were the same size, so the measurement could never work, and widening the tolerance
would have made the test unable to detect the thing it existed to check.

That experiment was available from the first failure and takes two minutes. **When a
threshold-based test is flaky, measure the signal before touching the threshold.** If the
margin is not large, the instrument is wrong, not the number.

The fix was to stop measuring through pixels: the scene emits `zoom-changed`, `PhaserGame`
mirrors it to `data-zoom`, and the test asks the camera. Prefer observing state over
inferring it from a rendering.

## A guard that cannot fail is decoration

`test/adapterCoverage.test.ts` exists to catch canon fields the game silently drops. After
writing it, the declaration for `neighbours` was removed to confirm it failed, and with the
right message. It later caught nothing only because nothing had drifted — but the proof that
it *can* fail is what makes the green meaningful.

Do this for anything whose job is to notice absence.

## A shortcut that bypasses the seam hides a broken seam

The vocabulary mechanic was dead in the shipped game — no player could learn a word, because
NPC dialogue never reached the adapter — while the suite was green. Every test that needed a
word called `learn()` directly.

**At least one test per mechanic must use only the paths a player has.**
`test/conversation.test.ts` walks both maps talking to people and never calls `learn`. It
found two more content bugs on its first run.

## Allowlists rot silently

Three separate bugs, one shape: a list of permitted things that stopped keeping up.

- `DB_FOLDERS` in the indexer — six entity types never indexed, no error
- `entity_document` — the prose worth retrieving was in fields it did not name
- the adapters — `neighbours`, then `lines`/`knows`/`language`, dropped on the floor

An allowlist is a decision that ages. Where one is necessary, **assert its coverage against
what actually exists** rather than trusting it. That is what `adapterCoverage` does, and why
it fails loudly when canon grows a field.

## Negative tests carry the positive ones

`weather.test.ts` proves the eastern field can be restored. It also proves that under a sky
that never clears, it cannot. Without the second, the first would pass just as well if
conditions were ignored entirely.

Whenever a test asserts a gate opens, assert it stays shut.

## Determinism is a testing feature

`buildFieldMap` is deterministic, so rather than walking a delta hoping to trip over
something, the e2e searches seeds for a convenient world: `poi-53` puts the Eastern Field two
steps from the start, `tower-139` does the same for Kavik's Tower. A 50-second fragile walk
became a 5-second assertion.

**If the world is seeded, search it for the world that makes the test easy.**

The corollary, learned the hard way: **a searched seed is a fixture, and fixtures go stale.**
Adding forest and hills to Lothal's palette changed what every tile becomes, so every authored
place moved — `poi-53` went from putting the Eastern Field two steps from the start to putting it
thirty-nine. Ten specs failed at once, and every one of them was a spec that walks somewhere.

The tell is the *shape* of the failure: ten failures that all share one behaviour is a changed
fixture, where ten scattered across unrelated specs is contention. The fix is to re-run the search,
never to widen the timeouts — that hides the cause and leaves the specs walking half a map. Check
walkability along the route while searching, too, or the key sequence stalls on a tile of sea.

## Intermittent means time-dependent

The same commit passed one CI run and failed another. That single fact ruled out a
deterministic break and pointed at something that varies with elapsed time — which turned out
to be the journal panel reflowing as the day turned, dragging the camera with it.

A real product bug, found only because the flake was investigated rather than retried.

## Never run two browser suites at once

Five times now a suite has "failed" — six specs, then thirty-six, then two, then three, then one
— because a second Playwright run was started while one was still going in the background. They
contend for the dev server on one port and for the machine, and the failures scatter across
unrelated specs in a way that looks exactly like a real regression. The 36-failure run was
diagnosed in a minute only because the previous clean run was still on screen.

**The tell is the duration.** This suite takes about three minutes. Runs of 8.3, 10.1 and 11.8
minutes have all reported failures that vanished on an idle machine. Nothing a starved run
reports should be believed until it is repeated.

But do not stop at the duration either. One 11.8-minute run held three failures: two were real
regressions from the change under test, and only the third was contention. **Re-run each failed
spec alone before dismissing any of them** — a slow run is evidence the failures are suspect,
not evidence they are false.

The same contention appears within a single file, not just across runs. A viewport-resizing test
added beside existing ones failed in the two-worker file run and passed alone, because the specs
share a page. If a new test resizes or navigates differently from its neighbours, check it in
isolation before believing either result.

## Match CI's parallelism locally

Local `workers` was pinned at 3 while CI leaves it to Playwright and gets 1–2. Adding seven
specs pushed three parallel Phaser instances past what a spec's waits allowed, and the
failure looked like a code regression. **Being fast locally and differently wrong is worse
than being slow and the same.** Local is now 2.

## Component tests, and the trap in them

Added after three bugs reached a browser before anything noticed: the diary counted itself
empty in discoveries alone, the place panel buried the field notes, and settling a question was
unreachable because nothing called `answer`. All three are rendering questions with
rules-shaped causes — the seam neither a unit test nor a five-minute browser suite covers well.
`test/panels.test.tsx` runs in about a second and each test names the bug it would have caught.

**Node stays the default environment**, and the panel tests opt in per file with
`// @vitest-environment jsdom`. Everything under `world/` and `content/` is meant to run
without a DOM, and a global jsdom would hide a stray browser dependency rather than catch it.

**Register `afterEach(cleanup)` yourself.** Testing Library only does it for you when vitest
runs with globals, which this project does not — so without it the DOM accumulates and every
query searches the previous test's markup too. It fails in the most misleading way available:
the first three assertions written here "failed" by finding an empty diary that belonged to an
earlier render, which reads exactly like the bug they were written to catch.

And the same rule as everywhere else: **the guard was verified by reintroducing the bug.**
Putting the old `noticed.length === 0` check back fails precisely the two tests written for it.

## The engine file was the one nothing could test

Six bugs surfaced while building the map art. Sorting them by how each was found says the whole
thing:

| Bug | Where it lived | Found by |
|---|---|---|
| Grass drawn across the traveller's face | `WorldScene` | playing it |
| Paddy sprouting through hut roofs | `WorldScene` | a contact sheet |
| A marker hidden under salt grass | `WorldScene` | a bug report |
| Footprints drawn beneath the terrain | `WorldScene` | a bug report |
| Blades reaching the player's chest | `frames.ts` | a test, in milliseconds |
| `ant` matching inside *Panthera* | `bodyPlan.ts` | a test |

The split is exact and it is not luck. `WorldScene.ts` was the only file importing Phaser, so it
was the only file no test could load — and it was nine hundred lines of both *deciding* what to
draw and *calling* the engine to draw it. Everything testable was caught early; everything
untestable cost a dev server, a scripted walk and a screenshot.

Only the drawing needs a browser. Placement is now a pure function in `scenePlan.ts` — world in,
a list of sprites, tiles and depths out — which `WorldScene` walks. The three depth bugs became
one assertion each, run against all four field maps rather than a fixture.

**Writing those assertions immediately found a fourth**: five huts on the Dry Harbour map had a
fence rail across the thatch, because the fence branch ran before the check for what the hut layer
had already built. It had been shipping since the fence landed. Nobody had walked that map's
southern boundary, and no screenshot of Lothal would ever have shown it.

What this does not fix is judgement. *"The neem tree looks like a green disc on a stick"* is not a
test. So the division is: **spatial and ordering facts get tests**, exhaustive and on every commit;
**aesthetic questions get contact sheets**, slow but only when the art changes.

## Write measurements down, or measure them again

The sprite heights were measured by hand three times in one session — each time in a throwaway
command whose output scrolled away, and once the number was assumed instead of checked and was
wrong. `tools/measure-sprites.js` now generates `docs/sprite-heights.md` from the built sheets and
fails if a sheet grows frames the name list does not know about.

The general form: **if a number decides behaviour and you had to compute it, commit the
computation, not the number.** A figure in a comment is stale the day the art changes; a generated
table is not.

## What is worth adding next
- **A Python test runner for the canon repo.** `lint_story.py` and `check_playability.py` are
  untested scripts, and one of them shipped a wrong ordering check for months.
- **Visual regression, properly.** If screenshots are ever compared again, compare *images*
  with a perceptual diff, never file sizes.
- **A smoke test that boots with `VITE_CANON_API` unset**, which is the configuration CI
  actually uses and the one that broke once already.
