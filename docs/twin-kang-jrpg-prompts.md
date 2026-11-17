# Priest Kang — NES JRPG character and bust

Owner update, 17 November 2026. Follow [the element guide](art-direction.md).

Kang's overworld character and all three quest bust stages use the exact **“nes jrpg sprite”**
direction. Large expressive head, compact body, short dark beard, broad jaw, narrow headband
with a round ornament, cream single-shoulder wrap and a few broad terracotta cloak marks.
The finished bust repeats those features in sandstone tones. It is a head-and-upper-chest bust
on a modest plinth, not a full-body statue. The first two frames remain the empty plinth and
partly carved likeness, preserving the existing optional quest and saved flags.

**Portrait status:** no `src/ui/portraits/priest-kang*.png` exists in this revision. Conversation
uses the language-coloured SVG fallback from `PersonPortrait.tsx`, not a dedicated painted face.
Kang's reference-checked watercolor portrait remains one of the original plan's 39 outstanding
illustrations. The new sprite face is a map design, not a completed archaeological portrait study.

## Exact generation prompts

Built-in imagegen, true transparent background. Character style reference:
`assets/source/twins/people/twin-gardener-nes-jrpg.png`. Bust reference: the newly generated Kang
sheet. Raw originals and previews stay in ignored `dump/twin-city-art-review/kang/`.

### Character

> Create one transparent game character sprite sheet, exact art direction 'nes jrpg sprite'. Cute high-quality simple NES JRPG overworld character Priest Kang, adult Harappan man with warm brown skin, broad handsome square jaw, strong cheekbones, short neat dark beard, slicked dark hair, narrow terracotta headband with one round central gold ornament, cream one-shoulder shawl with ONLY three simple terracotta trefoil motifs and cream wrap skirt, plain sandals. Design evokes the archaeological Indus Priest-King bust with a strong confident face, but friendly and cute. Reference image is ONLY for chibi proportions, palette simplicity, chunky pixels. Big expressive round head, short compact body and limbs, warm dark outline, minimum tiny detail. Exact 4 columns by 5 rows grid with generous fully transparent gutters. Row 1 FOUR SOUTH/front-facing walk frames. Row 2 FOUR NORTH/back-facing walk frames, show back of head and garment, NO face. Row 3 FOUR EAST/right profile walk frames. Row 4 FOUR WEST/left profile walk frames. Row 5 FOUR cross-legged seated poses in this exact column order: NORTH/back, SOUTH/front, WEST/left, EAST/right. Twenty full-body poses of the SAME person and outfit, coherent face/scale, consistent ground line. Native design target26x40 pixels per pose; use large clean pixel clusters, no painted softness, no halo, no gradients, no text, no labels, no shadows or coloured background. Person only, no pedestal or scenery. Keep all heads hands feet inside cells.

### Bust stages

> Create ONE transparent pixel-art game prop atlas in the exact style 'nes jrpg sprite', matching reference character Priest Kang. EXACT 3 COLUMNS, ONE ROW, three separate sprites with generous transparent gutters. Left cell: EMPTY low square sandstone plinth. Middle cell: same plinth carrying a partly carved shoulder-height stone bust, face roughed in, one small cream cloth draped over one side. Right cell: same plinth carrying the COMPLETED life-size bust of Priest Kang, only HEAD AND UPPER CHEST not a full body: broad handsome square jaw, short neat carved beard, slicked hair, narrow headband with a round central ornament, broad one-shoulder cloak with ONLY two or three big simple trefoil marks. His head and clothes match reference; ALL statue parts are warm sandstone cream/tan/ochre, not brown skin or black living hair. This is an affectionate cute NES JRPG statue with big recognizable head, calm slightly narrowed eyes and confident gentle face. THREE stages align at same scale, plinth footprint and baseline. Native logical cell32x40 pixels: large crisp pixel clusters, very simple silhouette, warm dark outline, only broad material shadows, no fine carving texture, no surface noise, no tiny decorations, no soft glow or gradients, no words text labels, no people standing beside it. Three-quarter slightly overhead JRPG view. Entire sprites fully visible, isolated on true TRANSPARENT background. Keep the bust itself life-size relative to a small chibi map person, pedestal modest, no giant monument.

## Rebuild and frame contracts

- Character source: `assets/source/twins/people/priest-kang-nes-jrpg.png`, 104×200 RGBA,
  four columns and five rows. Walking rows south, north, east, west; seated row north, south,
  west, east. `tools/import-jrpg-sheet.py` imports the raw sheet with cropping/point resizing.
  `node tools/build-twin-people.js priest-kang` rebuilds the twenty-frame 520×40 runtime strip.
- Bust source: `assets/source/twins/kang-bust-nes-jrpg.png`, 96×40 RGBA, three 32×40 cells.
  `tools/import-fauna-jrpg.py`'s `import_sheet` imports a three-column, one-row sheet.
  `node tools/build-twin-stories.js` copies these samples at exact 4× scale into frames 0–2 of
  `assets/twins/stories-nes.png`. Existing cave, fold, hearth and sand frames 3–6 stay unchanged.
- Render the bust at the same logical-pixel scale as resident people (the atlas has 4× source
  pixels, so its display scale is `travellerScale(TILE_SIZE)/4`). This keeps it life-size instead
  of expanding the head-and-chest likeness into a tile-sized monument.
- Every crop/resize preserves sampled colour and alpha. No quantization, palette reduction,
  alpha cleanup, dithering or extra sprite effects. Runtime dimensions and actor counts stay fixed.
- Kang's resident facing matches his generated south/north/east/west rows. Cave walking now also
  uses those correct directional rows; seated poses remain the generated front-facing frames.

Phase verification: 44 focused unit/frame/map/RGBA checks and typecheck pass. Production build
and bundle budgets pass. The existing cave/hearth/fold/sand pixels are unchanged by the builder;
Beedu retains its accepted hash. The preceding cave phase's PR CI is green at `ed8326e`.
Fresh exact-head CI is required for this Kang update before merge.
