# Twin-valley implementation ledger

> **Current art forms (17 November 2026):** Follow [the element-by-element guide](art-direction.md#current-element-by-element-direction--17-november-2026). New overworld people, wandering animals and trams use **“nes jrpg sprite”**; Beedu alone keeps its accepted small SNES art. Terrain/buildings remain simple NES; off-map portraits/events/places/plates remain painted, with the two Denisovan portrait exceptions. Older prompts below are production history where they conflict; new delivery uses resize only, without colour reduction.

## Approved generated NES JRPG character batch

### Wildlife, transport and documentation follow-up

Final tram import maps generated right/left/down/up to the engine's right/left/up/down rows;
the final delivery checks and typecheck pass. The 18 animal/tram runtime PNGs total 82.8 KB.
The preceding generated character commit's PR CI passed; this new batch requires fresh CI.

The fox, otter, crane and pelican now have generated NES JRPG right/left/front/back sprites;
the ostrich/emu tram has sixteen generated poses with proper end-on geometry. Compact RGBA
inputs are tracked under `assets/source/twins/fauna/` and required by `tools/twin-fauna.json`.
The builder point-enlarges these samples without palette, colour or alpha quantization. Default
fauna rebuilds never write accepted Beedu; `--beedu` is an explicit separate rebuild option.
All 147 focused wildlife/frame/map/docs/RGBA tests pass. The new guide in `art-direction.md`
lists each element's form, and related briefs plus agent entry points link to it. Historical
SNES/quantized production notes are labelled as superseded for the new JRPG art.

Nemi, Mirlepa and Yamantaka now use the owner-approved generated “nes jrpg sprite” direction,
with sixteen standing/walking poses and four seated facings each. Back views show backs;
east/west profiles and Yamantaka's three-head silhouette were inspected in the generated sheets.
Compact RGBA source atlases live in `assets/source/twins/people/`; the manifest requires them,
so missing accepted sources fail instead of silently reverting to the interim art. The builder
only rearranges source pixels into the existing 20-frame runtime strips. No palette or alpha
quantization is applied. Large raw sheets and review composites stay ignored. The remaining
twelve named sheets retain the earlier cute NES art. Beedu is accepted and unchanged.
Batch verification: all 56 character/source/resident/traveller tests pass. The new source guard
compares every delivered RGBA row against the tracked atlas, catching dropped or reordered poses,
colour reduction and alpha changes. Sprite-manifest checks pass; Beedu's asset and builder have
no diff. The preceding commit's full push and PR CI were green; this batch requires fresh CI.

## Overworld art follow-up

After game PR #262 opened, the owner requested cuter carrier-like map characters and animals.
All fifteen named sheets now use round larger heads, compact bodies and short limbs. Mirlepa
has folded knees, closed eyes and a woven cap; Yamantaka keeps three separate heads and one
small coat. The two Denisovan skin ramps follow their fairer portrait direction.
Four animal species and both ostrich-tram atlases have new outlined silhouettes and faces.
Beedu uses the owner's sole SNES exception: a finer 48×32 logical grid delivered in the existing
96×64 cells, curved wings, small cephalic fins, a whip tail and restrained shading. No animation
counts, actor counts, world layout, movement, runtime draw calls or collision rules changed.
All sources remain reproducible; raw review sheets remain ignored. Phase-end checks for this
art follow-up are recorded after the earlier gameplay results below.

Sprite follow-up checks: 139 wildlife/map/frame/story tests plus 17 character-sheet tests pass;
the sprite manifest validates. The 34 updated runtime images total approximately 44.8 KB.
Review composite: ignored `dump/twin-city-art-review/cute-sprite-review.png`, including the
original carrier for comparison. No image-generation or palette-reduction pass was used.
The previous PR pipeline passed its build/unit gate but failed two dusk carrier conversations.
Reproduction showed the cave had entered the road-company stop pool. It is now excluded with
the other expansion stops, restoring established routes rather than changing test coordinates.
After the fix, all 34 traveller tests and both previously failing keyboard/touch dusk browser
cases pass. Follow-up total: 190 relevant unit/frame checks plus the two browser regressions.

Owner authorized phased implementation and new review branches on 17 November 2026.
This ledger distinguishes authored code from validated / published work. Do not treat the
original planning estimates or a completed source edit as evidence that the game passed CI.

## Phase 1: canon and conversation states — authored

Canon 3.8.0 is exported by the lore repository's exporter. New content: the Windward Cave
POI; Mirlepa and three-headed Yamantaka; intermittent cook/herder NPCs; Priest Kang; the cave
discovery and welcome; the actual-flight beedu event; and Kang's optional five-beat bust arc.
The existing Denisovan culture is reused and the character-species vocabulary gains Denisovan.
Named Denisovans retain their own identity and Maru contacts. No random culture pool is added.

Kang is explicitly invited through “Ask about making the bust”. Declining leaves the invitation
open. Court site selection, preparation, carving and unveiling occur on return visits, with
existing story flags. The finished life-size head-and-shoulders bust remains a Harappa courtyard
object. Workers' dialogue changes after unveiling. Flight-witness dialogue requires a personal
sighting flag, rather than unlocking from a rumour. Flags are passed consistently to line
selection and hearing so dialogue indices describe the same available set.

## Phase 2: geography, people and story scenery — authored

The cave is at the northwestern anchor (5,5), on the existing walkable rocky margin. Adding it
to a saved map does not cut a Manhattan road through the ridge or rebuild city ground. The
existing High Camp inspires a stable household; only the cook/herder visits change by day.

All fifteen NPC identities (thirteen main characters plus two helpers) use compact code-authored
NES sheets and the existing character loader. Yamantaka has a wider 34×40 cell with three
separate head masses, Mirlepa uses seated poses, and one helper at most appears. The cave's
central threshold is reserved. Static residents share traveller scale, row depth and culling.

A seven-frame story atlas supplies the cave, hearth/fold, sand accent and three bust stages.
The bust site is chosen from dry courtyard corners clear of existing POIs, roots and routes;
its scenery slot is reserved before house placement. Existing accepted map assets remain.

Rebuild: `node tools/build-twin-people.js` and `node tools/build-twin-stories.js`.

## Phase 3: beedu and narrative connection — authored

`content/beedu.ts` caches a validated western sand–coast loop and derives one lifecycle from
supplied scene time. The renderer owns one body, one flattened kite-style shadow and one short
sand accent. Flight has hidden, sand-stirring, emerging, gliding, descending and burrowing states.
The clock is not advanced by player steps or rendered-frame counts. Reduced motion keeps the
wing still and reduces the sand effect. Invalid routes produce no ambient animal.

Only a real nearby, visible flight reports a sighting. Fog and camera bounds are checked;
the event waits for movement/riding, another card, conversation or panel to finish. Its prose
describes a sighting already made, so queueing cannot falsely keep a vanished animal overhead.
The introductory event is deduplicated through existing history; later conversations use
the persistent witness fact. No mount, combat, harvesting or compulsory rare-spawn gate is added.

## Art delivery — in progress

The built-in image generator recovered after the desktop reboot. The original ten twin-valley
portraits now have 256×256 full-colour painted deliveries. Mirlepa and Yamantaka also have
portraits: JoJo-inspired anime linework, fairer Tibetan-inspired faces, Kalash-inspired highland
dress, the established earth palette, and exactly three heads for Yamantaka. Kia portraits were
corrected against existing Kia face references to light open wraps and marsh flowers, preserving
their faces and ages. All were resized only, without colour quantization. Sources stay ignored.
No paid CLI/API fallback was used. Kang, remaining event/place views and journey paintings are
still pending; no completed reference-faithful Kang portrait or full art inventory is claimed.

Generated portraits/event paintings use the existing preferred-edition path and art
manifest. Follow `twin-portrait-prompts.md` and the original
plan's face/costume requirements. Keep sources and review captures in their established ignored
desktop locations and ship only compact runtime outputs.

## Verification and publication

The owner authorized phase-end testing on 17 November. The corrected full unit run passes:
163 files and 3,640 tests (`npm test -- --maxWorkers=2`). Typecheck, canon-lock and sprite-manifest
checks pass. The integration production build and bundle budgets passed (app 218.0/220 KB gzip,
canon 130.3/350 KB); exact final-head build results must still be confirmed by CI.
Lore schema/reference lint, playability and export-boundary checks pass, including the actual
sibling bundle comparison. Canon is 3.8.0, with 939 lore entities and 602 exported entities.

The first unrestricted unit attempt hit sandbox cache permissions; the host run was overloaded.
The corrected two-worker full run is green. Phase-end checks caught and fixed missing People-diary
gifts on the new introductions, a delta column that disabled beedu flights, the typed activity ref,
new language inks / role fallbacks, adapter coverage, stale counts and unfinished story-art names.
Quest art uses the established fallback until accepted paintings are delivered; tests were not
weakened to allow missing files.

The first targeted browser run passed four cases and failed three: two new cases used a wrong
button selector; one desktop case stayed on the loading state. Selectors were corrected from the
captured DOM. The isolated run passed six cases; the Kang case additionally needed the card's
normal “Go on” confirmation after each choice. That corrected case now passes separately:
all seven targeted cases are green across the final run and focused rerun. This covers actual
cave conversations/portraits, optional commission/decline/reopen/accept, named NES identities,
city materials and desktop/mobile courtyard paintings. All test screenshots,
logs and raw generations remain in ignored storage. No final performance review is claimed.

Git refreshes recovered after reboot. Both checkouts use fresh `feat/twin-valley-stories` branches
from refreshed main. Previous game PR #261 is merged: head `21edff01f3f4da508b26893e77077e125a224971`,
merge `129a78a6b7b63b6ecfbc212a9ceb273b9585fbd8`, merged 16 November 2026 at 21:39:35 UTC.
Previous lore PR #167 is merged: head `5dd4457c4734ea0256ade498e3a3f347f96bd77f`,
merge `e5f07f57b4e68e1619d1888604c69155e97dff70`, merged 14 November at 17:01:47 UTC.
The new lore commit is `9a882d07d9e49e3c456b25c613961158aa8a114c`, published in
[lore PR #168](https://github.com/lordlebu/SouthOfTethys/pull/168). Its exact-head push validation,
PR validation and additional CI all passed. The game implementation is published in
[game PR #262](https://github.com/lordlebu/4000BCESaraswathy/pull/262), initially at
`6c26e2207932fd69426b806202737605fb3ff120`. Its build/unit job passed; the two dusk carrier
browser failures are addressed and verified by this art follow-up. The updated exact-head
pipeline remains the merge gate; do not describe the previous failing run as green.
Before publishing, refresh main and verify previous merges, then place compatible work on one
fresh review branch per repository. The lore PR and game PR must link their canon dependency.
