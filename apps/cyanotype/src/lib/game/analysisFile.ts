// An analysis as a file (Hedge School's design 21, item 7; design 33): the Analysis board's lines, the moves evaluated,
// and the engine's results for every position of them and of the positions one move from them, so that the analysis
// opens at once in another browser. The file is the shared one (@abstractclass/analysis/files.ts), in Cyanotype's
// format. It loads from the board's New menu: its results go to this browser's store, and its lines to the board's
// address (board.ts), as a shared analysis opens.
import * as shared from "@abstractclass/analysis/files.ts";
import type { KeptBoard } from "@abstractclass/analysis/kept.ts";
import type { Manifest } from "@abstractclass/engine/client.ts";
import { boardLink, refuseKomi } from "./board.ts";
import { SITE_NAME } from "../site.ts";

export const ANALYSIS_FORMAT = "cyanotype-analysis";

/** The analysis file of a board, with the results of `models`, the networks this site ships. `site` is the site's
 *  version. */
export const exportAnalysis = (board: KeptBoard, site: string, models: Set<string> | null, now = new Date()) =>
  shared.exportAnalysis(ANALYSIS_FORMAT, board, site, models, now);

/** A file name for an analysis: the date and time it was saved, the player's own. */
export const analysisFileName = (now = new Date()): string => shared.analysisFileName(ANALYSIS_FORMAT, now);

/** Reads an analysis file. Throws an Error that tells the player what is wrong. */
export const readAnalysisFile = (text: string): shared.AnalysisFile => shared.readAnalysisFile(text, SITE_NAME, ANALYSIS_FORMAT);

/** Reads an analysis file and keeps its results in this browser, of the manifest's search and the networks it ships.
 *  Answers the board's address with the file's lines. Throws an Error that tells the player what is wrong. */
export async function openAnalysisFile(text: string, manifest: Manifest | null): Promise<string> {
  const file = readAnalysisFile(text);
  refuseKomi(file.board.komi); // before its results go to the store
  await shared.keepAnalyses(file, manifest);
  return boardLink("", file.board, 0, "analysis_file");
}
