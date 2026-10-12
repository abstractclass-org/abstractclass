# Early access: Hedge School's review on the web

**Status:** decided, being built. **Decided:** 2026-10-12.

## Context

The review works on the owner's machines: import a game, and the engine reviews it in the browser. The players of
Enclosure meet in a Discord, and the site can serve them before puzzles and lessons exist. The site is static files
([02-static-site.md](02-static-site.md)), so hosting serves files only, and the engine runs on the visitor's machine.

## Decision

1. **The name: Hedge School,** for the site and the project: the pages, the README, the package and the GitHub
   repository (`hedgeschool`). The address: `hedgeschool.abstractclass.org`, on the owner's domain, so that it matches
   the name the visitor reads. The browser's storage keeps its first names (`learn-enclosure`), so that the games and
   settings a browser holds stay. The local folder keeps its name too.
2. **The scope: the review only.**
   - **The home page:** import a game, and the player's games. No sample game: a review opens on a game the player
     brought.
   - **The ways to bring a game:** a pasted record in this site's notation, a pasted export of Constellation's
     analysis board, and the meaf.us bookmarklet ([import](#constellations-export) below).
   - **The header:** the name, which leads home, then Review, and on its right The notation and About. Review opens
     the last game reviewed in this browser, and the address then names it, so a reload keeps it. With no game
     reviewed yet, it asks for one. **The footer,** on the pages that scroll (the home page and the pages about the
     site): About, The notation, Privacy, Notices, and the site's version (its commit). The review has no footer: it
     fills the window.
   - **Not in the early access:** puzzles, lessons, free analysis and the engine lab. Their addresses lead home. Their
     code stays, for the full site.
3. **One build switch:** `VITE_EDITION=early` builds the early access. Without it, the build is the full site, for
   development.
4. **Unlisted:** `robots.txt` disallows every page, and every page carries `noindex`. The address is shared by hand,
   in the Discord, which is also where players report problems.
5. **Hosting: Cloudflare Pages,** built from the private GitHub repository on every push to `main`:
   - **The build command,** `npm run build:cloudflare`: it fetches the engine from its GitHub Release (`npm run engine
     -- --deploy`, which refuses local engine files), runs the tests and the type check, then builds into `build/`.
     Pages installs the dependencies first (`npm ci`).
   - **Node 24** (`.node-version`): Pages' build image has Node 22.16 by default, which cannot run the tests' TypeScript
     without a flag.
   - **The build's variables:** `VITE_EDITION=early`, `VITE_GA_ID` and `VITE_CF_ANALYTICS_TOKEN` (item 7). Pages names
     the commit (`CF_PAGES_COMMIT_SHA`), which the footer shows.
   - **The headers** (`static/_headers`): `noindex` on every file, and a year's cache, never checked again, for the
     build's hashed code (`/_app/immutable/`) and the engine's files (`/engine/<id>/<file>`): their paths name their
     content, so a file there never changes. `/engine/manifest.json` keeps the default check on each load.
   - **A 404 page** (`404.html`, adapter-static's fallback): without it, Pages serves the home page for any unknown
     address.
   - **The size:** 69 files, 29 MB. Each file is under Pages' limit of 25 MiB (the larger network is 20.6 MB).
   - A build from a clean clone, as Pages makes it, was run on the owner's machine: the engine downloaded, the tests
     and the type check passed, the site built.
6. **The engine:** a GitHub Release of `enclosure-engine`, a public repository that holds only the engine's
   releases, while the engine repository stays private
   ([requests/03-release-artifacts.md](../requests/03-release-artifacts.md)). The release has the module, both
   networks, as the engine settings offer both, and a notice of the licences of what is compiled into the module.
   The site ships that notice beside the module, and the notices page lists the works and links to it.
7. **Analytics: Cloudflare's and Google's.** Cloudflare's sets no cookies. Google Analytics runs in Google's consent
   mode, advanced form: the Google tag loads on every page with its cookies denied, and sends cookieless pings until
   the visitor accepts. A banner asks once, with Accept and Decline alike. The privacy page shows the choice, can
   change it, and names what the pings hold. Neither service sees a game: the bookmarklet hands a game to the import
   page in the address's fragment (after `#`), and that page removes it before it starts them. Every other page
   starts them from the layout. The build names the services (`VITE_GA_ID`, `VITE_CF_ANALYTICS_TOKEN`). Without
   them, as in development, nothing loads.
8. **The notation page:** a full description of the position notation and the game record notation, written so that
   other developers can follow it, as PGN's standard describes PGN. The notations are decided in the engine
   repository's design (its `docs/design/04-notation-and-protocol.md`). That repository is private, so this page is
   their public description. A change is decided there first, then the page follows
   ([requests/11-notation-page.md](../requests/11-notation-page.md)).
9. **The labels:** as built (design 10), with no note that they may change. They are computed again from the stored
   analyses whenever the page opens, so a later change reaches every stored game without a new search.

### Constellation's export

Constellation's analysis board (`constellation.blueshrimp.uk/#analysis`) exports a game as one line: the start, then
one item for each turn, separated by spaces.

```
[B:A10-D10 R:P10-S10] D10-A7 P10-M10-J7 A7-A10,A7-D4 J7-L10-J13 …
```

- **The start:** `[B:… R:…]`, Blue's and Red's edges. The site imports games from the standard start only.
- **A turn:** one edge (`D10-A7`), two edges that meet, written as a path (`P10-M10-J7`: P10-M10, then M10-J7), or
  two edges apart, separated by a comma (`A7-A10,A7-D4`).
- **Points:** columns `A` to `S`, with `I`; rows `1` to `19`. This site's columns are `A` to `T` without `I`, as GTP's,
  so a column keeps its place in the alphabet that skips `I`: `P` is `Q`, `M` is `N`, `J` is `K`. The rows count
  from the bottom on both sites (checked on Constellation's board).
- The import turns the export into this site's record (`[Site "Constellation"]`, then the turns), which the engine
  checks and the site keeps like any other record.

## Alternatives

- **A sample game,** to show the review before a player imports one: a bot game is not the player's own, and the
  early access is for players who bring their games.
- **A public repository:** later. **The free `pages.dev` address:** the owner's domain is the lasting one.
- **Listed in search engines:** after the first players' reports.
- **A note that the labels may change:** not needed, since a change reaches stored games by itself.
- **No Review link:** a bare link led to a review with no game. Opening the last game reviewed gives the link a use.
- **Google's consent mode, basic form:** no Google tag until the visitor accepts. The advanced form's modeling needs
  1,000 events a day from visitors who decline and 1,000 daily users who accept, so a small site gains little from it.
- **Cloudflare's automatic Web Analytics** (one click on a Pages project): it adds the beacon to every page as it is
  served, so the beacon would start before the import page removes a record from the address.

## Consequences

- The steps are in the handoff while they run, and in decisions/open-items.md when they wait.
- The site's name changes in the pages. The bookmarklet's link text says Hedge School.
- A game that Constellation exports from another start cannot be imported yet.

## Where it is

- The switch, the name and the version: `src/lib/edition.ts`, `vite.config.ts` (the commit). The last game reviewed:
  `src/lib/game/store.ts`, read by `src/routes/review/+page.svelte`. The hidden pages:
  `src/routes/{puzzles,learn,lab/engine}/+page.ts`. Unlisted: `static/robots.txt`, `src/routes/+layout.svelte`.
- The import of Constellation's export: `src/lib/game/constellation.ts`, with its tests.
- The pages: `src/routes/{about,notation,privacy,notices}/+page.svelte`, `src/lib/SiteFooter.svelte`,
  `src/lib/prose.ts` (their text style).
- Analytics: `src/lib/analytics.svelte.ts`, `src/lib/ConsentBanner.svelte`, started in `src/routes/+layout.svelte` and
  `src/routes/import/+page.svelte`.

## Log entries

- [decisions/product.md](../decisions/product.md): "Early access: the review only, as Hedge School", "Early access:
  the second round", "Google Analytics in Google's consent mode, advanced", "Early access: the third round"
  (2026-10-12).
