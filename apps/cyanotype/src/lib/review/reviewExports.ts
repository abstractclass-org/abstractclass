// The review's Export menu (@abstractclass/review/ExportMenu.svelte, Hedge School's design 13; design 33): its entries
// and what each delivers. Its link shares the review (game/share.ts). The review file (abscls-8tl1.34) and the
// annotated record (abscls-8tl1.35) add their entries here, after the link, in Hedge School's order.
import { STORES, dbGet } from "@abstractclass/storage/db.ts";
import { branchNodes, type KeptBranches } from "@abstractclass/analysis/kept.ts";
import { shareNote } from "@abstractclass/analysis/share.ts";
import { REVIEW_LINK, type ExportItem, type ExportKind, type ExportResult } from "@abstractclass/review/exports.ts";
import type { GameRecord } from "../game/record.ts";
import { reviewLink, type ReviewRun } from "../game/share.ts";

/** The review's entries: a link that shares the review. */
export const REVIEW_EXPORTS: ExportItem[] = [REVIEW_LINK];

/** Delivers an export of the game `id` in review, whose finished review ran with `run`: the link, copied. Answers what
 *  to tell the player. */
export async function deliverExport(kind: ExportKind, id: string, record: GameRecord, run: ReviewRun): Promise<ExportResult | void> {
  if (kind !== "share_link") throw new Error("this export is not ready yet");
  const branches = branchNodes((await dbGet<KeptBranches>(STORES.branches, id)) ?? null);
  const link = reviewLink(location.origin, record, branches, run);
  await navigator.clipboard.writeText(link);
  // No review files yet (abscls-8tl1.34): a link that is too long cannot offer one.
  return { linkLength: link.length, note: shareNote(link.length, false) };
}
