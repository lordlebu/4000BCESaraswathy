# Publishing

Where the game is published, who it is published for, and what the first release taught. The plan
with every platform compared is a published page, kept current:
<https://claude.ai/artifact/2FwENKUkVryP1PKAHUi8cv>.

## Where it is

| Place | Address | Updated by |
|---|---|---|
| itch.io | <https://lordlebu.itch.io/south-of-tethys> | `release.yml`, on a `v*` tag or by hand |
| GitHub Pages | the repository's Pages URL | `pages.yml`, on every push to `main` |
| GitHub Releases | the repository's Releases page | `release.yml`, on a `v*` tag: the same zip itch.io was sent |
| Lore portal | <https://south-of-tethys-canon.vercel.app/> | the canon repo's `deploy-canon-service.yml`, on every canon change |

**v0.1.0 went to itch.io on 30 September 2026**, from the merge of #224, and the page was made
public the same day. **v0.1.1** followed that evening from #226: the lighter first load, the store
kit, the installable build and the princess icon. **v0.1.2**, on 1 October from #227, squeezes every
painting losslessly, links the canon panel into the lore portal, and is the first release also
published on the repository's Releases page. Pages is the build that is always current; itch.io is
a release somebody chose.

The lore the game does not ship is read at <https://south-of-tethys-canon.vercel.app/>, the canon
service's own page, published from the canon repository with every canon change. The in-game canon
panel links each entry it names to it.

Players reach the owner at <https://x.com/landofmyst>. It is in the listing's description, and
belongs in every new listing.

## Who it is for

The owner's ruling, 30 September 2026: **teens and adults, and older players in particular.** This
is a slow game about a layered world. It is not an action game and it is not for children.

That decides three things on every listing, and it overturned the first draft of the plan, which
had recommended the ad-funded portals:

- **Where.** Storefronts and communities where adults browse by theme: itch.io, Newgrounds, IndieDB,
  the Microsoft Store, and Steam once the game is sold. Never Poki, CrazyGames, Y8, Coolmath Games
  or the ad networks that syndicate a game to sites nobody chose — their catalogues are built
  around quick action games for a young audience.
- **Rating.** **Teen**, on the owner's ruling of 1 October 2026, wherever a platform asks. Never
  "everyone".
- **Price.** **Free**, on the same ruling. No payments and no donation prompt on itch.io.
- **Words.** The pitch leads with the world and its history. Tags say worldbuilding, exploration,
  story-rich and slow, and do not say action or casual.

## The itch.io listing, as it was set

Recorded because none of it lives in the repository and all of it would have to be remembered.

| Field | Value |
|---|---|
| Kind of project | HTML |
| Genre | Adventure (not Visual Novel, which the form offered) |
| Tags | exploration, worldbuilding, story-rich, atmospheric, relaxing, cozy, crafting, procedural-generation, 2d, singleplayer |
| AI disclosure | Yes: graphics, text and dialogue, code. Not sounds — the build has no audio. |
| Embed | In page, 960 × 600, set by hand |
| Mobile friendly | On |
| Start on page load | Off. The game is 30 MB; a visitor who does not press Run does not download it. |
| Fullscreen button | On |
| Scrollbars, SharedArrayBuffer | Off |
| Community | Comments |

960 × 600 is the size the build was tested at, served from a nested path inside an iframe the way
itch.io serves it. The AI disclosure is Yes because it is true; itch.io filters on it and can
delist a project that answers otherwise.

## Releasing

```bash
git tag -a v0.2.0 origin/main -m "v0.2.0: what changed"
git push origin v0.2.0
```

or **Run workflow** on the Release workflow in the Actions tab. butler sends only what changed since
the last push. Every run also keeps `south-of-tethys-<version>.zip` as an artifact, with
`index.html` at its root, for the places that take an upload by hand.

`ITCH_TARGET` is a repository **variable**, `lordlebu/south-of-tethys` — the username and the
project's URL slug, nothing else. `BUTLER_API_KEY` is a repository **secret**. Put the target under
Secrets and the publish step is skipped; put the key under Variables and butler gets nothing.

## What the first release taught

Three things stopped it, none of them in the build, and each looks like something else.

**itch.io will not take a build from an account whose email is unverified.** butler fails in about a
second with `itch.io API error (400): /wharf/builds: Please verify your account's email address
before uploading a build`. A one-second failure reads as a bad key, and that was the first guess;
the key was fine. Verify at <https://itch.io/user/settings>.

**butler cannot mark the upload as playable.** After the first push the page says *You've selected
a HTML5 game but haven't configured how your project is embedded*. On the project's edit page, tick
**This file will be played in the browser** on the `html5` upload. The tick is remembered for the
channel, so this is once.

**Embed options set before that tick do not hold.** The embed section only exists while a file is
marked playable. Set the options after ticking, and save.

**A step's log cannot be read without a GitHub login.** The public API gives each step's result and
its annotations, and the annotation for a failed shell step is only `Process completed with exit
code 1`. From a session without `gh`, the error text has to be pasted by somebody who can open the
run.

**Re-running without a login means re-pushing the tag.** Deleting and pushing the same tag on the
same commit starts a fresh run and loses nothing. With a login, *Re-run failed jobs* is simpler.

## Saves do not travel

A journey is saved in the browser, under the address the game is played at. One started on Pages
does not appear on itch.io. That is acceptable while the two have separate audiences; if it stops
being, the answer is exporting and importing a save as text.

## What a player downloads first

`dist/` is 30 MB, and for a day that was taken to be the cost of opening the game. It is not.
Plates, scenes, portraits and faces are fetched when a panel first shows them. Measured by
`npm run measure:load`, 30 September 2026, in MB on the wire:

| Map | Before | After |
|---|---|---|
| Lothal, where a journey starts | 8.56 | **4.50** |
| Narmada | 8.56 | 7.24 |
| Dwarka | 8.56 | 5.82 |
| Aravali | 8.56 | 4.50 |

The difference is the painted animals. `preload` loaded every map's — twelve files, 4.05 MB — on
the reasoning that they would be "a few KB each", and the first map has none. It now loads the
ones that walk the map being drawn.

### Squeezed in the build, losslessly

The paintings are written by nine builders, each with a small PNG encoder of its own that neither
chooses a filter per row nor asks zlib for its best. `tools/squeeze-png.js` re-encodes every PNG on
its way into `dist/` -- adaptive filters, an opaque alpha channel dropped, the highest deflate level
-- then decodes its own output and ships the original if a single pixel differs. The files in the
repository are not touched, so no art changes and git keeps no second copy of 240 binaries.

| Map | Before | After |
|---|---|---|
| Lothal | 4.50 | **3.89** |
| Narmada | 7.24 | 5.70 |
| Dwarka | 5.82 | 4.72 |

The whole build went from 26.6 MB of paintings to 23.6. The cost is build time: about 35 seconds
more, on every build CI makes.

### What is left, and why it was not taken

**The animal paintings are not oversized.** An earlier note here said they were several times the
size they are drawn at. That is true at the default zoom and false at the closest: four zoom steps
take a sivatherium drawn 193 pixels tall to 772, from a painting 694 tall. Shrinking them would
blur the animals exactly when a player leans in to look.

**The two further savings both change the art, so they are the owner's call:**

| Option | `terrain.png` | What it costs |
|---|---|---|
| Today, squeezed | 1,316 KB | nothing |
| WebP, lossless | about 880 KB | a new image encoder in the build, a dependency |
| Quantised to 256 colours | about 200 KB | the painting: fifty thousand colours become 256 |

Quantising is the large one -- roughly a sixth of the weight -- and it is a change to how the ground
looks, which is not a thing to do to somebody's art on the grounds of a number.

**Ruled on 1 October 2026: no quantising.** The ground keeps its colours. Do not propose it again on
the grounds of weight; the lossless squeeze is where this stops.

## The store kit

[`docs/store-kit/listing.md`](store-kit/listing.md) holds the name, the one-line pitch, the
description, the controls, the tags and the rating answer, and beside it the five screenshots
`npm run store:shots` takes from the built game. Paste from it; do not write a listing afresh.

`other-listings.md` says which field takes which piece on Newgrounds, IndieDB and the Microsoft
Store, and `devlog-01.md` is a first devlog, drafted for the owner to put into their own words.

## Installable

From the release after v0.1.0 the game can be installed from the browser and opened again with no
connection. Four files agree to make that so: `public/manifest.webmanifest`, the two icons it names
(`python tools/build-icons.py` cuts them, the tab's `favicon.ico` and the rest from the owner's
painting of the Asura-Tainted Princess, kept at 512 pixels as `assets/icon.png`), the link in `index.html`, and
`tools/service-worker.js`, which the build stamps and writes to `dist/sw.js`.

**It keeps what the player has been sent, and nothing else.** Fetching all 30 MB up front to be
"fully offline" would multiply the first visit by seven. Offline, the game opens and plays on any
ground already walked; a plate never seen waits for a connection.

**The page is fetched from the network first**, and from the cache only when there is none.
Answered cache-first, a returning player is handed last release's page for ever. **The cache is
named for the build**, and a new build deletes the old one — which matters most on itch.io, where
every release is served from a new path on the same origin and would otherwise leave its whole
cache behind.

`test/installable.test.ts` holds the four files to each other. What it cannot see is a browser, so
this was checked by hand on 30 September 2026: served from a nested path, the worker took control,
kept 43 files, and with the server stopped and the browser offline the game reopened and drew. Do
that again after changing the worker.

The worker runs in production builds only. The browser suite runs against the dev server and never
meets it.

## Jams

Looked for on 1 October 2026, and **the honest answer is that jams are a poor fit for this game.**
Two rules, common to most of them, each rule it out:

- **Most want work made during the jam.** The Hallo-Horror and Cozy Fall jams allow old code and
  assets but not a finished game; an existing project is a submission only to the few jams that say
  so outright.
- **Many refuse generative AI, and say so in the rules.** The paintings here came from image models.
  The *Finish Your Game* jam -- run every November by Portland Indie Game Squad, unjudged, and the
  one jam whose whole point is an existing project -- states that games "made with or featuring
  Generative AI ... will not be accepted". That rule is the jam's to make, and the answer is not to
  enter rather than to argue the disclosure.

So a jam is entered only when its page says both that an existing project is welcome and nothing
against AI-made art, and the theme is one this game already answers. None open now does. Check the
rules page, not the jam's summary, every time; they change between years.

## What is next

**Done:** the itch.io description carries the READ THE WORLD section and links the lore portal
(1 October 2026).

**Waiting on the owner, by hand, because none of them can be published from git:**

- **IndieDB and Newgrounds**, from `store-kit/other-listings.md`. Neither has an upload API. Read
  Newgrounds' rule on AI-made art in games before submitting there.
- **The Microsoft Store**, from the same file. It needs a developer account and a name reserved in
  Partner Center before anything can be automated, and the first submission is by hand in any case.
  Once it is listed, an update could be pushed from `release.yml`; that is worth doing then and not
  before.

Everything that *can* go from git already does: Pages on every merge, itch.io and GitHub Releases
on every `v*` tag, and the lore portal on every canon change.

**Ruled, 1 October 2026:** no quantising of the ground art; and the lore portal shows every field of
every entity, `notes` included, guarded so that nobody can use up its free plan -- see *The lore
reader is the portal on Vercel* in the canon repository's `docs/decisions.md`.

**Ruled, 1 October 2026:** rated **Teen**, and **free**. Nothing in publishing is waiting on a
decision now; the Microsoft Store waits on the owner's time, by choice.