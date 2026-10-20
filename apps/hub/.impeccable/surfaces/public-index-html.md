---
version: 1
slug: "public-index-html"
primary_target: "public/index.html"
related_targets: ["public/404.html"]
---

# The hub's front page

**Scope:** `public/index.html` (the hub at `abstractclass.org`) and `public/404.html`. **Mode:** Persuade.

- **Audience and job:** players who know their game and want its site, first; a newcomer who wants to know what each
  game is, second (PRODUCT.md).
- **Action:** one click to the game's site: "Learn <game>" for a player, "Try a practice game" for a newcomer.
- **Proof:** each game's board plays a real scene: edges placed one by one, regions filling, and the review's moment
  (the engine's better edge, then the played edge marked Mistake). No counts, quotes or claims beyond the sites' own.
- **Constraints:** Hedge School's look, no script, no storage, no request to another host.
- **Chosen structure:** "The game first, one column", locked from the second hand with the steer: "Game name first and
  largest, site name second and smaller. The game board should probably be animated."
- **Unresolved:** Abstract Class has no mark yet: the favicon is a plain monogram until it has one. No share image.
- **The build's adaptations of the contract,** accepted in the finish review: the board is 320 pixels, with badges
  at 1.4 times Hedge School's, so that the review's moment reads; the entry stacks below 52rem.
- **Changed after the build:** the hub names no website where a game is played (no "Played on" line), no game's
  credit in the footer, and no address in plain text. These belong to each game's site.
- **The roll:** the surface roll ran from the skill's catalog (source "api"). This skill version (4.5.2) prints no
  SEED REFERENCE line. A later `--check-seed` call, which this version does not have, dealt a hand that was
  discarded, and the build's roll was reproduced into `.impeccable/questions/roll.json`.

## Direction contract

THESIS: One calm column of games. Each entry leads with the game's name, because a player knows the game before the
site. It refuses the landing-page hero and the row of equal cards.

OWN-WORLD: Hedge School's tokens: the warm page `#f6f5f2` (dark `#1d1e21`), ink, muted grey, hairlines `#dddad3`, the
system's sans, lavender only on the actions. The board as Hedge School draws it: sand ground, dot lattice, blue and red
edges, regions at 16%.

STORY: The visitor reads "Abstract Class" and one line, finds their game's name, sees its board play, and clicks
"Learn Enclosure". A newcomer reads two lines and takes "Try a practice game".

FIRST VIEWPORT: A 760-pixel column. At top, the wordmark at 24 pixels and the line at 17. Under a hairline,
"Enclosure" at 64 pixels, "at Hedge School" at 20, two lines,
the lavender "Learn Enclosure" and the quiet "Try a practice game". The board, 280 pixels, at left of the text, playing.

FORM: The game first, one column, sixth of the second hand's seven (the dealt lead); seed: none (unavailable).
Signature interaction: the board replays a real scene edge by edge in CSS, pauses under the pointer, and holds the
Mistake. Motion grammar: an edge draws from one end to the other in 0.35 s, ease-out; a region fades in. Reduced
motion: the moment, still.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and
every shipping raster carrying its provenance
