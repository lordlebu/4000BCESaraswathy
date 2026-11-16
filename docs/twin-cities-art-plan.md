# Harappa and Mohenjo-daro Visual Improvement Plan

**Status:** Implementation in progress; current map work accepted; 8-bit NES map direction settled  
**Prepared:** 17 November 2026  
**Repository:** `4000BCESaraswathy`  
**Scope:** Harappa, Mohenjo-daro and the mainland Saraswati twin-city map

**Execution cadence (owner update):** Complete the practical implementation batch before
testing. Do not interrupt work with repeated local checks after small changes. Commit and push
the completed batch for the full pipeline; record remaining art inventory and actual CI results
without claiming the entire programme is finished.

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
reusing the accepted directional sheet. Named walking sheets, the remaining portrait/event/place
illustrations, seasonal variants and bespoke bird/harness animation are still pending. The implementation record tracks
phase-end verification and review captures; the complete visual programme is not yet finished.

## Purpose

Harappa and Mohenjo-daro are mechanically complete, but their current visual coverage reads as a functional prototype beside the stronger parts of the game. This plan raises the twin cities to the established quality bar without changing their geography, authored progression, save compatibility or quiet exploration rhythm.

The work covers the playable map, city architecture, environmental detail, named NPC presentation, place views, event paintings and supporting review automation. It does not propose new currencies, settlement mechanics or a larger content batch.

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
| Oru | Landing keeper | Rope and river-weathered clothing |
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
