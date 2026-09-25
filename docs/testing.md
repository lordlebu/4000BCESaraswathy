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
`test/conversation.test.ts` walks every map talking to people and never calls `learn`. It
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
something, the e2e searches seeds for a convenient world: `poi-252` puts the Eastern Field two
steps from the start, `tower-57` does the same for Kavik's Tower. A 50-second fragile walk
became a 5-second assertion.

**If the world is seeded, search it for the world that makes the test easy.**

The corollary, learned the hard way twice: **a searched seed is a fixture, and fixtures go stale.**
Adding forest and hills to Lothal's palette changed what every tile becomes, so every authored
place moved — the seed that had put the Eastern Field two steps from the start now put it
thirty-nine. Ten specs failed at once, and every one of them was a spec that walks somewhere.

Then it happened again with landforms, **after I had reasoned that it would not**. The argument was
that the route-easing pass runs after placement, so the places stay where they are. True, and
beside the point: the *shaping* decides what terrain each tile is, placement gathers candidates by
terrain, and `pick` indexes those lists with a modulo. So the rule is wider than it first looked —
it is not palettes, it is **anything that changes what a tile is**.

The tell is the *shape* of the failure: ten failures that all share one behaviour is a changed
fixture, where ten scattered across unrelated specs is contention. The fix is to re-run the search,
never to widen the timeouts — that hides the cause and leaves the specs walking half a map. Check
walkability along the route while searching, too, or the key sequence stalls on a tile of sea.

"Never widen the timeouts" is the right rule *for this failure*, and it is worth saying what makes
it right, because it has one real exception and they are easy to confuse. Here the route was
supposed to be two tiles and had silently become thirty-nine: the budget was fine and the work had
grown behind it. Widening would have bought the spec enough room to keep doing the wrong thing.
See the section below for the case where the work is the intended size and the budget genuinely
does not fit it.

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

**The tell is the duration.** This suite takes about **4.7 minutes** at fifty specs, on two
workers. It was three when that figure was first written and the suite was smaller — worth
re-measuring whenever specs are added, because a stale number here makes every normal run look
like contention. Runs of 8.3, 10.1 and 11.8 minutes have all reported failures that vanished on an
idle machine. Nothing a starved run reports should be believed until it is repeated.

But do not stop at the duration either. One 11.8-minute run held three failures: two were real
regressions from the change under test, and only the third was contention. **Re-run each failed
spec alone before dismissing any of them** — a slow run is evidence the failures are suspect,
not evidence they are false.

The same contention appears within a single file, not just across runs. A viewport-resizing test
added beside existing ones failed in the two-worker file run and passed alone, because the specs
share a page. If a new test resizes or navigates differently from its neighbours, check it in
isolation before believing either result.

## Should the strategy change? Recorded, not acted on

Asked after the third browser-suite flake in a fortnight, and worth writing down because the answer
is "not yet" and that will stop being true at some point.

**What is actually wrong.** Every flake this suite has produced has had the same shape: a test
waiting on *elapsed time* instead of on *state*. The fatigue walk waited a fixed number of steps
against a tween whose length depends on terrain. The diary reload slept 3500ms against a save that
flushes on a 3000ms interval. The fix for that one waited for localStorage to **change**, which
races the same interval from the other side — the write can land before the snapshot, and then
nothing ever changes again. Three failures, one root cause, and none of them a bug in the game.

**What people do about it in projects like this.** The standard answers, roughly in order of how
much they would help here:

| Practice | Fit |
|---|---|
| Assert on state, never on elapsed time | **Already the rule**, newly written down. Every flake so far violated it. |
| Expose a test seam for async work — a `data-*` attribute, a promise on `window` | Would have prevented all three outright. The cheapest real change available. |
| Control the clock (fake timers) rather than out-waiting it | Awkward here: Phaser drives tweens off its own loop, so faking `setTimeout` alone does not stop the world. |
| Push logic down: thin browser suite over a thick unit suite | **Largely done and worth protecting.** 593 unit tests to 50 browser specs, and `scenePlan.ts` is deliberately Phaser-free so the hard part runs under Node. |
| Trace/video on first retry | Already on. It is what makes a CI failure legible at all. |
| Shard CI across runners | Premature. The suite is 4.4 minutes locally; the problem is flakiness, not duration. |

**Why not now.** The one change that would pay — a state seam the specs can await instead of
guessing — is a change to production code to suit the tests, and it should be made once, on
evidence, rather than three times in a hurry while chasing a red build. There are now three worked
examples of exactly what such a seam would need to expose. That is a good position to design from
and a bad one to design during.

**The trigger to revisit.** A fourth time-dependent flake, or any flake in a spec that does *not*
wait on a timer. Either means the pattern is wider than "we kept writing sleeps", and the seam
should be built.

Until then the rule is the cheap half of the same idea, and it is not optional: **a spec may wait
for a condition to be true, never for a duration to pass.** If the condition cannot be observed
from the page, that is the argument for the seam — make it then.

## What skips the browser suite

The suite is the slowest thing in CI, so it does not run on changes that cannot reach a browser.
The rule is a safe list rather than a denylist, and the list is short because an ambiguous case
should err towards checking.

| Change | Browser suite |
|---|---|
| `*.md` anywhere | skipped |
| anything under `docs/` — prose and the images embedded in it | skipped |
| anything under `assets/source/` — the raw art the builders read | skipped |
| `assets/*.png`, `src/ui/plates/*.png` | **runs** |
| workflows, code, `data/canon/`, an empty diff | **runs** |

The distinction that matters is **shipping versus not**. `assets/source/` holds inputs: changing
one does not change a pixel the game draws, because the sheet under `assets/` only moves when
somebody runs the tool and commits the output — and that output *is* a change to `assets/`, which
is not on the list. The built sheets and the painted plates are imported by `src/` and ship, and
two specs compare rendered frames, so an art change there can genuinely fail a test.

Workflow files are deliberately absent from the safe list: a change to how CI runs should be
checked by CI. So is an empty diff.

## Reproduce CI before diagnosing CI

**Four failures in a row were diagnosed by reading a log**, because the suite passed locally every
time. Three commits went out against a failure nobody could reproduce and one of them broke `main`.
An attempt to stand in for CI with 4× CPU throttling *disproved itself*: the version that had just
failed CI passed under the throttle in 84 seconds, faster than the fix did at 99. Throttling a CPU
does not emulate a software renderer.

```bash
npm run test:ci                            # the whole suite, the way CI runs it
npm run test:ci e2e/playthrough.spec.ts    # one spec
CI_CPUS=2 CI_MEMORY=7g npm run test:ci     # a private repo's smaller runner
```

`tools/ci-local.sh` runs the browser suite in `mcr.microsoft.com/playwright` at the version the
repo pins, constrained to **4 CPUs and 16 GB**. Two things make it work, and the second is the one
that gets skipped:

**The image**, because a developer machine draws through a real GPU and the runner falls back to
SwiftShader. **The size**, because the first run of this handed the container sixteen cores and
everything passed comfortably — which proves only that a sixteen-core Linux box is not a GitHub
runner.

**Getting the size right cuts both ways.** Two CPUs was tried first and fails three of the four
tests in `hours.spec.ts` — tests CI passes every time. A reproduction harsher than the thing it
reproduces invents failures nobody has. Calibrate by running a spec CI passes and tightening until
it stops: four is where local behaviour matches CI's.

The number that came out of it settled a fortnight of guessing: **at a correctly sized runner the
map crossing takes 4.3 minutes, and its budget was four.** Not a flake, not the renderer, not new
sprites — a test that needed more time than it had.

Two things to know before reading a duration off it. Linux dependencies live in a named Docker
volume rather than the checkout, because `rolldown` and `esbuild` ship per-platform binaries and a
Windows `node_modules` dies on the first import inside Linux; the first run installs, later ones
start immediately. And Docker Desktop on Windows adds real filesystem overhead — a full suite that
CI does in 17 minutes has taken 31 here. **It reproduces behaviour, not timings.**

## The browser suite is sharded four ways, and the cap is what taught us that

CI runs everything on every push. `browser-shard` is a matrix of `--shard=N/4` and a gate job named
`browser` reports their aggregate, because `main`'s ruleset requires a check by that name and a
matrix reports as `browser-shard (1)`.

```bash
npm run test:e2e                     # all of it
npm run test:e2e -- --shard=3/4      # one shard, exactly as CI runs it
npm run test:e2e:fast                # a local shortcut; nothing in CI uses it
```

**Measured, September 2026.** Unsharded the 129 tests are **45 CPU-minutes of work**, 22.5 minutes
on two workers. Sharded and read off CI itself, twice:

| run | shard 1 | shard 2 | shard 3 | shard 4 | |
|---|---|---|---|---|---|
| 35354275483 | 6.6 | 6.1 | **16.7** | 4.4 | one flaky walk |
| 35366992526 | 6.6 | 6.1 | 6.7 | 3.6 | clean |

**Three numbers, one story, and it took all three to get it right.** A local prediction said 8.4
minutes for the worst shard. The first CI run said 16.7, which looked like the local box being
twice as fast as a runner. The second CI run said 6.7 — so the box is *not* twice as fast, and
the 16.7 was the map crossing blowing its own 480-second budget and being re-run by `retries: 1`.
Ten minutes of one shard was a flaky test, and one measurement could not tell that from a slow
shard.

The lessons, in the order they were learned the hard way:

- **A measurement taken somewhere else is a prediction.** Publish where it came from.
- **One measurement of a variable thing is an anecdote.** The reading that looked like a systematic
  factor was a single flaky test, and the second run is what distinguished them.
- This box is about 1.1 to 1.3× faster than a hosted runner per shard, at the same 4 CPUs and
  16 GB — enough to matter, nowhere near the 2× the first comparison suggested.

Raising the shard count is unnecessary and barely works anyway: at six the worst shard is 16.3
minutes, at eight 11.6, because a handful of files dominate and a file cannot be split across
shards. `reachable.spec.ts` alone is 6.6 minutes, and Playwright says so in the run's own output.
Headroom comes from the cap instead, which is 45 minutes: the install steps' own budgets (12 and
15) plus the **flaky** run's 16.7, because a cap is for the bad run and not the good one.

**How it broke, which is the part worth keeping.** The suite ran on one runner under
`timeout-minutes: 30`, and the comment that chose 30 assumed the suite took "four or five" minutes.
It took twenty-five. Six runs of *the identical suite* on `main` measured 17.3, 21.9, 22.1, 28.6,
29.3 and 29.3 minutes; three of them landed within forty seconds of the cap and passed. Then run
35345668203 went over and was killed with 49 tests unreported.

Nothing failed. Nothing was flaky. There was no bad commit to find — which is exactly why this took
a measurement rather than a reading of the diff, and why the first instinct, that the two tests the
merge added were at fault, was wrong: they cost **17.8 seconds of 2,692**.

Three lessons, and the third is the one this file exists for:

- **A duration in a comment is a claim, and it rots.** Every timing in this section and in
  `ci.yml` was written from a real measurement and every one of them was years of commits out of
  date. Re-measure before trusting one, including these.
- **A job cap is a budget, not a safety net.** If the thing it bounds has grown into it, the cap
  stops catching hangs and starts flipping coins.
- **A green job can still be hiding a failure.** Playwright reports a test that failed and passed
  on retry as *flaky*, and the job goes green. The map crossing did exactly that on run
  35354275483 — a 480-second timeout nobody would have seen, and ten minutes of a shard nobody
  could have explained. `if: failure()` on the report upload then threw the trace away, so the
  artifact step existed and preserved nothing; it uploads on any completed run now, about 230 KB
  a shard. **An open item:** the walk's 480-second budget is not reliably enough on a hosted
  runner. It passed cleanly on the very next run, so one occurrence in two is not yet a signal —
  and the artifact change is what will make the next one readable rather than inferred.
- **A check whose result depends on how busy the runner was is not a check.** Which is the same
  finding as the `@slow` split below, arrived at from the other direction.

### The `@slow` split, retired

`playthrough.spec.ts` used to be held off pull requests by its `@slow` tag, so it first ran *after*
the merge. A pull request went green, merged, and turned `main` red — three times in one sprint. A
check that only fails once it is too late to act cheaply is worse than a slower one, so the walk
runs everywhere now and the cost is absorbed by sharding instead.

The tag survives, and earns its keep locally: `npm run test:e2e:slow` is the map crossing on its
own. It is the only test that walks a whole map and proves a real playthrough finishes, and it has
caught three separate bugs.

## The signal has to be the one the thing actually gives

Three of the four CI failures above came from waiting on the wrong thing, and each wrong thing
looked obviously right.

**A fixed wait is a guess about someone else's machine.** The walk spent 1,900 ms after every tap
and 780 ms after every step — 209 seconds of deliberate waiting inside a 240-second budget, with
about thirty seconds left for everything else. Nothing had to break for that to run out.

**"Changed" is not "finished".** Replacing those waits with "wait until the journal heading
changes" was worse. A tap is not one move: it hands the pathfinder a whole route, so returning on
the first change cuts the route off after its *first* tile and taps again. Measured with the loop
cap lifted, the walk went from needing 110 legs to **214** — and still passed locally, because
fifteen seconds of grace after the loop let one last uninterrupted path reach the landmark. The
signal had to be *stillness*: differ from where the turn started, then hold the same value for
300 ms. Back to 38 legs.

**A cap tuned to your own machine is a fixed wait wearing a disguise.** The replacement capped a
tap at five seconds, picked from what a path costs locally. A tile is 425 ms, so a twelve-tile route
is already 5.1 seconds and gets guillotined — putting the walk straight back to one tile a leg on
any machine slower than the one that chose the number. Size caps from the *map*, not the clock.

**And `locator.click` waits for the element to hold still.** Part of actionability is stability: the
same bounding box for two consecutive animation frames. The canvas is in a RESIZE-mode scale manager
beside a journal panel that reflows as the day turns, so there are moments when its box is never
still for two frames together, and the click then runs to the test timeout — reported as *"element
was visible and stable but the operation never completed"*. `walk.ts` already documented this for
`keyboard.press`, ending "every other spec in this suite already presses through `page.keyboard`;
this helper was the one place that did not." The tap in the walk was the other place. Both go
through `page.mouse` at a computed point now. The full suite went 8.9 minutes to 4.8.

## When the budget really is too small

The exception to "never widen the timeouts", and the way to tell it from the rule.

Run 32553811087 failed the fatigue walk at ninety seconds. Two things were true at once, and only
one of them was the spec's fault.

The spec's fault: it walked fifteen steps to reach a tiredness note that needs about forty, so the
distance was never doing anything the assertion could use — `expect(tired).toBeLessThanOrEqual(1)`
would have passed without walking at all. Eight steps proves the same thing and still crosses the
terrain change, which was the only part of the route with any content in it. **That half is the
ordinary rule: the work was wasted, so the work went, and the budget was not the problem.**

Not the spec's fault: **headless Chromium on a CI runner has no GPU.** It falls back to SwiftShader
and renders in software, measured at roughly 3.7× slower than the same suite locally. Against that
multiplier the second-slowest spec — settling a question, 25s local — lands at about 92 seconds,
and there is nothing wasteful in it to remove. It is a legitimately long spec on a legitimately
slow renderer, and it was one noisy runner from failing for a reason no amount of tuning addresses.

So the budget went to 180 seconds, which costs nothing on a green run: **a timeout bounds failure,
it does not pace success.**

The distinction to hold on to:

| | Stale fixture | Too-small budget |
|---|---|---|
| What changed | the work grew behind the budget | nothing; the renderer is just slow |
| Evidence | route length, seed search | measured per-step time, local vs CI ratio |
| Fix | re-run the seed search | raise the budget, and say by what factor and why |
| Widening the timeout | hides it | is the fix |

The test is whether you can say *where the time goes* before you touch the number. Measure the
steps, compare local against CI, and only then decide. Widening because a spec failed and you do
not know why is the thing the rule forbids, and it stays forbidden.

## A starved frame counts as one frame, so a step's wait scales with its cost

**Reported as `main` going red after PR 206**, which had not touched the code that failed.
`e2e/dugout.spec.ts` › *"on a map without a boat, the same step is a wade"* timed out at
`page.waitForFunction: Timeout 10000ms exceeded`, on the run and on its retry, while the Lothal test
beside it passed. The same test had passed on the pull request and on the two runs of `main` before
it.

### The mechanism

Phaser does not advance the game by wall time. `TimeStep.smoothDelta` in
`node_modules/phaser/src/core/TimeStep.js` does two things that matter on a slow renderer:

- **A frame longer than 200ms** (`1000 / minFps`, where `minFps` defaults to 5) is treated as a bad
  frame and credited with the *last sane* delta instead of its real length.
- **For 120 frames after boot** (`panicMax`), and whenever the page is not focused, every delta is
  capped at one 60fps frame, 16.7ms.

So on a software renderer that is starved of CPU, a tween does not finish after its length in
milliseconds. It finishes after its length in **frames**, however long those frames take. A step is
`STEP_MS * cost` of tween, so the frames it needs grow with its cost:

| step | cost | tween | frames at 16.7ms |
|---|---|---|---|
| paddling on Lothal | 0.5 | 212ms | ~13 |
| plains on foot | 1 | 425ms | ~25 |
| a river on foot (the wade) | 3 | 1275ms | ~76 |

That is why the wade failed and the paddle beside it did not. It is also why `walk.ts`'s 12-second
arrival budget, sized for ordinary ground, does not carry over to a river.

### How it was diagnosed

1. **The CI log first.** `get_job_logs` through the GitHub tools gave the failing test and the
   timings: both attempts failed within seconds of each other, and the shard ran in 7.3 minutes
   against 3.5 in the local container, so the runner was about twice as slow as the reproduction.
   The Playwright report artifact could not be downloaded: its blob-storage URL is refused by the
   session's proxy.
2. **Ruled out the clock.** The spec pins no `?hour=`, so the wall clock chooses the hour and CI ran
   at 22:03 UTC. The same step at all 24 hours passed locally. `startPhaseFor` is the only wall-clock
   read, and `?hour=` overrides it.
3. **Ruled out a kill.** Nothing calls `killTweensOf(this.player)`, and only walking and riding set
   `moving`. So "stuck forever" would need a tween that never completes. Nothing in the wading
   branch of `moveWaterline` blocks or allocates per frame.
4. **Reproduced in CI's image** (see *Reproduce CI before diagnosing CI*). At CI's 4 CPUs the wade
   passed and took 1.7 to 1.9 seconds; at 2 CPUs, 1.8 to 3.5. **Starved to one CPU, with
   `reachable.spec.ts` running beside it on a second worker, the old 10-second bound failed both
   dugout tests.** That harness is harsher than CI, which *Reproduce CI* warns can invent failures.
   It was used here to expose the mechanism, not to calibrate a rule the rest of the suite follows.
5. **Traced it: slow, not stuck.** A scratch spec read `__walker()` every three seconds during the
   step. The traveller crept across the tile, `__stalls` recorded one stall about every four
   seconds, and he arrived after **38.7 seconds** twice and 6.9 seconds once.
6. **Measured the budget rather than deriving it.** `walk.ts`'s 12 seconds times the cost, 36, was
   tried first and was exactly what the trace exceeded. The wait is now `STEP_BUDGET = 60_000` in
   `e2e/dugout.spec.ts`, half again the worst measured. In the same one-CPU harness where the old
   bound failed both dugout tests, three repeats of both beside `reachable.spec.ts` passed, 42 of 42
   with retries off.

### The rule it adds

**Size a step's wait by the frames it needs, not the milliseconds.** When a spec waits for a tween,
its budget has to cover the step's *cost* at the worst frame rate CI gives, because Phaser will not
let a starved frame count for more than one. A generous bound costs a green run nothing, since
`waitForFunction` returns the moment the condition holds. This is the *too-small budget* column of
the table above, and it came with the thing that column asks for: where the time goes, measured,
before the number moved.

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
one assertion each, run against every field map rather than a fixture.

**Writing those assertions immediately found a fourth**: five huts on what was then the Dry Harbour
map had a fence rail across the thatch, because the fence branch ran before the check for what the
hut layer had already built. It had been shipping since the fence landed. Nobody had walked that
map's southern boundary, and no screenshot of Lothal would ever have shown it. (That map has since
been retired, which does not weaken the lesson — the bug was found because the assertion ran
against every map rather than the one being looked at.)

What this does not fix is judgement. *"The neem tree looks like a green disc on a stick"* is not a
test. So the division is: **spatial and ordering facts get tests**, exhaustive and on every commit;
**aesthetic questions get contact sheets**, slow but only when the art changes.

## A test that shares an assumption with the code cannot catch it

Two of the most expensive bugs here were invisible because the test and the code were wrong in the
same way.

`isNight` compared a phase against `hour / 24` and was false at every hour of the day. Its unit
test built fixtures with the same conversion and passed — the function and the check agreed, and
both were wrong. A browser spec caught it, because the camp button never appeared.

Later, a check that every `helps` is spoken reported **every reaction missing**. For several
minutes that looked like a content bug. It was not: the check started from an empty journey, and a
person's reaction only surfaces once their opening offer has been taken. The content was there and
the test was unrealistic.

The two shapes are worth naming separately:

- **A fixture built with the implementation's own formula proves nothing.** Where a conversion
  exists in the source, import it or go through the real entry point — `startPhaseFor`, not a
  hand-written `hour / 24`.
- **A check that skips the path a player takes will report absence that is not there.** Walk it the
  way it is walked: arrive, talk, go and do the work, come back.

The tell for the second one is a check that fails *everywhere at once* on its first run. Genuine
absence is usually patchy; universal failure is more often the harness.

## A spec asserts a mechanic's *shape*, so changing the shape breaks it

Resting used to be one click: press the row, the night passes, the row greys out because there is
no bed on offer in the morning. `e2e/fatigue.spec.ts` said exactly that, and it was right for as
long as it was true.

Then resting became an activity like taking something — a painted card, three beats, and the night
spent on the way *out* of it. The click now opens a card, and the spec went on asserting the
morning had arrived while the player was still looking at dusk. It failed on `main`, alone, in an
otherwise green suite of eighty.

There is no way to write that spec so the change would not break it, and it should not be tried:
the spec's whole job is to hold the mechanic's shape still. **What matters is that the shape change
and the spec change travel in the same commit**, and the thing that decides whether they do is
whether the browser suite runs before the merge and not after it.

It did not here. The pull request that made resting an activity was merged **twelve seconds** after
it was opened, and the one before it in thirty-seven — so `main` was the first place either ever
ran. Every failure this session had already been fixed on a branch by the time anyone read it,
which is the specific waste a required check exists to prevent. A required check that is merged
past is a check nobody is running.

## A flag that doubles as content only latches when the content is there

The same change left a second fault behind it, and it is the more portable of the two.

The activity modal held its settled state as `string | null` — the sentence the run ended on,
doubling as *has this run ended*. Every gesture that comes off a tile has a material to name, so
the sentence is never empty and the flag always latches. A rest promises nothing. Its line came
back `''`, and `''` is not null:

- the card's prose rendered the empty string, because `??` falls back on null and not on empty;
- the timing bar and the strike button never went away, so a finished night never looked finished;
- the settle effect ran again on the next render and paid `onFinish` **twice** — the double
  payment this component's own test file names as the most expensive fault it can have.

Nine unit tests covered that modal and none of them opened it on a rest, because every fixture had
a material in it. **A fixture set that never contains the empty case cannot find the empty case**,
and the empty case is usually the one a later feature introduces.

The fix is not a cleverer falsiness check. It is that a run settling on an empty sentence is a
legitimate state, so the flag has to be something other than the sentence — here `{ line: string }
| null`, where the object is the flag and the string is only what it carries.

## jsdom has no layout, and three things follow from it

All three cost a round in the interface work, and none of them announces itself — a suite that
believes it is testing a thing keeps passing while the thing is untested.

**`offsetParent` is always null.** The modal's focus trap filtered its candidates with
`el.offsetParent !== null`, which is the usual way to drop a hidden control. Under jsdom that drops
*every* control, so the trap found nothing to wrap to and the tests would have passed on a trap that
did nothing. `Element.checkVisibility()` is the one API that answers for an ancestor as well as the
element, and jsdom is happy to say "visible" when nothing has told it otherwise, which is the right
answer in a test.

**A portal is not in the render container.** Every modal renders outside `#root` so the application
behind it can be marked `inert` with one attribute. `render()` returns a `container` that no longer
holds any of it; Testing Library's **`baseElement`** is `document.body` and is the documented way to
query a portal. `container` is still right for exactly one assertion — that a *closed* panel renders
nothing, which is a question about the container rather than about the page.

**There is no such thing as "in front".** Whether the right modal is on top of the other is a
question only a browser can answer, and `e2e/plates.spec.ts` asks it with `elementFromPoint` at the
centre of the picture: what would the browser hand a click to. The component test proves the right
modal *answers Escape*; that is a different claim, and both are needed.

## Seeding a save from a spec: write it into the next load

Putting a collection into `localStorage` and reading it back in the same page **does not work**. The
page is live, the step's arrival settles a moment later, and the game saves its own in-memory state
straight over the edit — the album then opens on whatever was actually met and the failure looks
like the feature is broken.

`page.addInitScript` writes into the *next* load, before any application code runs. So: boot, take
one step so the game writes a save, read what it wrote, edit it, hand it to an init script, reload.

Reading the save back is also how `SAVE_VERSION` is obtained. Importing it from `src/save.ts` drags
`collection.ts`, `satchel.ts` and `nodes.ts` into Playwright's Node runtime, where their JSON
imports need an attribute Node will not infer — and the spec does not fail an assertion, it never
loads at all, reported as "No tests found". Hard-coding the number instead goes stale the next time
the ground moves under a save, which `save.ts` says happens for two different reasons.

## A test that passes because something vanished

Two browser assertions read `overlap('.place', '.journal') === 0` — the two panels divide the bottom
of the screen, so their rectangles must not intersect. The dock made them take turns in one slot, so
`.journal` is simply not on the page while a place is open, and the helper returns `0` when either
element is missing. **Both assertions would have gone on passing, against an arrangement they no
longer describe.**

The general form: an assertion phrased as *"these two things do not collide"* is satisfied by one of
them not existing. When the shape changes, re-read what the old assertion was protecting rather than
checking whether it still goes green — here it was *leaving a place reveals the notes rather than
clearing the screen*, which is now the reducer's and tested there, plus a browser test that walks
the controls a player actually has.

## Name a fixture that cannot change category

`test/specimen.test.tsx` needs one species with a painted plate and one without. Naming them —
`river-otter` and `sweet-indigo` — is a suite that fails the day somebody paints a sweet indigo, on
a feature working perfectly. Both are found from the data now, so the tests follow the folder.

Where the data cannot be imported, as in the browser spec, **name the half that only grows**: a
plate is added and never taken away, so a painted species is a safe constant and an unpainted one is
not.

## Write measurements down, or measure them again

The sprite heights were measured by hand three times in one session — each time in a throwaway
command whose output scrolled away, and once the number was assumed instead of checked and was
wrong. `tools/measure-sprites.js` now generates `docs/sprite-heights.md` from the built sheets and
fails if a sheet grows frames the name list does not know about.

The general form: **if a number decides behaviour and you had to compute it, commit the
computation, not the number.** A figure in a comment is stale the day the art changes; a generated
table is not.

## Watching the game from outside: the three debug hooks

The scene exposes three globals, and they exist because **a Node test cannot see a Phaser sprite**
— every fault in the walker, the travellers or the frame budget lives on the far side of that line.
They are not a debug build; they ship, because the bug that needs them is the one a player reports.

| hook | answers |
|---|---|
| `window.__walker()` | `{x, y, biome, moving, depth, sortedRow, queued}` — where the traveller is, what ground, mid-step or not, which row he is sorted into |
| `window.__travellers()` | every road traveller: id, whether canon named them, which sheet, visible, position |
| `window.__stalls` | every time the main thread stopped answering: `{lateBy, at, walker}`, also in `localStorage` under `sot.stalls` |

`__walker` is what made a reported freeze *steerable*: "North Dwarka, towards the basalt columns"
could not be aimed at until a spec could ask where the traveller had got to, and blind key-pressing
had been walking him the wrong way across the map for two harnesses.

## Diagnosing a freeze the machine will not reproduce

A freeze reported from play — "the whole game is stuck when I move to a different tile", landscape
phone — resisted three harnesses. What finally separated the possibilities was three techniques, in
this order. None of them is obvious and all three are cheap.

**1. A timer that notices it ran late.** `src/game/stall.ts`. A blocked main thread cannot run the
check either, so the check fires *after* the block and measures the gap. This is the only
measurement a page can make about its own paralysis, and it is the one that works on a phone, where
nothing can be attached. Read it back with `window.__stalls` or `localStorage`.

**2. CDP `Debugger.pause` breaks into a busy loop.** When the thread is pegged, `page.evaluate` and
`page.keyboard.press` both time out — so a spec cannot ask the page anything. The debugger can:
it interrupts from another thread and `Debugger.paused` hands back the full call stack. That is how
the tripping `setState` was located. Keep the test alive long enough to pause (`test.setTimeout`),
which the first attempt did not and so learned nothing.

**3. `Profiler` tells JavaScript from everything else.** Sample at 1ms, then aggregate self time by
leaf **and** find the longest unbroken run of one leaf, which is the shape a synchronous block has.
The distinction that matters: `(program)` is time *outside* JS. A profile where `(program)` holds
2,448ms and no JavaScript frame exceeds 10ms is not a bug in this codebase — it is rasterisation or
the thread not being scheduled at all.

**The meta-lesson, and it is the uncomfortable one.** Of the four mistakes made hunting this, three
were already documented in this file — "nothing a starved run reports should be believed", "a cap
tuned to your own machine is a fixed wait wearing a disguise", and "commit the computation, not the
number". They were re-learned at a cost of several hours. The gap was not missing prose; it was not
reading the prose that existed. Prefer re-reading this file over extending it.

## What has been ruled out about that freeze, so it is not re-derived

Open at the time of writing, with the causes eliminated **by measurement**:

| candidate | measured | verdict |
|---|---|---|
| `findPath` called from the frame loop | 2–14ms on all three maps with the travellers' own 8:1 cost function | not it |
| a React render chain | `App` never rendered >40× in 400ms under instrumentation | no chain exists |
| lava-field fill cost | Dwarka 233ms vs Lothal 267ms, one sitting | *cheaper* than ordinary ground |
| React `Maximum update depth exceeded` | fires under contention; page keeps running | real, non-fatal, a red herring |

`findPath` does re-sort its whole frontier on every pop and its comment claims "the largest map is
64x64" when the Aravali is 52×78. Both true, neither worth acting on at 14ms — recorded so the next
reader does not mistake an ugly loop for a hot one.

## What is worth adding next
- **A Python test runner for the canon repo.** `lint_story.py` and `check_playability.py` are
  untested scripts, and one of them shipped a wrong ordering check for months.
- **Visual regression, properly.** If screenshots are ever compared again, compare *images*
  with a perceptual diff, never file sizes.
- **A smoke test that boots with `VITE_CANON_API` unset**, which is the configuration CI
  actually uses and the one that broke once already.
