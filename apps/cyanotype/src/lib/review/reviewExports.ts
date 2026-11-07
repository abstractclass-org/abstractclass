// The review's Export menu (@abstractclass/review/ExportMenu.svelte, Hedge School's design 13; design 33): its entries
// and what each delivers, on the review page and beside each game in the Review tab. Its link shares the review
// (game/share.ts) with what the game's mark names: its deepest review that ran to its end (game/store.ts), as Hedge
// School's link does, also when the depth set now is another. The review file (abscls-8tl1.34) and the annotated record
// (abscls-8tl1.35) add their entries here, after the link, in Hedge School's order.
import { STORES, dbGet } from "@abstractclass/storage/db.ts";
import { branchNodes, type KeptBranches } from "@abstractclass/analysis/kept.ts";
import { shareNote } from "@abstractclass/analysis/share.ts";
import { REVIEW_LINK, type ExportItem, type ExportKind, type ExportResult } from "@abstractclass/review/exports.ts";
import { reviewLink } from "../game/share.ts";
import { loadGame } from "../game/store.ts";

/** The review's entries: a link that shares the review. */
export const REVIEW_EXPORTS: ExportItem[] = [REVIEW_LINK];

/** The link that shares the review of the game `id`, kept in this browser, with its mark and its variations. Throws
 *  when its review is not done. */
async function shareLink(id: string, origin: string): Promise<string> {
  const stored = await loadGame(id), mark = stored?.game.reviewed;
  if (!stored || !mark) throw new Error("the game's review is not done");
  const branches = branchNodes((await dbGet<KeptBranches>(STORES.branches, id)) ?? null);
  return reviewLink(origin, stored.record, branches, mark);
}

/** Delivers an export of the game `id`: the link, copied. Answers what to tell the player. */
export async function deliverExport(kind: ExportKind, id: string): Promise<ExportResult | void> {
  if (kind !== "share_link") throw new Error("this export is not ready yet");
  const link = await shareLink(id, location.origin);
  await navigator.clipboard.writeText(link);
  // No review files yet (abscls-8tl1.34): a link that is too long cannot offer one.
  return { linkLength: link.length, note: shareNote(link.length, false) };
}
