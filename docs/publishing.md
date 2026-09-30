# Publishing

Where the game is published, who it is published for, and what the first release taught. The plan
with every platform compared is a published page, kept current:
<https://claude.ai/artifact/2FwENKUkVryP1PKAHUi8cv>.

## Where it is

| Place | Address | Updated by |
|---|---|---|
| itch.io | <https://lordlebu.itch.io/south-of-tethys> | `release.yml`, on a `v*` tag or by hand |
| GitHub Pages | the repository's Pages URL | `pages.yml`, on every push to `main` |

**v0.1.0 went to itch.io on 30 September 2026**, from the merge of #224. Pages is the build that is
always current; itch.io is a release somebody chose.

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

## What is next

In order. The published plan carries the reasoning and the full table.

1. **Make the page public**, once the listing has a cover image and a description.
2. **A store kit** in `docs/store-kit/`: cover, screenshots, one-line pitch, description, controls,
   tags and the rating answer, written once and pasted into every listing.
3. **Measure the first load.** Nobody has measured how much of the 30 MB arrives before the first
   frame. If it is all of it, plates and scenes should load when first shown.
4. **Newgrounds and IndieDB**, by hand, from the release zip and the store kit. Newgrounds rated Teen.
5. **Installable and offline** — a web manifest and a service worker — and then the Microsoft Store,
   which is free for individuals and takes a web app by its address.
6. **Devlogs on itch.io**, drafted from canon's atlas, timeline and memory map.
7. **Jams that accept an existing game**: narrative, worldbuilding and slow-game jams only.

Open, and the owner's: whether the listing is Teen or Mature, given what canon holds; free or pay
what you want; the cover image.
