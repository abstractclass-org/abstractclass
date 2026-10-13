// The userscript: the bookmarklet's second form, for Tampermonkey (design 11). It runs on meaf.us game pages, in the
// page's own context (`@sandbox raw`, which meaf.us allows: it sends no content security policy), so that it reads the
// board's game as the bookmarklet does (meafPage.ts). It shows a button with the school's collie in the page's corner
// while a game shows, and adds an entry to Tampermonkey's menu. Either opens the game in this site's import page, in a
// new tab, with the record after the `#`. Tampermonkey opens the tab (GM_openInTab), so no popup blocker stops it: a
// finished game of the player's own reloads as a watcher's view, and its review then opens by itself once the moves
// come. Tampermonkey checks this site for updates (`@updateURL`, a file with the header only, as Greasy Fork serves
// one), and fetches the script again when its version is newer, so a change of meaf.us's page needs no new install.
// The script says its code's version with each game (importHash.ts), so that the import page can tell a player whose
// Tampermonkey has not yet taken a change. The site serves the files at /hedge-school.user.js and
// /hedge-school.meta.js (src/routes).
import { HEAD_COAT, HEAD_SILHOUETTE, HEAD_VIEWBOX } from "#lib/collie.ts";
import { meafRecord, type MeafGame } from "./meaf.ts";
import { explain, findGame, missingMoves, watcherUrl } from "./meafPage.ts";

declare function GM_openInTab(url: string, options?: { active?: boolean }): void;
declare function GM_registerMenuCommand(name: string, run: () => void): void;

/** The script's own name, in Tampermonkey's lists and on the button. */
export const USERSCRIPT_NAME = "Review in Hedge School";

/** Runs on the meaf.us page. Self-contained: the script carries its source, and that of the functions it gets. */
function main(origin: string, icon: string, code: string, find: typeof findGame, missing: typeof missingMoves,
              say: typeof explain, watcher: typeof watcherUrl, toRecord: (game: MeafGame) => string) {
  const click = "the Hedge School button";
  const PENDING = "hedge-school:review-after-load"; // this tab's finished game whose review opens once its moves come
  const WAIT_MS = 30000; // how long the watcher's view may take to load them

  // The button and its notes, in a shadow root: the page's styles do not reach them.
  const host = document.createElement("div");
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
    :host { all: initial; position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; font: 13px/1.4 system-ui, sans-serif; }
    button { display: grid; place-items: center; width: 60px; height: 60px; padding: 0; border: 2px solid #ffffff33;
             border-radius: 50%; background: #0b0c0e; cursor: pointer; box-shadow: 0 2px 8px #0008; }
    button:hover, button:focus-visible { border-color: #fff; outline: none; }
    p { position: absolute; right: 0; bottom: 70px; width: max-content; max-width: min(340px, 80vw); margin: 0;
        padding: 8px 10px; border: 1px solid #ffffff33; border-radius: 6px; background: #16181c; color: #eee;
        box-shadow: 0 2px 8px #0008; cursor: pointer; }
    p[hidden] { display: none; }
  </style><p role="status" hidden></p><button type="button" title="Review this game in Hedge School"
     aria-label="Review this game in Hedge School">${icon}</button>`;
  const note = root.querySelector("p")!, button = root.querySelector("button")!;
  let hide: ReturnType<typeof setTimeout> | undefined;
  const show = (text: string) => {
    note.textContent = text;
    note.hidden = false;
    clearTimeout(hide);
    hide = setTimeout(() => (note.hidden = true), 10000);
  };
  note.addEventListener("click", () => (note.hidden = true));

  const open = (game: MeafGame) => {
    let text: string;
    try { text = toRecord(game); } catch (e) { show("Hedge School: " + (e as Error).message); return; }
    GM_openInTab(origin + "/review#" + new URLSearchParams({ tool: "userscript", v: code, record: text }), { active: true });
  };
  function review() {
    const game = find();
    if (!game) { show(say("none", click, origin)); return; }
    const why = missing(game);
    if (why === "reload") {
      sessionStorage.setItem(PENDING, `${game.gameID} ${Date.now()}`);
      show("Hedge School: meaf.us shows your finished game without its moves. The page reloads as a watcher's view, which has them, and the review then opens.");
      setTimeout(() => location.assign(watcher()), 1500);
      return;
    }
    if (why) { show(say(why, click, origin)); return; }
    open(game);
  }
  button.addEventListener("click", review);
  GM_registerMenuCommand("Review this game in Hedge School", review);
  document.body.append(host);

  // meaf.us changes its views without loading a page: the button shows while the page shows a game. After the reload
  // as a watcher's view, the review opens once the game's moves come.
  if (sessionStorage.getItem(PENDING)) show("Hedge School: waiting for the game's moves. The review then opens.");
  setInterval(() => {
    host.style.display = document.querySelector("svg.board") ? "" : "none";
    const pending = sessionStorage.getItem(PENDING);
    if (!pending) return;
    const [id, at] = pending.split(" "), game = find();
    if (Date.now() - Number(at) > WAIT_MS) {
      sessionStorage.removeItem(PENDING);
      show(`Hedge School: the page did not get the game's moves. Click ${click} to try again.`);
    } else if (game && String(game.gameID) === id && !missing(game)) {
      sessionStorage.removeItem(PENDING);
      open(game);
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
    ["description", "Opens the meaf.us game on screen in Hedge School's review. Reads the game from the page: no request to meaf.us, nothing from your login."],
    ["author", "Yshan"],
    ["homepage", "https://yhkao.com"],
    ["icon", `data:image/svg+xml;base64,${btoa(svg(64))}`],
    ["match", "https://meaf.us/sst1/*"],
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
  return userscriptHeader(origin, version) + "\n"
    + `(${main})(${JSON.stringify(origin)}, ${JSON.stringify(svg(44))}, ${JSON.stringify(code)}, ${findGame}, ${missingMoves}, ${explain}, ${watcherUrl}, ${meafRecord});\n`;
}
