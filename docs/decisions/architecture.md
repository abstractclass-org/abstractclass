# Architecture

The repository, the stack, hosting, and how the engine's artifacts arrive.

### The repository starts (2026-10-09)

- **What:** a new repository for a website that helps people learn Enclosure. The engine and the bots stay in the
  engine repository ([enclosure-ai](https://github.com/seankao31/enclosure-ai)), read-only from here.
- **Decided at the start** ([design/02-static-site.md](../design/02-static-site.md)):
  - The site is static files. All analysis runs on the visitor's CPU. Hosting must cost little.
  - The engine arrives as versioned artifacts (a tagged WebAssembly build and a model). No engine or rules code is
    copied here, because the rules engine must match the site and the engine repository's tests guard that.
  - Parallelism by Web Workers: one module instance per worker, different positions per worker, no threads in the
    module.
  - Heavy work (puzzle mining, deep searches) runs offline on the GPU with the native engine and ships as JSON.
  - Decisions live where the thing decided lives. Documents link across the repositories by URL and path.
  - The engine interface is designed for analysis, in the manner of UCI and GTP. Constellation's and meaf.us's
    interfaces are references only. The engine repository designs the protocol and the move notation, and works on
    them now. This repository states only what the product needs, to avoid duplicate work.
- **The first design document** moved here from the engine repository
  ([design/01-analysis-tool.md](../design/01-analysis-tool.md)). Its links now point into the engine repository. Its
  statements about the engine that changed since it was written (the V2 score outputs, the WebAssembly module)
  were updated. A pointer in the engine repository is requested
  ([requests/01-design-pointer.md](../requests/01-design-pointer.md)).

### The stack (2026-10-09)

- **Decided** ([design/03-stack.md](../design/03-stack.md)): TypeScript, Svelte with SvelteKit built to static
  files, Vite, hosting on Cloudflare.
- **The engine's artifacts** are pinned by SHA-256 in `engine.lock.json`. Deploys take them from GitHub Releases of
  the engine repository. Development takes them from local paths in `../enclosure`, because the networks still train
  and a release for every checkpoint is too much ceremony. A deploy refuses a local source.
- **Requested:** releases of the builds that the site deploys
  ([requests/03-release-artifacts.md](../requests/03-release-artifacts.md)).

### Styles in Tailwind (2026-10-10)

- **Decided** ([design/03-stack.md](../design/03-stack.md)): the site's styles move from Svelte's scoped CSS to
  Tailwind CSS 4 utility classes. The reason is the maintainer's method of choice. No player sees a difference.
- **The colours:** Tailwind's own palette is cleared. The tokens in `src/app.css` are the only colours, so dark mode
  still follows them. Label colours stay plain tokens, set from the label in the markup.
- **Plain CSS stays** for the board's SVG styles, the review page's layout grid (design 06), and the tokens and base
  element styles. About 210 lines of CSS remain, from about 700.
- **Checked against the build before the change**, page by page: in Edge in dark mode at 1,380, 1,000 and 390 pixels,
  with the display menu, the tabs, a retry, a lesson and a puzzle, and in headless Edge in light mode at 1,440, 1,000
  and 390 pixels. A comparison of computed styles, element by element, found the causes. Text sizes snap to Tailwind's
  scale: 0.78 to 0.85em becomes `text-xs` (12 px), and 0.88 to 0.92em becomes `text-sm` (14 px). Spacing rounds to
  0.25rem.
- **Tailwind's reset changed three things, and the site restores them.** Links lost their underline: the base style
  in `app.css` underlines links again, and links that are not in running text use `no-underline`. Boxes measure their
  padding inside their width (`border-box`): the pages' `main` elements use `box-content`, so a `max-w-*` limit is the
  width of the content, as before. Table columns sized in em grew with the larger text: the candidates table's columns
  are in rem, at their old widths in pixels.
- **One small change on purpose:** the accuracy table's number columns are 4rem wide, from 4.5rem, so that the larger
  text does not make more labels wrap. Replaced the same day: both review tables now fit their content
  ([product.md](product.md), "The review's tables fit their content").
- **Not adopted:** a styled component library. A headless one (Bits UI) is a candidate for the tabs and the display
  menu, whose keyboard and focus handling is incomplete.

### Bits UI for the tabs and the display menu (2026-10-10)

- **Decided** ([design/03-stack.md](../design/03-stack.md)): Bits UI 2, a headless component library for Svelte 5
  (the base of shadcn-svelte), for components with keyboard and focus behaviour. The styles stay Tailwind classes.
- **The version:** 2.19.3, from 22 September 2026. The newest, 2.19.5, was a week old. It needs Svelte 5.33 or later
  (the site has 5.57) and `@internationalized/date`, which npm installs with it.
- **The review's tabs** (Highlights and Analysis, below 1,260 pixels) are `Tabs`: the tab roles, `aria-selected`, one
  tab in the tab order, and the arrow keys between the tabs. The review's own arrow keys, which step through the game,
  leave the tabs and the menu alone. With three columns there are no tabs, and the Analysis shows directly.
- **The display menu** is `Popover`: it opens above the gear, moves the focus into the menu and back to the gear, and
  closes on Escape or a click outside it. Bits UI gives the menu no role, so the site gives it `role="dialog"`, as the
  gear's `aria-haspopup` says.
- **The move list's moves are out of the Tab order** (`tabindex="-1"`), as on Lichess: the arrow keys step through
  the game. Before, the 120 moves of the sample game were Tab stops before the step controls and the gear. The review
  page now has 17 Tab stops: the site's header, the biggest mistakes, the step controls and the gear. A click still
  goes to a move.
- **Checked in Edge:** the roles and `aria-selected`. ArrowRight and ArrowLeft between the tabs (they wrap) while the
  game's position stays. The menu opens and closes with the gear, with Escape and with a click outside. In a visible
  window, Enter on the gear opens the menu with the focus on its first control, Tab moves within the menu, and Escape
  closes it with the focus back on the gear. In a hidden window (behind another) the focus does not move and an
  outside click acts seconds late: a hidden page runs no animation frames and slows its timers, and Bits UI moves the
  focus in an animation frame and handles an outside click after a timer.

### The repositories move to the organization abstractclass-org (2026-10-15)

- **What:** the GitHub organization `abstractclass-org` owns the three repositories now, with their names unchanged:
  `hedgeschool` (this site, private), `enclosure-ai` (the engine's source, private) and `enclosure-engine` (the
  engine's releases, public). Future engine releases go to `abstractclass-org/enclosure-engine`.
- **Changed here:** the local checkout's remote (`git@github.com:abstractclass-org/hedgeschool.git`), the repository
  in `engine.lock.json`, and the links and names in the documents still in force. GitHub redirects the old addresses,
  but nothing here relies on that. The dated entries of the decision logs keep the old addresses as history.
- **Checked:** `npm run engine` with an empty download cache took all 15 files from the new repository's releases, and
  each SHA-256 matched the lock. The module reports protocol 0.6.1 and the search `fdfe5ad`, as the lock gives.
- **The deploy moves to GitHub Actions** (`.github/workflows/deploy.yml`, hosting.md section 3). The Pages project lost
  its Git connection with the move, and Cloudflare cannot add one to an existing Pages project. A new project would
  need a move of the domain. So a workflow builds each push as Cloudflare's build did (`npm run build:cloudflare`) and
  uploads it into the same project with Wrangler (`wrangler pages deploy`, pinned to 4.144.0): `main` to production,
  another branch to a preview. The project keeps its settings in Cloudflare (the D1 binding, the compatibility date,
  the domain), so the repository has no Wrangler file. The build's variables are repository variables, and the
  workflow gives the previews no Google Analytics and no Web Analytics, as Pages did. The Cloudflare token is a
  repository secret, with the one permission to edit Pages.
- **Checked:**
  - A test branch first (`deploy-test`): its run passed. Cloudflare took the upload into the existing project, with
    the Function. Its preview had the commit's version, `noindex`, no Google Analytics, the engine's files with their
    SHA-256, the Function's answer 400 to a request that is not JSON (503 would mean no database), and the userscript
    with the preview's own address. In Edge, the analysis board's engine searched (160 of 1,024 visits, five
    candidates).
  - Then `dev`: its preview deployed, and the workflow **Tests** passed.
  - Then `main`: the live site serves `1cd3180`, with no `noindex`, the Google Analytics ID and the Web Analytics
    token in its code, the engine's module as `application/wasm` with its SHA-256, the Function's 400, the userscript
    with the live address, and 404 for an unknown address.

### One repository for the learning sites (2026-10-16)

- **What:** one repository for all the learning sites: `apps/hub`, `apps/hedgeschool`, `apps/<the next game>`, and
  shared code in `packages/`.
- **Decided** ([design/26-one-repository.md](../design/26-one-repository.md)): Hedge School moves whole into
  `apps/hedgeschool`, and nothing goes into `packages/` until two sites need it. The hub is a page of links with no
  analytics. The addresses stay, and this repository becomes the shared one.
- **How:** a map of `src/lib` by its imports, then a second model's review of the map against the code (Codex). The
  review corrected the map: splitting `review/model.ts`'s types would not make the review general, because the review
  builds in Enclosure's turns, sides and scoring.
- **Next:** the move. Feature work waits until it is done.

### The repositories get new names (2026-10-16)

- **What:** this repository, `abstractclass-org/hedgeschool`, is now `abstractclass-org/abstractclass`, the
  repository of the learning sites (design 26). Its local checkout is the folder `abstractclass-org\abstractclass`. The
  engine's source, `abstractclass-org/enclosure-ai`, is now `abstractclass-org/engines`, checked out beside it at
  `../engines`. The release repository `enclosure-engine` keeps its name, because each game gets a release repository
  of its own.
- **Not changed:** the Pages project `hedgeschool`, the address hedgeschool.abstractclass.org, the D1 databases, and
  the browser's storage keys and IndexedDB name (`learn-enclosure`), which hold the players' data. The deploy names the
  Pages project, not the repository, and the secret and the variables moved with the repository. `engine.lock.json`
  does not change.
- **Changed here:** the links and names in the documents still in force, and the engine checkout's path in the
  documents and in the scripts' usage notes. The dated entries of the decision logs keep the old names as history.
  GitHub redirects the old names while no other repository takes them, so no new repository gets the name
  `hedgeschool`.
- **Left:** the About and Notation pages call the engine "the enclosure-ai project". Their text waits for a choice of
  the public name ([open-items.md](open-items.md)).
