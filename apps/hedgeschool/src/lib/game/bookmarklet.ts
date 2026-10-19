// The bookmarklet that brings a meaf.us or strategyjam.org game to the review. The player keeps it in the browser's
// bookmarks bar and clicks it on a game page. The bookmark holds only a loader (load): it adds this site's
// /bookmarklet.js to the game's page, so that the bookmark stays as it is when the code changes, as the userscript
// updates itself. The code (grab) runs there, in the player's own page:
// 1. it finds the game that the page holds (meafPage.ts, strategyjamPage.ts), with no request to the game's site and
//    nothing from the player's login;
// 2. it writes the game's record (meaf.ts, strategyjam.ts, carried in the script as they are);
// 3. it reads the position that the page shows, when the page says (shownMove, jamShownMove);
// 4. it opens this site's import page with the record and the position after the `#`, which the browser never sends to
//    a server, and says which tool sent it and from which site (importHash.ts), so that the page can tell a player
//    whose bookmark is an old one. The import page then asks the player to review the game or to analyze it on the
//    board.
// It depends on the two sites' pages: a change there can break it, and then it says that it found no game. The loader
// also depends on each site sending no content security policy that blocks other sites' scripts (neither sends one).
//
// A player's own finished game on meaf.us has no moves in the page (meafPage.ts, missingMoves). The bookmarklet then
// opens the same game as a watcher's view, which loads them, and asks for a second click: it cannot go on after the
// page reloads. The userscript can (userscript.ts). During a game it only says to click again when the game is over: a
// watcher's view would take the board from the player. A strategyjam.org page holds every move, while the game goes on
// too.
import { pageCodeText, type PageCode } from "./pageCode.ts";

/** The loader's version, sent with each game: a new loader takes the next number, and the import page then asks the
 *  players with an older one to drag the bookmarklet to the bar again. */
export const BOOKMARK_VERSION = 1;

/** The bookmark's code: it loads the bookmarklet's script from the site, and says so if it cannot. */
function load(origin: string, version: number) {
  const s = document.createElement("script");
  s.src = `${origin}/bookmarklet.js?bookmark=${version}`;
  s.onload = () => s.remove();
  s.onerror = () => {
    s.remove();
    alert(`Hedge School: the bookmarklet could not load its code from ${origin}. Check the connection, then click it again.`);
  };
  document.head.append(s);
}

/** Runs on the game's page, from the script that the bookmark loads. Self-contained: the script carries its source,
 *  and that of the functions it gets (`page`, pageCode.ts). The site's address and the bookmark's version come from the
 *  script's own address, so that the game goes back to the site that the bookmark came from. */
function grab(page: PageCode) {
  const src = new URL((document.currentScript as HTMLScriptElement).src);
  const origin = src.origin, version = src.searchParams.get("bookmark") ?? "";
  const click = "the Review in Hedge School bookmark"; // the bookmark's name, as the import page's link gives it
  const site = location.hostname;
  let record: () => string, at: string;
  if (site === "strategyjam.org") {
    const game = page.findJamGame();
    if (typeof game === "string") { alert(page.explain(game, click, origin, site)); return; }
    record = () => page.jamRecord(game);
    at = page.jamShownMove();
  } else {
    const game = page.findGame();
    if (!game) { alert(page.explain("none", click, origin, site)); return; }
    const why = page.missingMoves(game);
    if (why === "reload") {
      alert(`Hedge School: meaf.us shows your finished game without its moves. After you close this message, the page reloads as a watcher's view, which has them. When the game shows again, click ${click} once more.`);
      location.assign(page.watcherUrl());
      return;
    }
    if (why) { alert(page.explain(why, click, origin, site)); return; }
    record = () => page.meafRecord(game);
    at = page.shownMove();
  }
  let text: string;
  try { text = record(); } catch (e) { alert("Hedge School: " + (e as Error).message); return; }
  const url = origin + "/import#" + new URLSearchParams({ tool: "bookmarklet", v: version, site, at, record: text });
  // A slow load can end the click's right to open a tab: then this tab goes to the import page.
  if (!window.open(url, "_blank")) location.assign(url);
}

/** The bookmarklet's address, for a site served from `origin`: the loader. */
export function bookmarkletHref(origin: string): string {
  return "javascript:" + encodeURIComponent(`(${load})(${JSON.stringify(origin)}, ${BOOKMARK_VERSION})`);
}

/** The script that the loader adds to the game's page, served at /bookmarklet.js. */
export function bookmarkletScript(): string {
  return `(${grab})(${pageCodeText()});\n`;
}
