# Twin-valley landscape and motion polish — 18 November 2026

This owner-requested pass follows the completed illustration inventory: all 16 place views,
20 happening paintings, journey/arrival cards and main portraits already exist. No required
illustration is reopened. This pass adds low-detail landscape texture and quiet movement.

## Implemented scope

- A four-frame **nes jrpg sprite** bush atlas: grass green, sage, forest green and marsh green.
  Regular bushes sit around dry cliff lips; paired **half-size** bushes soften grass/desert
  borders. Routes, bridges, buildings, POI forecourts and the cave's walking area stay clear.
- Reuse the older maps' small decor: flowers, clover, twigs/stones, leaf litter, reeds, lily pads,
  shells and snow/rock detail in suitable habitats. At most one selected ground prop per cell.
  Seeded budgets cap new shrubs at 160 sprites and shared ground decor at 280.
- Mirlepa/Yamantaka exchange roles every 120 seconds, with one slow out-and-back instead of
  three loops per 45-second turn. Typical movement is 20 seconds per tile, never faster than
  12 seconds per tile; their four-frame foot cycle slows to 900ms. Their pose clock uses scene
  time, excluding journey-time jumps; helpers and monthly props still use journey days.
- Cave hearth smoke: six small voxel-like puffs. River water: at most 96 small, three-frame
  ripple marks, kept off road/rail bridge decks. Desert haze: at most 12 low-opacity cloud cells
  around the existing desert stops, with a dry-cell margin.
- Ambient textures are baked once and reused. Visible effects update at 5Hz; ripple frames
  change every 900ms. Camera/fog gates hide off-screen/unexplored marks. No full-screen shader,
  dynamic water texture redraw, unbounded particle pool or terrain/save mutation.
- Reduced-motion suppresses the optional smoke/haze/water marks while keeping static decor.
  The development-only `twin-atmos=off` switch supports same-sitting performance comparison.

Existing city buildings, the accepted Beedu, portraits/event cards, geography, transit,
conversations and save formats are retained. Earlier maps keep their existing planners/effects.

## Art provenance and rebuild

Built-in imagegen; transparent output. Compact reviewed source:
`assets/source/twins/shrubs-nes-jrpg.png` (64×64, four 32px cells).
Runtime: `assets/twins/shrubs-nes-jrpg.png` (256×256, four 128px cells).
Crop/nearest-neighbour resize only; RGBA retained, no colour/alpha quantization or dithering.
Rebuild: `python tools/build-twin-shrubs.py`.
Original generation and captures remain in ignored `assets/source/events/landscape-motion/`
and `dump/twin-city-art-review/landscape-motion/`; browser captures use ignored `test-results/`.

Exact prompt:

> Transparent 2 by 2 sprite atlas, four distinct simple low bushes for a peaceful 8-bit overworld. Exact style words: nes jrpg sprite. Chunky cute NES adventure-game bushes, readable scalloped round silhouettes, broad solid pixel clusters, only a few green/light/shadow tones chosen in the drawing, no fine texture. Native 32x32 pixels per cell, 64x64 atlas. Top left bright grassland round green bush with three rounded lobes and one clear light patch; top right smaller sage/saltbush, pale dusty green, compact round shape; bottom left deep cool forest-green round shrub, simple leaf clumps; bottom right muted marsh-green low shrub with just two simple reed blades. Top-down three-quarter overworld view, consistent light upper left and a simple dark contact-shadow strip, dark green outlines. Each entire isolated sprite centered inside its equal cell, bottom aligned, generous genuine transparent gutters. No soil tile, pots, scene background, gradients, grain, flowers, fruits, glow, halo, labels or grid lines. Keep the forms extremely simple and cute, like classic early NES adventure landscape props.

## Verification at the phase boundary

The requested static/motion work was completed before the combined checks. Typecheck,
production build, canon lock and bundle-size checks pass. The app chunk is **215.6/220 KiB gzip**;
no budgets were increased. Five focused browser checks pass: actual shrub sizing and cave
movement without journey-time jumps, visible smoke, changing river textures, localized desert
haze, reduced-motion suppression, and the existing cave seated/walking contract. Reviewed
captures cover the cave, river/border, desert and cliffs; captures stay ignored.

The initial full unit run exposed an empty haze placement around rocky desert hollows.
Haze now selects nearby open sand with a dry-cell margin. The corrected planner/landscape/
cave tests pass. The final full unit suite passes: **3,835 tests across 174 files**.

Same-sitting SwiftShader captures (milliseconds per frame, **not player GPU FPS**):

| View | Effects off best / median | Effects on best / median | Visible effect |
| --- | --- | --- | --- |
| Desert stop | 33.3 / 50.0 | 33.2 / 50.0 | 1 haze cell |
| River crossing | 66.6 / 83.3 | 49.9 / 66.7 | 1 ripple mark |
| Cave, first pair | 33.2 / 50.0 | 66.6 / 66.7 | 6 smoke puffs |
| Cave, repeat pair 1 (on first) | 66.5 / 66.7 | 66.6 / 66.7 | 6 smoke puffs |
| Cave, repeat pair 2 (on first) | 33.3 / 50.0 | 49.9 / 83.3 | 6 smoke puffs |

No page errors occurred. Desert haze showed no measured regression and river results were
within the machine's changing baseline. Cave readings remain inconclusive: one repeat is
identical, while the others are slower with smoke enabled. Keep the smoke capped at six tiny
puffs and include cave smoothness in the final hardware review; these readings do **not**
prove a zero-cost effect or player-side frame rate. Raw JSON remains in ignored
`dump/twin-city-art-review/landscape-motion/`.

The older pre-change desert sample was 150ms best / 166.6ms median, illustrating why captures
from different moments are not a reliable before/after comparison on this machine. A cold Vite
navigation exceeded the tool's old 30-second timeout; navigation now uses the existing 120-second
scene-readiness allowance. Frame comparison thresholds stay unchanged.

The broader final review still includes all card crops/likenesses, fog/dusk, keyboard/touch,
cave/calendar behaviour, Beedu event/dialogue, tram terminals, optional Kang bust and save/reload.
Extra character sheets and seasonal variations remain optional.
