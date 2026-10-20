# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated: plain static HTML and CSS, with no framework and no build step. The hub is one page and a 404 page. The
deploy uploads `apps/hub/public` as it is to its own Cloudflare Pages project. The text is in the system's sans, as
Hedge School's is, so the hub ships no font files. A build would add a dependency and a check for a page that has
nothing to compile.

## Users

Players first: people who already play one of the games and type or follow the bare domain `abstractclass.org` (from
the Enclosure players' Discord, from strategyjam.org after a jam, from a link in a site's footer). They want the site
for their game, fast. Second, a newcomer who reaches the domain by chance: one or two lines must tell them what each
game is and what its site does for them.

## Product Purpose

abstractclass makes free learning sites for abstract strategy games. Each site has an engine trained for its game,
and the engine runs in the visitor's browser. The hub at `abstractclass.org` is the organization's front door: one
page that names each site, says in a line or two what the game is and what the site does, and sends the visitor on.
Success: a visitor reaches the right site in one click, and a newcomer understands what each site offers.

## Positioning

Each site teaches one game with its own engine, trained for that game and run on the visitor's own computer: a
review of your own games, move by move, for games too new or too small to have one elsewhere.

## Operating Context

- **Hedge School** (`https://hedgeschool.abstractclass.org`): helps players learn Enclosure, the game of edges and
  enclosed regions played on strategyjam.org, meaf.us and Constellation (Hedge School says so, the hub does not).
  Practice against the engine (HedgeFund) at a
  chosen strength, review a game you played (where it turned, which turns cost you, what was better), the Analysis
  board and a board editor. Early access. Free. The engine runs in the browser.
- **A strategy-jam game's site** follows after 2026-10-24 (beads abscls-8tl1), at `<game>.abstractclass.org`. It
  analyzes the new game's games with its released network, in the visitor's browser. Its game and name are unknown
  until the jam's rules come out. The page must take a second entry, and later more, with no redesign.
- Visitors arrive on phones and desktops, in light and dark system themes.

## Capabilities and Constraints

- No analytics, no cookies, no storage, and no request to another host. So no consent banner and no privacy page.
- Security headers in a Cloudflare Pages `_headers` file. Search engines index the live address only: Cloudflare's
  own addresses for the project answer with `noindex`, as Hedge School's do.
- A 404 page.
- The text invites and persuades: plain web writing, as the GOV.UK style guides give it. It claims only what is true.
  Interface text says "Analyze", and names each thing by what it does for the visitor, never by an internal name.
- Each entry invites: to learn, for a player who knows the game, and to try it, for one who does not. It is not a
  "Play now" games portal.

## Brand Commitments

- **The name on the page is "Abstract Class":** two words, capitalized. The domain, the GitHub organization and the
  documents keep `abstractclass`.
- **One look for the hub and the game sites:** the hub looks like a Hedge School page (its page and panel colours,
  its lines, the system's font, its board drawing). The second game's site will take the same parts (design 26, item
  4).
- **Lavender is the accent of Abstract Class and of Hedge School** (`#6f5aa8` light, `#b8a6e8` dark, design 12),
  used sparingly. It stays a token, out of every raster image, so that a sibling site can take another accent later
  by a change of two values. The hub's tab icon (`public/icon.svg`) writes it as a literal, so it changes with them.
- **Hedge School's collie** (`apps/hedgeschool/static/brand/hedge-school.svg`): its terms allow it, unchanged but for
  its size, only in a button or a link that leads to Hedge School. Black and white, never as a negative.
- **No programmer's pun** on the name: no code braces, no `class Game { }`, no monospace jokes.

## Evidence on Hand

- Hedge School's real facts (its About page, its home page), its collie mark, its share card
  (`apps/hedgeschool/static/brand/card.png`), and its board drawing (a 19 × 19 lattice of dots, blue and red edges).
- A real position that Hedge School's home page already shows (`apps/hedgeschool/src/lib/home/still.json`: a game
  between bots, with no names).
- No player counts, testimonials, ratings or press. Do not invent them.
- The jam game's name, rules and look do not exist yet.

## Product Principles

1. **Route first.** The page exists to send a player to their game's site in one click.
2. **Every site is equal on the hub.** Each entry has the same anatomy (a drawing of its board, its name, a line on
   the game, a line on the site), so the next site joins as a new entry, not a redesign.
3. **Claim only what holds.** Say what each site does today. "Free" and "runs in your browser" hold for every site.
4. **Nothing leaves the page.** No tracking, no third-party request, nothing kept in the browser.

## Accessibility & Inclusion

Text contrast of at least 4.5:1, as Hedge School's tokens keep, in both colour schemes. Works with a keyboard, at 200%
zoom, and with reduced motion.
