# Search engines and link previews

**Status:** in force. It replaces design 11's item 4 (unlisted). **Decided:** 2026-10-14.

## Context

The early access was unlisted (design 11): `robots.txt` disallowed every page, every file answered with
`X-Robots-Tag: noindex`, and every page carried a `noindex` meta tag. The address was shared by hand, in the Discord.

- **A player who searches for Enclosure** does not find the site.
- **A link pasted in the Discord** shows no preview: the pages have no Open Graph tags, and no description.
- **The blocks worked against each other.** `Disallow` stops the crawl, so a search engine never reads the `noindex`.
  A page that another site links to can then show in results as a bare address.

The early access stays: the About page says that everything can change (design 11).

## Decision

1. **The live address is indexed.** `robots.txt` allows every page and names the sitemap. The live pages carry no
   `noindex`.
2. **Cloudflare's own addresses are not:** `hedgeschool.pages.dev` and each preview (`dev.hedgeschool.pages.dev`, a
   commit's hash) answer with `X-Robots-Tag: noindex` (`static/_headers`, Cloudflare's own pattern). Each page also
   names its live address as canonical. So no copy of a page competes with the live one.
3. **Each page names itself** (`src/lib/PageMeta.svelte`):
   - **The title:** the page, then the site: "Board editor · Hedge School". The home page: "Hedge School: learn
     Enclosure", since "Hedge School" alone says nothing to a stranger.
   - **The description,** at most about 160 characters, for the search result's snippet and the preview. It names
     Enclosure, and meaf.us where the page is about its games.
   - **The canonical address** on the live site, and Open Graph's title, description and address.
4. **The tags that every page shares** (`src/routes/+layout.svelte`): the site's name, the type, the preview image, and
   Twitter's large card, which Discord reads too.
5. **The preview image:** 1,200 × 630 pixels, Open Graph's size (`static/brand/card.png`). It shows a corner of a
   board, the collie, "Hedge School", "Learn Enclosure" and the address, in the site's dark theme. Edge draws it from
   `scripts/social-card.html`, whose comment gives the command.
6. **Pages kept out:** `/import`, an address that forwards (design 22), and the pages of the full site that the early
   access does not build (`/puzzles`, `/learn`, `/lab/engine`) carry `noindex`.
7. **The sitemap** (`/sitemap.xml`, prerendered): the pages that a visitor opens. Home, the Review tab, the Analysis
   board, the board editor, How a review works, Tools, the notation, About, For developers, Privacy and Notices.
8. **Structured data** on the home page (schema.org, as JSON-LD): a website, and a web application that is free.
9. **`/review` prerenders as the Review tab:** its address holds no game, so search engines read the Review tab's
   title, description and text (design 22, "The Review tab"). Once a game opens, the title is "Game review".
10. **The owner registers the site** in Google Search Console, as a Domain property, verified by a DNS record at
    Cloudflare, and submits `https://hedgeschool.abstractclass.org/sitemap.xml`. Bing Webmaster Tools can import the
    site from Search Console.

## Why

- **Discord is where players meet:** a link with a card says what the site is before anyone opens it.
- **Players search:** a page that names Enclosure and meaf.us answers their search.
- **Google's rules:** a `noindex` works only on a page that Google may crawl, and a canonical address joins the copies
  of a page into one result.
- **The words that rank are on the pages with text:** the notation, About, Tools, and later the page that explains the
  review and the lessons. The review, the board and the editor are tools with little text.

## Alternatives

- **Unlisted until the early access ends** (before): a changing site stays out of results, but players cannot find it.
- **`noindex` by the build, on previews only** (Pages names the branch at build time): it covers the pages, not every
  file, and needs a build switch. The headers cover every file of every Cloudflare address.

## Where it is

- `src/lib/PageMeta.svelte` (each page's tags), `src/routes/+layout.svelte` (the shared tags), the pages' own
  `PageMeta`, `src/lib/edition.ts` (`SITE_ORIGIN`).
- `static/robots.txt`, `static/_headers`, `src/routes/sitemap.xml/+server.ts`.
- `static/brand/card.png`, drawn from `scripts/social-card.html`.
