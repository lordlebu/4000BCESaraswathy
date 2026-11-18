# Twin-valley terrain softening - 18 November 2026

The owner requested gentler height and river edges, a less abrupt northeastern desert/grass
boundary, and quieter grass/hills around Windward Cave. This extends the open landscape phase.

## Implemented treatment

- Replace the bright highland fill with muted terrain colours and nine sparse, broad turf/stone
  clusters per 32px tile. No fine grass blades, checkerboard dithering or added ground objects.
- Feather natural terrain boundaries on **both** sides, using stepped alpha bands with irregular
  four-pixel runs. Sand/turf transitions reach almost half a tile inward on each side, with a faint earthy wash on the transition cells.
- Add a small directional light/shadow ramp at hill/mountain/snow steps. Shade river margins
  inward, keeping a pale land lip and the existing water texture. Never add rock-height shading
  inside water, and never change bridge/road decks or physical ground. These baked bands replace
  the previous flat hill/water outline overlays; animated water marks and real cliff faces remain.
- Bake the result once at scene entry into one shared 32px-frame canvas atlas. Display frames
  at the existing 128px tile size with nearest filtering. No extra ground quads, full-screen
  shader, per-frame drawing, downloaded artwork or runtime sprite recolouring.
- Keep the accepted original terrain sheets as input for ordinary ground and water. Highland
  fills/patterns and boundary bands are code-native rendering, not edits to delivered paintings.

## Palette samples

| Sample | Meadow | Hill | Character |
| --- | --- | --- | --- |
| Sage (owner approved) | `#8c9c7b` | `#92947b` | Warm muted grass, quiet stone/ochre connection to the desert |
| Lichen | `#899e91` | `#8c998b` | Cooler grey-green, gentle blue separation from dry ground |
| Olive | `#9c9f79` | `#a09b7f` | Drier yellow-green, closest to the sand/grass palette |

Review on the same seed, hour, position and zoom. Development-only `turf=sage`, `turf=lichen`
and `turf=olive` select the samples; `turf=legacy` draws the accepted previous terrain for
comparison. The owner selected **A - Muted sage** after reviewing the three in-game samples. Production uses sage. No new
player setting or save data. Captures live in already ignored `test-results/` and
`dump/twin-city-art-review/terrain-softening/`, not in commits.

## Phase-end verification

The final combined browser review passes **8 tests**: three actual-renderer palette/atlas checks,
the earlier cave household contract, and the four landscape/motion checks. Captures were inspected
for cave colours, the desert foothill seam and river banks. The runtime hook confirms that the
actual ground image uses the baked atlas at 128px display size. There were no page or missing-frame
errors. Pure checks cover both sides of the seams, water-safe height bands, muted palettes,
bounded unique frames and no mutation of saved world data.

On `twin-landscape-review`, the atlas has **521 frames / 2,228,224 bytes (2.125 MiB)**. It replaces
terrain texture switches and flat outline sprites rather than adding ground quads. The final full unit suite passes **3,839 tests across 175 files**. Typecheck, production
build, canon lock and bundle-size checks pass: app **217.1/220 KiB gzip**. No budgets were raised.

Same-sitting SwiftShader comparison, milliseconds per frame (not hardware/player FPS):

| View | Previous terrain best / median | Muted sage atlas best / median |
| --- | --- | --- |
| Cave camp | 33.2 / 50.0 | 33.3 / 66.6 |
| Desert/highland seam (42,18) | 66.6 / 83.3 | 50.0 / 66.7 |

Best-frame cave cost matches within noise, and the seam was faster. Cave median timing is higher,
so this is not proof of identical cost or a hardware-FPS guarantee. Final hardware review remains.
Raw measurements and sample sheets stay in the ignored review directory. The development sample
selector and legacy comparison do not become player preferences or save fields.

The standard Windows Playwright-managed dev-server teardown hung after its three palette cases
had passed. The final eight-case run used an ignored local harness launching Vite's Node entry
directly, with `PLAYWRIGHT_BASE_URL` and cleanup of its own child; it exited successfully in 54.5s.
No repository test timeout, browser assertions or CI configuration were relaxed.

This phase does not claim completion of the broader final gameplay/save/hardware review.
