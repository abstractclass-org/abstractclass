// Imports and loads as events (design 17), in the site's words (design 22). Two acts bring a game in:
// - an import: a game from outside the site, its moves alone, to the review (where the game is kept in the player's
//   list, then reviewed) or to the Analysis board. The site then does the work;
// - a load: the site's own saved work, a review or an analysis, from a file, a share link or a partner site that kept
//   it. It brings the lines, and the engine's results when it has them.
// Each source names one way in. A load's source also names where it goes. A site lists the sources of its imports
// (Hedge School's src/lib/game/sources.ts), and gives its analytics (ImportTracker).

/** Where an imported game goes: the review, or the Analysis board. */
export type ImportTo = "review" | "analysis";

/** Why an import failed: the record cannot be read, the engine's rules (or the storage) refuse it, or the link is
 *  broken. */
export type ImportFailure = "record" | "rejected" | "link";

/** How saved work came in, which also says where it goes: a review file, a review's share link and a partner's review
 *  to the review, an analysis file and an analysis's share link to the Analysis board. */
export type LoadSource =
  | "review_file" // a review file
  | "analysis_file" // an analysis file
  | "review_share_link" // a review's share link (`/review#packed=`)
  | "analysis_share_link" // an analysis's share link (`/analysis#packed=`)
  | "partner_review"; // a review that a partner's page kept, sent back (`/review#from=`, design 18)

/** Why a load failed: the file or the link cannot be read, or the engine's rules (or the storage) refuse its game. */
export type LoadFailure = "file" | "link" | "rejected";

/** What the events take of the site: its analytics' events (`track`), and a game's length in moves as the range that
 *  the events give (`range`: a count goes as a range, design 17). The events name that range `edges`. */
export interface ImportTracker {
  track(name: string, params: Record<string, string | number | boolean>): void;
  range(moves: number): string;
}

/** The events of a site whose imports come by the sources `S`, sent to its analytics. */
export function importEvents<S extends string>(t: ImportTracker) {
  return {
    /** A game imported: where it went, how it came, and its length as a range. */
    trackImport(to: ImportTo, source: S, moves: number) {
      t.track("import_game", { import_to: to, import_source: source, edges: t.range(moves) });
    },
    /** An import that failed, and why. */
    trackImportFailed(to: ImportTo, source: S, failure: ImportFailure) {
      t.track("import_failed", { import_to: to, import_source: source, import_failure: failure });
    },
    /** Saved work loaded: how it came, its game's length as a range, and what else it held. */
    trackLoad(source: LoadSource, moves: number, extra: Record<string, boolean> = {}) {
      t.track("load_saved", { load_source: source, edges: t.range(moves), ...extra });
    },
    /** A load that failed, and why. */
    trackLoadFailed(source: LoadSource, failure: LoadFailure) {
      t.track("load_failed", { load_source: source, load_failure: failure });
    },
  };
}
