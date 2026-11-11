// The review's Export menu (@abstractclass/review/ExportMenu.svelte, Hedge School's design 13; design 33): its entries
// and what each delivers, on the review page and beside each game in the Review tab. Its link shares the review
// (game/share.ts) with what the game's mark names: its deepest review that ran to its end (game/store.ts), as Hedge
// School's link does, also when the depth set now is another. The review file (game/reviewFile.ts) holds the engine's
// results, of the networks that the site ships. The annotated record (exportText.ts) follows them, copied or as a
// file, in Hedge School's order: the review page writes it from its review, and the Review tab from the store.
import { STORES, dbGet } from "@abstractclass/storage/db.ts";
import { branchNodes, type KeptBranches } from "@abstractclass/analysis/kept.ts";
import { shippedModels } from "@abstractclass/analysis/files.ts";
import type { Manifest } from "@abstractclass/engine/client.ts";
import { RECORD_EXPORTS, REVIEW_FILE, REVIEW_LINK, copyReviewLink, deliverFileOrRecord, type ExportItem, type ExportKind, type ExportResult } from "@abstractclass/review/exports.ts";
import { exportReview, reviewFileName } from "../game/reviewFile.ts";
import { reviewLink } from "../game/share.ts";
import { loadGame } from "../game/store.ts";
import { SITE_VERSION } from "../site.ts";

/** The review's entries: a link that shares the review, the review file, and the annotated record, copied or as a
 *  file. */
export const REVIEW_EXPORTS: ExportItem[] = [REVIEW_LINK, REVIEW_FILE, ...RECORD_EXPORTS];

/** The link that shares the review of the game `id`, kept in this browser, with its mark and its variations. Throws
 *  when its review is not done. */
async function shareLink(id: string, origin: string): Promise<string> {
  const stored = await loadGame(id), mark = stored?.game.reviewed;
  if (!stored || !mark) throw new Error("the game's review is not done");
  const branches = branchNodes((await dbGet<KeptBranches>(STORES.branches, id)) ?? null);
  return reviewLink(origin, stored.record, branches, mark);
}

/** Delivers an export of the game `id`, whose record is `record`: the link, copied; the review file as a download,
 *  with the results of the networks that `manifest` ships; or the annotated record, which `annotated` writes when it is
 *  asked for, copied or as a download. Answers what to tell the player, when that is more than the menu's own note. */
export async function deliverExport(kind: ExportKind, id: string, record: string, manifest: Manifest | null,
                                    annotated: () => string | Promise<string>): Promise<ExportResult | void> {
  if (kind === "share_link") return copyReviewLink(await shareLink(id, location.origin));
  if (kind !== "review_file" && kind !== "record_copy" && kind !== "record_file") throw new Error("the review has no such export");
  return deliverFileOrRecord(kind, reviewFileName(record, id), () => exportReview(id, SITE_VERSION, shippedModels(manifest)),
                             annotated);
}
