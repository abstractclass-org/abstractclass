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
- **Checked against the build before the change**, page by page: in Edge in dark mode at 1,380, 1,000 and 390
  pixels, with the display menu, the tabs, a retry, a lesson and a puzzle, and in headless Edge in light mode at
  1,440, 1,000 and 390 pixels. A comparison of computed styles, element by element, found the causes. Text sizes snap to Tailwind's scale: 0.78 to 0.85em becomes `text-xs` (12 px),
  and 0.88 to 0.92em becomes `text-sm` (14 px). Spacing rounds to 0.25rem.
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
