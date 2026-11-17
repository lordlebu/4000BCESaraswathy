# Harappa and Mohenjo-daro Visual and Story Plan

## Priest Kang character and bust — 17 November 2026

Kang now also uses a generated **“nes jrpg sprite”** twenty-pose overworld sheet. His three bust
quest stages share the same face, headband, beard and cloak silhouette, rendered in sandstone.
Both use compact RGBA sources and resize-only delivery. See [the exact prompt/rebuild ledger](twin-kang-jrpg-prompts.md).
Four of fifteen named overworld identities now have generated JRPG sheets; the other eleven
retain their preceding compact NES sheets. Kang now wears light indigo and has a delivered
cozy watercolor conversation portrait plus carving and unveiling event paintings. Required
remaining illustrations: 36 (19 happenings, 15 place views, 2 journeys). Beedu remains unchanged.

## Cave household update — 17 November 2026

Mirlepa and Yamantaka now take turns sitting and walking beside the northwest cave. Each
45-second turn leaves one in a generated seated pose while the other follows a short cardinal
out-and-back route. Both use the same approved twenty-pose NES JRPG sheet quality. The routes
stay on opposite sides, avoid other residents, props, water and the entrance, and follow restored
POI coordinates. This is local presentation; neither joins the three city circuit walkers.

Three **“nes jrpg sprite”** props — prayer flags, a fictional solarpunk Icmic cooker and a bonfire —
have paired visual states. Six arrangements change every five journey days and repeat after
thirty days. Returning on the same journey day gives the same arrangement. The cooker is a
fictional insulated terracotta/basket design with a brass reflector, not a historical technology
claim. This adds no fuel consumption, quest gate, combat or saved schema. Large generation
originals remain ignored. See [the prompt and rebuild ledger](twin-cave-jrpg-prompts.md).

> **Current art forms (17 November 2026):** Follow [the element-by-element guide](art-direction.md#current-element-by-element-direction--17-november-2026). New overworld people, wandering animals and trams use **“nes jrpg sprite”**; Beedu alone keeps its accepted small SNES art. Terrain/buildings remain simple NES; off-map portraits/events/places/plates remain painted, with the two Denisovan portrait exceptions. Older prompts below are production history where they conflict; new delivery uses resize only, without colour reduction.

## Approved NES JRPG generation direction

The four valley wandering animals and the ostrich/emu tram now also use generated **“nes jrpg
sprite”** sheets. Their four facings and sixteen vehicle poses keep the existing runtime frame
sizes. The current [element guide](art-direction.md) controls every art surface; older blanket
SNES directions are historical. The accepted Beedu image remains unchanged. Exact fauna/tram
prompts and sources are in [the production ledger](twin-fauna-jrpg-prompts.md).

The owner approved the generated Nemi, Mirlepa and Yamantaka samples made with the exact phrase
**“nes jrpg sprite”**. Their complete twenty-pose sheets now replace the interim code-authored
figures: large expressive heads, cheerful faces, small bodies, simple cloth masses and short limbs.
Keep this phrase and the approved samples in future character prompts. Do not return to the
rejected rectangular figure style. Mirlepa retains seated meditation; Yamantaka keeps three
anatomical heads in every facing. **Leave Beedu unchanged:** its current art is accepted.

This delivery covers those three sampled characters. The other twelve valley identities retain
their preceding cute NES sheets until separately generated in the approved direction. Portraits,
The subsequent fauna and cave updates are recorded above. Source PNGs are compact, tracked 4×5 RGBA
atlases; large generation outputs and comparison sheets stay ignored. Import uses cropping and
nearest-neighbour resizing only, with no colour quantization, palette reduction or dithering.
See [the exact prompt ledger](twin-overworld-jrpg-prompts.md) for provenance and rebuild commands.

## Overworld sprite correction — owner update, 17 November 2026

Use the established carrier traveller as the proportion reference: larger round heads,
short compact bodies, short limbs, clear dark eyes and warm outlines. The valley's previous
tall rectangular figures and tiny faces were rejected. Mirlepa and Yamantaka must also be cute:
Mirlepa sits cross-legged with closed eyes; Yamantaka has three separate round heads on one
compact body. Preserve their fair Tibetan-inspired complexion and woven highland costume cues.

The fox, otter, crane, pelican and ostrich tram need recognizable, friendly silhouettes and
expressive faces comparable in appeal to existing wanderers. Keep them simple NES-style;
do not add texture noise or detailed map painting. Portraits are unchanged by this correction.

**Explicit exception:** Beedu alone may use small 16-bit SNES pixel art, with curved manta wings,
gentle colour ramps, cephalic fins and a trailing tail. Keep the existing 96×64 frame, singleton,
flight path and shadow. The exception overrides the general NES rule for Beedu only.

Rebuild sources: `node tools/build-twin-people.js` and `python tools/build-twin-fauna.py`.
The latter owns the four animal species, Beedu and both tram atlases; older map builders delegate
their animal outputs to it so a rebuild cannot restore the rejected figures. Review contact
sheets remain in ignored `dump/twin-city-art-review/`.

## Conclusion checkpoint — 17 November 2026

The current gameplay coding batch is complete and is in phase-end verification. This does
**not** close the complete visual programme. The remaining path is one illustration-production
phase, then final visual/performance review and passing CI; do not start another map repaint.

| Area | Current state | What remains |
| --- | --- | --- |
| Accepted city map, bridges, depth and terminal turns | Prior merged map work retained | Final integrated review; no detailed map regeneration |
| Named map identities | All 15 identities built as simple NES sheets | Runtime/pipeline regression checks |
| Cave, helpers, beedu, optional Kang bust | Implemented with canon, saved-map addition and conversation wiring | Phase-end checks and review |
| Main cast portraits | All 13 preferred portraits delivered, including Kang in light indigo | Final integrated likeness/crop review |
| Authored happenings | 1 of 20 has a preferred painted edition; existing pixel editions/fallbacks retained | 19 paintings, including cave welcome and beedu sighting |
| Individual place views | 1 of 16 has a preferred painted edition | 15 views, including Windward Cave |
| Journey banners | Existing editions retained | 2 preferred paintings |
| Bust story illustrations | Carving and unveiling cozy watercolor paintings delivered and selected per quest beat | Optional commission/site/preparation takes only |
| Further ambient polish | Existing map presentation accepted | Seasonal variants and bespoke bird/harness motion remain unfinished; decide during final polish review whether to retain that scope |
| Publication | Game PR #262 and lore art-docs PR #169 are open; lore story PR #168 merged | Latest exact-head CI, owner review and merge |

**Remaining required illustration inventory: 36 images** (19 happenings + 15 place views +
2 journeys), plus separately optional takes. Kang’s portrait and both bust paintings are complete.
This is an asset count, not 36 coding tasks. Helpers do not require bespoke portraits.
See the [audited phased checklist and exact pending filenames](twin-cities-art-status.md).
The current implementation can be reviewed and played with existing art fallbacks.

For scheduling, reserve roughly **2–4 focused working days for the remaining illustration
batches and continuity corrections**, then **0.5–1 day for integrated visual/performance review**.
This is a revised planning estimate, not a measured completion promise; the older 17–32 day
estimate describes the entire story expansion from its beginning, not work still remaining.

Phase-end findings already corrected: typed event/activity ref; real coastal fallback for a
delta-obscured beedu shore; fog-aware sighting; introductions that leave People-diary traces;
canon counts and export fingerprint; additive-save count; new-language inks and role fallbacks;
adapter field coverage; and unsupported placeholder quest-art filenames.
Actual check results and publication SHAs belong in [the implementation ledger](twin-valley-implementation.md).


## Character art direction — owner revision, 17 November 2026

Only Mirlepa and Yamantaka use JoJo's Bizarre Adventure-inspired anime portraits: angular faces,
sculptural shadows and ink hatching in the established muted cream, ochre, olive and slate palette.
Both have fair light-beige skin, rosy highland cheeks and Tibetan-inspired eyes/cheekbones with
speculative Denisovan brow and midface structure. These are fictional character designs, not
scientific reconstructions. Keep Kalash-inspired woven highland dress; Yamantaka has exactly three
physical heads on one torso. Mirlepa remains a peaceful meditating hermit.

Irekha and Ulenna retain their watercolor faces and ages. Existing Kia portraits
(`src/ui/faces/kia-f-01.png` and `kia-f-02.png`) control their dress: less clothing,
lightweight open wraps with a bare shoulder and lower neckline, marsh flowers in carefully
dressed hair, shell pins and restrained beads. Keep chest coverage. Heavy embroidered shawls,
bulky undergarments and generic mountain-tribe styling were rejected by the owner.
Hutel retains his established Elamite watercolor portrait. Priest Kang retains the watercolor
style and archaeological Priest-King facial cues, with a stronger square jaw, pronounced cheekbones
and confident expression (the owner's “chad face” direction). Do not spread the anime treatment
to the rest of the cast or to the map. The map remains simple 8-bit NES art.

Delivery: resize selected sources to 256×256 with `--full-colour`; lossless RGB PNG encoding,
no palette/colour reduction or dithering. Raw generations and review images stay ignored.


**Status:** Implementation in progress; current map work accepted; 8-bit NES map direction settled  
**Prepared:** 17 November 2026  
**Repository:** `4000BCESaraswathy`  
**Scope:** Harappa, Mohenjo-daro and the mainland Saraswati twin-city map

**Story implementation authorized:** [Story expansion](#proposed-story-expansion--planning-only-17-november-2026)
adds the overarching narrative, individual conversation goals, Priest Kang, the northwestern
Denisovan cave camp and a single flying beedu, with effort estimates;
the owner has now authorized phased implementation and publication on fresh review branches.
Actual phase status and remaining external blockers are in [the implementation ledger](twin-valley-implementation.md).

**Execution cadence (owner update):** Complete the practical implementation batch before
testing. Do not interrupt work with repeated local checks after small changes. Commit and push
the completed batch for the full pipeline; record remaining art inventory and actual CI results
without claiming the entire programme is finished.

**Desktop review files:** Store screenshots, contact sheets and machine-specific frame samples
under the existing ignored `dump/twin-city-art-review/`, never in tracked documentation folders.
Retain useful findings and reproduction commands in text. Runtime assets and required visual-test
baselines are separate from disposable review captures.

**Portrait generation update:** Prefer low-resolution output directly from the generator. It
currently exposes no size parameter and returned 1254×1254 even for a native 256×256 request.
The owner therefore approved **resizing only, with no palette or colour reduction**. Preserve
every original PNG unchanged and use `build-plates.js --full-colour` for new portrait deliveries.
PNG compression after resizing must preserve all resulting colour samples; do not quantise them.

**Costume update:** Clearly adult high-status women may wear elegant, more open draped garments
with lower necklines and tasteful visible cleavage, while retaining coverage. Status should read
through cut, fabric and restrained adornment. Working characters retain practical role-appropriate
clothes; do not reclassify them as aristocrats to apply this direction. If generation is blocked,
revise toward a more conservative garment rather than attempting to bypass the tool's rules.

## Settled owner direction: simple 8-bit NES map art

**This is the controlling art decision for all further work under this plan. It supersedes
the earlier SNES/16-bit and detailed-map briefs, including historical prompts and progress notes.**

- The map work already completed is acceptable. Do not regenerate or repaint it merely to
  enforce this new wording.
- The go-to solution for future map assets is high-quality **8-bit NES-style pixel art**:
  simple silhouettes, compact forms, limited palettes, clear pixel clusters and sparse detail.
- Do not pursue intricate brickwork, individual leaves, fine material texture, ornate roofs,
  busy props or highly detailed map sprites. Quality must not be equated with detail density.
- Improve the map primarily through composition, scale, placement, colour/value separation,
  gradient shadows, lighting layers, overlap, elevation, water depth and foreground/background
  depth. Keep the underlying sprites simple and readable.
- Gradient shadows and depth layers are permitted as restrained presentation effects around
  simple assets. NES-style describes the visual direction; literal hardware emulation is not
  required. Avoid costly stacks of full-screen effects and measure new layers before adopting them.
- Event illustrations, NPC face portraits and other off-map paintings may retain their current
  richer quality. This restriction applies to the playable map, including walking NPC sprites,
  buildings, vegetation, wildlife and vehicles; it does not require simplifying faces or banners.
- Reuse accepted assets and existing rendering systems first. Do not spend generation tokens
  producing more detailed map art or repeatedly regenerating acceptable assets. New map art
  should address a concrete missing silhouette or function, using the simple NES brief.

Implementation notes, asset prompts, reproduction commands and review captures are recorded
in [Twin-city art progress](twin-cities-art-progress.md). The first batch implements preferred
art selection, Eru's portrait, the courtyard place/event paintings and the neem landmark.
The city-environment composition phase now adds authored residential bands, reserved work
areas, simple NES furnishings, shared directional bridges, contact shadows and water-side
bank depth. Tram arrivals now halt and use two short planted turning steps before resting,
reusing the accepted directional sheet. The next batch adds authored NES identities for the three
existing circuit walkers, Eru, Nemi and Seli, plus seven stationary workplace residents.
All ten have simple NES sheets and fixed costume keys. Remaining portrait/event/place
illustrations, seasonal variants and bespoke bird/harness animation are still pending. The implementation record tracks
phase-end verification and review captures; the complete visual programme is not yet finished.

## Purpose

Harappa and Mohenjo-daro are mechanically complete, but their current visual coverage reads as a functional prototype beside the stronger parts of the game. This plan raises the twin cities to the established quality bar without changing their geography, authored progression, save compatibility or quiet exploration rhythm.

The original visual pass covers the playable map, city architecture, environmental detail, named NPC presentation, place views, event paintings and supporting review automation. The separately gated story addendum proposes new content; neither scope adds a currency or settlement system.

## Current baseline

The current implementation already contains:

- A 64×64 mainland map with Harappa and Mohenjo-daro.
- Fifteen points of interest.
- Ten named NPCs.
- Eighteen authored happenings.
- Two journey banners.
- Dedicated ground, building, object, route, tram, rim and detail sheets.
- Four moving wildlife species and an animated ostrich tram.
- Desktop, mobile, transport, conversation, diary and saved-map coverage.

The main gap is not missing coverage. It is visual quality and differentiation.

### Observed weaknesses at the initial audit

These observations explain the original work. They are not instructions to repaint accepted
map assets or increase their detail; the settled owner direction above governs further changes.

- Harappa and Mohenjo-daro are distinguished mainly by ochre versus red ground and building colour.
- Repeated small house stamps flatten the settlements and make the player character appear oversized.
- Broad roads, square water edges and hard settlement boundaries make the map read as a diagram.
- The cities lack the asymmetric landmarks, surface wear, vegetation, shadows and environmental storytelling seen in Dwarka and Lothal.
- Most twin-city portraits share a nearly identical block template.
- Event and place images use flat pixel compositions, while the main game uses painted narrative scenes and distinct character portraits.
- Important locations such as the drain court, brick quarter, Harappa court and river landing are not visually dominant enough on the map.

## Art direction

The twin cities should use two related presentation styles.

### Playable world

Use simple, high-quality 8-bit NES-style pixel art. Prefer clear roof, wall, door and stair
masses, small palettes and deliberate pixel clusters. The current simplified house build is
an accepted implementation reference, not a mandate to increase every asset's size or palette.
Buildings, people, vehicles and doors must share a readable scale. Keep surfaces quiet.

Spend visual effort on gradient/contact shadows, lighting and value layers, elevation edges,
water-depth cues, object overlap and well-composed spaces. Do not add fine texture or clutter
to make a sprite appear more expensive. Measure representative scenes before increasing sprite
area, animation density or overlapping layers.

### Interface illustrations

Use watercolor or gouache illustration on lightly textured paper, consistent with the established portraits and narrative event paintings. The paintings should be naturalistic but not photorealistic, with clear silhouettes, quiet human action and landscape context.

### City identities

**Harappa**

- Sun-baked ochre plaster and earthen brick.
- Courtyard compounds, shaded work areas and planted pockets.
- Reed, timber, pottery, drying brick and repair marks.
- A civic court and workshop culture that feels inhabited rather than monumental.

**Mohenjo-daro**

- Deeper fired-brick reds and darker wet masonry.
- Formal drains, wells, retaining walls and stepped river terraces.
- Denser alleys near the centre and looser structures toward the water.
- Boat, rope, basket and reed infrastructure around the landing.

**Shared valley**

- Pale desert framing a green river corridor.
- Irregular mud banks, reeds, palms, coves and seasonal traces.
- A visibly maintained causeway, railway and tram system.
- Sparse wilderness with detail concentrated around human activity.

## Constraints

- Preserve the current 64×64 geography and all POI coordinates.
- Preserve save restoration and additive-map migration behavior.
- Preserve road, bridge, railway and tram connectivity.
- Owner correction: north–south causeway crossings over water must use the established
  bridge art and directional deck construction already used elsewhere in the game. Match
  its continuous planking, bank connections, span pieces and shadow; do not reuse one
  generic support sprite or draw an ordinary road over the deck. Check east–west crossings
  as well, and keep railway supports distinct. Reuse the existing bridge assets before
  considering any new art.
- Keep city footprints at their current scale unless playtesting identifies a specific readability failure.
- Do not hand-edit generated canon data in `data/canon/`.
- Pure art work belongs in the game repository. Any prose, NPC or event canon change begins in `SouthOfTethys` and is exported normally.
- Keep original accepted artwork available. Improved work should become the preferred presentation without silently deleting earlier assets.
- Store full-resolution working files under `assets/source/`; only optimized delivery assets belong under `src/ui/` or runtime atlases.
- Maintain deterministic placement and animation.
- Treat the simple 8-bit NES map direction as settled. No additional detailed-map generation
  passes or speculative asset variants are authorized by this plan.

## Workstream 1: lock the visual specification

Before producing the full asset set:

1. Create a reference board comparing Dwarka, Lothal, current Harappa and current Mohenjo-daro at the same zoom.
2. Define fixed measurements for doors, people, carts, walls, roofs and major POI structures.
3. Approve city-specific colour ramps under common daylight and shadow.
4. Produce one annotated paint-over for Harappa and one for Mohenjo-daro.
5. Define costume colours for all ten NPCs so portraits, overworld sprites and event appearances remain consistent.
6. Record prohibited anachronisms and unsupported archaeological reconstruction clichés.

### Acceptance criteria

- One approved reference board.
- One approved paint-over for each city.
- A scale chart and palette sheet usable by every later workstream.
- A costume and prop key for all named NPCs.

## Workstream 2: preferred-quality art support

The project keeps accepted art rather than deleting it. Events support alternate takes, but portraits and place views currently resolve to one stable filename. Introduce a preferred-art tier before the new paintings land.

Proposed behavior:

1. Look for a preferred painted asset, such as `<id>-painted`, first.
2. Fall back to the existing `<id>` asset when no preferred file exists.
3. Apply the rule to portraits, places and events.
4. Keep the old files and their current names untouched.
5. Record every new image in `src/ui/art-kept.json`.
6. Add tests for preferred lookup, fallback behavior, naming and orphaned files.
7. Document the preferred naming convention in the art handover and placement guides.

### Acceptance criteria

- New art becomes visible without overwriting or deleting existing art.
- A missing preferred image safely falls back to the current one.
- Portrait and place selection remains stable rather than randomly changing between faces or locations.
- The art manifest and naming tests pass.

## Workstream 3: city layout and environmental art

Begin this workstream immediately after gameplay completion. Replace hash-led house scattering inside the two settlement footprints with authored micro-layouts plus deterministic variation.

### Harappa package

- Three or four recognizable courtyard compounds.
- A visually dominant civic court.
- An earthen workshop with kilns, clay, drying brick and tool racks.
- A tram yard with platform furniture, hitching equipment and shade.
- Narrow lanes, repaired walls, roof access, planted corners and domestic clutter.
- A gradual transition from occupied ground into desert.

### Mohenjo-daro package

- A raised brick quarter with a clear silhouette.
- A drain court with visible channels, covers and outflows.
- Wells, cisterns, washing steps and damp masonry.
- Stepped river terraces and reinforced banks.
- A substantial landing with boats, rope, baskets and reedwork.
- Denser central alleys and looser water-edge construction.

### Shared package

- Worn roads with edges, wheel traces and foot traffic.
- Improved rail, bridge, station and gate details.
- Irregular banks with reeds, mud shelves, stones and wet transitions.
- Building shadows and selective foreground overlap.
- Activity-centred props instead of uniform prop density.
- Larger and clearer visual changes for the three knowledge-driven improvements.
- POI structures that are recognizable without reading the interface label.

### Graphics improvement investigations

The twin-city renderer should reuse the visual grammar already proven elsewhere in the game, but not copy systems blindly. Existing cliffs, overhangs, biome borders, water treatment, elevation cues and row-based depth provide reference implementations for how a flat tile map gains height and material separation.

#### Simple palettes, gradient shadows and depth

- Keep sprite palettes small and NES-like. Separate broad lit faces, base colours and shadow
  masses; do not introduce many fine tones inside each material.
- Add restrained gradient shadows and lighting/depth layers around simple sprites, reusing
  existing contact, rim, tint and occlusion systems before adding new effects.
- Keep one consistent light direction across ground, walls, buildings, props and characters.
- Distinguish materials through broad colour, value and silhouette cues rather than fine surface marks.
- Reserve the darkest values for doors, deep drains, under-roof space and strong overlaps so ordinary surface texture does not compete with navigation.
- Use contact shadows beneath houses, walls, trees, station furniture and the tram to make objects sit on the ground.
- Add restrained ambient occlusion where walls meet ground and inside courtyard corners.
- Test every palette under the game's dawn, noon, dusk and night tinting. A good noon ramp that collapses into one value at dusk is not finished.
- Check greyscale readability so Harappa and Mohenjo-daro remain structurally distinct without depending on ochre versus red.

#### Elevation, cliffs and overhang lessons

- Study the existing `cliffAt`, cliff-turn and rim-mask rules before designing twin-city height edges. Their main lesson is that ground texture stays quiet and height is carried by a separate edge layer.
- Do not apply the rock-cliff predicate directly to riverbanks: the existing system deliberately excludes water because continuous cliff faces made rivers look like built canals.
- Create separate low-bank, cut-bank, terrace and retaining-wall vocabularies for the Saraswati. Natural banks should be irregular; engineered banks should reveal deliberate courses and drainage.
- Use the overhang system as a layering reference rather than as twin-city art. It demonstrates how a lip, face and hanging foreground detail establish vertical depth.
- Give Harappa's rocky shoulder and Mohenjo-daro's river terrace distinct height profiles instead of using the same generic rim.
- Add corner, end-cap, inside-corner and transition frames so height edges turn cleanly rather than meeting in T-junctions.
- Keep the player's feet and route surface legible wherever a foreground wall, bank or roof overlaps the walking tile.

#### Water depth and shoreline treatment

- Define at least three visual water conditions: shallow bank water, main river channel and deeper sea/cove water.
- Signal depth through value, submerged colour, ripple scale and visible bottom detail rather than hard blue bands.
- Reuse the existing waterline and ripple behavior for the traveller, but give the environment separate slow glints and current marks.
- Paint wet margins, exposed mud, reed roots, stones and water-darkened masonry at bank transitions.
- Break long straight channels with small deterministic variations while preserving the authored collision and connected-water network.
- Give the delta distributaries narrower, softer edges than the main Saraswati channel.
- Give coves quieter surfaces, accumulated reeds and sheltered reflections so they do not read as pieces of the main river copied sideways.
- Make bridges and landings cast into the water and meet a believable bank rather than stopping at a tile boundary.

#### Landform detail

- Build several dune profiles: low wind ripple, slip face, eroded shoulder and vegetation-held dune.
- Use directional sand marks that agree with the dune form instead of uniform noise on every desert tile.
- Give hill faces a top lip, exposed face, rubble foot and occasional shadowed cleft.
- Blend the rocky shoulder into surrounding desert with talus and scattered stone rather than a hard biome outline.
- Introduce dry channels, silt fans and flood marks as low-contrast details that explain how the valley changes seasonally.
- Keep navigable ground visually calmer than impassable or elevated faces.

#### Architecture, courtyards and gates

- Add house variants by function, not decoration alone: domestic room, storage room, workshop, shaded platform, stair/roof access and repaired ruin.
- Vary footprint, roofline, doorway placement, parapet condition and attached shade while keeping the shared scale chart.
- Compose houses into courtyard groups with intentional openings instead of scattering independent buildings across most settlement tiles.
- Add courtyard surfaces such as swept earth, brick paving, planted beds, drains, work mats and storage jars.
- Suggest weathering with a few broad shapes: softened corners in Harappa and a darker damp
  base in Mohenjo-daro. Do not draw every brick, chip, salt mark or crack.
- Make gates readable through negative space, flanking posts, worn ground and approach alignment. Do not rely on a decorative gate sprite laid over a blocked-looking wall.
- Distinguish public, working and domestic space through prop families and ground wear.
- Add a small number of roof and foreground pieces that can occlude the player correctly and make the towns feel built upward, while avoiding large opaque roofs that hide navigation.

#### Vegetation and ecological placement

- Replace uniform biome-frequency placement with ecological bands: palms near reliable water, reeds at shallow margins, grasses on damp ground and thorn scrub on drier approaches.
- Use the existing rim-aware feature rules as a model for plants that belong specifically on banks, edges or water rather than anywhere in a biome.
- Cluster vegetation in families of different heights, then leave deliberate open ground around roads, doors, drains and sightlines.
- Give disturbed urban plants a different vocabulary from wilderness growth: swept courtyards, planted shade, volunteer grass in drains and reeds reclaiming unused rooms.
- Allow some plants to cross tile boundaries visually while keeping their contact point and depth tied to one tile.
- Add seasonal variants only after the base placement reads correctly; seasons should change density and colour, not move important silhouettes unpredictably.

#### Ostrich tram and terminal movement

- Retain the current four-direction, four-pose tram sheet and curved route following as the functional baseline.
- Implemented baseline: existing eased deceleration, a brief neutral halt, two planted turning steps and departure-ready neutral idle. The sequence uses raw elapsed time, cancels on departure and does not delay player control or slide the carriage.
- Further animation requires an approved simple NES sheet: bird head/neck motion and handler or harness adjustment. Do not imply the existing whole-carriage directional poses provide independently animated anatomy or harness.
- Keep the existing nighttime rest rule and give the stopped tram a distinct resting pose rather than freezing a walking frame.
- Add restrained body rise, leg phasing, harness tension and carriage suspension so the bird and vehicle feel connected.
- Ensure wheel or runner motion agrees with travel direction and does not slide on bends.
- Let terminal props reinforce the turnaround space: worn arcs, hitch posts, feed/water, shade and a clear platform edge.
- Test both directions, every heading change, repeated rides, reload at each station and low frame rate.
- Keep the turnaround short enough that it reads as detail rather than delaying the player from regaining control.

#### Additional detail ideas

These are optional placement and atmosphere ideas within the simple NES map direction.
Do not implement them as a dense detail checklist. Prefer a few readable objects or layers
and reuse existing art; omit anything that adds noise or requires unnecessary generation.

- Introduce small activity tableaux that can be read without interaction: bricks drying, reeds soaking, jars cooling, repaired wall sections and boats under work.
- Use prop rotation and damage states to break repetition without inventing new mechanics.
- Add restrained footprints, cart marks and swept areas that converge on actual doors and work sites.
- Give each major POI one silhouette landmark visible from several tiles away.
- Use local night lighting sparingly at occupied places, with light caught on nearby walls or water rather than a generic glowing circle.
- Add weather responses where the engine already exposes the state: darkened wet ground, reduced dust, stronger water highlights and weighted cloth in rain.
- Prevent synchronized ambient motion; reeds, glints, smoke and cloth should use seeded phase offsets.
- Audit every new foreground element at mobile zoom and under fog so detail does not become visual noise.
- Check sprite bounds and transparent padding. A technically correct frame with a small drawing inside it will still make buildings look undersized.
- Add an atlas-bleed review at fractional camera zooms and during tram movement.

### Technical approach

- Keep `src/world/twinCities.ts` responsible for geography and connectivity.
- Refactor `planTwinScene` in `src/game/twinArt.ts` around authored district compounds and anchors.
- Use seeded selection only for small variations within an authored layout.
- Reuse mask ordering, corner logic, row-based depth and contact semantics from the established rim and feature systems where the material behavior matches.
- Keep natural banks, engineered retaining walls and rock cliffs as separate art and placement rules.
- Derive vegetation placement from water distance, disturbance, edge type and settlement use rather than biome alone.
- Model the terminal turnaround as an explicit visual state sequence while leaving ride cost and route rules unchanged.
- Create versioned runtime sheets for ground, architecture, props, routes, rims and transport.
- Use build scripts for atlas assembly, palette reduction, validation and optimization.
  Simple geometric textures and shadow/depth masks may be generated deterministically;
  request image generation only for missing recognizable silhouettes that existing art cannot supply.
- Preserve the existing art sheets as fallback and historical source material.

### Acceptance criteria

- Harappa and Mohenjo-daro are identifiable from a greyscale silhouette and layout, not only colour.
- Future map assets read as simple 8-bit NES-style art at normal play zoom. Reject fine
  texture, excessive tones and busy ornament even if the asset looks impressive enlarged.
- Depth comes primarily from shadows, gradients, lighting layers, overlap and elevation,
  with measured rendering cost and clear routes.
- Buildings and the player share a credible scale.
- Major POIs are visually dominant and routes remain readable.
- Water, settlement, desert and wetland transitions do not appear as hard rectangular bands.
- Colour ramps preserve material separation at dawn, noon, dusk and night.
- Cliffs, banks, retaining walls and overhang-like foreground layers communicate different materials and do not collapse into one generic border.
- Main channel, delta, shallow bank and cove water are distinguishable without interface labels.
- Vegetation distribution follows water, disturbance and human use while preserving route and doorway clarity.
- Gates read as open from their approach direction.
- The tram turns around without sliding, snapping headings or freezing on a walking pose.
- Identical seeds produce identical layouts.
- Existing saves retain ground, POIs and progress.

## Workstream 4: named NPC package

Create ten unique 256×256 painted portraits and matching overworld identities.

| NPC | Role | Primary visual cue |
| --- | --- | --- |
| Eru | Earthen mason | Plaster tools and ochre dust |
| Nemi | Courtyard gardener | Seed pouch and living greenery |
| Tavra | Station keeper | Rail tokens and shade cloth |
| Renu | Brickworker | Fired-brick dust and carrying pad |
| Seli | Water keeper | Measuring vessel and blue-green accent |
| Hutel | Landing keeper | Rope and river-weathered clothing |
| Pavi | Tram handler | Harness fittings and bird feather |
| Denu | Causeway maintainer | Repair tools and sun-worn wrap |
| Irekha | Reed-boat repairer | Reed needles and bindings |
| Ulenna | Cove watcher | Bird-watching gear and coastal palette |

Each overworld identity should provide:

- Simple 8-bit NES-style forms, distinct from the richer face portrait used in the interface.
- Four directions.
- Idle and walking frames.
- Clothing colours matching the portrait.
- One readable role prop where scale permits.

All ten named NPCs now have reproducible 26×40 NES sheets. For the three circuit walkers, Eru wears cream
and ochre with a plaster float; Nemi wears olive with a seed pouch and gathered sprig; Seli wears
blue-green with a measuring vessel. Each has four facings, idle/walk poses and four seated frames
for the character-loader contract. The authored clothes are never randomly dyed. Their existing
circuits and schedules stay intact. The other seven residents stand beside an authored workplace,
clear of buildings, roads, rail and water; no movement schedule or new interaction is invented.

Journey banners now use the same painted-edition preference as portraits, place views and
happening cards, retaining their original image when no reviewed painted edition exists.

### Acceptance criteria

- No two portraits share the same facial template.
- Each person remains distinguishable with the name hidden.
- Portrait, overworld sprite and event appearances use the same costume key.
- Every profile loads the preferred portrait without falling back.
- Small sprites remain readable at normal and mobile zoom.

## Workstream 5: event paintings

Create eighteen improved 512×384 happening paintings and improve the two journey banners.

### Establishing and travel

- `happening_twin_arrival`
- `happening_twin_ostrich`
- `happening_twin_carrier`
- `happening_twin_camp`
- `journey-aravali-twins`
- `journey-lothal-twins`

### Harappa and western valley

- `happening_twin_courtyard`
- `happening_twin_workshop`
- `happening_twin_lane`
- `happening_twin_closing`
- `happening_valley_courtyard_return`
- `happening_valley_windbreak`

### Mohenjo-daro, river and coast

- `happening_twin_brick`
- `happening_twin_drain`
- `happening_twin_bank`
- `happening_twin_cove`
- `happening_valley_seam`
- `happening_valley_reed_return`
- `happening_valley_tide_room`
- `happening_valley_bird_return`

Every painting should contain:

- A specific moment rather than an icon-like summary.
- Two or three readable depth planes.
- A clear human action or environmental change.
- Architecture recognizable as the correct city.
- Consistent NPC faces, costume colours and tools.
- Time-of-day variation where supported by the prose.
- No text, logos, signatures or watermarks.

### Acceptance criteria

- Every authored happening resolves to a preferred painting.
- The correct city, NPC and activity can be inferred from the image.
- Paintings crop cleanly in the existing event card on desktop and mobile.
- No raw source image is shipped in the application bundle.

## Workstream 6: place views

Create a distinct painted view for all fifteen points of interest:

1. Harappa Court.
2. Earthen Workshop.
3. Nesting Ruins.
4. Harappa Station.
5. Raised Brick Quarter.
6. Drain Court.
7. Planted Ruins.
8. Twin Landing.
9. Twin Causeway.
10. Desert Ground.
11. Reed Junction.
12. Twin Cove.
13. Dune Windbreak.
14. Reedwright Bank.
15. Nesting Cove.

The same architectural and landscape vocabulary must appear in the painted view and on the playable map. Compose for the wide `PlacePanel` crop rather than treating these as event-card paintings.

### Acceptance criteria

- All fifteen POIs load a preferred individual view.
- Each view remains recognizable when cropped to the actual panel ratio.
- Landmark form, materials and surroundings agree with the playable map.
- Similar river and ruin locations remain visually distinguishable.

## Workstream 7: ambient motion and finishing detail

Add motion only after static compositions are approved:

- Quiet water glints and drain-water movement.
- Reed movement and small bird groups near the nesting cove.
- Kiln or cooking smoke where occupation supports it.
- Cloth awnings moving gently.
- Tram-platform idle motion.
- Restrained dust puffs on dry routes.
- Night light at occupied structures.

### Acceptance criteria

- Motion supports place identity without making the scene visually restless.
- Reduced-motion preferences remove nonessential animation.
- Effects stop or change appropriately at night and in weather where relevant.
- No missing frames, texture warnings or visible atlas bleeding occur.

## Review and verification

### Capture matrix

Capture both cities at:

- Dawn, noon, dusk and night.
- Normal fog and development survey mode.
- Desktop 1280×900 and mobile 390×844.
- Major POIs, causeway, station, river landing and wilderness transitions.

### Automated checks

- Visit all fifteen POIs.
- Open all eighteen happenings and both journey banners.
- Open all ten named NPC profiles.
- Assert that preferred assets load successfully and do not use fallback art.
- Validate sprite-sheet dimensions, frame counts and transparent bounds.
- Check for missing textures, missing frames and failed asset requests.
- Verify deterministic layouts for identical seeds.
- Verify saved-map restoration without geography regeneration.
- Run typecheck, unit tests, production build and targeted browser suites.
- Keep the existing JavaScript bundle budget unchanged; paintings remain separately cached assets.

### Human review

- Walk each city without survey mode.
- Confirm that navigation remains readable under normal fog.
- Review portrait and event continuity side by side.
- Check that detail survives mobile scaling.
- Compare performance against Dwarka and the current twin-city baseline on the same hardware.

## Delivery sequence

1. Approve references, scale, palettes and city paint-overs.
2. Implement preferred-quality art lookup and tests.
3. Build one complete Harappa vertical slice.
4. Review the vertical slice before batch production.
5. Complete Harappa environment art.
6. Complete Mohenjo-daro environment art.
7. Produce the ten portrait and overworld identity packages.
8. Produce the eighteen happening paintings and two journey paintings.
9. Produce the fifteen place views.
10. Add ambient motion and night detail.
11. Run the full capture, performance and regression review.

## First vertical-slice milestone

The first milestone should be one fully polished Harappa courtyard containing:

- Final ground and road treatment.
- Final architecture and props.
- One final named NPC overworld identity.
- That NPC's painted portrait.
- One final event painting.
- One final place view.
- Desktop, mobile, noon and dusk captures.

This validates the complete pipeline before committing to more than forty additional UI illustrations.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| New art diverges from the game | Approve a vertical slice before batch production |
| Portraits and events depict inconsistent people | Maintain one costume and face key per NPC |
| More detail makes routes unreadable | Keep route contrast and test under ordinary fog |
| City art breaks saved worlds | Keep geography and anchors stable; test restored saves |
| Asset volume increases initial load | Keep URL discovery eager but image bytes separately fetched; optimize delivery assets |
| Generated images contain signatures or artifacts | Inspect full-resolution sources, patch from the same source and rebuild |
| Procedural layout erodes city identity | Author compounds and use hashing only for local variation |
| Animation damages performance | Add motion last, cap active effects and compare like-for-like measurements |

## Questions for scrutiny

1. **Settled by the owner:** future map art uses simple, high-quality 8-bit NES style.
   Existing map work is accepted; richer event paintings and NPC faces remain appropriate.
   Do not reopen the choice between SNES detail and richer pixel painting during implementation.
2. Should Harappa and Mohenjo-daro retain equal footprints, or should Mohenjo-daro appear denser inside the same boundary?
3. Are the ten current NPC designs final in canon, including clothing, age and cultural cues?
4. Should improved event paintings replace the current view by preference, or should some old pixel takes remain visible through seeded variation?
5. Is the tram meant to feel improvised and local, or like an established piece of regional infrastructure?
6. How much archaeological familiarity is desirable before it begins to conflict with the invented setting?
7. Should the first vertical slice be Harappa Court, Drain Court or the causeway, based on the most important player impression?
8. What download and memory budget should be set for the complete twin-city art package?

## Definition of done

The visual pass is complete when:

- Harappa and Mohenjo-daro are immediately distinguishable by structure, not merely colour.
- Their environmental quality is comparable with the strongest established maps.
- The playable map retains the settled simple 8-bit NES direction. Improvements in quality
  come from composition, shadows, gradients, layers and depth rather than more detailed sprites.
- Accepted map work has not been needlessly regenerated, and art-generation effort is reserved
  for concrete gaps. Detailed event illustrations and NPC portraits remain supported.
- All ten named NPCs have unique, consistent portrait and overworld identities.
- All eighteen happenings, two journeys and fifteen POIs use reviewed preferred artwork.
- The cities remain readable and performant on desktop and mobile.
- Existing saves, geography, travel, diary, conversations and transport continue to pass.
- Review captures and source files make the work reproducible and open to later scrutiny.

## Proposed story expansion — planning only (17 November 2026)

**Implementation subsequently authorized by the owner.** This section retains the reviewed
story design and estimates. See [the phase ledger](twin-valley-implementation.md) for authored
work, pending artwork, verification and publication status. Existing unfinished art is not
silently represented as complete.

### Overarching map story

**A living valley survives through care, observation and room left for other lives.** Harappa
offers shade, earthen repair and planted rooms; Mohenjo-daro offers brickwork, drainage and
managed water. The river, desert and coast connect these practices. The northwestern cave
introduces a different community and a quieter way of paying attention. The beedu makes the
desert and coast feel like one living landscape.

The player's overarching goal is to understand how the valley stays habitable, record that
understanding in the diary, and return to people with evidence that changes the conversation.
Keep the peaceful naturalist game: no combat, royal obedience meter, experience points,
mandatory meditation timer or new currency.

Proposed narrative sequence, with freedom to explore out of order:

1. **Find a way into the valley.** Tavra explains the two cities, road, tram and onward travel.
   Nemi and Eru make the first question concrete: repairing a wall can damage the shade it serves.
2. **Compare two ways of keeping a city useful.** Renu and Seli show raised thresholds and
   selective drainage. Priest Kang connects these practical acts with inherited civic memory.
   His account is a perspective to examine, not an answer that overrides observation.
3. **Follow water and movement between places.** Denu and Irekha link roots, bridges and flexible
   repairs. Pavi, Hutel and Ulenna connect animal care, tides and nesting space with safe travel.
4. **Take an optional northwestern branch.** Ordinary directions and camp traces lead to the
   cave. Yamantaka welcomes a careful visitor; Mirlepa offers observation through stillness.
   A cook or herder makes this an inhabited camp rather than an isolated oracle encounter.
5. **Notice the moving desert.** Rumours of a moving shadow lead to the beedu's sand–coast
   circuit. Seeing it is a reward for attention, never a rare-spawn requirement for finishing
   the main map or gaining permission to travel.
6. **Return with a changed notebook.** People respond to specific observations. A concluding
   entry brings together roots, channels, shared shelter, patient watching and movement.

Keep the current core discoveries and two field questions intact unless a separately reviewed
canon change replaces them. Cave and beedu material is optional; no existing ending, boat, tram,
conversation or settlement support should require finding a rare actor.

### Peoples, languages and naming — controlling population brief

The owner requires a Harappan majority, some Kia and very few Elamites. This applies to the
valley's inhabitants, not to biological appearance inferred from skin colour. Keep culture,
native language, additional trade languages and character species separate in canon and UI.

| Main character | People / ethnicity | Native language | Additional languages |
| --- | --- | --- | --- |
| Eru | Harappan | Harappan | — |
| Nemi | Harappan | Harappan | — |
| Tavra | Harappan | Harappan | — |
| Pavi | Harappan | Harappan | — |
| Renu | Harappan | Harappan | — |
| Seli | Harappan | Harappan | — |
| Denu | Harappan | Harappan | — |
| Priest Kang | Harappan | Harappan | — |
| Irekha | Kia | Kia | Harappan |
| Ulenna | Kia | Kia | Harappan |
| Hutel, formerly displayed as Oru | Elamite, from the west | Elamite | Harappan |
| Mirlepa | Denisovan | In-world Denisovan | Harappan, Maru |
| Yamantaka | Denisovan | In-world Denisovan | Harappan, Maru |

That is **8 Harappan, 2 Kia, 1 Elamite and 2 Denisovan main NPCs**. The intermittent cook is
Harappan and the intermittent herder Kia. Only one helper visits at a time. Existing road
company stays limited; no extra random Elamite or Denisovan travellers are added automatically.

The lore's `cultures.json` declares Elamite and Denisovan already. Their naming and dress
conventions are now explicit there, and named NPCs carry `culture`, native `language` and
optional `trade_languages`. Profiles display those distinctions. The new Elamite language
must not be represented as Harappan merely because Hutel speaks Harappan for work. Written
English dialogue is player-facing presentation, not evidence that all speakers share a native
language. Any later teachable historical Elamite vocabulary needs sourced meanings; do not
invent translations and present them as attested language.

**Elamite naming:** use short two- or three-syllable game names with hut-, nap-, tem- or kut-
sounds and compact endings. Hutel is a coined Elamite-inspired game name, not a claimed ancient
attestation. Ordinary people do not all receive royal or divine compound names. Lore records
additional naming examples for future authoring, without activating a generic stranger pool.
The landing keeper's stable `npc_twin_landingkeeper` ID and portrait/sprite filenames remain
unchanged when his display name changes.

**Denisovan naming:** preserve the owner's two named individuals, **Mirlepa and Yamantaka**.
Use authored personal names and optional household / role epithets, independently of Maru
names. No reconstructed prehistoric language is claimed and no random names are needed for
these two. Their Kalash-inspired clothing and Tibetan / archaic-human face references remain
fictional art briefs, distinct from the identity of living communities.

For portraits use each culture's existing `dress` and `art_reference` guidance with individual
age, face and costume differences. Harappan references draw on Sindh, Punjab and Gujarat;
Kia references on the western/southern Indian coast and the canon's broader reference range;
Elamite references on the western Susiana / southwestern Iranian region. These are artist
references, not claims of an exact archaeological ethnic facial reconstruction.

### Individual conversation goals

Each conversation should have an opening concern, a concrete observation or ordinary action,
and a later response to that evidence. Replace repeated generic acknowledgement lines with
role-specific consequences when this content pass is authorized. The following are proposed
goals, not claims that the current canon already contains these beats.

| Person | What the conversation is trying to achieve | Evidence or player action | Later conversation / connection |
| --- | --- | --- | --- |
| Nemi, courtyard gardener | Understand why planted rooms and shade are useful living space | Observe the neem's roots, jars and shaded courtyard; compare planted ruins | Recognises that leaving an open root ring is part of care; directs the player to Eru |
| Eru, earthen mason | Distinguish sound repair from repair that destroys what makes a place usable | Compare patched plaster, old courses and exposed roots | Explains why repair stops short of the tree; links to Renu's different building material |
| Tavra, station keeper | Give clear orientation and safe routes without turning travel into a quest reward | Ask about both platforms, the road and the desert turn-off | Offers a grounded cave direction after the player expresses interest; never withholds the tram |
| Pavi, tram handler | Understand the bird's work, harness changes, water and rest | Observe a terminal arrival and the freed harness / water place | Talks about caring for a working animal; can distinguish tram tracks from a beedu sighting |
| Renu, brickworker | Read raised thresholds and brick arrangement as responses to water | Compare a threshold with the drain court | Responds to evidence about where water goes; connects to Seli and Kang's civic account |
| Seli, water keeper | Learn why one channel is cleared while another keeps reeds | Follow a floating leaf and compare moving water with a reed margin | Discusses selective clearing rather than total removal; points toward Denu and Irekha |
| Hutel, landing keeper | Understand the meeting of fresh water, salt and boat access | Observe the landing and changing water; ask about the Lothal crossing | Shares tide knowledge and reports of the coastal shadow; does not require notebook completion to travel |
| Denu, causeway maintainer | Explain how a clear passage and rooted banks support each other | Compare driftwood in the channel with roots at its sides | Recognises why keeping the middle open need not strip the margins; directs the player to Irekha |
| Irekha, reedwright | Understand flexible repair and a living source of materials | Compare a reed seam, cut bundles and the rooted bed | Explains what can be harvested without undoing the bank; offers a practical link to camp work |
| Ulenna, cove watcher | Observe nesting routes without displacing birds | Watch from the existing shelf and keep to the clear approach | Responds to nesting observations; distinguishes patient watching from chasing a rare beedu |
| Priest Kang, priest-king-associated figure | Explore civic memory and the optional commission of his life-size bust in Harappa | Bring practical observations, study the sitter with consent and help agree a suitable courtyard site | Responds to the completed likeness, credits the makers and changes his account in light of the player's evidence |
| Yamantaka, Denisovan camp guardian | Establish the cave's boundaries and hospitality without a threat or toll | Greet him, ask where to stand, leave the meditation alcove quiet | Explains the three-headed person's work and viewpoint; introduces Mirlepa or a helper; no battle, intimidation test or locked transport |
| Mirlepa, meditating Denisovan | Make still observation useful to a naturalist without supplying supernatural proof | Choose to sit or watch wind, dust, breath and small animals; short voluntary interaction | Reflects a specific observation back to the diary, acknowledges other valley knowledge and invites a later visit |
| Visiting cook, optional helper | Show how daily care sustains the camp | Ask about fuel, water and leaving the hearth safe; optional ordinary assistance | Acknowledges practical help; offers a different everyday account of the cave |
| Visiting herder, optional helper | Connect shelter, grazing routes and the need to leave space | Observe the resting fold or follow the described grazing route | Explains why the camp has visitors and changes through the day; may share a beedu rumour |

For the three new named NPCs, budget approximately four to six meaningful dialogue beats each.
For the ten existing NPCs, budget two to three tailored additions or rewrites each; preserve
existing useful lines. Helpers need two to four short situational beats each. This is roughly
36–56 authored beats before the added bust quest and flight-specific reactions. Allow a further
12–20 short beats for those additions, shared across existing speakers rather than duplicating
whole conversation trees. Exact lines, language knowledge and diary flags belong in the canon
review before game integration.

### Priest Kang: relationship and portrait brief

- Add **one NPC named Priest Kang**, associated closely with the local priest-king tradition.
  Use a kinsman / descendant relationship as the working story proposal; the exact relation
  (descendant, sibling or household associate) remains open. Do not create another royal NPC
  or a mandatory royal quest merely to fill this gap. The optional Harappa bust commission
  below is now explicitly part of the owner's requested story scope.
- Proposed home: an existing civic setting at **Harappa Court**, avoiding another POI solely
  for this character. Confirm that Kang and the courtyard inhabitants have enough clear space.
  A later visit to Mohenjo-daro can be dialogue first; an additional travel routine is optional.
- The richer face portrait should closely resemble the actual Indus sculpture conventionally
  called the **Priest-King**: use a verified frontal and three-quarter reference to match the
  eyes, nose, beard, headband and face proportions. Avoid a generic crowned fantasy king.
- Reference-check task before artwork: confirm the familiar bust's **Mohenjo-daro provenance**
  rather than treating “Harappan civilisation” as proof that it was excavated in Harappa city.
  The conventional title is not proof of the sitter's historical office. Kang's kinship and
  priestly role are fictional game lore.
- Match clothing and ornament to the reference in the painted portrait where appropriate.
  Keep the map version simple NES: broad headband, beard and cloak masses; no miniature
  trefoil texture or elaborate jewels.
- Minimum art package: one 256×256 delivery portrait, one standard NES identity sheet, and a
  shared face/costume reference for later event scenes. Keep the original ten NPC designs.


### Priest Kang's life-size bust quest — Harappa

**New owner requirement:** create a life-size bust of Priest Kang in Harappa through a quest /
event chain. Working interpretation: a life-size head-and-shoulders sculpture on a modest
plinth, not a full-body standing statue or a giant head. Its face shares Kang's verified
Priest-King reference and portrait identity. The enlarged scale and fictional commission are
game lore, not claims about the size or origin of the archaeological object.

**Quest purpose:** turn the map's theme into a visible choice about what a city remembers.
The finished work honours a person while acknowledging the people whose everyday care keeps
the courtyard usable. It is optional and grants no royal authority over the player.

Proposed chain:

1. **A proposal at Harappa Court.** Kang and the courtyard inhabitants discuss a bust. The
   player can agree, ask whose work it should commemorate, or leave the invitation open.
   Commissioning starts through conversation; no payment or rare-item gate is required.
2. **Study the sitter and choose the site.** Observe Kang's face and clothing with his consent.
   Nemi identifies a clear place outside the neem root ring; Eru checks the base. The bust must
   not occupy shade seating, a doorstep, a road or the natural approach to the courtyard.
3. **Prepare through ordinary local work.** Eru organises the plinth and clay study; Renu can
   advise on reused brick for the base. A local carving workshop supplies and carves the stone
   or other agreed material. Do not silently turn the earthen mason into a master stone
   sculptor: the carver can be a credited event participant without another permanent NPC.
   Start with donated / reused local materials and story flags, not a new resource economy.
4. **Carving event.** Show Kang's likeness emerging in the workshop. The player's contribution
   is observation, coordination and the placement decision. Use an authored event choice or
   an ordinary return visit to advance work, not a compulsory real-time waiting timer.
5. **Unveiling event in Harappa.** Install the completed life-size bust at the agreed site.
   Kang responds to his likeness; Nemi, Eru and the other participants acknowledge the shared
   work. An optional diary response can emphasise the sitter, the makers, or the living
   courtyard; none should be a hidden punitive answer.
6. **Persistent aftermath.** Keep exactly one finished bust on the map after reload and
   revisits. Kang and the workers gain specific post-quest lines. A player who leaves the
   invitation unfinished can still complete the main map and use all travel.

Working quest states: `not_commissioned → commissioned → work_ready → installed`.
The carving and unveiling are two authored happenings with two delivery paintings. The proposal
and preparation use conversations and existing panels. Each transition and reward must be
idempotent; repeating a conversation must not add another bust or duplicate a diary entry.

Presentation: three compact NES scenery states at one reserved courtyard position (unworked
base / work in progress / installed bust), with shadows and depth consistent with the accepted
map. Head size should relate to nearby NPCs. Use the rich event paintings and place-panel
detail to convey facial resemblance; do not add intricate face pixels or cloak patterns to the
map. Keep all accepted courtyard art and the neem clear.

Canon owns the quest, event prose, participant roles, choice results and reaction conditions.
The game owns the scenery-state presentation and its flag-to-render wiring. Reuse existing
saved story flags / event history where possible. On older saves the sculpture is absent
until commissioned; no map regeneration, moved city anchor, forced quest completion or new
POI is needed.

Acceptance: the full chain makes the bust **in Harappa**, uses the shared Kang face key,
credits the makers, preserves the courtyard, survives reload, and remains optional. The
beedu sighting is not a prerequisite for this quest.

### Northwestern cave and first Denisovans

**Site and presentation**

- Add one permanent cave-camp POI in the **extreme northwest** of the existing 64×64 mainland.
  Working search window: approximately x=3–7, y=3–7, with a small edge margin for the cave
  silhouette and camera. The exact tile is a layout decision, not a committed coordinate.
- Prefer a cave entrance in the existing rocky terrain with a clear southeast approach, a
  sheltered hearth and a small resting / grazing space. Use existing cliffs, ledges, contact
  shadows and layer depth; do not enlarge the map or rebuild the cities.
- MVP uses one exterior POI and descriptive sublocations: threshold, meditation alcove, hearth
  and fold. No separate explorable interior map is included in the base estimate.
- Connect the cave to the northwestern approach from Harappa with a readable foot route.
  Do not blindly use the current expansion POI's Manhattan road builder: it could cut a broad
  road through the intended ridge. Preserve existing roads, bridge spans and city anchors.
- Treat the cave as a **stable home camp like the High Camp**, not one of the existing random
  encampments that relocates or disappears on a cycle. Reuse camp routines, hospitality and
  helper-role concepts, while keeping this permanent location and its named occupants stable.

**Mirlepa**

- Use the exact name **Mirlepa**. A meditating Denisovan, calm, observant and fully clothed.
- The face brief combines the owner's Tibetan, archaic-human / Neanderthal and cave-dweller
  inspiration as a **fictional design**, with a coherent brow, broad facial structure and
  distinct nose / jaw chosen during concept review. Do not describe the result as a scientifically
  established Denisovan face.
- Kalash-inspired dress: reference actual garments before choosing silhouette, headwear,
  embroidery placement and colours. Rich textile cues belong mainly in the portrait; use
  one or two broad colour bands on the NES sprite.
- Meditating idle is the primary pose. Include a readable seated silhouette and a modest
  standing / four-facing set for the standard character contract, not an elaborate exercise
  animation or a compulsory real-time meditation activity.

**Yamantaka**

- Use the exact name **Yamantaka**. A Denisovan guardian with **three actual heads**, as the
  owner requested, using Svetovid as a multi-headed visual inspiration.
- Keep the count at three. A frontal portrait should make all three heads readable; the small
  map silhouette must also show three distinct head masses without piling on facial detail.
- This is a specific fantastical person's anatomy, not the default Denisovan body type.
  His role is a keeper of the threshold and a host; preserve the game's noncombat character.
- Use the requested Tibetan / Denisovan facial inspiration and Kalash-inspired dress, with
  his own face/costume key. Do not copy Mirlepa's face three times or rely on a weapon silhouette.
- A wider character cell is allowed if needed to retain three heads at integer scale. Reuse
  the existing per-character frame-size support; do not squeeze the figure into 26 pixels or
  use a large fractional scale. Keep clear space around the cave entrance.

**Helpers and routines**

- Mirlepa and Yamantaka remain the two permanent named residents. Add a visiting cook and/or
  herder intermittently, derived from seed and journey day, with at most two helpers present.
- Start with one helper slot, alternating cook and herder. A second simultaneous helper is an
  optional extension. Visitors leave naturally; the cave itself never disappears.
- Reuse existing camp actor, talk and routine machinery where suitable. Do not insert this
  camp directly into the random camp-kind lottery or silently replace another camp's people.
- Work can be ordinary hospitality: fetching a little water, discussing fuel, checking a
  resting fold. No killing requirement, combat encounter or mandatory resource grind.

**Denisovan identity decision**

Recommendation: **separate ancestry / people identity, with independent cultural affiliation**.
Mirlepa and Yamantaka should be recognisably the game's first Denisovans, while being able to
share Maru routes, hospitality, language or relationships. Kalash-inspired clothing and Tibetan
facial references are art directions, not statements that living communities are Denisovans.

Review the actual canon schema before deciding whether this is a new people entity, an ancestry
link on characters, or an existing supported relationship. Do not invent an unsupported entity
type or hard-code all Denisovans as Maru in the game adapter.

| Option | Benefit | Cost / limitation |
| --- | --- | --- |
| Maru-affiliated named Denisovans only | Lowest disruption; authored people can share existing camp conventions | Without a separate identity record, the first Denisovans may be indistinct in the lore |
| Separate Denisovan identity with Maru contacts — recommended | Preserves their introduction and separates ancestry from culture | Requires a small canon / adapter review; no new random traveller culture is assumed |
| Fully independent Denisovan culture and random traveller pool | Supports later settlements, names, language and recruits | Larger follow-up: names, culture selection, clothing pools and general encounter logic; unnecessary for two NPCs |

### Flying beedu: one rare desert–coast visitor

**Use the existing creature.** The exported canon already contains `fauna_beedu`, Beedu,
alias Sand-Camouflage Beedu, `Sarasvatimanta gedrosii`: a rare Gedrosian desert manta that
glides on thermal currents and has gas-filled bladders. Do not add a duplicate flying-stingray
species. Coast patrol and sand emergence are proposed behaviour extensions for canon review.

**Recommended first version**

- Use a **fixed, validated western desert–coast loop**, with a seeded starting phase. This is
  easier to author and review than pathfinding or a changing flight route.
- Begin and end on dry sand near the Gedrosian margin, preferably toward the existing Desert
  Ground / Dune Windbreak side. Fly south toward the western shore, follow a short coastal
  section, then return to sand. The extreme northwest cave need not be its spawn point.
- Do not expand desert terrain into the sea just to make the loop fit. Validate the actual
  seed's river and coast; keep the route away from city roofs, tram yards and nesting space.
  If a restored map has no valid loop, hide the ambient visitor rather than use a bad path.
- The beedu is ambient wildlife with an authored flight-sighting event and contextual NPC
  conversations. It is not a mount, a hostile encounter or an item source. Reuse existing
  species observation / diary hooks through the event; a new targeting interface remains optional.

**Lifecycle**

`hidden → sand stirring → emerging → gliding / coast patrol → descending → burrowing → hidden`

- At most **one beedu body** exists on this map at any time. Reuse one actor and one shadow;
  never let repeated entry, reload, a second renderer or a second event create another.
- Working rhythm: approximately 1½–3 minutes visible flight and 2–4 minutes hidden, plus short
  emergence / burrowing transitions. These are tuning proposals, not immutable requirements.
- Use one smooth path and readable banked turns. Four facings with two or three wing poses
  are enough; emergence can reuse a folded silhouette and one simple sand accent.
- Reuse the kite-style **shadow below the body**, with height offset and flattened scale;
  no kite rope. Keep the shadow anchored to the ground path while the body rises and falls.
  Fade or narrow it with height. Draw it naturally on sand and water, under the flying body.
- No continuous particle system. At most one short sand accent during emergence or burial.
  Use clear NES silhouettes, a small palette and existing shadow/depth systems.

**Implementation shape for a later authorized batch**

- A pure timing / path function answers position, height, facing and lifecycle state from
  seed, a validated route and supplied elapsed scene time.
- Cache route preparation once per world. Do not pathfind every frame.
- Drive presentation with the scene's continuous ambient clock, following existing pause
  behaviour. Walking advances the journey clock abruptly; it must not make the beedu jump
  along its route. Do not advance the animal by counting rendered frames.
- No new flight-simulation save fields for the MVP. Use existing story/event history for
  personal sightings and reports. On re-entry, a seeded presentation phase can restart;
  normal scene cleanup must destroy the previous body, shadow and sand accent.
- Hide body, shadow and emergence effects consistently under undiscovered fog. No moving
  shadow may reveal an unseen animal or unseen coastline. Respect camera culling.
- Reduced-motion treatment should preserve an occasional sighting with a still-wing / calmer
  presentation and minimal sand motion. It must not make a diary goal impossible.
- Flight events and NPC discussion are required parts of this addition. Distinguish reports,
  current local witnesses and the player's actual sighting as specified below. No main-map
  completion condition should depend on the spawn window.


**Flight event and conversations — required, not optional flavour**

Every actual flight can supply current-world context, and the first qualifying player-visible
passage should offer a proper authored happening, provisionally **“A Shadow Leaves the Sand”**.
The ambient actor, event and conversation rules must describe the **same flight**.

- Trigger eligibility from the real beedu lifecycle: emerging or gliding, near the player and
  visible under the normal fog rules. A hidden or off-map creature must never trigger a
  personal-sighting event. Sand stirring alone can be a hint, not proof of flight.
- Use the existing event queue. Do not interrupt a tram ride, another event, dialogue or a
  movement step. Capture the actual sighting context when eligible; if delivery is deferred,
  describe a recent sighting rather than claiming the animal is still overhead.
- Suggested event choices: **watch the glide**, **follow its shadow from where you stand**, or
  **let it pass**. The first two can use existing observation / diary hooks for `fauna_beedu`;
  no chase, new targeting interface, capture or harvest mechanic is required.
- Minimum MVP: one introductory sighting event per journey, remembered through existing event
  history. Repeated flights still change contextual conversation, but do not open a card on
  every loop or spam the journal. A rare repeat variation can be reviewed later.
- Keep separate facts for **a real player sighting**, **a report heard from someone else**, and
  **the animal flying now**. Do not let a rumour award a personal observation, or a permanent
  “seen it” flag make dialogue say it is flying forever.
- NPCs can react to a current nearby passage only when their location plausibly permits it.
  Otherwise they discuss the player's account or a clearly attributed report. The short
  western loop does not make every NPC on the opposite coast a first-hand witness.
- Dialogue delivery should update at lifecycle / conversation boundaries through the existing
  content-to-UI seam, not broadcast per-frame actor positions into React.
- Reuse the scene's pause policy while a card is open, or keep the scene moving and use
  past-tense sighting prose. Do not restart, respawn or duplicate the beedu to play its event.

| Speaker | Flight-related conversation goal |
| --- | --- |
| Tavra | Pass on recent reports and a useful direction; identify hearsay as hearsay |
| Pavi | Compare a beedu's effortless glide with the work and care of the tram bird |
| Hutel | Discuss the broad shadow over the shore and what the player's description suggests about wind and water |
| Ulenna | Encourage watching without chasing; distinguish the sighting from nesting birds and interpret the player's account |
| Visiting herder | Give a first-hand account when actually near the western route, otherwise a clearly attributed camp report |
| Mirlepa | Reflect on an observed change in air or dust without claiming supernatural foreknowledge |
| Priest Kang | Respond to the player's sighting as part of the valley's living memory; never require it to commission the bust |

Rumour, immediate reaction and later recollection should each have a short distinct line where
relevant. Preserve other conversation goals; not every visit should be replaced by beedu talk.
A flight heard about while away from the route can be discussed without marking the player's
own sighting complete. The creature's rarity must not stall the principal map story.

**Alternatives:** after the fixed loop is accepted, two or three prevalidated route variants
could be chosen per cycle. Fully procedural coast routing is a later enhancement, not the MVP.

### Content, art and repository boundaries

Provisional IDs for discussion only: `npc_priest_kang`, `npc_mirlepa`, `npc_yamantaka`,
`poi_northwest_cave_camp`, `quest_twin_kang_bust`, `happening_twin_kang_carving`,
`happening_twin_kang_unveiling` and `happening_twin_beedu_flight`. Naming conventions and existing lore collisions must be checked
in the canon repository before reserving these IDs.

- **SouthOfTethys:** new people / ancestry relationships, three named NPCs, cave POI, map
  membership, dialogue, optional happenings and any beedu behaviour clarification. Export the
  approved canon release normally; never hand-edit the game's `data/canon/` projection.
- **4000BCESaraswathy:** cave placement and presentation, permanent-camp integration, simple
  NES sheets, richer portraits / scene paintings, helper routines, beedu path and renderer,
  shadow, fog, reduced-motion handling, loading and save compatibility.
- Baseline becomes **16 POIs and 13 named NPCs** if Kang reuses Harappa Court and the cave is
  the only added POI. Intermittent helpers are separate from that authored named-NPC count.
- Minimum new art: three portraits, three named map identities, cave entrance / place view,
  one compact beedu atlas, and one or two small cave/helper props reused where possible.
  Plan four new story illustrations: camp arrival, beedu sighting, Kang's carving event and
  the bust unveiling. Add one compact three-state bust/plinth atlas. Helper-specific faces
  and a full cave interior painting set are optional.
- Keep all accepted existing assets. Raw candidates and desktop review captures stay local
  in already ignored folders; only compact runtime deliveries and necessary build inputs are
  proposed for tracking. No images are generated by this planning update.

### Save and progression compatibility

The cave is a new POI in an existing saved world. Explicitly extend the approved new-place
migration; do not regenerate old ground, shift existing POIs or punch a default road through
the ridge. Review the reserved northwestern placement on both new and restored maps.

Prefer existing discovery / event flags for authored narrative progress. Derived helper visits
and ambient flight do not need their own serialized counters. Do not bump a ground or knowledge
version merely to add presentation; any required schema change needs its own migration plan.
The bust quest and first actual beedu sighting do require persistent narrative state: use the
existing flag / event-history mechanisms and restore their scene and dialogue consequences.

Optional cave understanding can have one new discovery thread with four diary rungs: noticing
the inhabited threshold, understanding hospitality, observing stillness, and recognising the
camp's part in the wider valley. Define the actual prose and conditions in canon. Do not award
insight just for waiting while a timer runs, and do not classify a person's ancestry as a puzzle
the player “solves”.

### Effort estimate

These are **additional person-days**, at eight productive hours per day, for the proposed story
extension. They are not estimates for the unfinished original illustration inventory, elapsed
image-service waiting, or a promise of how many chat turns implementation will take.

| Work package | Included, without double counting | Person-days |
| --- | --- | --- |
| A. Narrative and canon authoring | Map arc, 13 conversation goals, helpers, cave discovery, bust quest and four happening scripts including beedu reactions; reference / naming review | 2–4 |
| B. Priest Kang delivery | Reference-based portrait, simple map sheet, placement in existing court and dialogue wiring; prose is in A | 0.75–1.5 |
| C. Denisovan identity | Recommended small canon / adapter identity model and cultural relationships; not a full random culture | 0.5–1 |
| D. Cave site and permanent camp | Northwest anchor, approach, exterior/place art, sublocations, stable camp integration and saved-map addition | 1.5–3 |
| E. Cave cast and helpers | Mirlepa / Yamantaka portraits and NES sheets, wider three-head cell if needed, meditation pose, one rotating helper slot, two delivery paintings (camp arrival and beedu sighting) | 2–4 |
| F. Beedu presentation | Compact atlas, one fixed validated loop, lifecycle, singleton cleanup, kite-style shadow, fog/culling and reduced motion | 2–3 |
| G. Narrative integration | Diary/event hooks, actual-flight sighting eligibility, contextual NPC reactions, optional cave progress and art lookup; no new targeting UI | 1.25–2.5 |
| H. Final integration and pipeline review | Save, travel, NPC/camp, bust persistence, event deduplication, accessibility and rendering regressions; completed-batch CI/review plus fixes | 2–3.5 |
| I. Harappa bust quest delivery | Quest-state wiring, three-state bust/plinth art and placement, carving/unveiling delivery paintings, persistent aftermath; prose in A | 2–4 |
| **Base total** | **A+B+C+D+E+F+G+H+I** | **14–26.5 days / 112–212 hours** |
| **Planning allowance** | **20% uncertainty, rounded** | **17–32 person-days / roughly 135–255 hours** |

One person working full time: roughly **four to seven working weeks including allowance**.
The required flight event / reactions and bust quest add about **3.5–6.5 person-days** to the
previous base estimate, including the two additional event paintings and integration review.
External reference and image-generation availability can extend calendar time without increasing
the amount of implementation. Reusing approved camp and shadow machinery is already assumed.

Optional additions, **not included above**:

| Addition | Additional effort |
| --- | --- |
| Two or three curated beedu loops instead of one | 0.5–1 day |
| Fully procedural flight routing across the whole coast | 1.5–3 days, instead of the curated-loop increment |
| Full independent Denisovan random-traveller culture | 2–4 days beyond the identity model |
| Separate explorable cave interior map | 2–4 days |
| Second simultaneous helper and more visit variety | 0.5–1.5 days |
| New targeting / observation UI for the flying beedu | 0.5–1.5 days |
| Bespoke helper portraits or extra story paintings | 0.5–1 day per reviewed delivery image |

Main uncertainty: three-head art readability, how much Denisovan taxonomy the canon schema can
already express, saved-world cave insertion, and reference/illustration review. Do not treat
the lower estimate as guaranteed or count optional branches twice.

### Proposed execution order, after approval to implement

1. Resolve Kang's exact relationship, cave name and Denisovan identity approach; settle the
   bust site/material and flight-event prose. The beedu event, NPC discussion and Harappa bust
   quest are now required story scope. Approve the short narrative / costume brief.
2. Author and validate the canon changes in the lore repository; export a coherent release.
3. Add the cave anchor, stable camp and save migration, keeping existing city geometry intact.
4. Integrate Kang, Mirlepa, Yamantaka and the rotating helper with their conversation states;
   add the optional bust commission, carving, unveiling and persistent courtyard aftermath.
5. Add the fixed-loop beedu using the existing ambient clock and shadow approach; wire its
   real sighting event and witness/report-aware NPC conversations to the same actor lifecycle.
6. Finish delivery art, scene reactions and diary connections as one coherent batch.
7. Run the full pipeline and a focused final review **after implementation**, without repeated
   local test cycles. Review images remain in the existing ignored desktop folder.

Do not merge story code on the strength of this plan alone. The original visual-pass completion
gate and this proposed story extension remain separate, so new ideas do not silently redefine
unfinished work as done.

### Review decisions and reference status

- Confirm whether “closely related” means Kang is a literal family relative of a local
  priest-king, its descendant, or an associated priestly figure. The kinship proposal is not
  treated as settled canon.
- Confirm the recommended separate Denisovan identity with Maru connections, versus a full
  independent culture. No modern Tibetan or Kalash identity is equated with archaic ancestry.
- Settled by the owner: Yamantaka has three anatomical heads. Do not substitute a three-faced
  headdress or change the count to four.
- Confirm the one-POI exterior cave MVP, one helper at a time, and the short western beedu loop.
- Historical / ethnographic image verification remains pending. Online reference searches failed
  during this planning session. Before art production, obtain and inspect a trustworthy
  Priest-King reference and Kalash dress references; distinguish speculative Denisovan design
  from verified archaeological evidence. No external source is claimed to have been verified.
