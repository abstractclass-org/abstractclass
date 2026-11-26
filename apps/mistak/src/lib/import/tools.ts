// Mistak's tools for playtak.com (docs/design/34-tak-site.md, "The tools for playtak's pages"): the bookmarklet and the
// userscript, on the tools' frame (@abstractclass/import's bookmarklet.ts and userscript.ts), as Hedge School's
// (design 11) and Cyanotype's, with Mistak's parts: its names and texts, the button's picture and place, and its page
// code. The page code reads the game on playtak's board (playtakPage.ts) and writes its record in PTN. The site serves
// the tools' files at /bookmarklet.js, /mistak.user.js and /mistak.meta.js (src/routes), and its tools page gives the
// bookmark (src/routes/tools). The texts are strict Simplified Technical English: the player follows them.
import { bookmarkletHref as href, bookmarkletScript as script } from "@abstractclass/import/bookmarklet.ts";
import type { Tool } from "@abstractclass/import/importHash.ts";
import type { Found } from "@abstractclass/import/pageCode.ts";
import { userscriptHeader as header, userscriptSource as source, type ButtonPlace,
         type UserscriptSite } from "@abstractclass/import/userscript.ts";
import { svgTag } from "@abstractclass/site/brand.ts";
import { drawingMarkup } from "@abstractclass/site/brandGradient.ts";
import { LOGO_SMALL } from "#lib/brand/logo.ts";
import { SITE_COPYRIGHT, SITE_NAME } from "#lib/site.ts";
import { explain, findPlaytakGame, pageRecord } from "./playtakPage.ts";

/** The functions that `read` reaches through its page: each self-contained. */
const PAGE = { findPlaytakGame, pageRecord, explain };

/** Reads the player's page on a click (@abstractclass/import's pageCode.ts): the game on playtak's board, or why it has
 *  none. Mistak's import page checks the record. Self-contained: it reaches the other functions through `page`. */
function read(page: typeof PAGE, _tool: Tool, click: string, origin: string): Found {
  const game = page.findPlaytakGame();
  if (typeof game === "string") return { say: page.explain(game, click, origin) };
  return { id: game.id, record: () => page.pageRecord(game), at: game.at };
}

/** The page code that the tools carry. */
const PAGE_CODE = { read, ...PAGE };

/** The bookmark's name, and the userscript's in Tampermonkey's lists. */
export const TOOL_NAME = `Open in ${SITE_NAME}`;

/** Where the button sits on playtak.com: on a line of its own, at the middle, under the row of buttons under the move
 *  list (the first move, the move before, the move after, the last move), so that it covers nothing of the board. The
 *  row is in the panel beside the board, and it is full: in playtak's own client, with its panel 198 pixels wide, a
 *  button at the end of the row went to a line of its own. The button shows only while the move list has a row: before
 *  a game, the page has nothing to open. */
const PLACE: ButtonPlace = {
  css: "display: block; width: fit-content; margin: 4px auto 0; --size: 30px",
  into: "#notationbar + .optlist", shows: "#moveslist tr",
};
const BUTTON_PLACES: Record<string, ButtonPlace> = { "playtak.com": PLACE, "www.playtak.com": PLACE };

/** The button's picture, also in Tampermonkey's lists: the logo's simple drawing (src/lib/brand/logo.ts), as Hedge
 *  School's button shows its collie's head, on one line and hidden from screen readers. */
const svg = (size: number) => svgTag(size, ' aria-hidden="true"') + drawingMarkup(LOGO_SMALL, "mistak-tool") + "</svg>";

/** Mistak's parts of both tools (@abstractclass/import's UserscriptSite). */
const SITE: UserscriptSite<typeof PAGE_CODE> = {
  name: SITE_NAME, toolName: TOOL_NAME, id: "mistak", icon: svg, places: BUTTON_PLACES,
  description: "Opens the game on the playtak.com board in Mistak. It reads the game from the page. It sends no request to playtak.com, and it does not use your login.",
  // The author is the holder of the sites' copyright: the hooks' check of private words allows the name only in
  // copyright.ts's one line, so it comes from there.
  author: SITE_COPYRIGHT.replace(/^© \d+ /, ""), homepage: "https://yhkao.com",
  matches: ["https://playtak.com/*", "https://www.playtak.com/*"],
  page: PAGE_CODE,
};

/** The bookmarklet's address, for the site served from `origin`: the loader. */
export const bookmarkletHref = (origin: string) => href(origin, SITE.name);

/** The script that the loader adds to the game's page, served at /bookmarklet.js. */
export const bookmarkletScript = () => script(SITE);

/** The userscript's header for Tampermonkey, alone (/mistak.meta.js). */
export const userscriptHeader = (origin: string, version: string) => header(SITE, origin, version);

/** The userscript's file (/mistak.user.js). */
export const userscriptSource = (origin: string, version: string, code: string) => source(SITE, origin, version, code);
