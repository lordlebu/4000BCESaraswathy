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

## Intermittent means time-dependent

The same commit passed one CI run and failed another. That single fact ruled out a
deterministic break and pointed at something that varies with elapsed time — which turned out
to be the journal panel reflowing as the day turned, dragging the camera with it.

A real product bug, found only because the flake was investigated rather than retried.

## Match CI's parallelism locally

Local `workers` was pinned at 3 while CI leaves it to Playwright and gets 1–2. Adding seven
specs pushed three parallel Phaser instances past what a spec's waits allowed, and the
failure looked like a code regression. **Being fast locally and differently wrong is worse
than being slow and the same.** Local is now 2.

## What is worth adding next

- **Component tests.** There is no DOM test environment, so `Diary.tsx` and `PlacePanel.tsx`
  are covered only through e2e, which is slow and indirect. `jsdom` plus
  `@testing-library/react` would let the diary's rules-to-render wiring be tested in
  milliseconds. Two dev dependencies, and the first thing I would add.
- **A Python test runner for the canon repo.** `lint_story.py` and `check_playability.py` are
  untested scripts, and one of them shipped a wrong ordering check for months.
- **Visual regression, properly.** If screenshots are ever compared again, compare *images*
  with a perceptual diff, never file sizes.
- **A smoke test that boots with `VITE_CANON_API` unset**, which is the configuration CI
  actually uses and the one that broke once already.
