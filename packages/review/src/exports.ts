// The Export menu's entries (ExportMenu.svelte, Hedge School's designs 13 and 21): what each export makes, its label,
// and what it tells the player. Each page lists its own entries: the review's, the Analysis board's. The entries that
// every site's pages share are here, so that their words stay one.

/** What an export makes, by name (Hedge School's design 17): a share link, a review file or an analysis file, the
 *  annotated record copied or as a file, or the review file saved to a partner site. */
export type ExportKind = "share_link" | "review_file" | "analysis_file" | "record_copy" | "record_file" | "partner_save";

/** An entry of the Export menu: what it makes, its label, a line on what the other end gets, and the note after it. */
export type ExportItem = [ExportKind, string, string, string];

/** What an export tells the player beyond the menu's own note, and a share link's length (Hedge School's design 17
 *  counts it). */
export interface ExportResult { note?: string; linkLength?: number }

/** The review's link (Hedge School's design 13, item 8): it holds no results, so the recipient's browser reviews the
 *  game again. */
export const REVIEW_LINK: ExportItem =
  ["share_link", "Copy a link to share the review", "Short. The recipient's browser reviews the game again.", "Link copied"];

/** The annotated record, copied or as a file: the review's and the Analysis board's last entries. */
export const RECORD_EXPORTS: ExportItem[] = [
  ["record_copy", "Copy the annotated record", "", "Annotated record copied"],
  ["record_file", "Annotated record as a file", "", "Annotated record saved"],
];

/** The Analysis board's entries (Hedge School's design 21): the analysis by link, as a file with the engine's results,
 *  or as the annotated record. */
export const BOARD_EXPORTS: ExportItem[] = [
  ["share_link", "Copy a link to share the analysis", "Its lines and the moves evaluated. The recipient's browser searches what it shows.", "Link copied"],
  ["analysis_file", "Analysis file, to load later or elsewhere", "With the engine's results: the analysis opens at once.", "Analysis file saved"],
  ...RECORD_EXPORTS,
];
