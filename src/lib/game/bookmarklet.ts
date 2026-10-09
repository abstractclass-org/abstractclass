// The bookmarklet that brings a meaf.us game to the review. The player keeps it in the browser's bookmarks bar and
// clicks it on a meaf.us game page. It runs there, in the player's own page:
// 1. it finds the game the board holds (React keeps it as the board component's `game` prop, the way the engine
//    repository's tools/sitebot_driver.js reads it), with no request to meaf.us and nothing from the player's login;
// 2. it writes the game's record (meaf.ts, carried in the bookmarklet as it is);
// 3. it opens this site's /import page with the record after the `#`, which the browser never sends to a server.
// It depends on meaf.us's page: a change there can break it, and then it says that it found no game.
import { meafRecord } from "./meaf.ts";

/** Runs on the meaf.us page. Self-contained: the bookmarklet carries its source. */
function grab(toRecord: (game: unknown) => string, origin: string) {
  const prefix = "Learn Enclosure: ";
  const svg = document.querySelector("svg.board") as (Element & Record<string, unknown>) | null;
  const key = svg && Object.keys(svg).find(k => k.startsWith("__reactFiber"));
  let game: { moveHistory?: unknown[] } | null = null;
  type Fiber = { return: Fiber | null; alternate: Fiber | null; memoizedProps?: { game?: { moveHistory?: unknown[] } } };
  for (let f = (key ? svg![key] : null) as Fiber | null; f && !game; f = f.return)
    for (const x of [f, f.alternate]) {
      const g = x && x.memoizedProps && x.memoizedProps.game;
      if (g && Array.isArray(g.moveHistory)) { game = g; break; }
    }
  if (!game) { alert(prefix + "no game found on this page. Open a game on meaf.us (one you play or watch, or a finished one), then click again."); return; }
  let text: string;
  try { text = toRecord(game); } catch (e) { alert(prefix + (e as Error).message); return; }
  window.open(origin + "/import#" + encodeURIComponent(text), "_blank");
}

/** The bookmarklet's address, for a site served from `origin`. */
export function bookmarkletHref(origin: string): string {
  return "javascript:" + encodeURIComponent(`(${grab.toString()})(${meafRecord.toString()}, ${JSON.stringify(origin)})`);
}
