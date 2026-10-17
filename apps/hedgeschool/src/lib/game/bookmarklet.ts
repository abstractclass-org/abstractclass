// The bookmarklet that brings a meaf.us game to the review. The player keeps it in the browser's bookmarks bar and
// clicks it on a meaf.us game page. The bookmark holds only a loader (load): it adds this site's /bookmarklet.js to the
// meaf.us page, so that the bookmark stays as it is when the code changes, as the userscript updates itself. The code
// (grab) runs there, in the player's own page:
// 1. it finds the game the board holds (meafPage.ts), with no request to meaf.us and nothing from the player's login;
// 2. it writes the game's record (meaf.ts, carried in the script as it is);
// 3. it opens this site's review with the record after the `#`, which the browser never sends to a server, and says
//    which tool sent it (importHash.ts), so that the review can tell a player whose bookmark is an old one.
// It depends on meaf.us's page: a change there can break it, and then it says that it found no game. The loader also
// depends on meaf.us sending no content security policy that blocks other sites' scripts (it sends none).
//
// A player's own finished game has no moves in the page (meafPage.ts, missingMoves). The bookmarklet then opens the same
// game as a watcher's view, which loads them, and asks for a second click: it cannot go on after the page reloads. The
// userscript can (userscript.ts). During a game it only says to click again when the game is over: a watcher's view
// would take the board from the player.
import { meafRecord, type MeafGame } from "./meaf.ts";
import { explain, findGame, missingMoves, watcherUrl } from "./meafPage.ts";

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

/** Runs on the meaf.us page, from the script that the bookmark loads. Self-contained: the script carries its source,
 *  and that of the functions it gets. The site's address and the bookmark's version come from the script's own
 *  address, so that the game goes back to the site that the bookmark came from. */
function grab(find: typeof findGame, missing: typeof missingMoves, say: typeof explain, watcher: typeof watcherUrl,
              toRecord: (game: MeafGame) => string) {
  const src = new URL((document.currentScript as HTMLScriptElement).src);
  const origin = src.origin, version = src.searchParams.get("bookmark") ?? "";
  const click = "the Review in Hedge School bookmark"; // the bookmark's name, as the import page's link gives it
  const game = find();
  if (!game) { alert(say("none", click, origin)); return; }
  const why = missing(game);
  if (why === "reload") {
    alert(`Hedge School: meaf.us shows your finished game without its moves. After you close this message, the page reloads as a watcher's view, which has them. When the game shows again, click ${click} once more.`);
    location.assign(watcher());
    return;
  }
  if (why) { alert(say(why, click, origin)); return; }
  let text: string;
  try { text = toRecord(game); } catch (e) { alert("Hedge School: " + (e as Error).message); return; }
  const url = origin + "/review#" + new URLSearchParams({ tool: "bookmarklet", v: version, record: text });
  // A slow load can end the click's right to open a tab: then this tab goes to the review.
  if (!window.open(url, "_blank")) location.assign(url);
}

/** The bookmarklet's address, for a site served from `origin`: the loader. */
export function bookmarkletHref(origin: string): string {
  return "javascript:" + encodeURIComponent(`(${load})(${JSON.stringify(origin)}, ${BOOKMARK_VERSION})`);
}

/** The script that the loader adds to the meaf.us page, served at /bookmarklet.js. */
export function bookmarkletScript(): string {
  return `(${grab})(${findGame}, ${missingMoves}, ${explain}, ${watcherUrl}, ${meafRecord});\n`;
}
