# The stack: SvelteKit, Vite, Cloudflare, and pinned engine artifacts

**Status:** in force. **Decided:** 2026-10-09.

## Context

The site is static files, and the engine runs in the visitor's browser in Web Workers
([02-static-site.md](02-static-site.md)). The interface is custom whatever the framework: an SVG board, a move tree,
a margin graph, and an analysis panel that updates while workers search. Each first visit downloads the engine's
module and network: 7.6 MB for b10c128, 21.7 MB for b15c192. The engine and its networks are still in training, so
new builds arrive often.

## Decision

- **Language:** TypeScript everywhere. The engine's messages and the analysis data have typed shapes.
- **Framework:** Svelte with SvelteKit, built to static files (`@sveltejs/adapter-static`). Each product area
  (review, puzzles, training) is a route, and each page is pre-rendered.
- **Build tool:** Vite (inside SvelteKit). It bundles each Web Worker as a module script.
- **Styles:** Tailwind CSS 4 (`@tailwindcss/vite`), as utility classes in the markup. The colour tokens in `src/app.css`
  are Tailwind's only colours (`bg-panel`, `text-muted`, `border-line`), and dark mode follows the tokens. The page's
  `data-theme` (`light` or `dark`) chooses the tokens, and Tailwind's `dark:` follows it: the theme menu sets it
  (`src/lib/theme.svelte.ts`), and with no choice it follows the system's theme. Plain CSS stays where utilities read
  worse: the board's SVG styles (`Board.svelte`), the review page's layout grid with its `calc()` board size (design
  06), and the tokens and base element styles in `app.css`. Links are underlined unless they are not in running text
  (`no-underline`). A page's `main` uses `box-content`, so its `max-w-*` limit is the width of its content.
- **Components with keyboard and focus behaviour:** Bits UI 2 (`bits-ui`), a headless library for Svelte 5. It gives
  the roles, the keys and the focus handling, and leaves the styles to Tailwind. The review's tabs and its display
  menu use it (`Tabs`, `Popover`).
- **Hosting:** Cloudflare (Pages, or Workers static assets). Files larger than 25 MiB go to Cloudflare R2.
- **The engine's artifacts** (a WebAssembly build and a model) are pinned in a lock file, `engine.lock.json`:
  - Each artifact has an ID (the build's name, such as `b10c128-s66625408-d13350730`), a source, its SHA-256 and
    its size.
  - A source is a **release** (a tag and an asset of a GitHub Release of `enclosure-engine`, the public repository
    that holds only the engine's releases, since the engine repository is private) or a **local** path (a file in
    `../enclosure`).
  - `npm run engine` gets each artifact, checks its SHA-256, and puts it in `static/engine/<ID>/`. It writes
    `static/engine/manifest.json`, which the site reads to find the files and to name them in its results.
  - **Development may use local sources,** to try a build in the engine repository's `runs/` before it is released.
    The lock file in Git points at a release.
  - **A deploy uses releases only.** The deploy refuses a local source. Data that ships (precomputed analyses,
    puzzles) must come from a released build, because the release keeps the exact file that made it.

## Why

- **Svelte:** it compiles to small bundles with little runtime, and its fine-grained updates suit results that stream
  in from workers. SvelteKit gives routing and pre-rendering, which a static site needs.
- **Tailwind:** the styles sit with the markup they style, on one spacing and type scale. It is the method that the
  site's maintainer reads and writes most easily. Svelte's scoped CSS already kept styles from leaking, so this is a
  choice of method, not a fix.
- **Vite:** the standard tool. It handles `new Worker(new URL(...))`, asset URLs and the dev server.
- **Cloudflare:** a free plan with no stated bandwidth cap, and custom cache headers. The engine files are large, and
  bandwidth is the main cost of a static site that ships them. A file may be 25 MiB, so b15c192 (21.7 MB) fits.
- **Releases for deploys:** a release is immutable and reachable from CI. Every stored result names the build that
  made it, and the release lets anyone get that build again.
- **Local sources for development:** a release for every training checkpoint is too much ceremony. The SHA-256 still
  names the exact file.

## Alternatives

- **React with Vite:** the largest ecosystem, but a larger runtime and more boilerplate.
- **No framework (the Lichess way, TypeScript with Snabbdom):** the smallest output, but routing, state and components
  are ours to write.
- **Svelte's scoped CSS only** (the site's first styles): no dependency, and SVG and `calc()` layouts read well. It
  gives no shared scale, and each component names its own classes.
- **A styled component library** (Skeleton, Flowbite-Svelte, shadcn-svelte): the site's main parts (the board, the
  chart, the move list) are custom, and these libraries bring their own look.
- **esbuild alone, or no build:** fewer tools, but we write the dev server, the hashing and the HTML handling.
- **GitHub Pages:** free and simple, but 100 GB a month of soft bandwidth (about 4,500 first visits at 22 MB), no
  custom headers, and no commercial use.
- **Netlify or Vercel:** free tiers that meter bandwidth.
- **Artifacts in Git LFS here:** every CI download counts against a quota, and the binaries live in two places.
- **Artifacts in an object store with versioned URLs:** the site would not rebuild for a new model, but the engine
  repository would need the bucket's credentials. It stays possible later, behind the same manifest.

## Consequences

- The engine repository must publish GitHub Releases of the builds that this site deploys
  ([requests/03-release-artifacts.md](../requests/03-release-artifacts.md)). Until then, nothing deploys.
- `static/engine/` is not in Git.

## Where it is

- `package.json`, `vite.config.ts`: the project.
- `src/app.css`: the colour tokens, Tailwind's theme from them, and the base element styles.
- `engine.lock.json` and `scripts/fetch-engine.mjs`: the engine's artifacts.

## Log entries

- [decisions/architecture.md](../decisions/architecture.md), "The stack" (2026-10-09).
- [decisions/architecture.md](../decisions/architecture.md), "Styles in Tailwind" (2026-10-10).
