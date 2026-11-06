// The Export menu's entries (ExportMenu.svelte, Hedge School's designs 13 and 21): what each export makes, its label,
// and what it tells the player. Each page lists its own entries: the review's, the Analysis board's.

/** What an export makes, by name (Hedge School's design 17): a share link, a review file or an analysis file, the
 *  annotated record copied or as a file, or the review file saved to a partner site. */
export type ExportKind = "share_link" | "review_file" | "analysis_file" | "record_copy" | "record_file" | "partner_save";

/** An entry of the Export menu: what it makes, its label, a line on what the other end gets, and the note after it. */
export type ExportItem = [ExportKind, string, string, string];

/** What an export tells the player beyond the menu's own note, and a share link's length (Hedge School's design 17
 *  counts it). */
export interface ExportResult { note?: string; linkLength?: number }
