// The notice when a page's scripts do not load (abscls-lwhe): a box under the header that tells the player to load the
// page again. Without it, a page whose code did not load stays as its prerendered state, with no word: Practice shows
// only its header (abscls-z0jz). Every page of each site gets the script at the end of its head, in the build: each
// site's hooks.server.ts takes `handle`, which puts the script in the place of LOAD_NOTICE_MARK in its src/app.html.
//
// Only the page's own code shows the notice: the modules that the page's HTML preloads (SvelteKit's start.js and
// app.js, the client that start.js loads, the route's nodes, and the chunks of each). The script reads them from the
// head's `modulepreload` links before the page's code runs, so that no link that Vite's loader adds later counts. The
// 404.html fallback preloads only the root layout's node, and its start loads the error page's node with no catch: a
// node that fails with no handler counts too. SvelteKit catches the failure of a node that a hover preloads or that a
// link opens: it shows its error page. A later part that fails (PostHog's client, the home page's replay, the removal
// of earlier results) leaves the page working, and shows no notice: its own code handles its failure.
// The script watches two events, and reads the module that did not load from the error's message:
// - `vite:preloadError`, Vite's own event for a dynamic import in the built code that fails (Vite's guide, "Load Error
//   Handling"). SvelteKit loads each route's nodes and its client through such an import, and catches the failure of
//   a node: it shows its error page.
// - `unhandledrejection`: SvelteKit's start script in the page's body imports start.js and app.js with no bundler
//   between and no catch, so their failure comes only as a rejection that nothing handles.
// Chrome's message is "Failed to fetch dynamically imported module: <address>", and Firefox's "error loading
// dynamically imported module: <address>". Safari's, "Importing a module script failed.", names no module, so Safari
// shows no notice. The script lets each error go on as before: the error page and the error reports stay.

import type { Handle } from "@sveltejs/kit/hooks";

/** The notice's words (strict Simplified Technical English: the player follows them). "Load the page again" is the
 *  way out that the Practice page's own notices use (@abstractclass/practice's practice.ts). */
export const LOAD_NOTICE = { text: "Part of this page did not load.", action: "Load the page again" } as const;

/** The place of the script in each site's src/app.html: after `%sveltekit.head%`, which holds the page's preloads. */
export const LOAD_NOTICE_MARK = "<!-- load-notice -->";

/** Watches for the page's own code that does not load, and then shows the notice once. The head holds its text
 *  (`script`), so it uses nothing outside itself, in the older JavaScript of the theme's script. It styles the box in
 *  its own attribute, with the site's colour tokens and their light values, so that it shows when the site's style did
 *  not load either. */
function watchLoad(text: string, action: string) {
  var preloaded: Record<string, boolean> = {}, nodes = "", shown = false;
  var links = document.querySelectorAll("link[rel=modulepreload]");
  for (var i = 0; i < links.length; i++) {
    var href = (links[i] as HTMLLinkElement).href, start = /^(.*\/)entry\/start\.[^/]+$/.exec(href);
    preloaded[href] = true;
    if (start) nodes = start[1] + "nodes/";
  }
  function addBox() {
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
  function onLoadError(error: { message?: unknown } | null | undefined, unhandled: boolean) {
    var failure = /dynamically imported module: (\S+)/.exec(String(error && error.message));
    var own = failure && (preloaded[failure[1]] || (unhandled && nodes && failure[1].indexOf(nodes) === 0));
    if (shown || !own) return;
    shown = true;
    if (document.body) addBox(); else addEventListener("DOMContentLoaded", addBox);
  }
  addEventListener("vite:preloadError", function (e) {
    onLoadError((e as Event & { payload?: Error }).payload, false);
  });
  addEventListener("unhandledrejection", function (e) { onLoadError(e.reason, true); });
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

/** Each site's `handle` hook (its src/hooks.server.ts): the site is static, so it runs only in the build and in the
 *  development server. */
export const handle: Handle = ({ event, resolve }) => resolve(event, { transformPageChunk: withLoadNotice });
