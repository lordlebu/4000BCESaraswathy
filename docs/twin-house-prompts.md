# Twin-city house sources

> **Current checkpoint - 18 November 2026:** Muted sage is approved; terrain softening, shrubs, slow cave walks and bounded ambience are implemented. Required illustration backlog: **0**. [Current completion audit](twin-cities-art-status.md) and [terrain decision/evidence](twin-terrain-softening.md) override earlier dated counts and production instructions below.

> **Current art forms (17 November 2026):** Follow [the element-by-element guide](art-direction.md#current-element-by-element-direction--17-november-2026). New overworld people, wandering animals and trams use **“nes jrpg sprite”**; Beedu alone keeps its accepted small SNES art. Terrain/buildings remain simple NES; off-map portraits/events/places/plates remain painted, with the two Denisovan portrait exceptions. Older prompts below are production history where they conflict; new delivery uses resize only, without colour reduction.

The owner requested simpler SNES art after seeing the detailed versions. The default builder
now writes `assets/twins/homes-snes.png`, the runtime atlas: a 32×36 logical grid, four-pixel
clusters and a 14-colour material palette. Source areas are averaged before quantisation to
avoid turning tiny brick marks into noise. `--detailed` reproduces the retained earlier atlas;
the generation prompts below are historical source prompts, not the detail target for future art.

Generated with the built-in image tool. Both transparent sources are retained under
`assets/source/twins/`. Build with `node tools/build-twin-homes.js` to produce
`assets/twins/homes-painted.png`: two baseline-aligned 128×144 frames.
The builder crops to the opaque silhouette and fits its aspect ratio onto a two-pixel grid.

## Harappa: harappa-home.png

```text
Use case: stylized-concept. Asset type: single production building sprite for a top-down SNES RPG set in invented ancient South Asia. A Harappa ochre earthen courtyard house, low L-shaped compound around an open little yard, flat parapet roofs, shaded dark doorway on front, roof access steps at side, worn plaster exposing a few mud bricks, reed awning, two terracotta storage jars and a tiny planted niche. Elevated three-quarter overhead view with horizontal front wall; not an isometric diamond. Detailed crisp 16-bit pixel art, stepped tonal ramps, coherent pixel clusters, muted sand/ochre/olive colours, warm cream upper-left light and plum-brown recesses. A humble working home, no palace, temple or modern features. One compact silhouette centered with real alpha transparency and modest transparent padding. Entire roof, stairs and base visible. Building fills almost all the canvas. No ground tile, landscape, sky, people, text, caption, border, grid, guides, logo, signature or watermark. Front doorway large enough to read at 100px building height.
```

## Mohenjo-daro: mohenjodaro-home.png

```text
Use case: stylized-concept. Asset type: single production building sprite for a top-down SNES RPG in invented ancient South Asia. A Mohenjo-daro fired-brick courtyard house, compact squared two-level silhouette, low flat parapet roof enclosing an open rooftop drying court, clear front doorway under a small timber lintel, side steps, narrow screened window, chipped brick courses, water-darkened lower masonry, a pottery jar and reed basket near the entrance. Elevated three-quarter overhead view with horizontal front wall; not an isometric diamond. Detailed crisp 16-bit pixel art, stepped tonal ramps, coherent clusters, muted terracotta and russet brick with cream upper-left lighting, warm plum-brown recesses and a tiny sage textile accent. Humble inhabited working house, no temple, palace, modern features or elaborate ornament. One compact silhouette centered on true alpha transparency with modest padding, whole roof and base visible, building fills nearly all canvas. No ground tile, landscape, people, sky, text, caption, frame, grid, guides, logo, signature or watermark. Front doorway readable at 100px building height.
```
