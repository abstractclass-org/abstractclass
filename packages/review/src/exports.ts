// The Export menu's entries (ExportMenu.svelte, Hedge School's designs 13 and 21): what each export makes, its label,
// and what it tells the player. Each page lists its own entries: the review's, the Analysis board's. The entries that
// every site's pages share are here, so that their words stay one, with the delivery of the review's files, of its
// link and of the Analysis board's exports.
import { DISCORD_LIMIT } from "@abstractclass/analysis/share.ts";
import { download } from "@abstractclass/site/download.ts";

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

/** The review file (Hedge School's design 13): it holds the engine's results, so the review opens at once. */
export const REVIEW_FILE: ExportItem =
  ["review_file", "Review file, to load later or elsewhere", "With the engine's results: the review opens at once.", "Review file saved"];

/** The note after a review's link is copied: its length, and a warning past a Discord message's limit, which offers
 *  the review file in the link's place. */
export function shareNote(length: number): string {
  const n = length.toLocaleString("en");
  return length > DISCORD_LIMIT
    ? `Link copied: ${n} characters, more than a Discord message takes (${DISCORD_LIMIT.toLocaleString("en")}). Delete some variations, or send the review file.`
    : `Link copied (${n} characters). The recipient's browser reviews the game again.`;
}

/** Copies a link, and answers its length (Hedge School's design 17 counts it). */
async function copyLink(link: string): Promise<ExportResult> {
  await navigator.clipboard.writeText(link);
  return { linkLength: link.length };
}

/** Copies a review's link (Hedge School's design 13, item 8), and answers its length and the note on it (shareNote). */
export async function copyReviewLink(link: string): Promise<ExportResult> {
  return { ...(await copyLink(link)), note: shareNote(link.length) };
}

/** Delivers a file or the annotated record, as both sites' reviews and Analysis boards do (Hedge School's designs 13
 *  and 21). The review file or the analysis file, which `file` makes, goes out as a download named `name`. The
 *  annotated record, which `annotated` writes, is copied (`record_copy`), or else goes out as a download named
 *  `recordName`: by default the file's name with `.txt`. */
export async function deliverFileOrRecord(kind: ExportKind, name: string, file: () => Promise<unknown>,
                                          annotated: () => string | Promise<string>,
                                          recordName = name.replace(/\.json$/, ".txt")): Promise<void> {
  if (kind === "review_file" || kind === "analysis_file") return download(name, JSON.stringify(await file()));
  const text = await annotated();
  if (kind === "record_copy") await navigator.clipboard.writeText(text);
  else download(recordName, text, "text/plain");
}

/** The annotated record, copied or as a file: the review's and the Analysis board's last entries. */
export const RECORD_EXPORTS: ExportItem[] = [
  ["record_copy", "Copy the annotated record", "", "Annotated record copied"],
  ["record_file", "Annotated record as a file", "", "Annotated record saved"],
];

/** What the Analysis board exports: its link, its analysis file and the file's name, and its annotated record. Each
 *  function makes its export only when the player asks for it. */
export interface BoardExport {
  link: () => string;
  file: () => Promise<unknown>;
  fileName: string;
  annotated: () => string;
}

/** The note of the Analysis board's annotated record: the site, and the network of the engine's results, by its name
 *  and its id. */
export const boardRecordNote = (site: string, networkName: string, networkId: string) =>
  `${site}'s Analysis board, with ${networkName} (the network ${networkId}).`;

/** Delivers an export of the Analysis board (Hedge School's design 21), as both sites' boards do. The link is copied.
 *  The analysis file goes out as a download. The annotated record is copied, or goes out as `analysis.txt`. */
export async function deliverBoardExport(kind: ExportKind, board: BoardExport): Promise<ExportResult | void> {
  if (kind === "share_link") return copyLink(board.link());
  return deliverFileOrRecord(kind, board.fileName, board.file, board.annotated, "analysis.txt");
}

/** The Analysis board's entries (Hedge School's design 21): the analysis by link, as a file with the engine's results,
 *  or as the annotated record. */
export const BOARD_EXPORTS: ExportItem[] = [
  ["share_link", "Copy a link to share the analysis", "Its lines and the moves evaluated. The recipient's browser searches what it shows.", "Link copied"],
  ["analysis_file", "Analysis file, to load later or elsewhere", "With the engine's results: the analysis opens at once.", "Analysis file saved"],
  ...RECORD_EXPORTS,
];
