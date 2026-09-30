# Publishing

Where the game is published, who it is published for, and what the first release taught. The plan
with every platform compared is a published page, kept current:
<https://claude.ai/artifact/2FwENKUkVryP1PKAHUi8cv>.

## Where it is

| Place | Address | Updated by |
|---|---|---|
| itch.io | <https://lordlebu.itch.io/south-of-tethys> | `release.yml`, on a `v*` tag or by hand |
| GitHub Pages | the repository's Pages URL | `pages.yml`, on every push to `main` |

**v0.1.0 went to itch.io on 30 September 2026**, from the merge of #224, and the page was made
public the same day. Pages is the build that is always current; itch.io is a release somebody chose.

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
- **Rating.** Teen or above wherever a platform asks. Never "everyone".
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

What is left is 0.62 MB of code and data and 3.88 MB of ground: `terrain` alone is 1.6 MB and
`places` 0.7. The animals that remain are 0.3–0.6 MB a view, at up to 740 pixels across for a
figure drawn at about 100. Both are a question for the art pipeline rather than the loader, and
neither has been touched.

## The store kit

[`docs/store-kit/listing.md`](store-kit/listing.md) holds the name, the one-line pitch, the
description, the controls, the tags and the rating answer, and beside it the five screenshots
`npm run store:shots` takes from the built game. Paste from it; do not write a listing afresh.

`other-listings.md` says which field takes which piece on Newgrounds, IndieDB and the Microsoft
Store, and `devlog-01.md` is a first devlog, drafted for the owner to put into their own words.

## Installable

From the release after v0.1.0 the game can be installed from the browser and opened again with no
connection. Four files agree to make that so: `public/manifest.webmanifest`, the two icons it names
(`python tools/build-icons.py` cuts them from Varuna's own sprite), the link in `index.html`, and
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

## What is next

In order. The published plan carries the reasoning and the full table.

1. **Release v0.1.1**, which carries the lighter first load and the installable build to itch.io.
2. **Post the first devlog**, from `store-kit/devlog-01.md`.
3. **IndieDB and Newgrounds**, by hand, from `store-kit/other-listings.md`. Read Newgrounds' rule on
   AI-made art in games before submitting there.
4. **The Microsoft Store**, from the same file, once Pages is serving the installable build.
5. **The weight of the ground and the animals**, above: 1.6 MB of terrain, and paintings several
   times the size they are drawn at.
6. **Jams that accept an existing game**: narrative, worldbuilding and slow-game jams only.

Open, and the owner's: whether the listing is Teen or Mature, given what canon holds; free or pay
what you want.
