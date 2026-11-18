// The notice when a page's scripts do not load (abscls-lwhe): a box under the header that tells the player to load the
// page again. Without it, a page whose code did not load stays as its prerendered state, with no word: Practice shows
// only its header (abscls-z0jz). Every page of each site gets the script in its head, in the build: the site's
// hooks.server.ts gives `withLoadNotice` to SvelteKit's `transformPageChunk`, which puts the script in the place of
// LOAD_NOTICE_MARK in the site's src/app.html. The 404.html fallback, which prerenders no layout, gets it too.
//
// The script watches two events, before the page's code starts:
// - `vite:preloadError`, Vite's own event for a dynamic import in the built code that fails (Vite's guide, "Load Error
//   Handling"). SvelteKit loads each page's code through such an import, at the start and at each navigation.
// - `unhandledrejection` with the error of a module that did not load. SvelteKit's start script in the page's body
//   imports start.js and the app's entry with no bundler between, so no `vite:preloadError` comes, and nothing catches
//   its failure. The browsers' messages: Chrome's "Failed to fetch dynamically imported module", Firefox's "error
//   loading dynamically imported module", Safari's "Importing a module script failed".
// The script lets each error go on as before: SvelteKit still shows its error page, and the error reports still send.

/** The notice's words (strict Simplified Technical English: the player follows them). "Load the page again" is the
 *  way out that the Practice page's own notices use (@abstractclass/practice's practice.ts). */
export const LOAD_NOTICE = { text: "Part of this page did not load.", action: "Load the page again" } as const;

/** The place of the script in each site's src/app.html. */
export const LOAD_NOTICE_MARK = "<!-- load-notice -->";

/** Watches for code that does not load, and then shows the notice once. The head holds its text (`script`), so it uses
 *  nothing outside itself, in the older JavaScript of the theme's script. It styles the box in its own attribute, with
 *  the site's colour tokens and their light values, so that it shows when the site's style did not load either. */
function watchLoad(text: string, action: string) {
  var shown = false;
  function put() {
    var box = document.createElement("div"), words = document.createElement("p");
    var button = document.createElement("button");
    box.setAttribute("role", "alert");
    box.setAttribute("data-load-notice", "");
    box.style.cssText = "position: fixed; z-index: 60; top: calc(var(--site-header, 3rem) + 1rem); left: 1rem; " +
      "right: 1rem; margin: 0 auto; width: fit-content; max-width: 32rem; box-sizing: border-box; display: flex; " +
      "flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; padding: 0.75rem 1rem; font-size: 0.875rem; " +
      "line-height: 1.4; color: var(--text, #24252a); background: var(--panel, #fff); " +
      "border: 1px solid var(--border, #dddad3); border-radius: 0.5rem; box-shadow: 0 4px 16px rgb(0 0 0 / 0.15)";
    words.style.margin = "0";
    words.textContent = text;
    button.type = "button";
    button.textContent = action;
    button.onclick = function () { location.reload(); };
    box.appendChild(words);
    box.appendChild(button);
    document.body.appendChild(box);
  }
  function show() {
    if (shown) return;
    shown = true;
    if (document.body) put(); else addEventListener("DOMContentLoaded", put);
  }
  addEventListener("vite:preloadError", show);
  addEventListener("unhandledrejection", function (e) {
    var message = e.reason && e.reason.message;
    var failed = /dynamically imported module|Importing a module script failed/;
    if (typeof message === "string" && failed.test(message)) show();
  });
}

/** The script in each page's head. */
export const LOAD_NOTICE_SCRIPT =
  `<script>(${watchLoad})(${JSON.stringify(LOAD_NOTICE.text)}, ${JSON.stringify(LOAD_NOTICE.action)});</script>`;

/** SvelteKit's `transformPageChunk` for a site's pages: puts the script in the place of LOAD_NOTICE_MARK. A head
 *  without the mark stops the build, so that no site loses the notice without a word. A later part of a page that
 *  streams holds no head, and passes as it is. */
export function withLoadNotice({ html }: { html: string }): string {
  if (html.includes(LOAD_NOTICE_MARK)) return html.replace(LOAD_NOTICE_MARK, () => LOAD_NOTICE_SCRIPT);
  if (html.includes("</head>")) throw new Error(`The page's head has no ${LOAD_NOTICE_MARK} (the site's src/app.html)`);
  return html;
}
