# Painted portraits

**This folder is written by a build step. Do not drop generated art in here** — put it in
`assets/source/portraits/` and run:

```bash
node tools/build-plates.js --portraits
```

That squares the image, strips a painted frame if a tool added one, drops the bottom strip a
watermark sits in, resizes to 256px, and writes the file here under the right name. Nothing else to
do: no list to update, no code to change.

    assets/source/portraits/Grok portrait-thrali.png   ->   src/ui/portraits/thrali.png

It is the same tool as the species plates, with `--portraits` swapping the folders and the size.
A portrait *is* a plate of a person: decoding whatever PNG a tool emitted, finding a painted frame,
squaring and resampling are identical work, and that code has already been beaten into shape by
three image tools disagreeing about all of it. A second copy would mean fixing the next
border-detection bug twice.

## Why it matters where they go

`src/ui/portraits.ts` globs *this* directory, so anything sitting here is bundled. A raw straight
from an image model is 2–8 MB against the ~60 KB of a built portrait, and it lands under a name like
`grok portrait-thrali` that no person will ever look up — so it ships megabytes and draws nothing.
That happened three times with plates, which is why the build now sweeps raws out of the output
folder and back into the intake, and why `test/portraits.test.ts` fails on one.

**The name is the person, without canon's prefix.** Canon calls the fisher `npc_thrali`, and unlike
species that id is *not* rewritten on the way in — so `npc_thrali.png` would look right and match
nothing. The file is `thrali.png`. `portraitName()` in `portraits.ts` is the single place that rule
lives, and the test checks every file in here names somebody real.

Anybody without a portrait keeps their drawn silhouette, which is the point of having one — see
`src/ui/PersonPortrait.tsx`. It is built from what canon records and nothing else: ink by language,
tool by trade, and nobody made a wise elder.

See `docs/portrait-prompts.md` for what to ask an image model for.
