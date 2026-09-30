# Other listings

What to put where, for the places after itch.io. Everything quoted here comes from
[listing.md](listing.md); this file only says which field takes which piece. The field names are as
remembered and not checked against each site's form on the day — where the form differs, the form
is right.

## Newgrounds

An adult audience that values hand-made art, and every entry carries a rating. Upload by hand; there
is no automated route.

| Field | Put in it |
|---|---|
| File | `south-of-tethys-<version>.zip` from the Release run's artifacts. `index.html` is at its root, which is what Newgrounds expects. |
| Title | South of Tethys |
| Dimensions | 960 × 600, and allow fullscreen and touch |
| Icon / thumbnail | `cover.jpg`, cropped square by their uploader round the traveller |
| Description | The **Short description** from `listing.md` |
| Author comments | The **Full description**, without the HOW TO PLAY block if there is a separate controls field |
| Genre | Adventure |
| Tags | exploration, worldbuilding, relaxing, pixel-art, nature, story |
| Rating | **Teen.** Violence: none. Nudity: none. Language: none. Adult themes: mild, for the wider history the world refers to. |
| AI disclosure | Yes. Newgrounds asks, and restricts AI-generated art in its Art Portal; read the current rule for games on the upload form before submitting, because it has changed more than once. |

**The AI rule is the one thing that could stop this listing.** The paintings in the game came from
image models. If Newgrounds' rule for games on the day forbids that, do not submit and do not answer
otherwise — leave this one out.

## IndieDB

A catalogue read by people who follow how a game is made. A page there links to the itch.io build
rather than hosting it, and is approved by staff before it shows.

| Field | Put in it |
|---|---|
| Name | South of Tethys |
| Summary | The **One line** from `listing.md` |
| Description | The **Full description** |
| Genre | Adventure |
| Theme | Nature, or History if Nature is not offered |
| Players | Single player |
| Project | Indie |
| Engine | Phaser (listed as a custom or HTML5 engine if Phaser is not offered) |
| Platform | Web |
| Release status | Released, early access |
| Homepage | <https://lordlebu.itch.io/south-of-tethys> |
| Box shot / header | `cover@2x.jpg` |
| Screenshots | The five, in order |
| Contact / social | <https://x.com/landofmyst> |

IndieDB rewards pages that post. The devlog in [devlog-01.md](devlog-01.md) is written to be posted
there as the first article as well as on itch.io.

## Microsoft Store

Free for an individual, and takes an installable web app by its address. It needs the game to be
installable first, which it is from the release after v0.1.0 — see *Installable* in
[publishing.md](../publishing.md).

1. Register as an individual developer at <https://storedeveloper.microsoft.com/> and reserve the
   name **South of Tethys**.
2. Open <https://www.pwabuilder.com/>, give it the Pages address of the game, and let it report on
   the manifest and the service worker.
3. Choose **Package for stores → Windows**, fill in the publisher details Partner Center gave in
   step 1, and download the package.
4. Upload the package in Partner Center. The listing takes the **Short description**, the **Full
   description**, the five screenshots and the cover.
5. Answer the age-rating questionnaire for what is in the game: no violence, no gambling, no user
   interaction. Expect a rating of 3+ or 7+ from the questionnaire itself; the *audience* is still
   teens and adults, and the description says so.

Use the **Pages** address and not the itch.io one: itch.io serves each release from a new path, and
the store package points at one address for good.
