# Kang — light indigo and cozy watercolor update

Owner update, 17 November 2026. Style reference: `exec-ad76b05a-607c-4b1a-b4b8-d00b7ef007c3.png`
from the supplied local generated-images folder. The reference controls watercolor style;
Kang's established sprite controls identity. His new portrait then controls both event cards.
The map bust remains carved sandstone. The live character always wears light indigo.

## Exact prompts

### Indigo NES JRPG character

> Edit the SECOND reference character sprite atlas only, using FIRST reference as context only. Preserve exact 4-column by5-row twenty-pose layout, every facing, animation, cute face, beard, headband, skin and proportions. Change Priest Kang's cream dress and wrap skirt to LIGHT INDIGO: airy pale lavender-blue naturally dyed cloth with muted darker indigo fold shadows and few simple darker indigo trefoil motifs. His skin stays warm brown. Exact art direction 'nes jrpg sprite'. Keep chunky simple 8-bit pixels, not painted. Walking rows south,north,east,west; seated row north,south,west,east. Fully transparent background, generous transparent gutters separating5rows and4columns, no halo, no labels. All twenty poses remain same person wearing same light indigo dress. Logical target26x40 per pose. No new props. Render the sprite atlas ONLY.

### Conversation portrait

> Paint a square head-and-shoulders conversation portrait of Priest Kang for a cozy naturalist game. FIRST reference controls simple cozy watercolor and fine ink on warm cream paper, warm sunlight, restrained earth colours, gentle broad washes, uncluttered leafy Harappan courtyard background. SIMPLIFY the reference's tiny photographic texture, soft storybook watercolor, not anime, not pixel art. SECOND reference controls identity only: adult Harappan man warm medium-brown skin, handsome strong square jaw and cheekbones, straight broad nose, calm slightly narrowed eyes, slicked short dark hair, short neat dark beard and moustache, narrow headband with round central ornament. His LIGHT INDIGO one-shoulder dress/cloak is the prominent colour; airy pale lavender-blue natural-dyed cloth, a few broad subtle trefoil motifs, light indigo lower wrap implied. Do not use cream as his main dress. Friendly confident quiet smile, eye contact at slight three-quarter angle. Evoke the Indus Priest-King facial features as a fictional living character, no crown, no fantasy armor, no text or frame. Readable at native256x256 delivery, simple watercolor portrait, no microscopic detail.

### Carving event

> Create a wide4:3 event-card watercolor painting for a cozy peaceful naturalist JRPG. FIRST reference controls warm cream paper, cozy simple watercolor with loose fine ink and broad gentle washes; simplify detail and tiny texture, NOT pixel art, NOT anime. SECOND reference controls Priest Kang's face and LIGHT INDIGO one-shoulder dress exactly: warm brown Harappan man, short dark beard, square jaw, slicked dark hair, headband with round medallion. He wears pale lavender-blue indigo cloth with subtle broad trefoil motifs. Ancient Harappan brick architecture, no fantasy crown, no modern tools, no text, no labels, no graphic border. Readable at512x384 delivery. Keep important faces and action within central80percent with airy margins. Scene: A Face Coming Out of Stone. A local Harappan stone carver works gently with a small chisel and wooden mallet on a pale sandstone life-size head-and-shoulders bust of Kang in a shady open-sided earthen workshop. Kang sits nearby in his light indigo dress, watching his likeness with a gentle smile. The bust repeats his short beard, headband and one-shoulder cloak in carved sandstone, NOT living skin or indigo painted stone. The bust on a low bench has a partly roughed shoulder, its face almost complete. A clay study and reused brick base nearby explain the craft. One other maker steadies the modest base. Quiet collaborative afternoon, warm indirect sunlight, simple clear composition with carver/bust/Kang focal triangle, respectful believable hands, no violence, no giant monument.

### Unveiling event

> Create a wide4:3 event-card watercolor painting for a cozy peaceful naturalist JRPG. FIRST reference controls warm cream paper, cozy simple watercolor with loose fine ink and broad gentle washes; simplify detail and tiny texture, NOT pixel art, NOT anime. SECOND reference controls Priest Kang's face and LIGHT INDIGO one-shoulder dress exactly: warm brown Harappan man, short dark beard, square jaw, slicked dark hair, headband with round medallion. He wears pale lavender-blue indigo cloth with subtle broad trefoil motifs. Ancient Harappan brick architecture, no fantasy crown, no modern tools, no text, no labels, no graphic border. Readable at512x384 delivery. Keep important faces and action within central80percent with airy margins. Scene: A Likeness With Room Around It. In Harappa's living courtyard beneath a neem tree, the completed life-size sandstone head-and-upper-chest bust of Priest Kang stands on a modest low reused-brick plinth, outside the tree root ring. Kang in light indigo dress stands beside it, clearly recognizable as the sitter; the statue repeats his face/headband/beard/cloak in stone tones. A Harappan woman gardener in muted green and a local maker admire the work, another resident sits peacefully beside water jars in the shade. Clear wide walking passage, roots undisturbed. Soft morning sunshine, gentle shared satisfaction, ordinary welcoming civic life rather than a royal ceremony, no crowd or banners, no oversized statue. Loose cozy watercolor with restrained earth palette and light indigo focal cloth.

## Delivery and wiring

- Character raw `exec-c43e0cf2-ac5a-4e17-b683-ed08b43161e5.png`; compact RGBA source and runtime
  twenty-frame strip replace Kang's previous cream clothing using crop/nearest-neighbour resize.
- Portrait raw `exec-12719a34-8e09-4302-af85-708960758556.png`, delivered at 256×256 as
  `src/ui/portraits/priest-kang-painted.png`.
- Carving raw `exec-fe6dcc95-6c2c-419d-a2e3-bee7b2a3dd0d.png`, delivered at 512×384 as
  `src/ui/events/story-storyline_twin_kang_bust-carving-painted.png`.
- Unveiling raw `exec-8666ea6d-463a-4f25-b46d-f02fffcc9714.png`, delivered at 512×384 as
  `src/ui/events/story-storyline_twin_kang_bust-unveiling-painted.png`.
- Large raw paintings stay under existing ignored `assets/source/portraits/` and `assets/source/events/`;
  sprite raw stays under ignored `dump/twin-city-art-review/kang/`. Track only compact runtime art,
  the compact sprite source and this production ledger.
- Rebuild portrait with `node tools/build-plates.js --portraits --full-colour --only=priest-kang-painted`.
  Rebuild each event with `--events --full-colour --only=<filename without .png>`.
  No palette reduction, quantization or lossy image compression. Existing accepted images remain.
- `portraitFor('npc_priest_kang')` automatically prefers the new named portrait.
  `beatEvent` now supplies a beat-specific art variant when canon has no explicit artwork.
  EventCard resolves that variant before its shared arc/arrival fallback; canon's explicit art
  stays authoritative. No extra quest is added and no story prose is duplicated or rewritten.


## Statue material correction — owner review, 17 November 2026

The earlier paintings made the bust's hair/beard/eyes too lifelike. Owner requested obvious
coloured stone, then lapis lazuli eyes and basic paintwork for the final unveiling only.
The carved hair and beard stay unpainted pale stone in both stages. Final mineral eye inlays
and sparse ochre/indigo accents are decorative presentation, not new quest resources.
Existing pre-edit runtime and raw versions remain under ignored
`dump/twin-city-art-review/kang/stone-correction/`; original tool generations remain in their
existing generated-images location. User explicitly requested correction of the two named
paintings, which remain registered under the same runtime filenames.

### Carving edit

> undefined

### Unveiling edit

> undefined


Corrected generation outputs: carving `exec-33eb0d7b-3587-4ccf-ac6d-b32ad9bd9af8.png`;
unveiling `exec-7b04819d-35df-43f0-9881-78add1950e02.png`. Rebuilt at the same 512×384,
full-colour, with unchanged filenames and quest wiring. Future scenes additionally follow
[broader colour variety](art-direction.md#colour-variety--owner-update-17-november-2026);
this focused correction preserves the existing scenes' composition and living characters.
