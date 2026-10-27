// Drawing Board's tools for strategyjam.org (design 33): the bookmarklet and the userscript, on the tools' frame
// (@abstractclass/import's bookmarklet.ts and userscript.ts), as Hedge School's (design 11), with Drawing Board's
// parts: its names and texts, the button's picture and place, and its page code. The page code reads a strategyjam.org
// game of Blueprints (strategyjamPage.ts) and writes its record (strategyjam.ts). The site serves the tools' files at
// /bookmarklet.js, /drawing-board.user.js and /drawing-board.meta.js (src/routes), and its tools page gives the
// bookmark (src/routes/tools). The texts are strict Simplified Technical English: the player follows them.
import { bookmarkletHref as href, bookmarkletScript as script } from "@abstractclass/import/bookmarklet.ts";
import type { Tool } from "@abstractclass/import/importHash.ts";
import type { Found } from "@abstractclass/import/pageCode.ts";
import { userscriptHeader as header, userscriptSource as source, type ButtonPlace,
         type UserscriptSite } from "@abstractclass/import/userscript.ts";
import { center, hexPath, TOUCHING, type Hex } from "#lib/board/hex.ts";
import { SITE_NAME } from "#lib/site.ts";
import { jamRecord } from "./strategyjam.ts";
import { explain, findJamGame, jamShownMove } from "./strategyjamPage.ts";

/** The functions that `read` reaches through its page: each self-contained. */
const PAGE = { findJamGame, jamShownMove, jamRecord, explain };

/** Reads the player's page on a click (@abstractclass/import's pageCode.ts): a strategyjam.org game of Blueprints, or
 *  why it has none. The record refuses a game of other rules, or from another start (strategyjam.ts). Self-contained:
 *  it reaches the other functions through `page`. */
function read(page: typeof PAGE, _tool: Tool, click: string, origin: string): Found {
  const game = page.findJamGame();
  if (typeof game === "string") return { say: page.explain(game, click, origin) };
  return { id: game.id, record: () => page.jamRecord(game), at: page.jamShownMove() };
}

/** The page code that the tools carry. */
const PAGE_CODE = { read, ...PAGE };

/** The bookmark's name, and the userscript's in Tampermonkey's lists. */
export const TOOL_NAME = `Open in ${SITE_NAME}`;

/** Where the button sits on strategyjam.org: at the end of the page's row of buttons for the game (Sandbox, Download
 *  record, Resign), to the right, in a row of its own if the row is full. Blueprints' module puts the row at the foot
 *  of the column beside the board in a wide window, and strategyjam.org's own view puts it in the panel under the board
 *  in a narrow one: both draw it inside the stage (`.stage .actions`). So the button is in the page's own layout in
 *  both, and covers nothing. In a wide window the column at the window's right holds the player's own hand, which a
 *  button fixed in the corner would cover. Before the game comes, the page has no row, and the button is fixed in the
 *  window's lower right corner. */
const BUTTON_PLACES: Record<string, ButtonPlace> = {
  "strategyjam.org": {
    css: "display: flex; justify-content: flex-end; margin-left: auto; order: 99; align-self: center; --size: 36px",
    into: ".stage .actions",
  },
};

/** A five-pointed star's outline, its points `r` from its middle. */
const star = (r: number) => "M" + Array.from({ length: 10 }, (_, k) => {
  const a = (Math.PI / 5) * k - Math.PI / 2, d = k % 2 ? r * 0.42 : r;
  return `${+(d * Math.cos(a)).toFixed(2)},${+(d * Math.sin(a)).toFixed(2)}`;
}).join("L") + "Z";

/** The button's picture until the site has a logo (design 33, "Consequences"): a blueprint as the game starts it, a
 *  star with a ring of six cells, in white with the star marked, for the button and for Tampermonkey's lists. Each
 *  cell has the shape and place of a hex of the board (hex.ts), ten times as large. */
const svg = (size: number) => {
  const cells = [[0, 0] as Hex, ...TOUCHING].map(center).map(([x, y]) => hexPath(10 * x, 10 * y, 9.2));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-27 -27 54 54" width="${size}" height="${size}" aria-hidden="true">`
    + `<path fill="#fff" d="${cells.join("")}"/><path fill="#0b0c0e" d="${star(5.6)}"/></svg>`;
};

/** Drawing Board's parts of both tools (@abstractclass/import's UserscriptSite). */
const SITE: UserscriptSite<typeof PAGE_CODE> = {
  name: SITE_NAME, toolName: TOOL_NAME, id: "drawing-board", icon: svg, places: BUTTON_PLACES,
  description: "Opens the game of Blueprints on the strategyjam.org page in Drawing Board. It reads the game from the page. It sends no request to strategyjam.org, and it does not use your login.",
  author: "Yshan", homepage: "https://yhkao.com",
  matches: ["https://strategyjam.org/blueprints/game/*"],
  page: PAGE_CODE,
};

/** The bookmarklet's address, for the site served from `origin`: the loader. */
export const bookmarkletHref = (origin: string) => href(origin, SITE.name);

/** The script that the loader adds to the game's page, served at /bookmarklet.js. */
export const bookmarkletScript = () => script(SITE);

/** The userscript's header for Tampermonkey, alone (/drawing-board.meta.js). */
export const userscriptHeader = (origin: string, version: string) => header(SITE, origin, version);

/** The userscript's file (/drawing-board.user.js). */
export const userscriptSource = (origin: string, version: string, code: string) => source(SITE, origin, version, code);
