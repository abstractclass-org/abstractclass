// Imports and loads as events (design 17), in the site's words (design 22). Two acts bring a game in:
// - an import: a game from outside Hedge School, its moves alone, to the review (where the game is kept in the
//   player's list, then reviewed) or to the Analysis board. Hedge School then does the work;
// - a load: Hedge School's own saved work, a review or an analysis, from a file, a share link or a partner site that
//   kept it. It brings the lines, and the engine's results when it has them.
// Each source names one way in. A load's source also names where it goes.
import { track } from "#lib/analytics.svelte.ts";
import { EDGE_RANGES, range } from "#lib/measure.ts";

/** Where an imported game goes: the review, or the Analysis board. */
export type ImportTo = "review" | "analysis";

/** How a game came in from outside. */
export const IMPORT_SOURCES = [
  "pasted_record", // a record pasted in a page's box
  "pasted_constellation", // Constellation's export pasted in a page's box (constellation.ts)
  "pasted_position", // a position pasted in the Analysis board's Import, with or without moves (design 21)
  "site_link", // another site's link with a record or a position (`#record=`, `#position=`, design 18)
  "bookmarklet", // the bookmarklet (bookmarklet.ts) on meaf.us
  "userscript", // the userscript (userscript.ts) on meaf.us
  "strategyjam_bookmarklet", // the bookmarklet on strategyjam.org
  "strategyjam_userscript", // the userscript on strategyjam.org
  "older_tool", // a meaf.us tool from before the tools named themselves (importHash.ts)
] as const;
export type ImportSource = (typeof IMPORT_SOURCES)[number];

/** Whether a page's text names an import's source. */
export const isImportSource = (s: string | null): s is ImportSource =>
  (IMPORT_SOURCES as readonly (string | null)[]).includes(s);

/** Why an import failed: the record cannot be read, the engine's rules (or the storage) refuse it, or the link is
 *  broken. */
export type ImportFailure = "record" | "rejected" | "link";

/** A game imported: where it went, how it came, and its length as a range. */
export function trackImport(to: ImportTo, source: ImportSource, edges: number) {
  track("import_game", { import_to: to, import_source: source, edges: range(edges, EDGE_RANGES) });
}

/** An import that failed, and why. */
export function trackImportFailed(to: ImportTo, source: ImportSource, failure: ImportFailure) {
  track("import_failed", { import_to: to, import_source: source, import_failure: failure });
}

/** How saved work came in, which also says where it goes: a review file, a review's share link and a partner's review
 *  to the review, an analysis file and an analysis's share link to the Analysis board. */
export type LoadSource =
  | "review_file" // a review file (reviewFile.ts)
  | "analysis_file" // an analysis file (analysisFile.ts)
  | "review_share_link" // a review's share link (`/review#packed=`, share.ts)
  | "analysis_share_link" // an analysis's share link (`/analysis#packed=`, board.ts)
  | "partner_review"; // a review that a partner's page kept, sent back (`/review#from=`, design 18)

/** Why a load failed: the file or the link cannot be read, or the engine's rules (or the storage) refuse its game. */
export type LoadFailure = "file" | "link" | "rejected";

/** Saved work loaded: how it came, its game's length as a range, and what else it held. */
export function trackLoad(source: LoadSource, edges: number, extra: Record<string, boolean> = {}) {
  track("load_saved", { load_source: source, edges: range(edges, EDGE_RANGES), ...extra });
}

/** A load that failed, and why. */
export function trackLoadFailed(source: LoadSource, failure: LoadFailure) {
  track("load_failed", { load_source: source, load_failure: failure });
}
