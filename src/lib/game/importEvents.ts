// Imports as events (design 17). An import is one act: a game brought into Hedge School, to the review (where the game
// is kept in the player's list, then reviewed) or to the Analysis board. Every way in sends the same events, with where
// the game went and how it came. Each source names one way in.
import { track } from "#lib/analytics.svelte.ts";
import { EDGE_RANGES, range } from "#lib/measure.ts";

/** Where an imported game goes: the review, or the Analysis board. */
export type ImportTo = "review" | "analysis";

/** How a game came in. */
export type ImportSource =
  | "pasted_record" // a record pasted in a page's box
  | "pasted_constellation" // Constellation's export pasted in a page's box (constellation.ts)
  | "review_file" // a review file opened (reviewFile.ts)
  | "analysis_file" // an analysis file opened (analysisFile.ts)
  | "review_share_link" // a review's share link (`/review#packed=`, share.ts)
  | "analysis_share_link" // an analysis's share link (`/analysis#packed=`, board.ts)
  | "site_link" // another site's link with a record (`#record=`, design 18)
  | "partner_review" // a review that a partner's page kept, sent back (`/review#from=`, design 18)
  | "bookmarklet" // the meaf.us bookmarklet (bookmarklet.ts)
  | "userscript" // the meaf.us userscript (userscript.ts)
  | "older_tool"; // a meaf.us tool from before the tools named themselves (importHash.ts)

/** Why an import failed: the record cannot be read, the engine's rules refuse it, the link is broken, or the file. */
export type ImportFailure = "record" | "rejected" | "link" | "file";

/** A game imported: where it went, how it came, its length as a range, and what else it held. */
export function trackImport(to: ImportTo, source: ImportSource, edges: number, extra: Record<string, boolean> = {}) {
  track("import_game", { import_to: to, import_source: source, edges: range(edges, EDGE_RANGES), ...extra });
}

/** An import that failed, and why. */
export function trackImportFailed(to: ImportTo, source: ImportSource, failure: ImportFailure) {
  track("import_failed", { import_to: to, import_source: source, import_failure: failure });
}
