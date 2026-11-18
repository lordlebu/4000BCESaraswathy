# Twin-city graphics phase — 18 November 2026

> **Current checkpoint - 18 November 2026:** Muted sage is approved; terrain softening, shrubs, slow cave walks and bounded ambience are implemented. Required illustration backlog: **0**. [Current completion audit](twin-cities-art-status.md) and [terrain decision/evidence](twin-terrain-softening.md) override earlier dated counts and production instructions below.

Scope: nineteen preferred happening paintings, two journey banners, a painting on the actual
arrival page, sparse shared cliff/decor layers, a compact NES JRPG dry-prop atlas, stable unknown/
known stranger portraits, and a slower ostrich tram. Existing buildings and accepted map Beedu
art are preserved. The subsequent fifteen-place-view painting phase is also complete.

## Delivery rules

Built-in imagegen throughout. Map props explicitly use **“nes jrpg sprite”**, four 32px source
cells expanded at 2× for 64px frames. Paintings use cozy watercolor and wider scene palettes,
512×384 RGB deliveries, no palette quantization or lossy compression. Named faces use existing
portrait references. Large sources stay ignored under `assets/source/events/`; review sheets and
generation metadata stay under ignored `dump/twin-city-art-review/graphics-phase/`.
New preferred editions retain their original pixel-art files as fallbacks. All delivered images
are registered in `src/ui/art-kept.json`.

Rebuild paintings with `node tools/build-plates.js --events --full-colour --only=<id>-painted`.
Rebuild dry props with `python tools/build-twin-dry-props.py`. The actual map arrival card reuses
`happening_twin_arrival-painted.png`; it is no longer text-only. Both journey directions resolve
their own preferred travel image through the existing art registry.

## Common painting prompt

> A landscape4:3 cozy watercolor storybook event card for a peaceful naturalist JRPG set in a fictional living Harappan river valley. Soft broad watercolor washes and spare fine ink, simple readable shapes, gentle everyday scene. Reference is style only: do NOT copy the man into the scene. WIDER VARIETY OF COLOURS with clear warm/cool separation; retain blue sky, cool shade, green plants and differently dyed cloth rather than bathing everything in sepia/yellow. A few coordinated dominant hues plus restrained accents, no excessive detail or photoreal skin. Main action centered with margins for a512x384 card crop. No text, labels, border, UI, weapons or combat. 

For the eighteen following scenes, append: “FIRST reference is watercolor technique/architecture
only; follow the scene's new palette, not its yellow cast.” When a named character is shown,
append: “SECOND reference controls the named person's face, age, skin, hair and clothes.”
First reference is `src/ui/places/poi_harappa_court-painted.png`; second references are the named
`src/ui/portraits/<person>-painted.png` below. Then append `Scene:` and the exact scene prompt.

## Scene prompts and sources

### happening_twin_bank

Identity reference: `twin-maintainer-painted.png`.

Generation: `exec-a44c10a0-4092-4733-8698-0d5d04bf9318.png`.

> Denu in a rust-orange turban and cream work wrap lifts a loose piece of driftwood away from a riverbank opening while another keeper marks the rooted green margin to leave untouched. Water flows freely beside living reeds. No concrete reconstruction or cutting plants. Palette: turquoise water, emerald roots, rust brick, blue shade.

### happening_twin_brick

Identity reference: `twin-brickworker-painted.png`.

Generation: `exec-b881a247-6f06-4d3a-b1a7-fe59242df1b6.png`.

> Renu, an adult Harappan woman in brick-red and cream head wrap, compares the shaded inner brick and sunlit outer face with one hand on each in an old planted room. Coolness and useful inherited walls are the subject. Palette: red brick, cool lavender-blue interior shade, jade leaves, cream sunlight.

### happening_twin_camp

Generation: `exec-bdb47ffe-0755-43b1-80ea-3425f7876bc0.png`.

> An itinerant camp beside the Harappan valley at early night. A friendly mixed group of mostly Harappan travellers in indigo, muted plum, green and cream wraps moves a ceramic bowl along the ground to make space for a newcomer at supper. Modest shelters, small campfire, bedrolls and a donkey far behind. Palette: deep cobalt and teal night, amber fire, plum and green cloth; no uniform sepia. Peaceful ordinary hospitality.

### happening_twin_cove

Generation: `exec-c54fba21-858a-4a9d-9efe-00f4f0272cbc.png`.

> A naturalist stands back on the dry path above a sheltered river-delta cove, noticing clear fresh blue water become greener with tidewater. Reeds, sandbar, simple old red-brick remnants and small shore birds. Attention to changes in the water, no fishing or interference. Palette: turquoise and deep blue water, jade reeds, pink-ochre sand, lavender distant banks.

### happening_twin_carrier

Generation: `exec-961f2f00-c152-485a-b439-f5713eadb5de.png`.

> A single adult Harappan carrier with a modest cloth-wrapped parcel and rolled mat chooses a shaded footpath along the river rather than the distant exposed causeway. Quietly pausing beneath green trees, not rushing. A tiny ostrich tram crosses far behind. Palette: emerald shade, clear blue river, pale coral path, muted plum carrier wrap.

### happening_twin_closing

Generation: `exec-dd4488b8-9a31-40eb-9906-10a57ed4d166.png`.

> Quiet wide view of the two living Harappan cities and their river: neighbours have kept a shaded courtyard open, a planted brick drainage channel clear and the rooted riverbank undisturbed. A few small residents continue their ordinary work, birds inhabit old rooms. No grand royal victory or crowds. Palette: blue river, green canopy, ochre earth, red brick, distinct blue-violet afternoon shade.

### happening_twin_drain

Identity reference: `twin-waterkeeper-painted.png`.

Generation: `exec-abe669fb-c875-43ca-9416-f368ed36585a.png`.

> Seli, an older Harappan woman with long grey braid and muted blue-green wrap, maintains an ancient red-brick open water channel while carefully leaving helpful plants rooted beside it. Modest working courtyard, water flowing past greenery. Palette: brick red, cool teal water and dress, leaf green and cream walls. Not sterile modern concrete.

### happening_twin_lane

Generation: `exec-c539ee1e-7268-4d0c-a922-71d50b970967.png`.

> An empty old earthen workshop lane in the Harappan city: no human footprints, but seeds caught beside raised door thresholds and a few tiny birds approaching nesting holes. Narrow living remnants with some rooms roofed and others open to sky. Palette: pale ochre walls, cool blue/lavender shade, green seedlings, muted red and indigo cloth on one line. The seeds/thresholds are the focal detail, no people needed.

### happening_twin_ostrich

Identity reference: `twin-handler-painted.png`.

Generation: `exec-ac586bba-7430-40b4-bc1b-ec31ab547c18.png`.

> Pavi, a young curly-haired Harappan tram handler in a rust-red simple wrap, loosens a large friendly ostrich's harness and brings it a shallow bowl of water before dealing with the small wooden passenger tram. Station yard under a reed canopy; bird is calm, one animal pulls the tram. Palette: teal-green shade, pale gold straw, rust cloth, indigo textiles and blue sky.

### happening_valley_courtyard_return

Generation: `exec-a5d86831-89d5-4805-827a-8030ee3ccf45.png`.

> A new little reed mat set beneath a mature neem in an ordinary Harappan courtyard. The tree's exposed root ring has generous loose earth around it, undisturbed. A guest sits on the mat outside the roots; modest water jars and old ochre homes frame the open shade. Palette: rich jade-green canopy, cool blue-green shadows, pale ochre wall, muted plum mat edge and red ceramic.

### happening_twin_workshop

Identity reference: `twin-mason-painted.png`.

Generation: `exec-331afc71-5ad1-4ba0-94db-c3647cd3580b.png`.

> Eru, a Harappan earthen mason with curly dark hair and short dark beard in a cream wrap, waits beside an old ochre workshop wall while a tiny bird carries grass into a nesting hole in its mortar. The mason takes another clear way round, leaving the occupied wall alone. Broad simple watercolor masses; palette of ochre earth, cool blue shade, green stems, muted plum door cloth.

### happening_valley_bird_return

Identity reference: `cove-watcher-ulenna-painted.png`.

Generation: `exec-e238a36f-19eb-4368-b096-02ec27745ffb.png`.

> Ulenna, a young Kia woman with warm brown skin, dark hair dressed with flowers, airy yellow wrap and bare shoulder as reference, shows an empty nest WITHOUT touching it. A second small bird carries stems into the next hollow of a low coastal nesting shelf. She stands on the marked path, leaving both nests undisturbed. Palette: blue-grey cliff, turquoise cove, golden yellow dress, magenta flowers, soft green coastal growth.

### happening_valley_reed_return

Identity reference: `reedwright-irekha-painted.png`.

Generation: `exec-a6d1e303-a1df-43ec-b961-332e9138e31b.png`.

> Irekha, an older Kia woman with grey hair dressed with marsh flowers, warm brown skin and light yellow airy drape, points beside a reed drying frame to a NEW living reed and its root beside an old cut stem. She teaches a visitor to leave the root while taking only cut stems. Water and a small reed-boat repair nearby. Palette: fresh emerald reeds, turquoise water, indigo shadows and yellow cloth.

### happening_valley_tide_room

Identity reference: `cove-watcher-ulenna-painted.png`.

Generation: `exec-4f6fa25e-5f5d-44ca-a8ff-594094330e02.png`.

> Ulenna, a young Kia woman with dark flower-dressed hair and a light yellow wrap, moves one pace BACK on a dry coastal path while tidewater slides beneath a low nesting shelf. Birds remain quietly in their hollows. Respectful still observation, no boats entering nesting space. Palette: cobalt/turquoise tide, violet-grey rock, green reeds, yellow dress and small pink flowers.

### happening_valley_seam

Identity reference: `reedwright-irekha-painted.png`.

Generation: `exec-37236247-d685-4067-b1ef-0758c08a3286.png`.

> Irekha, an older Kia woman with grey floral hair, warm brown skin and airy yellow wrap, gently presses a repaired reed-boat seam into the clear shallows. Individual lashed reed bundles flex while the water stays outside; her hands rest on the little boat, never uprooting the living reed bed. Palette: golden reeds and dress, bright turquoise shallows, indigo cool shade, lilac marsh flowers.

### happening_valley_windbreak

Generation: `exec-213e2df4-517e-4a97-9c4e-25876218a393.png`.

> A low weathered earthen windbreak at the Gedrosian edge of the valley. Thin streams of windblown sand skim the open dune on one side; sheltered old footprints retain their edges on the quiet side. A distant naturalist reads the tracks without trampling them. A few compact blue-green cacti and dry grass. Palette: coral and gold sand, cool lavender shadow, teal cactus, clear blue sky.

### journey-aravali-twins

Generation: `exec-3bea694a-4cd2-4128-88b0-52cb23e7eb6b.png`.

> Wide map-entry journey panorama: a modest wooden cart drawn by a large flightless ostrich/emu comes down from violet-grey Aravali foothills toward the green Saraswati valley. Ochre Harappa stands upstream west of the blue river, red-brick Mohenjodaro downstream east, separate road and light tram rail cross on a simple causeway. Tiny travellers, living courtyards and planted old rooms. Palette: lavender hills, indigo river, emerald margin, ochre and red brick, pale pink-blue sky. Cozy welcoming travel banner, no modern train.

### journey-lothal-twins

Generation: `exec-73be0536-b3e3-47d2-b9dc-f1c2d3b950cd.png`.

> Wide map-entry journey panorama from a small wooden coastal dhow with cream sail and muted indigo stripe, approaching the green Saraswati delta from the turquoise Tethys. A few Harappan sailors in varied blue/green/rust wraps, reeds and sandy coves, ochre Harappa upstream and red-brick Mohenjodaro on the opposite bank in the distance. Welcoming peaceful travel; no modern ship, no warboats. Palette: turquoise foreground sea, deep blue channels, emerald reeds, coral banks, cream sail and muted plum shade.

## Initial priority scenes and continuity edits

The initial arrival and cave drafts inherited inappropriate facial cues from a portrait-style
reference. They were corrected against Tavra/Mirlepa/Yamantaka's actual portraits before delivery.
Their earlier raw drafts remain in the generated-images history; no incorrect draft is shipped.

### happening_twin_arrival

Accepted generation: `exec-4dacb76f-3f28-4202-b06f-20aa07dda827.png`.

> A landscape4:3 cozy watercolor storybook event card for a peaceful naturalist JRPG set in a fictional living Harappan river valley. Soft broad watercolor washes and spare fine ink, simple readable shapes, gentle everyday scene. Reference is style only: do NOT copy the man into the scene. WIDER VARIETY OF COLOURS with clear warm/cool separation; retain blue sky, cool shade, green plants and differently dyed cloth rather than bathing everything in sepia/yellow. A few coordinated dominant hues plus restrained accents, no excessive detail or photoreal skin. Main action centered with margins for a512x384 card crop. No text, labels, border, UI, weapons or combat. Scene 'Two Cities, One Crossing': wide welcoming view on arriving at the Harappan tram yard. A small ostrich visibly pulls a simple wooden passenger tram beside a separate pedestrian road across a modest river causeway. Ochre earthen city of Harappa on the upstream west bank, red brick Mohenjodaro downstream on east bank. Living courtyards, trees growing among old rooms, green river margin and pale arid hills. A distant local station keeper in muted blue points out the separate road and railway to one traveller. Clear actual river and delta beyond. Palette: rich indigo-blue river, teal reeds, terracotta and ochre buildings, cream sunlight and pink-blue sky. Architecture simple ancient brick/earth, no grand pyramids or modern locomotive.

Continuity edit:

> Edit FIRST reference arrival painting. Keep its bright blue river, teal greenery, separate road and ostrich tram, cities, people placement and cozy watercolor composition. Correct ONLY the foreground STATION KEEPER man pointing out the way: he is TAVRA, not Priest Kang. Match the SECOND reference portrait: mature Harappan man with short salt-and-pepper cropped hair, thick grey moustache, no beard, NO headband or medallion, ordinary cream wrap with muted indigo shoulder cloth, NOT Priest Kang's trefoil dress. Keep the traveller and tram unchanged. Warm brown skin. Wider colours, simple cozy watercolor, no text, landscape4:3.

### happening_twin_beedu_flight

Accepted generation: `exec-46c454ba-da33-41bf-99f9-06f812881fa7.png`.

> A landscape4:3 cozy watercolor storybook event card for a peaceful naturalist JRPG set in a fictional living Harappan river valley. Soft broad watercolor washes and spare fine ink, simple readable shapes, gentle everyday scene. Reference is style only: do NOT copy the man into the scene. WIDER VARIETY OF COLOURS with clear warm/cool separation; retain blue sky, cool shade, green plants and differently dyed cloth rather than bathing everything in sepia/yellow. A few coordinated dominant hues plus restrained accents, no excessive detail or photoreal skin. Main action centered with margins for a512x384 card crop. No text, labels, border, UI, weapons or combat. Scene 'A Shadow Leaves the Sand': ONE pale flying stingray (a beedu) has lifted gently from pale rose-ochre desert sand beside the turquoise Gedrosian coast. Match the SECOND reference's graceful manta/stingray silhouette and trailing tail, painted as a gentle natural animal, not a bird or dragon. Curved broad wings riding air almost still; distinct soft ray-shaped shadow follows dune and hollow BELOW it on the sand. Small settling sand plume at emergence point. A tiny distant naturalist stands respectfully watching, not riding or chasing. Wide blue sea and cool cobalt shadow contrast with coral/rose dunes, pale mint animal, muted-green coastal scrub. Peaceful wonder, not a battle. Only one beedu.

### happening_twin_cave_arrival

Accepted generation: `exec-431cf038-4424-491f-9056-7cf8ad52d701.png`.

> A landscape4:3 cozy watercolor storybook event card for a peaceful naturalist JRPG set in a fictional living Harappan river valley. Soft broad watercolor washes and spare fine ink, simple readable shapes, gentle everyday scene. Reference is style only: do NOT copy the man into the scene. WIDER VARIETY OF COLOURS with clear warm/cool separation; retain blue sky, cool shade, green plants and differently dyed cloth rather than bathing everything in sepia/yellow. A few coordinated dominant hues plus restrained accents, no excessive detail or photoreal skin. Main action centered with margins for a512x384 card crop. No text, labels, border, UI, weapons or combat. Scene 'Room Beside the Fire': northwestern high camp at a cave mouth among slate-grey dry highland rocks. TWO friendly fictional Denisovan men with fair Tibetan-inspired faces and Kalash-inspired woven highland clothes: Mirlepa has ONE head and sits cross-legged at the cave side; Yamantaka has exactly THREE separate natural heads on ONE torso, and gestures to a low open sheep-fold boundary keeping the entrance clear. Both fully clothed, no weapons or monster menace. Small prayer flags, a compact terracotta insulated camp cooker and modest stone fire ring, bowls and a spare mat invite the visitor. Tiny helper cooking in background. Palette: cool slate blue rocks, teal and plum woven clothes, green/red/blue flags, warm orange fire and cream sunlight. Cozy watercolor rendition of these people, not anime; clearly readable three heads on Yamantaka, not three separate standing men.

Continuity edit:

> Edit FIRST reference cave welcome painting. Keep cozy watercolor, cool slate rocks, bright blue sky, prayer flags, cooker, fire, sheep fold, three-head anatomy, people placement and composition. Match the two permanent cave residents to SECOND and THIRD portrait references. LEFT seated Mirlepa is a FAIR-SKINNED Tibetan-inspired fictional Denisovan with long dark hair, a woven geometric cap, braided locks, neat beard, reserved expression, cream woven wrap and muted olive green highland shawl. LARGE three-headed Yamantaka has THREE FAIR-SKINNED Tibetan-inspired stern but welcoming clean-shaven angular faces on ONE torso, long dark hair, strong brows, blue/teal robe with cream and ochre Kalash-inspired geometric trim. Remove Yamantaka's generic smiling beards and topknots; keep all THREE heads clearly visible. Reference2 controls Mirlepa identity, reference3 Yamantaka. Use cozy watercolor rendition here, not anime linework. Only change these two identities and clothes, preserve palette variety, no text. Landscape4:3.

## Dry-country NES props

Raw generation: `exec-a09575a3-ad0b-4885-b61f-e8612b9d40a0.png`.
Compact tracked source: `assets/source/twins/dry-props-nes-jrpg.png` (64×64 RGBA).
Runtime: `assets/twins/dry-props-nes-jrpg.png` (128×128 RGBA, four 64px cells).
Imported with `import_sheet(...,2,2,32,32)` from `tools/import-fauna-jrpg.py`.

> Create ONE transparent game prop atlas, exact art direction 'nes jrpg sprite'. EXACT grid2columns by2rows. Top left: one small blue-green branching desert cactus with two arms. Top right: small round jade-green flowering cactus with one magenta flower. Bottom left: little golden dry-grass tuft with muted olive tips. Bottom right: tiny cluster of two rust-red and slate-blue desert stones. Cute simple quality8bitNES JRPG map sprites, broad obvious pixel clusters, warm dark outlines, few shades per material, no tiny spines or surface noise, not detailed SNES. Slightly overhead top-downJRPG view. Each designed natively32x32pixels, fully visible with huge transparent margins/gutters, consistent baseline and scale. No painted background, no cast shadow, no glow, no text or labels. Reference is for chunky sprite simplicity ONLY, no people.

## Interaction and scenery behavior

The profile continues to hide an unlearned name in the visible heading, but passes the full
stable identity to the portrait selector, matching events and People. Thus introduction never
rerolls the face or reveals the name early. The tram now uses the shared 240ms/tile viewing pace
instead of the valley's 100ms override: 2.4× viewing time, unchanged route/fare/journey-time rules.

Shared cliff geometry and old decor are filtered away from roads/rail, buildings and place courts.
Cave clearance includes the four-tile walking/resting area. One small ground prop per selected
tile, with sparse cactus/grass/stone placements in dry country. Building placements remain an
unchanged prefix of the original scene plan; only new landscape accents are appended.


## Phase checks

Typecheck and 1,322 combined content/UI/art/scene checks pass. Restoring the old portrait
redaction makes the new global continuity regression fail; source is restored immediately before
the complete passing run. Scene checks retain the entire original placement prefix and protect
paths/courts/cave space. RGB/RGBA checks verify preferred paintings and source-preserving props.

Production build and unchanged bundle budgets pass: initial app 219.6 KiB gzipped (220 KiB cap).
Journey UI now loads on travel as a separate 1.1 KiB chunk, with the existing blocking road modal
while loading. The dry-prop atlas is 6,024 bytes and uses already-loaded shared cliffs/decor.
The twenty-one 512px paintings total 9,038,864 bytes and load through their card/arrival slots;
raw generations and review composites are not tracked. Beedu's accepted map sprite hash remains
`DDD7D7029F8B9051C172D4DD31E47B8AB3680058BE370D0F255D1A874A1D330F`.
All six targeted browser cases pass: three travel-flow cases and three valley cases, including
the tram duration/animation in both directions and its nighttime rest. Full exact-head CI and
final integrated visual/performance review remain required.
