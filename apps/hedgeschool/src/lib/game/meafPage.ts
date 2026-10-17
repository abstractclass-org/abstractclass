// What the bookmarklet (bookmarklet.ts) and the userscript (userscript.ts) run in the player's own meaf.us page. Each
// function is self-contained (no imports, nothing from outside its own body): the two carry their source as text.
import type { MeafGame } from "./meaf.ts";

/** The meaf.us game that the page's board holds, or null: React keeps it as the board component's `game` prop, the way
 *  the engine repository's tools/sitebot_driver.js reads it. No request to meaf.us, and nothing from the player's login. */
export function findGame(): MeafGame | null {
  const svg = document.querySelector("svg.board") as (Element & Record<string, unknown>) | null;
  const key = svg && Object.keys(svg).find(k => k.startsWith("__reactFiber"));
  type Fiber = { return: Fiber | null; alternate: Fiber | null; memoizedProps?: { game?: MeafGame } };
  for (let f = (key ? svg![key] : null) as Fiber | null; f; f = f.return)
    for (const x of [f, f.alternate]) {
      const g = x && x.memoizedProps && x.memoizedProps.game;
      if (g && Array.isArray(g.moveHistory)) return g;
    }
  return null;
}

/** Why the page's game lacks moves, or null when it has them all. meaf.us gives a player's own game without its moves:
 *  the page asks for them only for a viewer who watches the game (`spectate=1`) or opens it from the History page
 *  (design 11). "playing": the game goes on. "loading": a watcher's view that has not received them yet. "reload": a
 *  finished game, whose watcher's view loads them (watcherUrl). */
export function missingMoves(g: MeafGame): "playing" | "loading" | "reload" | null {
  if (g.moveHistory.length >= (g.historyLength ?? 0)) return null;
  if (g.phase !== "done") return "playing";
  return new URLSearchParams(location.search).get("spectate") === "1" ? "loading" : "reload";
}

/** This page's address as a watcher's view of its game. */
export function watcherUrl(): string {
  const url = new URL(location.href);
  url.searchParams.set("spectate", "1");
  return url.href;
}

/** What to tell the player when the page gives no game to review. `click` names what they click again: "the Review in
 *  Hedge School bookmark", or "the Hedge School button". `site` is the site's address: with no game on a page that
 *  shows one, meaf.us may have changed its page, and the site's import page has the tools as they are now. */
export function explain(why: "none" | "playing" | "loading", click: string, site: string): string {
  return "Hedge School: " + (why === "none"
    ? `no game found on this page. Open a game on meaf.us (one you play or watch, or a finished one), then click ${click} again. If a game shows and this message comes back, meaf.us may have changed its page: ${site}/tools has the newest bookmarklet and userscript.`
    : why === "playing" ? `meaf.us gives your own game without its moves while you play. When the game is over, click ${click} again.`
    : `this page does not have the game's moves yet. Wait a moment, then click ${click} again.`);
}
