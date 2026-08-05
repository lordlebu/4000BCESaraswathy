# Prototype Source

The browser prototype of **South of Tethys: Jambhudweepa Adventure**. Open it with `.\run` from the
repo root.

| File | Role |
| --- | --- |
| `index.html` | Canvas, controls, and journal layout. Loads `main.js` as a module. |
| `styles.css` | Cozy prototype styling. |
| `main.js` | Startup, input, canvas rendering, and save/load. The only file that touches the DOM. |
| `generator.js` | Deterministic seed-based world generation. |
| `species.js` | Loads `data/*.json` and picks a creature and plant per tile. |
| `journal.js` | Journal text. Presentation only — every string comes from the data. |
| `smoke-test.js` | The whole test suite. Plain assertions that throw; run with `.\run test`. |

`generator.js` and `species.js` are deliberately free of DOM and framework code, so they can be
tested under Node and reused when the React shell lands. Keep new game logic out of `main.js`.

These files are ES modules — the root `package.json` sets `"type": "module"`. The scripts in
`tools/` are CommonJS instead, pinned by `tools/package.json`.

See [PLAYTEST.md](PLAYTEST.md) for what to look for while playing.
