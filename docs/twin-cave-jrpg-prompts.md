# Northeast cave — NES JRPG props and household

> **Current checkpoint - 18 November 2026:** Muted sage is approved; terrain softening, shrubs, slow cave walks and bounded ambience are implemented. Required illustration backlog: **0**. [Current completion audit](twin-cities-art-status.md) and [terrain decision/evidence](twin-terrain-softening.md) override earlier dated counts and production instructions below.

> **18 November relocation:** the household now occupies the northeastern green highlands at (51,12), with a stream, foothills, bare mountains and border snowcaps. The historical POI id is preserved. See [terrain ledger](twin-highlands-jrpg-prompts.md).

Owner update, 17 November 2026. Follow [the element guide](art-direction.md).
Both Mirlepa and Yamantaka use their approved generated walking and seated sprites;
no smaller substitute or procedural sitting figure is introduced. Every 120 seconds they exchange
roles, with one very slow out-and-back walk during the turn. The stride is at least 12 seconds
per tile (20 seconds on the usual six-leg route); the clock excludes journey-time jumps. Routes are cached on map
entry/day refresh, confined within four tiles of the restored cave, and separated west/east.
The entrance, props and other residents remain clear. This adds two pose updates per frame,
no route search per frame, no new actor sprites, particle effects or pathfinding timers.

## Generated prop sheet

Built-in imagegen, transparent output. Reference: `assets/source/twins/people/mirlepa-nes-jrpg.png`
for palette and pixel simplicity only. Raw output `exec-db2898bc-85d2-45c3-9cce-e8e86a5ce026.png`
is copied to ignored `dump/twin-city-art-review/cave-camp/cave-props-raw.png`.

Prompt:

> Create ONE game prop sprite sheet: exact keyword and art direction 'nes jrpg sprite'. Cute simple 8-bit NES JRPG overworld props matching reference's warm earth palette and thick dark outlines. Transparent background. EXACT grid 3 columns by 2 rows, six separate sprites, huge clean transparent gutters, no labels no text. Top row left: two small wooden poles with a hanging string of colourful triangular prayer flags. Top row middle: a fictional solarpunk Icmic cooker, squat terracotta insulated nested pot inside a woven basket with a small brass solar reflector lid, no electricity, no modern technology. Top row right: small cheerful bonfire with chunky orange flames and three logs in a low stone ring. Bottom row left: same prayer flags, weathered warmer faded colours with repaired fabric. Bottom row middle: same Icmic cooker with lid propped open, visible inner pot and two very simple steam curls. Bottom row right: same stone fire ring and logs with soft red embers, no tall flame. Each sprite designed as if drawn natively on 32 by 32 pixels, large obvious pixel blocks, extremely limited detail, easy to read tiny, three-quarter overhead perspective for JRPG map, no realistic texture, no smooth painted illustration, no ground background or cast shadow outside its cell. Same footprint and scale between paired variants. All six entirely visible with generous transparent margins. Style reference image is for palette and chunky pixel simplicity only; draw props only, no people.

Compact source: `assets/source/twins/cave-props-nes-jrpg.png` (96×64 RGBA, six 32×32 cells).
Runtime: `assets/twins/cave-props-nes-jrpg.png` (384×256, six 128×128 cells).
Import uses `import_sheet` from `tools/import-fauna-jrpg.py` with 3 columns, 2 rows, 32×32 cells.
Crop and nearest-neighbour resizing only; no palette, colour or alpha reduction. Rebuild with
`python tools/build-cave-props.py`. Only the valley loads this atlas. Beedu is unchanged.

## Monthly arrangements

Journey days are zero-based internally; these are player-facing days within a repeating month.

| Days | Flags | Cooker | Fire ring |
| --- | --- | --- | --- |
| 1–5 | Fresh | Closed | Embers |
| 6–10 | Weathered | Closed | Bonfire |
| 11–15 | Fresh | Steaming | Embers |
| 16–20 | Weathered | Steaming | Embers |
| 21–25 | Fresh | Closed | Bonfire |
| 26–30 | Weathered | Closed | Embers |

Fixed prop footprints keep routes stable while visual states change. Uses the game's journey
day, not wall-clock dates. Helpers retain their six-day visits. The scene clock drives walking;
re-entering reconstructs safe routes without persisting mid-step positions. Existing cave
conversations and optional stories are unaffected.

## Phase verification

Typecheck, 81 focused unit/frame/map/RGBA checks, the production build and bundle budgets pass.
The automated cave browser case confirms both generated identities, one seated figure and an
actually moving figure, with no missing textures/frames or page errors. Runtime prop atlas is
16,281 bytes; its compact reproducible source is 11,396 bytes. No review screenshots or raw
generation outputs are tracked. Beedu retains its accepted SHA-256
`DDD7D7029F8B9051C172D4DD31E47B8AB3680058BE370D0F255D1A874A1D330F`.
Full CI for the published head is still required before merge.
