// The bookmarklet that brings a game from a game site's page to a site's import page (design 11). The player keeps it in
// the browser's bookmarks bar and clicks it on a game page. The bookmark holds only a loader (load): it adds the site's
// /bookmarklet.js to the game's page, so that the bookmark stays as it is when the code changes, as the userscript
// updates itself. The code (grab) runs there, in the player's own page:
// 1. the site's page code (pageCode.ts) finds the game that the page holds, with no request to the game's site and
//    nothing from the player's login, and reads the position that the page shows, when the page says;
// 2. it writes the game's record (carried in the script as the site writes it);
// 3. the bookmarklet opens the site's import page with the record and the position after the `#`, which the browser
//    never sends to a server, and says which tool sent it and from which site (importHash.ts), so that the page can
//    tell a player whose bookmark is an old one.
// It depends on the game sites' pages: a change there can break the page code, and then it says that it found no game.
// The loader also depends on each game site sending no content security policy that blocks other sites' scripts.
//
// When the page code finds no game, the bookmarklet shows its message. When the page lacks the game's moves and the page
// code names an address that has them (Hedge School's meaf.us watcher's view), the bookmarklet then loads it, and the
// message asks for a second click: the bookmarklet cannot go on after the page reloads. The userscript can
// (userscript.ts).
import { pageCodeText, type AnyPageCode, type PageCode } from "./pageCode.ts";

/** The loader's version, sent with each game: a new loader takes the next number, and the import page then asks the
 *  players with an older one to drag the bookmarklet to the bar again. */
export const BOOKMARK_VERSION = 1;

/** What the bookmarklet takes of a site: its name, which starts each message, the tools' own name, which is the
 *  bookmark's, and its page code. A site's UserscriptSite (userscript.ts) has them all. */
export interface BookmarkletSite<P extends PageCode<P>> { name: string; toolName: string; page: P }

/** The bookmark's code: it loads the bookmarklet's script from the site, and says so if it cannot. */
function load(origin: string, version: number, name: string) {
  const s = document.createElement("script");
  s.src = `${origin}/bookmarklet.js?bookmark=${version}`;
  s.onload = () => s.remove();
  s.onerror = () => {
    s.remove();
    alert(`${name}: the bookmarklet could not load its code from ${origin}. Check the connection. Then click the bookmarklet again.`);
  };
  document.head.append(s);
}

/** Runs on the game's page, from the script that the bookmark loads. Self-contained: the script carries its source,
 *  and that of the functions it gets (`page`, pageCode.ts). The site's address and the bookmark's version come from the
 *  script's own address, so that the game goes back to the site that the bookmark came from. */
function grab(name: string, click: string, page: AnyPageCode) {
  const src = new URL((document.currentScript as HTMLScriptElement).src);
  const origin = src.origin, version = src.searchParams.get("bookmark") ?? "";
  const site = location.hostname;
  const found = page.read(page, "bookmarklet", click, origin);
  if ("say" in found) {
    alert(found.say);
    if (found.reload) location.assign(found.reload.url);
    return;
  }
  let text: string;
  try { text = found.record(); } catch (e) { alert(`${name}: ` + (e as Error).message); return; }
  const url = origin + "/import#" + new URLSearchParams({ tool: "bookmarklet", v: version, site, at: found.at, record: text });
  // A slow load can end the click's right to open a tab: then this tab goes to the import page.
  if (!window.open(url, "_blank")) location.assign(url);
}

/** The bookmarklet's address, for a site served from `origin`: the loader. `name` is the site's name. */
export function bookmarkletHref(origin: string, name: string): string {
  return "javascript:" + encodeURIComponent(`(${load})(${JSON.stringify(origin)}, ${BOOKMARK_VERSION}, ${JSON.stringify(name)})`);
}

/** The script that the loader adds to the game's page, served at /bookmarklet.js. */
export function bookmarkletScript<P extends PageCode<P>>(site: BookmarkletSite<P>): string {
  const click = `the ${site.toolName} bookmark`; // what the player clicks, as the messages name it
  return `(${grab})(${JSON.stringify(site.name)}, ${JSON.stringify(click)}, ${pageCodeText(site.page)});\n`;
}
