// The functions that the bookmarklet (bookmarklet.ts) and the userscript (userscript.ts) run in the game's page: on
// meaf.us (meafPage.ts, meaf.ts) and on strategyjam.org (strategyjamPage.ts, strategyjam.ts). Each is self-contained, so
// the tools carry them as text: one object of them, by name, which the tool's own code takes as its argument.
import { meafRecord } from "./meaf.ts";
import { explain, findGame, missingMoves, watcherUrl } from "./meafPage.ts";
import { jamRecord } from "./strategyjam.ts";
import { findJamGame } from "./strategyjamPage.ts";

export const PAGE_CODE = { findGame, missingMoves, explain, watcherUrl, meafRecord, findJamGame, jamRecord };
export type PageCode = typeof PAGE_CODE;

/** PAGE_CODE as the text of an object, for a tool's script. */
export const pageCodeText = () => `{ ${Object.entries(PAGE_CODE).map(([name, f]) => `${name}: ${f}`).join(", ")} }`;
