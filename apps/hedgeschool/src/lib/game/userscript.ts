// The userscript: the bookmarklet's second form, for Tampermonkey (design 11). It runs on the game pages of meaf.us and
// strategyjam.org, in the page's own context (`@sandbox raw`, which both allow: they send no content security policy),
// so that it reads the page's game as the bookmarklet does (meafPage.ts, strategyjamPage.ts). It shows a button with the
// school's collie near the page's lower right corner while a game shows (BUTTON_PLACES), and adds an entry to
// Tampermonkey's menu. Either opens the game in this site's review, in a new tab, with the record and the position that
// the page shows after the `#`. The review then asks the player to review the game or to analyze it on the board.
// Tampermonkey opens the tab (GM_openInTab), so no popup blocker stops it: a finished game of the player's own on
// meaf.us reloads as a watcher's view, and Hedge School then opens by itself once the moves come. Tampermonkey checks this
// site for updates (`@updateURL`, a file with the header only, as Greasy Fork serves one), and fetches the script again
// when its version is newer, so a change of a site's page needs no new install. The script says its code's version with
// each game (importHash.ts), so that the import page can tell a player whose Tampermonkey has not yet taken a change.
// The site serves the files at /hedge-school.user.js and /hedge-school.meta.js (src/routes).
import { HEAD_COAT, HEAD_SILHOUETTE, HEAD_VIEWBOX } from "#lib/collie.ts";
import { pageCodeText, type PageCode } from "./pageCode.ts";

declare function GM_openInTab(url: string, options?: { active?: boolean }): void;
declare function GM_registerMenuCommand(name: string, run: () => void): void;

/** The script's own name, in Tampermonkey's lists and on the button. */
export const USERSCRIPT_NAME = "Review in Hedge School";

/** A place for the button: the CSS of its box, `into`, the page's element at whose end it sits in the page's own
 *  layout, and `shows`, the page's element that shows a game: the button hides while the page lacks it. A place with
 *  no `into` is fixed in the window, and so is the button when the page lacks that element (FIXED_PLACE). */
interface ButtonPlace { css: string; into?: string; shows?: string }

/** The button fixed in the window's lower right corner. */
const FIXED_PLACE = "position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; --size: 60px";

/** Where the button sits on each site: near the page's lower right corner, where it covers nothing. strategyjam.org's
 *  page fills the window, and its move list holds the lower right corner: in a narrow window the panel under the board
 *  scrolls, and in a wide one the board can fill the height between the menu and the panel. So there the button ends
 *  the move list's legend ("can be cut", "can't be cut yet"), to the right, in a row of its own if the legend fills
 *  its row, and it scrolls with the panel. meaf.us changes its views without loading a page, so there the button
 *  shows while the page shows a board. */
const BUTTON_PLACES: Record<string, ButtonPlace> = {
  "meaf.us": { css: FIXED_PLACE, shows: "svg.board" },
  "strategyjam.org": { css: "display: block; margin-left: auto; order: 99; align-self: center; --size: 36px", into: ".enc-legend" },
};

/** Runs on the game's page. Self-contained: the script carries its source, and that of the functions it gets (`page`,
 *  pageCode.ts). */
function main(origin: string, icon: string, code: string, places: Record<string, ButtonPlace>, fixed: string, page: PageCode) {
  const click = "the Hedge School button";
  const site = location.hostname, place = places[site] ?? { css: fixed };
  const PENDING = "hedge-school:review-after-load"; // this tab's finished game whose review opens once its moves come
  const WAIT_MS = 30000; // how long the watcher's view may take to load them

  // The button, and its notes above it, fixed in the window: each in a shadow root, which the page's styles do not
  // reach, of an element whose name the page's styles do not know.
  const shadow = (html: string) => {
    const host = document.createElement("hedge-school");
    host.attachShadow({ mode: "open" }).innerHTML = html;
    return host;
  };
  const buttonHost = shadow(`<style>
    button { display: grid; place-items: center; width: var(--size); height: var(--size); padding: 0; border: 2px solid #ffffff33;
             border-radius: 50%; background: #0b0c0e; cursor: pointer; box-shadow: 0 2px 8px #0008; }
    button svg { width: 73%; height: 73%; }
    button:hover, button:focus-visible { border-color: #fff; outline: none; }
  </style><button type="button" title="Open this game in Hedge School" aria-label="Open this game in Hedge School">${icon}</button>`);
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
      buttonHost.style.cssText = `all: initial; ${into ? place.css : fixed}`;
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
    try { text = record(); } catch (e) { show("Hedge School: " + (e as Error).message); return; }
    GM_openInTab(origin + "/review#" + new URLSearchParams({ tool: "userscript", v: code, site, at, record: text }), { active: true });
  };
  function review() {
    if (site === "strategyjam.org") {
      const game = page.findJamGame();
      if (typeof game === "string") show(page.explain(game, click, origin, site));
      else open(() => page.jamRecord(game), page.jamShownMove());
      return;
    }
    const game = page.findGame();
    if (!game) { show(page.explain("none", click, origin, site)); return; }
    const why = page.missingMoves(game);
    if (why === "reload") {
      sessionStorage.setItem(PENDING, `${game.gameID} ${Date.now()}`);
      show("Hedge School: meaf.us shows your finished game without its moves. The page reloads as a watcher's view, which has them. Then Hedge School opens the game.");
      setTimeout(() => location.assign(page.watcherUrl()), 1500);
      return;
    }
    if (why) { show(page.explain(why, click, origin, site)); return; }
    open(() => page.meafRecord(game), page.shownMove());
  }
  button.addEventListener("click", review);
  GM_registerMenuCommand("Open this game in Hedge School", review);
  document.body.append(noteHost);
  keepPlace();

  // The button keeps to its place: meaf.us changes its views without loading a page, and on strategyjam.org React
  // draws the legend once the game comes, and can draw it again. On meaf.us, after the reload as a watcher's view, the
  // game opens once its moves come (PENDING, which only meaf.us's pages set), with no position: the player has moved
  // no slider yet, and the page's slider takes the game's end only after it draws the moves, so a read can come
  // between and give the moves before them. Without a position, the board opens at the game's end.
  if (sessionStorage.getItem(PENDING)) show("Hedge School: waiting for the game's moves. Then Hedge School opens the game.");
  setInterval(() => {
    keepPlace();
    const pending = sessionStorage.getItem(PENDING);
    if (!pending) return;
    const [id, at] = pending.split(" "), game = page.findGame();
    if (Date.now() - Number(at) > WAIT_MS) {
      sessionStorage.removeItem(PENDING);
      show(`Hedge School: the page did not get the game's moves. Click ${click} to try again.`);
    } else if (game && String(game.gameID) === id && !page.missingMoves(game)) {
      sessionStorage.removeItem(PENDING);
      open(() => page.meafRecord(game), "");
    }
  }, 500);
}

const svg = (size: number) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${HEAD_VIEWBOX}" width="${size}" height="${size}" `
  + `fill-rule="evenodd" aria-hidden="true"><path fill="#fff" d="${HEAD_SILHOUETTE}"/><path fill="#0b0c0e" d="${HEAD_COAT}"/></svg>`;

/** The userscript's header for Tampermonkey, alone: the file that Tampermonkey checks for updates. `origin` is this
 *  site's address, from which the script updates and opens the review. `version` grows with each build, so that
 *  Tampermonkey takes it as an update. */
export function userscriptHeader(origin: string, version: string): string {
  const header = [
    ["name", USERSCRIPT_NAME],
    ["namespace", `${origin}/`],
    ["version", version],
    ["description", "Opens the meaf.us or strategyjam.org game on screen in Hedge School, to review it or to analyze it on the board. Reads the game from the page: no request to the game's site, nothing from your login."],
    ["author", "Yshan"],
    ["homepage", "https://yhkao.com"],
    ["icon", `data:image/svg+xml;base64,${btoa(svg(64))}`],
    ["match", "https://meaf.us/sst1/*"],
    ["match", "https://strategyjam.org/enclosure/game/*"],
    ["sandbox", "raw"],
    ["grant", "GM_openInTab"],
    ["grant", "GM_registerMenuCommand"],
    ["run-at", "document-idle"],
    ["noframes", ""],
    ["updateURL", `${origin}/hedge-school.meta.js`],
    ["downloadURL", `${origin}/hedge-school.user.js`],
  ].map(([k, v]) => `// @${k.padEnd(12)} ${v}`.trimEnd());
  return ["// ==UserScript==", ...header, "// ==/UserScript==", ""].join("\n");
}

/** The userscript's file: its header, then its code. `code` is the version of its code (the build's hash of the files
 *  it is made from), which it sends with each game. */
export function userscriptSource(origin: string, version: string, code: string): string {
  const data = [origin, svg(44), code, BUTTON_PLACES, FIXED_PLACE].map(v => JSON.stringify(v)).join(", ");
  return userscriptHeader(origin, version) + "\n" + `(${main})(${data}, ${pageCodeText()});\n`;
}
