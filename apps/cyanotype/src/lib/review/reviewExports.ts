// The review's Export menu (@abstractclass/review/ExportMenu.svelte, Hedge School's design 13; design 33): its entries
// and what each delivers, on the review page and beside each game in the Review tab. Its link shares the review
// (game/share.ts) with what the game's mark names: its deepest review that ran to its end (game/store.ts), as Hedge
// School's link does, also when the depth set now is another. The review file (game/reviewFile.ts) holds the engine's
// results, of the networks that the site ships. The annotated record (abscls-8tl1.35) adds its entries here, after
// them, in Hedge School's order.
import { STORES, dbGet } from "@abstractclass/storage/db.ts";
import { branchNodes, type KeptBranches } from "@abstractclass/analysis/kept.ts";
import { shippedModels } from "@abstractclass/analysis/files.ts";
import { shareNote } from "@abstractclass/analysis/share.ts";
import type { Manifest } from "@abstractclass/engine/client.ts";
import { download } from "@abstractclass/site/download.ts";
import { REVIEW_FILE, REVIEW_LINK, type ExportItem, type ExportKind, type ExportResult } from "@abstractclass/review/exports.ts";
import { exportReview, reviewFileName } from "../game/reviewFile.ts";
import { reviewLink } from "../game/share.ts";
import { loadGame } from "../game/store.ts";
import { SITE_VERSION } from "../site.ts";

/** The review's entries: a link that shares the review, and the review file. */
export const REVIEW_EXPORTS: ExportItem[] = [REVIEW_LINK, REVIEW_FILE];

/** The link that shares the review of the game `id`, kept in this browser, with its mark and its variations. Throws
 *  when its review is not done. */
async function shareLink(id: string, origin: string): Promise<string> {
  const stored = await loadGame(id), mark = stored?.game.reviewed;
  if (!stored || !mark) throw new Error("the game's review is not done");
  const branches = branchNodes((await dbGet<KeptBranches>(STORES.branches, id)) ?? null);
  return reviewLink(origin, stored.record, branches, mark);
}

/** Delivers an export of the game `id`: the link, copied, or the review file as a download, with the results of the
 *  networks that `manifest` ships. Answers what to tell the player. */
export async function deliverExport(kind: ExportKind, id: string, manifest: Manifest | null): Promise<ExportResult | void> {
  if (kind === "share_link") {
    const link = await shareLink(id, location.origin);
    await navigator.clipboard.writeText(link);
    return { linkLength: link.length, note: shareNote(link.length) };
  }
  if (kind !== "review_file") throw new Error("this export is not ready yet");
  const file = await exportReview(id, SITE_VERSION, shippedModels(manifest));
  download(reviewFileName(file.record, id), JSON.stringify(file));
}
