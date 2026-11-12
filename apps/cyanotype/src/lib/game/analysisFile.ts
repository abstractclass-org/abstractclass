// An analysis as a file (Hedge School's design 21, item 7; design 33): the Analysis board's lines, the moves evaluated,
// and the engine's results for every position of them and of the positions one move from them, so that the analysis
// opens at once in another browser. The file is the shared one (@abstractclass/analysis/files.ts), in Cyanotype's
// format. It loads from the board's New menu: its results go to this browser's store, and its lines to the board's
// address (board.ts), as a shared analysis opens, with the file's network, which the board keeps as its own.
import * as shared from "@abstractclass/analysis/files.ts";
import type { KeptBoard } from "@abstractclass/analysis/kept.ts";
import type { Manifest } from "@abstractclass/engine/client.ts";
import { boardLink } from "./board.ts";
import { MAX_RECORD_KOMI } from "./record.ts";
import { REVIEW_FORMAT } from "./reviewFile.ts";
import { SITE_NAME } from "../site.ts";
import { NETWORKS, networkName } from "../analysis/engineSettings.ts";

export const ANALYSIS_FORMAT = "cyanotype-analysis";
/** The site's networks, as the question of a file's network names them (shared.networkQuestion). */
const NETWORK_NAMES: shared.SiteNetworks = { site: SITE_NAME, name: networkName, offered: NETWORKS.map(n => n.id) };

/** The kind of a Cyanotype file, from its `format`: a review file (reviewFile.ts), an analysis file, or null for
 *  another file. */
export const fileKind = (text: string) => shared.fileKind(text, REVIEW_FORMAT, ANALYSIS_FORMAT);

/** The analysis file of a board, with the results of `models`, the networks this site ships, and the engine that the
 *  board searched with (shared.fileEngine). `site` is the site's version. */
export const exportAnalysis = (board: KeptBoard, site: string, models: Set<string> | null,
                               engine: shared.FileEngine | null = null, now = new Date()) =>
  shared.exportAnalysis(ANALYSIS_FORMAT, board, site, models, engine, now);

/** A file name for an analysis: the date and time it was saved, the player's own. */
export const analysisFileName = (now = new Date()): string => shared.analysisFileName(ANALYSIS_FORMAT, now);

/** Reads an analysis file. Throws an Error that tells the player what is wrong, also for a komi beyond the one that a
 *  record can give (MAX_RECORD_KOMI). */
export const readAnalysisFile = (text: string): shared.AnalysisFile =>
  shared.readAnalysisFile(text, SITE_NAME, ANALYSIS_FORMAT, MAX_RECORD_KOMI);

/** Reads an analysis file and keeps its results in this browser, of the manifest's search and the networks it ships.
 *  Answers the board's address with the file's lines, and the file's network (`network`), which the board keeps as
 *  its own (Hedge School's design 21). A file of several networks, or of a network that the site no longer ships, asks
 *  the player first (`choose`, shared.boardNetwork): a cancel answers null, and keeps nothing. Throws an Error that
 *  tells the player what is wrong. */
export async function openAnalysisFile(text: string, manifest: Manifest | null,
                                       choose: (q: shared.NetworkQuestion) => Promise<string | null>): Promise<string | null> {
  const file = readAnalysisFile(text);
  const board = await shared.boardNetwork(file, manifest, NETWORK_NAMES, choose);
  if (!board) return null;
  await shared.keepAnalyses(file, manifest);
  return shared.withNetwork(boardLink("", file.board, 0, "analysis_file"), board.network);
}
