// Render the art plan from docs/art-asks.json, twice: as the repo brief and as the published page.
//
// **One script for both, so the page the owner paints from and the brief in the repo cannot say
// different things.** That is the owner's standing rule for art asks (see the session-craft skill,
// "Asking for art"): every ask is a card with the exact file name, one line on why, where to save
// it, a Copy button and the whole prompt -- and the same prompt in the repo, written by one script.
//
// A prompt is the kind's style block word for word, then (for scenes) the frame paragraph, then one
// `Subject:` line. Only the subject changes between cards, which is what keeps a set coherent.
//
//   node tools/render-art-asks.js                       # writes docs/art-asks.md
//   node tools/render-art-asks.js --html=<path>         # also writes the page
//
// CommonJS, like everything in tools/ -- see tools/package.json.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const asks = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'art-asks.json'), 'utf8'));

/** The species plate block, as docs/plate-prompts.md has it since 2026-09-09. */
const PLATE_STYLE =
  "Watercolour natural-history plate from a field naturalist's notebook, ancient South Asia, " +
  '4000 BCE. Painted with visible brush and pigment granulation on off-cream paper. Solarpunk ' +
  'light: clean, bright, sunlit colour, saturated where the light falls, with warm bounce light in ' +
  'the shadows rather than flat grey — luminous pigment, never neon and never glowing. Soft ' +
  'gradients within each shape and gentle ambient shading where the animal meets the ground. Warm ' +
  'near-black for the darks, never pure black. Living greens — the colour of a thing growing, not ' +
  'drying. One animal, seen side-on or three-quarter, filling most of the frame, with only a ' +
  'suggestion of its habitat behind it — a few strokes, not a landscape. Where the habitat is ' +
  'water, paint it moving: ripples, flow lines, a curl of spray, light broken on a moving surface — ' +
  'water in motion rather than a flat wash. Calm and unhurried; there is no threat in this world ' +
  'and nothing is snarling or hunting. Square image, 1024×1024. Not photographic: no lens blur, no ' +
  'specular highlights, no 3D render. No text, no caption, no label, no border, no frame, no ' +
  'watermark, no signature, no grid, no colour swatches.';

/** The activity scene block, as docs/activity-scene-prompts.md has it. */
const SCENE_STYLE =
  "Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE. " +
  'Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation ' +
  'colour — nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient ' +
  "shading. Warm near-black for the darks, never pure black. A person's hands and body at work, " +
  "seen close and from the traveller's own side — this is a moment of doing, not a portrait. " +
  'Unhurried and calm; there is no threat in this world and nothing is in danger. Landscape ' +
  'orientation, 4:3, 1024×768 or larger. Not photographic: no lens blur, no specular highlights, no ' +
  '3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.';

/** Why every scene keeps faces out: five travellers are playable and any of them is the one working. */
const SCENE_FRAME =
  'Keep the face out of frame: hands, forearms, a shoulder or a back, so that it could be any of ' +
  'the travellers a player might be. Sleeves and wraps in dyed cloth — madder red, indigo, ' +
  'turmeric, ochre — never plain white costume.';

/**
 * Whether the built painting is in the game yet, so the page can mark the card Arrived.
 *
 * A night asked for as one scene can arrive as its two moments (`rest-none-midnight`,
 * `rest-none-dawn`) rather than under its own name, and that counts.
 */
function arrived(folder, file) {
  const built = fs.readdirSync(path.join(ROOT, 'src', 'ui', folder));
  if (built.includes(`${file}.png`)) return true;
  return folder === 'scenes' && built.some((f) => /^(.*)-(midnight|dawn)\.png$/.test(f) && f.startsWith(`${file}-`));
}
const plateSave = (c) => `assets/source/plates/plate-${c.file}.png`;
const sceneSave = (c) => `assets/source/scenes/scene-${c.file}.png`;
const platePrompt = (c) => `${PLATE_STYLE}\n\nSubject: ${c.subject}`;
const scenePrompt = (c) => `${SCENE_STYLE}\n\n${SCENE_FRAME}\n\nSubject: ${c.subject}`;

const PLATE_GROUPS = [
  ['often', 'Met most often', 'The thirty unpainted animals a player meets most, by tiles across the four maps.'],
  ['rare', 'Rare finds', 'Twenty rare and mythic animals that can be met. Seldom seen, and remembered when they are.'],
  ['described', 'Newly described', 'Species your lore notes of 29 September made paintable: the ones canon could not describe, and the war beasts in the calm poses you ruled. Each subject is its canon `appearance` plus a pose.']
];
/** A settled ask shows what was decided in place of what was missing. */
const settledCell = (x) =>
  x.settled ? `<span class="chip arrived">Settled</span> ${esc(x.settled)}` : esc(x.note);
const SCENE_GROUPS = [
  ['ground', 'On the ground', 'A take narrows its painting by the ground it happens on. Each of these falls back to the plain gesture until it arrives.'],
  ['bench', 'At the bench', 'A making narrows by canon’s process word. Ordered by how many recipes use it.'],
  ['night', 'Nights', 'The two kinds of night still drawn with the generic rest scene.']
];
const RULING_GROUPS = [
  ['war', 'Asura war beasts', 'Bred or altered for battle. Painted calm, they stop being what canon says they are; painted as canon says, they break the rule that nothing in this world is a threat.'],
  ['mimic', 'Mimics, constructs and spectres', 'Canon describes what they do, or what people read into them, more than what they look like.'],
  ['people', 'People, or animals?', 'Canon gives these a civilisation or a will. If they are people, they want a portrait and lines, not a plate.'],
  ['plant', 'Horror plants', 'The same register question as the war beasts, for plants.']
];

// ---------------------------------------------------------------------------------------------
// The brief

function brief() {
  const m = asks.measured;
  const out = [];
  out.push('# The art plan — plates and scenes to paint');
  out.push('');
  out.push('> Generated by `node tools/render-art-asks.js` from `docs/art-asks.json`. Edit the JSON and');
  out.push('> re-run; the published plan page is rendered by the same script, so the two cannot differ.');
  out.push('');
  out.push(
    `**${asks.plates.length} species plates and ${asks.scenes.length} activity scenes.** The plates already painted cover ` +
      `${m.painted_share}% of the animals a player meets; these add ${m.asked_share}%, taking it to ${m.after_share}%. ` +
      `Measured, not estimated: ${m.how.charAt(0).toLowerCase()}${m.how.slice(1)}`
  );
  out.push('');
  out.push('Nothing here is a blocker. Every slot already draws something, and each file takes effect the');
  out.push('moment it is built. Save the raw where the card says (or anywhere in `assets/source/dump/`), then');
  out.push('`node tools/build-plates.js` for plates or `--scenes` for scenes.');
  out.push('');
  out.push('## Plate style block');
  out.push('');
  out.push('> ' + PLATE_STYLE);
  out.push('');
  for (const [key, title, blurb] of PLATE_GROUPS) {
    out.push(`## Plates — ${title}`);
    out.push('');
    out.push(blurb);
    out.push('');
    for (const c of asks.plates.filter((p) => p.group === key)) {
      out.push(`**\`${c.file}\`** — ${c.name}, ${c.rarity}. ${c.why} Save as \`${plateSave(c)}\`.`);
      if (c.guess) out.push(`*${c.guess}*`);
      out.push(`> Subject: ${c.subject}`);
      out.push('');
    }
  }
  out.push('## Scene style block');
  out.push('');
  out.push('> ' + SCENE_STYLE);
  out.push('>');
  out.push('> ' + SCENE_FRAME);
  out.push('');
  for (const [key, title, blurb] of SCENE_GROUPS) {
    out.push(`## Scenes — ${title}`);
    out.push('');
    out.push(blurb);
    out.push('');
    for (const c of asks.scenes.filter((s) => s.group === key)) {
      out.push(`**\`${c.file}\`** — ${c.why} Save as \`${sceneSave(c)}\`.`);
      out.push(`> Subject: ${c.subject}`);
      out.push('');
    }
  }
  out.push('## Needs lore before it can be painted');
  out.push('');
  out.push('| Species | Kind | Tiles | What canon is missing |');
  out.push('|---|---|--:|---|');
  for (const l of asks.lore) out.push(`| ${l.name} (\`${l.id}\`) | ${l.kind} | ${l.tiles} | ${l.settled ? `**Settled.** ${l.settled}` : l.note} |`);
  out.push('');
  out.push('## Needs a ruling before it can be painted');
  out.push('');
  for (const [key, title, blurb] of RULING_GROUPS) {
    out.push(`### ${title}`);
    out.push('');
    out.push(blurb);
    out.push('');
    out.push('| Species | Tiles | Canon says |');
    out.push('|---|--:|---|');
    for (const r of asks.rulings.filter((x) => x.group === key)) out.push(`| ${r.name} (\`${r.id}\`) | ${r.tiles} | ${r.settled ? `**Settled.** ${r.settled}` : r.note} |`);
    out.push('');
  }
  if (asks.held && asks.held.length) {
    out.push('## Held for a decision');
    out.push('');
    out.push('Paintings that arrived with no slot to go in. Kept in `assets/source/dump/`, not rejected.');
    out.push('');
    out.push('| File | What it is | The question |');
    out.push('|---|---|---|');
    for (const h of asks.held) out.push(`| \`${h.file}\` | ${h.what} | ${h.question} |`);
    out.push('');
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------------------------
// The page

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function card(c, kind) {
  const id = `${kind}-${c.file}`;
  const save = kind === 'plate' ? plateSave(c) : sceneSave(c);
  const prompt = kind === 'plate' ? platePrompt(c) : scenePrompt(c);
  const head =
    kind === 'plate'
      ? `<p class="card-subject"><b>${esc(c.name)}.</b> ${esc(c.why)}</p>`
      : `<p class="card-subject">${esc(c.why)}</p>`;
  const here = arrived(kind === 'plate' ? 'plates' : 'scenes', c.file);
  const chip =
    (here ? '<span class="chip arrived">Arrived</span>' : '') +
    (kind === 'plate' ? `<span class="chip ${esc(c.rarity)}">${esc(c.rarity)}</span>` : '');
  const guess = c.guess ? `<p class="card-guess">${esc(c.guess)}</p>` : '';
  return `
        <article class="card${here ? ' is-arrived' : ''}" data-card="${esc(id)}">
          <div class="card-top"><span class="card-file">${esc(c.file)}</span><span class="chips">${chip}</span></div>
          ${head}
          ${guess}
          <p class="card-save">Save as <code>${esc(save)}</code></p>
          <div class="card-actions">
            <button type="button" class="copy" data-copy="p-${esc(id)}">Copy prompt</button>
            <label class="done"><input type="checkbox" id="done-${esc(id)}" data-done="${esc(id)}"> Painted</label>
          </div>
          <details><summary>Show the full prompt</summary><pre id="p-${esc(id)}">${esc(prompt)}</pre></details>
        </article>`;
}

function page() {
  const m = asks.measured;
  const plates = PLATE_GROUPS.map(
    ([key, title, blurb]) => `
      <div class="group">
        <div class="group-head"><h3>${title}</h3><span>${asks.plates.filter((p) => p.group === key).length} plates · ${blurb}</span></div>
        <div class="grid">${asks.plates.filter((p) => p.group === key).map((c) => card(c, 'plate')).join('')}
        </div>
      </div>`
  ).join('');
  const scenes = SCENE_GROUPS.map(
    ([key, title, blurb]) => `
      <div class="group">
        <div class="group-head"><h3>${title}</h3><span>${asks.scenes.filter((s) => s.group === key).length} scenes · ${blurb}</span></div>
        <div class="grid">${asks.scenes.filter((s) => s.group === key).map((c) => card(c, 'scene')).join('')}
        </div>
      </div>`
  ).join('');
  const loreRows = asks.lore
    .map(
      (l) =>
        `<tr><td><b>${esc(l.name)}</b><br><code>${esc(l.id)}</code></td><td>${esc(l.kind)}</td><td class="num">${l.tiles}</td><td>${settledCell(l)}</td></tr>`
    )
    .join('\n');
  const rulings = RULING_GROUPS.map(([key, title, blurb]) => {
    const rows = asks.rulings
      .filter((r) => r.group === key)
      .map(
        (r) =>
          `<tr><td><b>${esc(r.name)}</b><br><code>${esc(r.id)}</code></td><td class="num">${r.tiles}</td><td>${settledCell(r)}</td></tr>`
      )
      .join('\n');
    return `
      <div class="group">
        <div class="group-head"><h3>${title}</h3><span>${blurb}</span></div>
        <div class="table-wrap"><table><thead><tr><th>Species</th><th>Tiles</th><th>Canon says</th></tr></thead><tbody>
${rows}
        </tbody></table></div>
      </div>`;
  }).join('');
  const pct = (n) => `${n}%`;
  const rest = Math.round((100 - m.after_share) * 10) / 10;

  return `<title>Plates and Scenes</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
  :root {
    --paper: #eff1ee; --panel: #f8f9f7; --ink: #1c2130; --muted: #525a6b; --rule: #d3d8d2;
    --indigo: #34407a; --indigo-bg: #dde1f1; --madder: #a4402e; --madder-bg: #f3dcd6;
    --turmeric: #8a6508; --turmeric-bg: #f3e6bf; --leaf: #4a6a2e; --leaf-bg: #dfe9d2;
    --serif: "Newsreader", "Iowan Old Style", "Palatino Linotype", Georgia, serif;
    --sans: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
    --mono: "IBM Plex Mono", ui-monospace, "Cascadia Mono", Consolas, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      color-scheme: dark;
      --paper: #13161e; --panel: #1a1e28; --ink: #e4e6ec; --muted: #a2a8b8; --rule: #2d3342;
      --indigo: #9aa6e6; --indigo-bg: #232a47; --madder: #e58a74; --madder-bg: #3b221d;
      --turmeric: #e2bb58; --turmeric-bg: #3a3017; --leaf: #9fc278; --leaf-bg: #22301a;
    }
  }
  :root[data-theme="dark"] {
    color-scheme: dark;
    --paper: #13161e; --panel: #1a1e28; --ink: #e4e6ec; --muted: #a2a8b8; --rule: #2d3342;
    --indigo: #9aa6e6; --indigo-bg: #232a47; --madder: #e58a74; --madder-bg: #3b221d;
    --turmeric: #e2bb58; --turmeric-bg: #3a3017; --leaf: #9fc278; --leaf-bg: #22301a;
  }
  body { background: var(--paper); color: var(--ink); font: 15.5px/1.6 var(--sans); padding-inline: 20px; padding-block: 0 72px; }
  .wrap { max-width: 1080px; margin: 0 auto; }
  h1, h2, h3 { font-family: var(--serif); font-weight: 600; text-wrap: balance; margin: 0; }
  h1 { font-size: clamp(2.1rem, 5vw, 3.1rem); line-height: 1.08; letter-spacing: -0.01em; }
  h2 { font-size: 1.7rem; line-height: 1.2; }
  h3 { font-size: 1.15rem; line-height: 1.3; }
  p { margin: 0; }
  code { font-family: var(--mono); font-size: 0.84em; overflow-wrap: anywhere; }
  a { color: var(--indigo); }
  a:focus-visible, button:focus-visible, input:focus-visible, summary:focus-visible { outline: 2px solid var(--indigo); outline-offset: 2px; }
  .eyebrow { font: 500 0.74rem/1 var(--sans); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
  header { padding-block: 56px 20px; display: grid; gap: 16px; }
  .lede { font-family: var(--serif); font-size: 1.24rem; line-height: 1.5; max-width: 68ch; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px 18px; color: var(--muted); font-size: 0.88rem; }
  nav.jump { display: flex; flex-wrap: wrap; gap: 8px; }
  nav.jump a { font-size: 0.86rem; text-decoration: none; border: 1px solid var(--rule); border-radius: 3px; padding: 5px 10px; background: var(--panel); }
  .coverage { display: grid; gap: 8px; max-width: 760px; }
  .bar { display: flex; height: 14px; border-radius: 3px; overflow: hidden; border: 1px solid var(--rule); }
  .bar span { display: block; height: 100%; }
  .bar .have { background: var(--leaf); }
  .bar .asked { background: var(--indigo); }
  .bar .left { background: var(--rule); }
  .legend { display: flex; flex-wrap: wrap; gap: 4px 18px; font-size: 0.86rem; color: var(--muted); font-variant-numeric: tabular-nums; }
  .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 6px; vertical-align: 0; }
  section { padding-block: 44px 0; display: grid; gap: 22px; }
  .section-head { display: grid; gap: 8px; }
  .section-head p { color: var(--muted); max-width: 72ch; }
  .howto { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px 28px; font-size: 0.92rem; }
  .howto div { display: grid; gap: 4px; border-top: 1px solid var(--rule); padding-top: 10px; }
  .howto b { font-weight: 600; }
  .howto p { color: var(--muted); }
  .style-block { background: var(--panel); border: 1px solid var(--rule); border-radius: 4px; padding: 14px 16px; display: grid; gap: 8px; max-width: 900px; }
  .style-block p { font-size: 0.86rem; color: var(--muted); }
  .group { display: grid; gap: 12px; }
  .group-head { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: baseline; }
  .group-head span { color: var(--muted); font-size: 0.86rem; max-width: 80ch; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 12px; }
  .card { background: var(--panel); border: 1px solid var(--rule); border-radius: 4px; padding: 14px 16px; display: grid; gap: 9px; align-content: start; min-width: 0; }
  .card.is-done, .card.is-arrived { border-color: var(--leaf); }
  .card-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .card-file { font: 500 0.9rem/1.2 var(--mono); overflow-wrap: anywhere; }
  .card-subject { font-size: 0.9rem; }
  .card-guess { font-size: 0.82rem; color: var(--turmeric); }
  .card-save { font-size: 0.8rem; color: var(--muted); }
  .card-actions { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
  .copy { font: 600 0.8rem/1 var(--sans); color: var(--paper); background: var(--indigo); border: 0; border-radius: 3px; padding: 9px 12px; cursor: pointer; }
  .copy:hover { filter: brightness(1.1); }
  .done { font-size: 0.84rem; color: var(--muted); display: inline-flex; gap: 6px; align-items: center; cursor: pointer; }
  .card details summary { cursor: pointer; font-size: 0.82rem; color: var(--indigo); }
  .card pre { margin: 8px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; font: 0.76rem/1.5 var(--mono); color: var(--muted); background: var(--paper); border: 1px solid var(--rule); border-radius: 3px; padding: 10px 12px; max-height: 320px; overflow-y: auto; }
  .chip { font: 600 0.68rem/1 var(--sans); letter-spacing: 0.06em; text-transform: uppercase; padding: 4px 7px; border-radius: 3px; white-space: nowrap; }
  .chip.common { background: var(--leaf-bg); color: var(--leaf); }
  .chip.rare { background: var(--indigo-bg); color: var(--indigo); }
  .chip.mythic { background: var(--turmeric-bg); color: var(--turmeric); }
  .chip.arrived { background: var(--leaf); color: var(--paper); }
  .chips { display: inline-flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
  .table-wrap { overflow-x: auto; border-top: 1px solid var(--rule); }
  table { border-collapse: collapse; width: 100%; min-width: 620px; font-size: 0.9rem; }
  th, td { text-align: left; padding: 10px 12px 10px 0; border-bottom: 1px solid var(--rule); vertical-align: top; }
  th { font: 600 0.72rem/1.2 var(--sans); letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
  td code { color: var(--muted); font-size: 0.76rem; }
  td.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .fixes { display: grid; gap: 10px; max-width: 80ch; }
  .fixes div { border-left: 2px solid var(--rule); padding-left: 12px; font-size: 0.92rem; }
  .fixes p { color: var(--muted); }
  footer { padding-block: 48px 0; color: var(--muted); font-size: 0.86rem; display: grid; gap: 6px; max-width: 80ch; }
  @media (max-width: 720px) { header { padding-block: 36px 16px; } }
</style>

<div class="wrap">
  <header>
    <p class="eyebrow">Varuna's Field Diary · art plan</p>
    <h1>Plates and Scenes</h1>
    <p class="lede">${asks.plates.length} animals to paint, chosen because players meet them most or remember them most, and ${asks.scenes.length} activity scenes for acts the game still draws with a stand-in. Every card has a ready-to-copy prompt. At the bottom are the animals and plants I could not write a prompt for without inventing their look, and what I need from you for each.</p>
    <div class="meta">
      <span>Game repo <code>4000BCESaraswathy</code></span>
      <span>Canon 2.37.0</span>
      <span>Branch <code>docs/plate-and-scene-plan</code></span>
      <span>28 September 2026</span>
    </div>
    <div class="coverage" role="img" aria-label="Share of animal encounters with a painted plate: ${pct(m.painted_share)} already painted, ${pct(m.asked_share)} more from this plan, ${pct(rest)} left.">
      <div class="bar"><span class="have" style="width:${m.painted_share}%"></span><span class="asked" style="width:${m.asked_share}%"></span><span class="left" style="width:${rest}%"></span></div>
      <div class="legend">
        <span><i style="background:var(--leaf)"></i>${pct(m.painted_share)} painted already (25 plates)</span>
        <span><i style="background:var(--indigo)"></i>${pct(m.asked_share)} these 50</span>
        <span><i style="background:var(--rule)"></i>${pct(rest)} left</span>
      </div>
      <p class="legend">Share of the ${m.fauna_tiles.toLocaleString('en')} animal encounters across the four maps. Measured by walking every tile and asking the game which animal stands there.</p>
    </div>
    <nav class="jump" aria-label="Sections">
      <a href="#how">How to hand them over</a><a href="#plates">Animal plates</a><a href="#scenes">Activity scenes</a><a href="#lore">Needs your lore</a><a href="#rulings">Needs your ruling</a><a href="#held">Held</a>
    </nav>
  </header>

  <section id="how">
    <div class="section-head"><h2>How to hand them over</h2></div>
    <div class="howto">
      <div><b>Copy, paint, save</b><p>Each card's button copies the whole prompt: the style block, then the subject. Save the result under the card's file name, in the folder it names or anywhere in <code>assets/source/dump/</code>.</p></div>
      <div><b>Any order, any number</b><p>Nothing waits on these. Every slot already draws something, and each painting replaces its stand-in the moment it is built.</p></div>
      <div><b>What gets a painting sent back</b><p>Only a technical fault: text, a watermark over the subject, a painted frame, a broken file. Never a style choice. Framing is fixed with a crop.</p></div>
      <div><b>Painted boxes</b><p>Tick <em>Painted</em> on a card to keep your own place. It is saved in this browser only.</p></div>
    </div>
  </section>

  <section id="plates">
    <div class="section-head">
      <h2>Animal plates</h2>
      <p>Square, one animal filling the frame with a few strokes of its ground. Every subject line is written from the animal's own canon entry, so the picture and the field note agree. Where I had to guess, the card says so.</p>
    </div>
    <div class="style-block"><p class="eyebrow">The plate style block, first in every plate prompt</p><p>${esc(PLATE_STYLE)}</p></div>
    ${plates}
  </section>

  <section id="scenes">
    <div class="section-head">
      <h2>Activity scenes</h2>
      <p>Landscape 4:3, a pair of hands at work with the traveller's face out of frame. These fill the top of the activity card.</p>
    </div>
    <div class="style-block"><p class="eyebrow">The scene style block and frame, first in every scene prompt</p><p>${esc(SCENE_STYLE)}</p><p>${esc(SCENE_FRAME)}</p></div>
    ${scenes}
  </section>

  <section id="lore">
    <div class="section-head">
      <h2>Needs your lore</h2>
      <p>Invented species whose canon entry says what they do but not what they look like. A prompt for any of these would be me designing the creature, not painting yours. A sentence or two each is enough; I will put it into canon and add the card.</p>
    </div>
    <div class="table-wrap"><table><thead><tr><th>Species</th><th>Kind</th><th>Tiles</th><th>What canon is missing</th></tr></thead><tbody>
${loreRows}
    </tbody></table></div>
    <p class="section-head"><span style="color:var(--muted);font-size:0.9rem">Plants are drawn as a mark in the game and are not painted as plates, so the plant rows matter for scenes and places later, not for this set.</span></p>
  </section>

  <section id="rulings">
    <div class="section-head">
      <h2>Needs your ruling</h2>
      <p>These have enough description, but painting them runs into a rule: nothing in this world is a threat, and a plate is an animal. Tell me which way each group goes: paint it calm, paint it as canon says, keep it unpainted, or move it out of the animals.</p>
    </div>
    ${rulings}
  </section>

  ${asks.held && asks.held.length ? `<section id="held">
    <div class="section-head"><h2>Held for your decision</h2><p>Paintings that arrived with no slot to go in. Kept on disk, not rejected; each needs one answer from you.</p></div>
    <div class="table-wrap"><table><thead><tr><th>File</th><th>What it is</th><th>The question</th></tr></thead><tbody>
${asks.held.map((h) => `<tr><td><code>${esc(h.file)}</code></td><td>${esc(h.what)}</td><td>${esc(h.question)}</td></tr>`).join('')}
    </tbody></table></div>
  </section>` : ''}

  <section id="fixes">
    <div class="section-head"><h2>Two fixes in the same pull request</h2><p>Both would have made paintings from this plan fail to show.</p></div>
    <div class="fixes">
      <div><b>Scene names with an underscore built under the wrong name.</b><p>A raw saved as <code>scene-stoop-sky_island.png</code> built as <code>stoop-sky-island</code>, which the game never looks up. The builder now keeps underscores for scenes, and a test pins it.</p></div>
      <div><b>A bench showed the animal on the tile.</b><p>Firing, cooking, brewing and drying play as a stalk, so the card showed the plate of whatever animal stood there. A painted <code>stalk-firing.png</code> could never have been seen where a painted animal lived. A bench is never about the animal now.</p></div>
    </div>
  </section>

  <footer>
    <p>Rendered by <code>node tools/render-art-asks.js --html</code> from <code>docs/art-asks.json</code>, which also writes <code>docs/art-asks.md</code> in the game repo, so this page and the brief say the same thing.</p>
  </footer>
</div>

<script>
  document.querySelectorAll('[data-copy]').forEach(function (button) {
    button.addEventListener('click', function () {
      var pre = document.getElementById(button.getAttribute('data-copy'));
      var text = pre.textContent;
      function done(label) {
        button.textContent = label;
        setTimeout(function () { button.textContent = 'Copy prompt'; }, 2000);
      }
      function selectIt() {
        var details = pre.closest('details');
        if (details) details.open = true;
        var range = document.createRange();
        range.selectNodeContents(pre);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        done('Selected: press Ctrl+C');
      }
      try {
        navigator.clipboard.writeText(text).then(function () { done('Copied'); }, selectIt);
      } catch (e) { selectIt(); }
    });
  });
  var KEY = 'plates-and-scenes-painted';
  var painted = {};
  try { painted = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { painted = {}; }
  document.querySelectorAll('[data-done]').forEach(function (box) {
    var id = box.getAttribute('data-done');
    var card = box.closest('.card');
    function show() { card.classList.toggle('is-done', box.checked); }
    box.checked = !!painted[id];
    show();
    box.addEventListener('change', function () {
      if (box.checked) painted[id] = true; else delete painted[id];
      try { localStorage.setItem(KEY, JSON.stringify(painted)); } catch (e) {}
      show();
    });
  });
</script>
`;
}

fs.writeFileSync(path.join(ROOT, 'docs', 'art-asks.md'), brief() + '\n');
console.log('wrote docs/art-asks.md');
const htmlArg = process.argv.find((a) => a.startsWith('--html='));
if (htmlArg) {
  const out = htmlArg.slice('--html='.length);
  fs.writeFileSync(out, page());
  console.log(`wrote ${out}`);
}

module.exports = { PLATE_STYLE, SCENE_STYLE, SCENE_FRAME, plateSave, sceneSave };
