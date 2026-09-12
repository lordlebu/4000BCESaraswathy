---
name: session-craft
description: Environment gotchas and working practices for Varuna's Field Diary (the 4000BCESaraswathy game repo and its SouthOfTethys canon sibling). Read this early in any session in these repositories, and consult it whenever you are about to push or delete a branch, run the Playwright suite, reach for gh, take new art into a builder, change anything in src/ui, check that something actually draws, or write a test with a threshold in it. Several items here are hard refusals and version mismatches that look exactly like a broken setup and are not, so checking here first saves a round of wrong diagnosis.
---

# Working in these repositories

Everything here was tried, measured, or got wrong. Nothing is included because it sounded
plausible. Ordered by how much time it saves.

`CLAUDE.md` in each repo is the authority on what the code is and what the rules are. This is the
complement: what the *environment* does, and how to check your own work in a codebase whose
central failure mode is a thing that is built, tested, believed, and connected to nothing.

---

## The environment

### Branch deletion is blocked, and there is no route

`git push origin --delete` returns **HTTP 403**, for one branch or thirty. So does the REST
endpoint `DELETE /repos/{owner}/{repo}/git/refs/heads/{branch}`, with a message that says what is
actually happening:

```
Write access to this GitHub API path is not permitted through this proxy.
```

There is no `delete_branch` in the GitHub MCP set either. This is a platform limit on Claude Code
sessions rather than a repository permission, so **do not spend a round trying all three routes**.
Scan, hand the owner a ready-to-paste command with the branch names inlined, and mention that
GitHub's branches page can do it too and offers restore afterwards.

Before blaming GitHub for any network refusal, read the proxy's own view:

```bash
curl -sS "$HTTPS_PROXY/__agentproxy/status"
```

An empty `recentRelayFailures` means the refusal came from the far end, not the relay.

### Playwright's browsers are present under the wrong build number

`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` holds a specific Chromium build. A pinned
`@playwright/test` newer than that asks for a different number and fails with *"Executable doesn't
exist at …"*, which reads exactly like a missing install. **Do not run `npx playwright install`** —
the browser is already there and the download is what the environment is set up to avoid.

Bridge it by linking the build you have at the path the installed version wants, resources
included:

```bash
D=/opt/pw-browsers; WANT=<number from the error>; HAVE=<number in $D>
mkdir -p "$D/chromium_headless_shell-$WANT/chrome-headless-shell-linux64"
ln -sf "$D/chromium_headless_shell-$HAVE/chrome-linux/headless_shell" \
       "$D/chromium_headless_shell-$WANT/chrome-headless-shell-linux64/chrome-headless-shell"
for f in "$D/chromium_headless_shell-$HAVE/chrome-linux/"*; do
  b=$(basename "$f"); [ "$b" = headless_shell ] || \
    ln -sfn "$f" "$D/chromium_headless_shell-$WANT/chrome-headless-shell-linux64/$b"
done
touch "$D/chromium_headless_shell-$WANT/INSTALLATION_COMPLETE"
```

The resource files matter — the shell will not start with only the binary linked. Read the number
out of the error rather than copying one; it moves with the pinned version. The whole browser
suite passes through this.

### `gh` installs and is half useless

`apt-get install -y gh` works, and it picks up the `GH_TOKEN` already in the environment with no
`gh auth login`. Then most of it fails, because **GitHub GraphQL is blocked for Claude Code
sessions** and most of `gh`'s pull-request surface is GraphQL.

| works | blocked |
|---|---|
| `gh api` REST routes | `gh pr list` |
| `gh pr view --json` | `gh pr checks`, `gh pr status` |
| `gh run list` | `gh issue list`, `gh repo view` |

The GitHub MCP tools already do everything `gh` can do here, so installing it buys almost nothing.
Reach for `mcp__github__*` instead.

---

## Checking your own work

This codebase's signature bug is a thing that exists, is tested, and is wired to nothing:
a rule with no caller (three times), a biome with art and species and zero tiles on every seed, and
four painted sheets that no code loaded. Tests do not catch that shape. These habits do.

### Open the picture

The `Read` tool renders images. Use it on built sheets, source art, and composites. In one session
this caught five faults that a full green suite did not see: a tree floating a tile above the
grass, a rope hung over solid ground, marble crushed by the wrong quantiser, prose describing a
building nobody had looked at, and a windmill standing on a railway.

**Twice the mistake was reasoning about a file instead of opening it.** A whole recommendation to
regenerate the temple art was written, and was wrong, because the sheet had not been looked at. Ten
seconds of looking reversed it. If you are about to make a claim about what an image contains, open
it first.

### Two halves make a browser check

Walking a player to a far corner of a map costs four and a half minutes of tweens, and nothing is
exposed on `window` to move the camera. When a real screenshot of a specific place is out of reach,
these two together cover the same ground:

- **Composite the real `planScene` output over the real sheets** and look at it. This proves
  placement, scale, frame choice, depth order and sub-tile offsets. It does *not* prove Phaser can
  load anything, and it will not reproduce the scene's baked terrain blending — so the ground comes
  out missing, and that is the compositor rather than the game.
- **Run `e2e/game.spec.ts`.** It fails on any console warning matching `has no frame` or
  `Texture … not found`, which is exactly what a sheet declared at the wrong cell size produces.

Neither is sufficient alone. Say which half proves what rather than implying a screenshot that was
never taken.

### Prove a test bites before believing it

Break the thing a new guard guards and confirm the failure names it. Every guard written in one
session was checked this way:

- force a rotation to zero → *"frames 0 and 1 are the same picture"*
- shorten a run by four pixels → *"frame 1: the run starts 4 px right of the left border"*
- invert an expected biome → *"the alms step stands at 31,52 on sky_island"*
- stub out a branch → *"the temple is drawn from 'places' — a painted place fell through to the
  generated sheet"*

This caught one assertion that passed for the wrong reason, and one that was testing the *example*
rather than the *rule* — it named a sheet literally and broke the moment a second painted sheet
existed. If an assertion names a specific value where it means "whatever the table says", it will
fail on the next addition rather than on a real fault.

### The interface has its own set of invisible faults

The same shape as the rest of this file: each was built, believed, and connected to nothing, and
none of them failed anything.

- **A focus trap under jsdom.** `offsetParent` is **always null** there, so the usual
  "drop the hidden controls" filter drops every control and the trap wraps to nothing while its
  tests pass. `Element.checkVisibility()` answers for ancestors too and behaves under jsdom.
- **A portal is not in `render()`'s container.** Query `baseElement` — `document.body` — or every
  assertion about a modal searches an empty div and reports the panel missing.
- **A class name is taken.** `styles.css` is one flat namespace over two thousand lines. `.specimen`
  had been used by the field kit five hundred lines below where the plate card claimed it; the later
  rule won, the card rendered as a transparent lozenge, and the card was restyling the field kit's
  chips in the other direction. Grep before naming a class, and *look at the thing* afterwards.
  `test/stylesheet.test.ts` now refuses a bare class declared twice at the top level, and a
  `z-index` that is not a `--z-*` token — the second is a fault that had not landed yet, written
  down because the numbers were 2, 3, 4, 5, 35, 40, 60 and 100 and one comment in the sheet reasoned
  about them.
- **Two modals and effect order.** React runs a child's effects **before its parent's**, so a stack
  of open modals pushed from an effect comes out inside-first: the outer panel answers keys meant
  for the inner one and its veil paints over it. Nesting depth has to come from the tree — a
  context — not from when something registered.
- **A panel that grows with its content moves the camera.** The insets React reports are measured
  from the dock, so anything that changes its height while the player stands still drags the map.
  `e2e/hours.spec.ts` guards it and is worth reading before giving any panel an automatic size.

### A browser spec cannot import `src/content/`

`SAVE_VERSION` lives in `src/save.ts`, which pulls in `collection.ts`, `satchel.ts` and `nodes.ts`,
whose JSON imports need an attribute Node will not infer. The spec does not fail an assertion — it
never loads, and Playwright reports **"No tests found"**, which reads as a bad glob.

Read what you need out of the running page instead. And when seeding `localStorage`, write it with
`page.addInitScript` before a reload: a direct write is overwritten by the live page saving its own
state a moment later, and the failure looks exactly like the feature not working.

### Measure the signal before choosing the threshold

`docs/testing.md` says this and it still gets got wrong. A check that a mill tower carried no
painted-on sails compared the hub row to the *bottom* row and expected the hub to be narrower —
false for a cone standing on a flight of steps, ratio 2.37. Measuring the silhouette first gave a
clean separation: the hub row is **0.67** of the building's widest, and a painted-on wheel would
exceed **1.0**. The threshold then sits in a real gap instead of wherever made the test pass.

And where there is no separation, **do not assert**. How well a bridge frame's leading edge matched
its trailing edge ran 84%–100%, the tiling read as continuous, and no value was ever established
that separates good from bad — so nothing was asserted about it, and that was written down.

---

## The two repositories

### A pull request can merge while you are working

It happened three times in one session. Fetch and check before committing, rather than discovering
it at push time:

```bash
git fetch origin main && git log --oneline -1 origin/main
```

After a merge, restart the branch from the new base instead of stacking on the old tip:

```bash
git rebase --onto origin/main <old-remote-tip> <branch>
git push --force-with-lease -u origin <branch>
```

**Before any force-push, run `git cherry origin/<branch> HEAD`.** A `-` means that commit's patch is
already present under a different sha and nothing is lost; a `+` means it is not. That turns "this
is probably fine" into a fact. The same command sorts merged branches from genuinely unmerged ones
when triaging what is safe to delete.

### The canon/game version split has a blind spot

`npm run check:data` compares the bundle against **its own lock**, not against canon. The two repos
can therefore disagree about what an entity is called while every check stays green. This actually
happened: a pull request merged only the first of two commits on its branch, leaving canon's `main`
with the old name while the game had already shipped a bundle built from the new one.

The check that sees it is canon's `check_export_boundary.py`, which reports **`game bundle:
matches`**. Run it whenever both repos have been touched in the same session.

### The push gate needs `/hooks` opened once

`.claude/hooks/push-gate.sh` refuses a push onto a branch whose pull request has already merged. It
is committed in both repos and it works — but Claude Code's settings watcher only watches
directories that had a settings file when the session *started*, so in the session that created it,
it never fires. Running it by hand still answers correctly:

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"git push"}}' | .claude/hooks/push-gate.sh
```

---

## Taking art in

### Never ask a painter for a sequence

A sheet of "six cells, the blades fifteen degrees apart" came back with the tower **pixel-identical
in every cell** and the sails in the same place in all six. Asking again produces the same failure,
because the ask is the problem. Ask for **one** image and rotate it in the builder: fewer things for
the painter to get right, and a source that can be re-stepped at any angle later.

Rotate at **build** time, not run time. Phaser can spin a sprite, but this game draws at integer
scale with `NEAREST` filtering, and an arbitrary runtime rotation resamples straight off that grid
so edges crawl as they turn.

### Three things about keying and palettes

- **Alpha zero renders as white.** A wheel that arrived "on a white background" measured
  `rgba(0,0,0,0)`. Keying that white would have eaten the cream sails. Measure corner pixels before
  believing a preview.
- **Key magenta on hue, not brightness.** One sheet's key measured `144,1,145` — unmistakably
  magenta and nowhere near bright. Test that red and blue agree with each other and both beat green.
- **Median cut, never popularity.** A popularity palette keeps the commonest colours and discards
  the mid-tones, which ruins any subject that is mostly one colour. It turned a marble temple into
  near-white on near-black and looked exactly like bad art. It was a bad quantiser.

### Put the builder's numbers where the game reads them

The windmill's boss offset is written by `tools/build-windmill.js` into `assets/windmill.json`,
which `frames.ts` imports. A second copy typed into the TypeScript would be a second place to
drift — which is how `routable` sat two biomes behind `isWalkable` for a whole round without anyone
noticing.

### Finding a feature in an image: look, do not detect

Three automatic attempts to locate a windmill's mounting boss — darkest compact blob, most disc-like
connected component, densest brass cluster — each found something else on the building. Compositing
the two sheets at a guessed offset and looking settled it in one pass.
`tools/preview-windmill.js` exists for that and is how to re-settle it if the art changes.

Same lesson the character sheets already cost: two pixel heuristics got the walk-cycle row order
wrong on two of five travellers, and looking took a minute and was right.

---

## Prose goes stale and nothing notices

Every count in `README.md` was wrong — creatures, plants, entities, grounds, species — and it named
an `npm run` script that had never existed. Each number was true when it was written.

`test/docs.test.ts` now checks the prose against the data and refuses any `npm run x` the package
does not have. Canon's `lint_story.py` has done this to itself for longer and caught the same class
of mistake twice in one session.

**If a document makes a claim that is arithmetic about data in the repo, it can be tested, and it
should be.** Add to that test rather than fixing a number by hand.
