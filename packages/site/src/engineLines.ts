// The page's line for an engine that failed, on both sites: Practice's, the Board editor's, the review's and the
// Analysis board's. Each line is in strict Simplified Technical English, in the form of Practice's stop lines (Hedge
// School's design 24, item 14): what failed, then what the player can do. The error's message is the code's, such as a
// module's address or "RuntimeError: unreachable", and a player cannot act on it: it goes into the error report only.

/** Why the engine failed:
 *  - "unstarted": it did not start. Its manifest, its module or its worker did not load, most often on an old page after
 *    a new deploy, or the network failed. A new load of the page gets the site's files again and starts new workers.
 *  - "error": it failed at a task after its start, such as a search that a WebAssembly trap ended. A new load of the
 *    page starts new workers, and the review goes on from the results that the browser keeps. */
export type EngineFault = "unstarted" | "error";

/** The engine's name where the site gives none of its own (Hedge School's). */
const THE_ENGINE = "The engine";

/** The line for an engine that failed (`fault`), with the site's name for its engine (`engine`): Cyanotype's is
 *  "StampDuty". */
export function engineLine(fault: EngineFault, engine: string = THE_ENGINE): string {
  return fault === "unstarted" ? `${engine} did not start. Load the page again.`
    : `${engine} has an error. Load the page again.`;
}

/** The line in the place of the review for a game that the engine did not read (GameAnalysis's error): the rules'
 *  reason when they refused it (`refused`), which can say what is wrong with the record, else the engine's error line.
 *  `what` is the thing read: the review's "game", or the Analysis board's "board". */
export function unreadLine(game: { refused: boolean; error: string }, what: "game" | "board", engine?: string): string {
  return game.refused ? `The engine could not read this ${what}: ${game.error}` : engineLine("error", engine);
}
