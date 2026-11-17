# Twin-city portrait prompts

> **Current art forms (17 November 2026):** Follow [the element-by-element guide](art-direction.md#current-element-by-element-direction--17-november-2026). New overworld people, wandering animals and trams use **“nes jrpg sprite”**; Beedu alone keeps its accepted small SNES art. Terrain/buildings remain simple NES; off-map portraits/events/places/plates remain painted, with the two Denisovan portrait exceptions. Older prompts below are production history where they conflict; new delivery uses resize only, without colour reduction.

## Final Kia costume correction — controls earlier prompts

Owner corrected the generic tribal treatment: use existing Kia portraits as visual references,
less clothing, airy draped wraps and flowers rather than heavy embroidered shawls. Preserve ages
and individual faces. Built-in edits accepted into the same named runtime portraits; earlier raw
candidates remain in ignored storage. These prompts supersede the earlier Kia revision prompts.

### reedwright-irekha

Reference: `src/ui/faces/kia-f-01.png`.

```text
Use case: identity-preserve. Image 1 is the edit target: Irekha, adult Kia reedwright around 65. Image 2 is the EXISTING KIA clothing/style reference. Preserve Irekha's face, age, grey braid, dark skin, working needle and reed-river background, with the game's watercolor-and-ink style. Correct her costume to match the reference culture: LESS clothing, lightweight plain olive/ochre wrapped cloth across the chest with one bare shoulder and visible collarbones, a simple lower neckline with tasteful natural cleavage, chest remains covered. Remove heavy cream shawl, thick embroidered borders and forehead band. Add a small loose spray of white marsh flowers tucked into her grey braid and simple shell hair pins, with very restrained beads. She is a mature practical delta craftswoman, not a mountain villager. Match the light open draping, flowers and carefully dressed hair of the Kia reference while preserving her individual identity. Same muted cream/olive/ochre palette. No modern clothes, anime, headdress, gold or text. Square face-and-shoulders crop.
```

### cove-watcher-ulenna

Reference: `src/ui/faces/kia-f-02.png`.

```text
Use case: identity-preserve. Image 1 is the edit target: Ulenna, adult Kia cove watcher aged 28. Image 2 is the EXISTING KIA portrait reference for clothing and hair. Preserve Ulenna's individual face, medium brown skin, cheekbones, two braids, searching expression, observation cord and feather, shoreline background, and watercolor-and-ink style. Correct her costume: LESS clothing, lightweight slate blue wrapped chest cloth with one bare shoulder, bare collarbones and a simple lower neckline with tasteful visible natural cleavage, chest remains covered. Remove heavy cream undergarment, bulky shawl, elaborate embroidered borders and forehead band. Match the reference's airy open draping and marsh flowers in carefully arranged hair: a small red-and-white flower cluster tucked beside one braid, shell hair pins, a few shell beads. A practical delta worker, not a mountain villager. Retain slate blue/cream/ochre earth colours with only the small flower accent. Face-and-shoulders square portrait. No anime, modern clothes, text or watermark.
```


## Revised character directions — 17 November 2026

Built-in imagegen only. Palette retained; selected outputs resized to 256×256 using
`node tools/build-plates.js --portraits --only=<id>-painted --full-colour --force`.
No colour quantization or dithering. Earlier Kia prompts above are retained as production history;
the following edits control the shipped portraits.

### reedwright-irekha-painted

```text
Use case: identity-preserve. Edit this portrait of Irekha, an older adult Kia reedwright. Preserve her exact face, age, deep brown skin, grey braid, expression, reed-working needle, river background, naturalistic watercolor and fine ink style, cream/ochre/olive palette and square composition. Change only dress/accessories to more visibly tribal Kia craft clothing: a broad handwoven geometric ochre-and-olive border along the cream shawl, a narrow woven hair band, a few small shell beads woven into the braid and a short plain bone-bead necklace. Keep practical worker clothing and modest coverage. Individual fictional Kia design, not a caricature. Broad simple patterns readable at 256px. Do not turn her into anime. No gold, text, watermark or modern objects.
```

Selected raw: `exec-5606a101-627c-46e4-b9d0-cfc0f7d717ac.png`.
Delivery: `src/ui/portraits/reedwright-irekha-painted.png`.

### cove-watcher-ulenna-painted

```text
Use case: identity-preserve. Edit this portrait of Ulenna, an adult Kia cove watcher. Preserve her exact face, medium brown skin, cheekbones, two dark braids, searching expression, feather and observation cord, shoreline background, naturalistic watercolor and fine ink style, cream/ochre/slate-blue palette and square composition. Change only dress/accessories to more visibly tribal Kia craft clothing: handwoven geometric cream-and-ochre edging on her slate blue shoulder cloth, a narrow braided forehead band, shell and dark wooden beads on the lower braids and a small simple shell necklace. Practical modest working clothes, weather-worn natural fibres. Individual fictional Kia design, not a caricature. Broad simple patterns readable at 256px. Do not turn her into anime. No gold, text, watermark or modern objects.
```

Selected raw: `exec-7743ceed-cf00-4ef0-a922-af4bccf46308.png`.
Delivery: `src/ui/portraits/cove-watcher-ulenna-painted.png`.

### mirlepa-painted

```text
Use case: stylized-concept. Square NPC dialogue portrait for Varuna's Field Diary. Requested JoJo's Bizarre Adventure anime style: powerful angular facial construction, graphic ink hatching, sculptural cheek planes, expressive composed eyes, bold cel shadows, elegant dramatic pose. Retain the reference palette exactly in spirit: warm cream paper, muted terracotta and ochre, olive green, slate indigo, brown skin; no neon. Fictional Denisovan individual inspired by Tibetan highland and archaic-human features: Tibetan-inspired eyes and cheekbones, broad midface, robust brow, broad nose, fair light-beige complexion with cool rosy highland cheeks. Distinct ethnicity from the Harappan cast, not a generic modern anime face. Kalash-inspired woven bands and layered highland dress, shell/bone ornaments, no gold. Simplify detail so a resized 256px portrait reads cleanly, broad colour shapes. No lettering, border, watermark, modern accessories, weapons or photorealism. Image 1 is a palette reference only, do not copy its man. Subject: Mirlepa, adult male peaceful meditating hermit, mature with dark beard and long dark hair, woven cap, olive and cream layered wrap with restrained rust geometric woven edging. One head, calm half-closed eyes, imposing square jaw, peaceful dignified expression. Head and shoulders with the whole head and cap visible, slightly three-quarter, quiet shaded cave background.

Final revision:
Edit target: Mirlepa portrait. Make his skin clearly fair light beige with cool rosy cheeks, and his facial features more Tibetan-inspired: pronounced high cheekbones, Tibetan-inspired eye shape and broad midface, while retaining a robust archaic brow and broad nose. He is a fictional Denisovan adult highland hermit. Preserve the JoJo's Bizarre Adventure anime style, angular ink hatching, calm expression, beard, hair, woven cap, Kalash-inspired clothing, shell necklace, cave background and exact composition. Keep clothing/background in the existing muted ochre/olive/cream earth palette. Skin must be noticeably lighter, not orange or tanned. No text or watermark.
```

Selected raw: `exec-dbd3a642-6d70-4a9b-beed-c6afd2494950.png`.
Delivery: `src/ui/portraits/mirlepa-painted.png`.

### yamantaka-painted

```text
Use case: stylized-concept. Square NPC dialogue portrait for Varuna's Field Diary. Requested JoJo's Bizarre Adventure anime style: powerful angular facial construction, graphic ink hatching, sculptural cheek planes, expressive composed eyes, bold cel shadows, elegant dramatic pose. Retain the reference palette exactly in spirit: warm cream paper, muted terracotta and ochre, olive green, slate indigo, brown skin; no neon. Fictional Denisovan individual inspired by Tibetan highland and archaic-human features: Tibetan-inspired eyes and cheekbones, broad midface, robust brow, broad nose, fair light-beige complexion with cool rosy highland cheeks. Distinct ethnicity from the Harappan cast, not a generic modern anime face. Kalash-inspired woven bands and layered highland dress, shell/bone ornaments, no gold. Simplify detail so a resized 256px portrait reads cleanly, broad colour shapes. No lettering, border, watermark, modern accessories, weapons or photorealism. Image 1 is a palette reference only, do not copy its man. Subject: Yamantaka, adult male Denisovan cave guardian with exactly THREE distinct physical heads on ONE broad torso, like Svetovid, not three separate people. Central head forward, two side heads angled outward, all three faces and hair fully visible inside the square, separated silhouettes and robust necks. Dark shoulder-length hair, strong broad jaws, light facial stubble, attentive peaceful expressions. Kalash-inspired indigo layered coat with ochre/rust woven edging and cream scarf. Bust composition, three heads fill upper two thirds, cave stone behind. Friendly formidable presence, no violence, no supernatural aura.

Final revision:
Edit target: Yamantaka portrait. Give ALL THREE heads clearly fair light-beige skin with cool rosy highland cheeks and more Tibetan-inspired eyes and pronounced high cheekbones, retaining the robust archaic brow, broad nose and strong jaws of this fictional Denisovan adult. Keep exactly THREE physical heads on ONE torso. Preserve the JoJo's Bizarre Adventure anime style, graphic ink hatching, peaceful alert expressions, hair, Kalash-inspired indigo coat, shell ornaments, ochre woven borders, cream scarf, cave background and exact composition. Keep the clothing/background earth-tone palette; change the complexion and facial features only. Skin must be noticeably lighter, not orange or tanned. All three faces readable and uncropped. No text or watermark.
```

Selected raw: `exec-1caae372-13bc-457b-a393-7099a133c577.png`.
Delivery: `src/ui/portraits/yamantaka-painted.png`.


Built-in image generation; rich off-map watercolor portraits. These costume keys accompany the simple NES map direction. Raw outputs remain in the already ignored assets/source/portraits/; only compact delivery PNGs ship. Existing original portraits remain as fallbacks.

## Nemi: twin-gardener-painted

```text
Use case: illustration-story. Asset type: square 1024x1024 production NPC face portrait for Varuna's Field Diary, an invented ancient South Asian river-valley setting. Subject: Nemi, courtyard gardener in Harappa. A woman in her early forties with warm brown skin, a rounded face, wide-set dark eyes, thick eyebrows and dark hair in a practical high bun. Muted olive-green working wrap over cream clothing; an ochre seed pouch and one gathered sprig at the lower edge. Quiet attentive expression; a few neem leaves and ochre courtyard plaster behind her. Style: naturalistic watercolor and fine ink on warm off-cream paper, visible pigment pooling, softly modelled facial planes, restrained earth colours; richer off-map portrait art, not pixel art. Head and shoulders, three-quarter view, face large and readable in a 40px UI crop; modest fully clothed working person, quiet unposed dignity. Minimal atmospheric background. Fill canvas edge to edge. No text, frame, logos, watermark, jewellery, royal insignia, modern objects, photorealism or 3D.
```

## Seli: twin-waterkeeper-painted

```text
Use case: illustration-story. Asset type: square 1024x1024 production NPC face portrait for Varuna's Field Diary, an invented ancient South Asian river-valley setting. Subject: Seli, water keeper in Mohenjo-daro. An older woman around sixty, deep brown skin, a long narrow face, silver-threaded dark braid over one shoulder, gently hooded eyes and a thoughtful unsmiling mouth. Blue-green working wrap over undyed cloth. Hold a small plain measuring vessel at the bottom of the portrait; hints of red fired brick and shaded water behind her. Style: naturalistic watercolor and fine ink on warm off-cream paper, visible pigment pooling, softly modelled facial planes, restrained earth colours; richer off-map portrait art, not pixel art. Head and shoulders, three-quarter view, face large and readable in a 40px UI crop; modest fully clothed working person, quiet unposed dignity. Minimal atmospheric background. Fill canvas edge to edge. No text, frame, logos, watermark, jewellery, royal insignia, modern objects, photorealism or 3D.
```

## Tavra: twin-stationkeeper-painted

```text
Use case: illustration-story. Asset type: square 1024x1024 production NPC face portrait for Varuna's Field Diary, an invented ancient South Asian river-valley setting. Subject: Tavra, station keeper at Harappa's ostrich tram platform. A man around fifty with medium brown skin, a broad square face, a neat salt-and-pepper moustache and close-cropped hair greying at the temples. Plain cream clothing with a faded indigo shoulder cloth. A small unmarked clay rail token held low at the edge; a hint of reed platform shade behind him. Alert, quietly welcoming expression. Style: naturalistic watercolor and fine ink on warm off-cream paper, visible pigment pooling, softly modelled facial planes, restrained earth colours; richer off-map portrait art, not pixel art. Head and shoulders, three-quarter view, face large and readable in a 40px UI crop; modest fully clothed working person, quiet unposed dignity. Minimal atmospheric background. Fill canvas edge to edge. No text, frame, logos, watermark, jewellery, royal insignia, modern objects, photorealism or 3D.
```

## Pavi: twin-handler-painted

```text
Use case: illustration-story. Asset type: square 1024x1024 production NPC face portrait for Varuna's Field Diary, an invented ancient South Asian river-valley setting. Subject: Pavi, ostrich tram handler in Harappa. A young adult man with dark brown skin, a slim oval face, short loose curls, clean-shaven chin and an intent, lively gaze. Rust-brown shoulder wrap and cream working tunic, a plain leather harness strap over the shoulder. A single ostrich feather and a wooden harness buckle at the lower edge; reed shade behind him. No helmet or uniform. Style: naturalistic watercolor and fine ink on warm off-cream paper, visible pigment pooling, softly modelled facial planes, restrained earth colours; richer off-map portrait art, not pixel art. Head and shoulders, three-quarter view, face large and readable in a 40px UI crop; modest fully clothed working person, quiet unposed dignity. Minimal atmospheric background. Fill canvas edge to edge. No text, frame, logos, watermark, jewellery, royal insignia, modern objects, photorealism or 3D.
```

## Renu: twin-brickworker-painted

```text
Use case: illustration-story. Asset type: square 1024x1024 production NPC face portrait for Varuna's Field Diary, an invented ancient South Asian river-valley setting. Subject: Renu, brickworker in Mohenjo-daro. A sturdy woman around forty-five with sun-browned skin, a broad cheeked face, close dark eyebrows and dark hair covered by a plain folded carrying cloth. Faded terracotta working wrap, undyed tunic, brick dust at the shoulder. Hold the corner of one fired brick at the lower edge. A direct calm gaze; red brick drying court softly suggested behind her. Style: naturalistic watercolor and fine ink on warm off-cream paper, visible pigment pooling, softly modelled facial planes, restrained earth colours; richer off-map portrait art, not pixel art. Head and shoulders, three-quarter view, face large and readable in a 40px UI crop; modest fully clothed working person, quiet unposed dignity. Minimal atmospheric background. Fill canvas edge to edge. No text, frame, logos, watermark, jewellery, royal insignia, modern objects, photorealism or 3D.
```

## Hutel: twin-landingkeeper-painted

```text
Use case: illustration-story. Asset type: square 1024x1024 production NPC face portrait for Varuna's Field Diary, an invented ancient South Asian river-valley setting. Subject: Hutel, Elamite river landing keeper from the western coast, now by Mohenjo-daro. Southwestern Iranian / Susiana regional art reference, an individual rather than an ethnic stereotype. An older man around sixty with dark sun-weathered skin, a broad nose, deeply lined cheeks, cropped grey hair and short grey stubble. Muted river-blue cloth over cream linen; a plain coil of rope resting on one shoulder. A relaxed watchful expression; shaded river water and a timber landing loosely suggested behind him. Style: naturalistic watercolor and fine ink on warm off-cream paper, visible pigment pooling, softly modelled facial planes, restrained earth colours; richer off-map portrait art, not pixel art. Head and shoulders, three-quarter view, face large and readable in a 40px UI crop; modest fully clothed working person, quiet unposed dignity. Minimal atmospheric background. Fill canvas edge to edge. No text, frame, logos, watermark, jewellery, royal insignia, modern objects, photorealism or 3D.
```

## Denu: twin-maintainer-painted

```text
Use case: illustration-story. Asset type: square 1024x1024 production NPC face portrait for Varuna's Field Diary, an invented ancient South Asian river-valley setting. Subject: Denu, causeway maintainer along the Saraswati. A lean middle-aged man with medium brown sun-weathered skin, an angular face, a slightly crooked nose and a short dark moustache. Plain sun-worn ochre headwrap, off-white working tunic, muted brown shoulder cloth. A small wooden repair mallet held low at the edge. Patient focused expression; a few broad bridge timbers and river colours behind him. Style: naturalistic watercolor and fine ink on warm off-cream paper, visible pigment pooling, softly modelled facial planes, restrained earth colours; richer off-map portrait art, not pixel art. Head and shoulders, three-quarter view, face large and readable in a 40px UI crop; modest fully clothed working person, quiet unposed dignity. Minimal atmospheric background. Fill canvas edge to edge. No text, frame, logos, watermark, jewellery, royal insignia, modern objects, photorealism or 3D.
```

## Irekha: reedwright-irekha-painted

```text
Use case: illustration-story. Asset type: square 1024x1024 production NPC face portrait for Varuna's Field Diary, an invented ancient South Asian river-valley setting. Subject: Irekha, a Kia reed-boat repairer on the Saraswati bank. An older woman around sixty-five with deep brown skin, a softly rounded face, fine laugh lines, dark observant eyes and grey hair in a long low braid. Muted reed-green and ochre clothing, a simple cream shawl. A blunt wooden reed-binding needle and a few cut reeds at the lower edge. Quiet confident expression; bundled reeds and pale river light behind her. Style: naturalistic watercolor and fine ink on warm off-cream paper, visible pigment pooling, softly modelled facial planes, restrained earth colours; richer off-map portrait art, not pixel art. Head and shoulders, three-quarter view, face large and readable in a 40px UI crop; modest fully clothed working person, quiet unposed dignity. Minimal atmospheric background. Fill canvas edge to edge. No text, frame, logos, watermark, jewellery, royal insignia, modern objects, photorealism or 3D.
```

## Ulenna: cove-watcher-ulenna-painted

```text
Use case: illustration-story. Asset type: square 1024x1024 production NPC face portrait for Varuna's Field Diary, an invented ancient South Asian river-valley setting. Subject: Ulenna, a Kia cove watcher at the southern nesting shore. A young adult woman with medium brown skin, a long face, pronounced cheekbones, dark eyebrows and dark hair in two low braids. Blue-grey shoulder cloth over undyed working clothing. A white shorebird feather and knotted observation cord at the lower edge. A still, searching gaze off to one side; pale coastal water and a few reed strokes behind her. Style: naturalistic watercolor and fine ink on warm off-cream paper, visible pigment pooling, softly modelled facial planes, restrained earth colours; richer off-map portrait art, not pixel art. Head and shoulders, three-quarter view, face large and readable in a 40px UI crop; modest fully clothed working person, quiet unposed dignity. Minimal atmospheric background. Fill canvas edge to edge. No text, frame, logos, watermark, jewellery, royal insignia, modern objects, photorealism or 3D.
```
