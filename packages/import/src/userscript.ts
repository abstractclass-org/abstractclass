// The userscript: the bookmarklet's second form, for Tampermonkey (design 11). It runs on a site's game pages
// (UserscriptSite's `matches`), in the page's own context (`@sandbox raw`, which a page allows when it sends no content
// security policy), so that it reads the page's game as the bookmarklet does, with the site's page code (pageCode.ts).
// It shows a button with the site's picture near the page's lower right corner while a game shows (ButtonPlace), and
// adds an entry to Tampermonkey's menu. Either opens the game in the site's import page, in a new tab, with the record
// and the position that the page shows after the `#`.
// Tampermonkey opens the tab (GM_openInTab), so no popup blocker stops it: when the page lacks the game's moves and the
// page code names an address that has them (Hedge School's meaf.us watcher's view), the page reloads there, and the
// script then opens the game by itself once the moves come. Tampermonkey checks the site for updates (`@updateURL`, a
// file with the header only, as Greasy Fork serves one), and fetches the script again when its version is newer, so a
// change of a game site's page needs no new install. The script says its code's version with each game
// (importHash.ts), so that the import page can tell a player whose Tampermonkey has not yet taken a change. The site
// serves the files at /<id>.user.js and /<id>.meta.js (UserscriptSite's `id`).
import { pageCodeText, type AnyPageCode, type PageCode } from "./pageCode.ts";

declare function GM_openInTab(url: string, options?: { active?: boolean }): void;
declare function GM_registerMenuCommand(name: string, run: () => void): void;

/** A place for the button: the CSS of its box, `into`, the page's element at whose end it sits in the page's own
 *  layout, and `shows`, the page's element that shows a game: the button hides while the page lacks it. A place with
 *  no `into` is fixed in the window, and so is the button when the page lacks that element (FIXED_PLACE). */
export interface ButtonPlace { css: string; into?: string; shows?: string }

/** The button fixed in the window's lower right corner. */
export const FIXED_PLACE = "position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; --size: 60px";

/** What the userscript takes of a site, whose page code is `P`. */
export interface UserscriptSite<P extends PageCode<P>> {
  name: string; // the site's name, which starts each message and names the button: "Hedge School"
  toolName: string; // the tools' own name: the script's in Tampermonkey's lists, and the bookmark's
  /** The name of the script's files (/<id>.user.js, and its header alone at /<id>.meta.js), of the elements that it adds
   *  to the page, and of its key in the tab's storage: "hedge-school". */
  id: string;
  /** The button's picture: an SVG element of `size` pixels, on the button and in the header for Tampermonkey's lists. */
  icon(size: number): string;
  places: Record<string, ButtonPlace>; // the button's place on each game site, by the site's host
  description: string; // the header's, for Tampermonkey's lists
  author: string;
  homepage: string;
  matches: string[]; // the game pages that the script runs on, as Tampermonkey's `@match` gives them
  page: P;
}

/** What the script's code takes of the site, as data: the site's address (`origin`), the version of the script's code
 *  (`code`), the site's texts and picture, and the button's places. */
interface Data {
  origin: string; code: string; name: string; id: string; click: string; open: string; icon: string;
  places: Record<string, ButtonPlace>; fixed: string;
}

/** Runs on the game's page. Self-contained: the script carries its source, and that of the functions it gets (`page`,
 *  pageCode.ts). */
function main(d: Data, page: AnyPageCode) {
  const site = location.hostname, place = d.places[site] ?? { css: d.fixed };
  const PENDING = `${d.id}:review-after-load`; // this tab's game that opens once its moves come
  const WAIT_MS = 30000; // how long the reloaded page may take to load them

  // The button, and its notes above it, fixed in the window: each in a shadow root, which the page's styles do not
  // reach, of an element whose name the page's styles do not know.
  const shadow = (html: string) => {
    const host = document.createElement(d.id);
    host.attachShadow({ mode: "open" }).innerHTML = html;
    return host;
  };
  const buttonHost = shadow(`<style>
    button { display: grid; place-items: center; width: var(--size); height: var(--size); padding: 0; border: 2px solid #ffffff33;
             border-radius: 50%; background: #0b0c0e; cursor: pointer; box-shadow: 0 2px 8px #0008; }
    button svg { width: 73%; height: 73%; }
    button:hover, button:focus-visible { border-color: #fff; outline: none; }
  </style><button type="button" title="${d.open}" aria-label="${d.open}">${d.icon}</button>`);
  const noteHost = shadow(`<style>
    p { position: fixed; z-index: 2147483647; width: max-content; max-width: min(340px, 80vw); margin: 0; padding: 8px 10px;
        border: 1px solid #ffffff33; border-radius: 6px; background: #16181c; color: #eee; box-shadow: 0 2px 8px #0008;
        font: 13px/1.4 system-ui, sans-serif; cursor: pointer; }
    p[hidden] { display: none; }
  </style><p role="status" hidden></p>`);
  noteHost.style.cssText = "all: initial";
  const button = buttonHost.shadowRoot!.querySelector("button")!, note = noteHost.shadowRoot!.querySelector("p")!;
  // The button at the end of its place's element, or fixed in the window when the page has none. A hidden button keeps
  // its box, so that a note can show above it.
  const keepPlace = () => {
    const into = (place.into && document.querySelector(place.into)) || null, parent = into ?? document.body;
    if (buttonHost.parentElement !== parent) {
      buttonHost.style.cssText = `all: initial; ${into ? place.css : d.fixed}`;
      parent.append(buttonHost);
    }
    buttonHost.style.visibility = !place.shows || document.querySelector(place.shows) ? "" : "hidden";
  };
  let hide: ReturnType<typeof setTimeout> | undefined;
  const show = (text: string) => {
    const r = button.getBoundingClientRect(), view = document.documentElement; // above the button, to its right edge
    note.style.right = `${Math.max(8, view.clientWidth - r.right)}px`;
    note.style.bottom = `${Math.max(8, view.clientHeight - r.top + 10)}px`;
    note.textContent = text;
    note.hidden = false;
    clearTimeout(hide);
    hide = setTimeout(() => (note.hidden = true), 10000);
  };
  note.addEventListener("click", () => (note.hidden = true));

  const open = (record: () => string, at: string) => {
    let text: string;
    try { text = record(); } catch (e) { show(`${d.name}: ` + (e as Error).message); return; }
    GM_openInTab(d.origin + "/import#" + new URLSearchParams({ tool: "userscript", v: d.code, site, at, record: text }), { active: true });
  };
  function review() {
    const found = page.read(page, "userscript", d.click, d.origin);
    if (!("say" in found)) { open(found.record, found.at); return; }
    const reload = found.reload;
    if (reload) sessionStorage.setItem(PENDING, `${reload.id} ${Date.now()}`);
    show(found.say);
    if (reload) setTimeout(() => location.assign(reload.url), 1500);
  }
  button.addEventListener("click", review);
  GM_registerMenuCommand(d.open, review);
  document.body.append(noteHost);
  keepPlace();

  // The button keeps to its place: a page can change its views without loading a page (meaf.us), and React can draw
  // the place's element once the game comes, and again (strategyjam.org). After a reload to the address that has the
  // game's moves (PENDING, which only Hedge School's meaf.us pages set), the game opens once its moves come, with no
  // position: the player has moved no slider yet, and meaf.us's slider takes the game's end only after it draws the
  // moves, so a read can come between and give the moves before them. Without a position, the board opens at the
  // game's end.
  if (sessionStorage.getItem(PENDING)) show(`${d.name}: waiting for the game's moves. Then ${d.name} opens the game.`);
  setInterval(() => {
    keepPlace();
    const pending = sessionStorage.getItem(PENDING);
    if (!pending) return;
    const [id, at] = pending.split(" ");
    if (Date.now() - Number(at) > WAIT_MS) {
      sessionStorage.removeItem(PENDING);
      show(`${d.name}: the page did not get the game's moves. Click ${d.click} to try again.`);
      return;
    }
    const found = page.read(page, "userscript", d.click, d.origin);
    if (!("say" in found) && found.id === id) {
      sessionStorage.removeItem(PENDING);
      open(found.record, "");
    }
  }, 500);
}

/** The userscript's header for Tampermonkey, alone: the file that Tampermonkey checks for updates. `origin` is the
 *  site's address, from which the script updates and opens the import page. `version` grows with each build, so that
 *  Tampermonkey takes it as an update. */
export function userscriptHeader<P extends PageCode<P>>(site: UserscriptSite<P>, origin: string, version: string): string {
  const header = [
    ["name", site.toolName],
    ["namespace", `${origin}/`],
    ["version", version],
    ["description", site.description],
    ["author", site.author],
    ["homepage", site.homepage],
    ["icon", `data:image/svg+xml;base64,${btoa(site.icon(64))}`],
    ...site.matches.map(page => ["match", page]),
    ["sandbox", "raw"],
    ["grant", "GM_openInTab"],
    ["grant", "GM_registerMenuCommand"],
    ["run-at", "document-idle"],
    ["noframes", ""],
    ["updateURL", `${origin}/${site.id}.meta.js`],
    ["downloadURL", `${origin}/${site.id}.user.js`],
  ].map(([k, v]) => `// @${k.padEnd(12)} ${v}`.trimEnd());
  return ["// ==UserScript==", ...header, "// ==/UserScript==", ""].join("\n");
}

/** The userscript's file: its header, then its code. `code` is the version of its code (the build's hash of the files
 *  it is made from), which it sends with each game. The site's name names the button in the messages (`click`), and
 *  gives the button's label and the entry in Tampermonkey's menu (`open`). */
export function userscriptSource<P extends PageCode<P>>(site: UserscriptSite<P>, origin: string, version: string,
                                                        code: string): string {
  const data: Data = { origin, code, name: site.name, id: site.id, click: `the ${site.name} button`,
                       open: `Open this game in ${site.name}`, icon: site.icon(44), places: site.places, fixed: FIXED_PLACE };
  return userscriptHeader(site, origin, version) + "\n" + `(${main})(${JSON.stringify(data)}, ${pageCodeText(site.page)});\n`;
}
