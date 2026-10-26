// Hedge School's tools for meaf.us and strategyjam.org (design 11): the bookmarklet and the userscript, on the tools'
// frame (@abstractclass/import's bookmarklet.ts and userscript.ts), with Hedge School's parts: its names and texts, the
// school's collie on the button, the button's place on each site, and its page code. The page code reads a meaf.us
// game (meafPage.ts, meaf.ts) or a strategyjam.org game of Enclosure (strategyjamPage.ts, strategyjam.ts). The site
// serves the tools' files at /bookmarklet.js, /hedge-school.user.js and /hedge-school.meta.js (src/routes), and its
// tools page gives the bookmark (src/routes/tools).
//
// A player's own finished game on meaf.us has no moves in the page (meafPage.ts, missingMoves). The page code then names
// the same game as a watcher's view, which loads them. The bookmarklet opens it and asks for a second click: it cannot
// go on after the page reloads. The userscript can: it opens the game once the moves come. During a game the page code
// only says to click again when the game is over: a watcher's view would take the board from the player. A
// strategyjam.org page holds every move, while the game goes on too.
import { HEAD_COAT, HEAD_SILHOUETTE, HEAD_VIEWBOX } from "#lib/collie.ts";
import { bookmarkletHref as href, bookmarkletScript as script } from "@abstractclass/import/bookmarklet.ts";
import type { Tool } from "@abstractclass/import/importHash.ts";
import type { Found } from "@abstractclass/import/pageCode.ts";
import { FIXED_PLACE, userscriptHeader as header, userscriptSource as source, type ButtonPlace,
         type UserscriptSite } from "@abstractclass/import/userscript.ts";
import { meafRecord } from "./meaf.ts";
import { explain, findGame, missingMoves, shownMove, watcherUrl } from "./meafPage.ts";
import type { ImportSource } from "./sources.ts";
import { jamRecord } from "./strategyjam.ts";
import { findJamGame, jamShownMove } from "./strategyjamPage.ts";

/** The functions that `read` reaches through its page: each self-contained. */
const PAGE = { findGame, missingMoves, explain, watcherUrl, shownMove, meafRecord, findJamGame, jamShownMove, jamRecord };

/** Reads the player's page on a click (@abstractclass/import's pageCode.ts): a strategyjam.org game, or a meaf.us
 *  game, or why it has none. Self-contained: it reaches the other functions through `page`. */
function read(page: typeof PAGE, tool: Tool, click: string, origin: string): Found {
  const site = location.hostname;
  if (site === "strategyjam.org") {
    const game = page.findJamGame();
    if (typeof game === "string") return { say: page.explain(game, click, origin, site) };
    return { id: game.page, record: () => page.jamRecord(game), at: page.jamShownMove() };
  }
  const game = page.findGame();
  if (!game) return { say: page.explain("none", click, origin, site) };
  const why = page.missingMoves(game);
  if (why === "reload") {
    const say = tool === "bookmarklet"
      ? `Hedge School: meaf.us shows your finished game without its moves. After you close this message, the page reloads as a watcher's view, which has them. When the game shows again, click ${click} once more.`
      : "Hedge School: meaf.us shows your finished game without its moves. The page reloads as a watcher's view, which has them. Then Hedge School opens the game.";
    return { say, reload: { url: page.watcherUrl(), id: String(game.gameID) } };
  }
  if (why) return { say: page.explain(why, click, origin, site) };
  return { id: String(game.gameID), record: () => page.meafRecord(game), at: page.shownMove() };
}

/** The page code that the tools carry. */
const PAGE_CODE = { read, ...PAGE };

/** The userscript's own name, in Tampermonkey's lists, and the bookmark's. */
export const USERSCRIPT_NAME = "Review in Hedge School";

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

/** The school's collie, the head alone, for the button and for Tampermonkey's lists. */
const svg = (size: number) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${HEAD_VIEWBOX}" width="${size}" height="${size}" `
  + `fill-rule="evenodd" aria-hidden="true"><path fill="#fff" d="${HEAD_SILHOUETTE}"/><path fill="#0b0c0e" d="${HEAD_COAT}"/></svg>`;

const USERSCRIPT: UserscriptSite<typeof PAGE_CODE> = {
  name: "Hedge School", script: USERSCRIPT_NAME, id: "hedge-school", click: "the Hedge School button",
  open: "Open this game in Hedge School", icon: svg, places: BUTTON_PLACES,
  description: "Opens the meaf.us or strategyjam.org game on screen in Hedge School, to review it or to analyze it on the board. Reads the game from the page: no request to the game's site, nothing from your login.",
  author: "Yshan", homepage: "https://yhkao.com",
  matches: ["https://meaf.us/sst1/*", "https://strategyjam.org/enclosure/game/*"],
  page: PAGE_CODE,
};

/** The bookmarklet's address, for the site served from `origin`: the loader. */
export const bookmarkletHref = (origin: string) => href(origin, "Hedge School");

/** The script that the loader adds to the game's page, served at /bookmarklet.js. `click` is the bookmark's name, as
 *  the tools page's link gives it. */
export const bookmarkletScript = () => script({ name: "Hedge School", click: "the Review in Hedge School bookmark", page: PAGE_CODE });

/** The userscript's header for Tampermonkey, alone (/hedge-school.meta.js). */
export const userscriptHeader = (origin: string, version: string) => header(USERSCRIPT, origin, version);

/** The userscript's file (/hedge-school.user.js). */
export const userscriptSource = (origin: string, version: string, code: string) => source(USERSCRIPT, origin, version, code);

/** A tool's way in, for the import events (design 17): the tool, on the site that it ran on. A tool that names no
 *  site ran on meaf.us. */
export const toolSource = (tool: Tool, site: string | null): ImportSource =>
  site === "strategyjam.org" ? `strategyjam_${tool}` : tool;
