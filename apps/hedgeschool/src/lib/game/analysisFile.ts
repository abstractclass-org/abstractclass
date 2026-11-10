// An analysis as a file (design 21): the Analysis board's lines, the moves evaluated, and the engine's results for every
// position of them, so that the analysis opens at once in another browser. The file is the shared one
// (@abstractclass/analysis/files.ts), in Hedge School's format: the review file's kind for the board (reviewFile.ts),
// with the same results, chosen the same way, and read the same way.
import * as shared from "@abstractclass/analysis/files.ts";
import type { Manifest } from "@abstractclass/engine/client.ts";
import { REVIEW_FORMAT } from "./reviewFile.ts";
import { boardLink } from "./board.ts";
import { MAX_RECORD_KOMI } from "./record.ts";
import type { KeptBoard } from "./store.ts";
import { NETWORKS, networkName } from "../analysis/engineSettings.ts";
export { ANALYSIS_FILE_VERSION } from "@abstractclass/analysis/files.ts";

export const ANALYSIS_FORMAT = "hedge-school-analysis";

/** The kind of a Hedge School file, from its `format`, or null for another file. */
export const fileKind = (text: string) => shared.fileKind(text, REVIEW_FORMAT, ANALYSIS_FORMAT);

/** The analysis file of a board, with the results of `models`, the networks this site ships, and the engine that the
 *  board searched with (shared.fileEngine). */
export const exportAnalysis = (board: KeptBoard, site: string, models: Set<string> | null,
                               engine: shared.FileEngine | null = null, now = new Date()) =>
  shared.exportAnalysis(ANALYSIS_FORMAT, board, site, models, engine, now);

/** A file name for an analysis: the date and time it was saved, the player's own. */
export const analysisFileName = (now = new Date()): string => shared.analysisFileName(ANALYSIS_FORMAT, now);

/** Reads an analysis file. Throws an Error that tells the player what is wrong, also for a komi beyond the one that a
 *  record can give (MAX_RECORD_KOMI, design 24). Its version rule is the review file's (design 13). */
export const readAnalysisFile = (text: string): shared.AnalysisFile =>
  shared.readAnalysisFile(text, "Hedge School", ANALYSIS_FORMAT, MAX_RECORD_KOMI);

/** Reads an analysis file and keeps its results in this browser, of the manifest's search and the networks it ships:
 *  the board reads no other (design 20, item 8). Answers the board's address with the file's lines (board.ts), as a
 *  shared analysis opens, and the file's network (`network`), which the board keeps as its own: the board counts the
 *  load. A file of several networks, or of a network that the site no longer ships, asks the player first (`choose`,
 *  shared.boardNetwork): a cancel answers null, and keeps nothing. Throws an Error that tells the player what is
 *  wrong. */
export async function openAnalysisFile(text: string, manifest: Manifest | null,
                                       choose: (q: shared.NetworkQuestion) => Promise<string | null>): Promise<string | null> {
  const file = readAnalysisFile(text);
  const network = await shared.boardNetwork(file, manifest, "Hedge School", networkName, NETWORKS.map(n => n.id), choose);
  if (network === undefined) return null;
  await shared.keepAnalyses(file, manifest);
  return shared.withNetwork(boardLink("", file.board, 0, "analysis_file"), network);
}
