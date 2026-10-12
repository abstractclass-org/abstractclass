// The bookmarklet that brings a meaf.us game to the review. The player keeps it in the browser's bookmarks bar and
// clicks it on a meaf.us game page. It runs there, in the player's own page:
// 1. it finds the game the board holds (meafPage.ts), with no request to meaf.us and nothing from the player's login;
// 2. it writes the game's record (meaf.ts, carried in the bookmarklet as it is);
// 3. it opens this site's /import page with the record after the `#`, which the browser never sends to a server.
// It depends on meaf.us's page: a change there can break it, and then it says that it found no game.
//
// A player's own finished game has no moves in the page (meafPage.ts, missingMoves). The bookmarklet then opens the same
// game as a watcher's view, which loads them, and asks for a second click: it cannot go on after the page reloads. The
// userscript can (userscript.ts). During a game it only says to click again when the game is over: a watcher's view
// would take the board from the player.
import { meafRecord, type MeafGame } from "./meaf.ts";
import { explain, findGame, missingMoves, watcherUrl } from "./meafPage.ts";

/** Runs on the meaf.us page. Self-contained: the bookmarklet carries its source, and that of the functions it gets. */
function grab(find: typeof findGame, missing: typeof missingMoves, say: typeof explain, watcher: typeof watcherUrl,
              toRecord: (game: MeafGame) => string, origin: string) {
  const click = "the Review in Hedge School bookmark"; // the bookmark's name, as the import page's link gives it
  const game = find();
  if (!game) { alert(say("none", click)); return; }
  const why = missing(game);
  if (why === "reload") {
    alert(`Hedge School: meaf.us shows your finished game without its moves. After you close this message, the page reloads as a watcher's view, which has them. When the game shows again, click ${click} once more.`);
    location.assign(watcher());
    return;
  }
  if (why) { alert(say(why, click)); return; }
  let text: string;
  try { text = toRecord(game); } catch (e) { alert("Hedge School: " + (e as Error).message); return; }
  window.open(origin + "/import#" + encodeURIComponent(text), "_blank");
}

/** The bookmarklet's address, for a site served from `origin`. */
export function bookmarkletHref(origin: string): string {
  return "javascript:" + encodeURIComponent(
    `(${grab})(${findGame}, ${missingMoves}, ${explain}, ${watcherUrl}, ${meafRecord}, ${JSON.stringify(origin)})`);
}
