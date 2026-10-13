// An analysis as a file (design 21): the Analysis board's lines, the moves evaluated, and the engine's results for every
// position of them, so that the analysis opens at once in another browser. It is the review file's kind for the board
// (reviewFile.ts): the same results, chosen the same way (of the lines' positions and of the positions one move from
// them, which confirm the Greats), and read the same way.
import { readAnalysisKey } from "#lib/analysis/cache.ts";
import { STORES, dbEntriesWhere, dbPutMany } from "#lib/storage/db.ts";
import { belongs, positionKeys } from "./reviewFile.ts";
import type { KeptBoard } from "./store.ts";

export const ANALYSIS_FORMAT = "hedge-school-analysis";
export const ANALYSIS_FILE_VERSION = 1;

export interface AnalysisFile {
  format: typeof ANALYSIS_FORMAT;
  version: number;
  exported: string; // ISO date and time
  site: string; // the site's version (its commit) that wrote the file
  board: KeptBoard; // the lines: every node, with the moves evaluated, and the main line
  analyses: [string, unknown][]; // the engine's results, by their keys in the browser's store
}

/** The kind of a Hedge School file, from its `format`, or null for another file. */
export function fileKind(text: string): "review" | "analysis" | null {
  try {
    const f = JSON.parse(text) as { format?: unknown };
    return f?.format === ANALYSIS_FORMAT ? "analysis" : f?.format === "hedge-school-review" ? "review" : null;
  } catch {
    return null;
  }
}

/** The analysis file of a board, with the results of `models`, the networks this site ships. */
export async function exportAnalysis(board: KeptBoard, site: string, models: Set<string> | null, now = new Date()): Promise<AnalysisFile> {
  const positions = positionKeys([], { version: 2, nodes: board.nodes });
  const analyses = await dbEntriesWhere(STORES.analysis, key => belongs(key, positions, models));
  return { format: ANALYSIS_FORMAT, version: ANALYSIS_FILE_VERSION, exported: now.toISOString(), site, board, analyses };
}

/** A file name for an analysis: the date and time it was saved, the player's own. */
export function analysisFileName(now = new Date()): string {
  const two = (n: number) => String(n).padStart(2, "0");
  return `hedge-school-analysis-${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}.json`;
}

/** Reads an analysis file. Throws an Error that tells the player what is wrong. */
export function readAnalysisFile(text: string): AnalysisFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This is not a Hedge School analysis file: it is not JSON.");
  }
  const f = data as Partial<AnalysisFile>;
  if (!f || typeof f !== "object" || f.format !== ANALYSIS_FORMAT) throw new Error("This is not a Hedge School analysis file.");
  // The version rule is the review file's (design 13): a new field keeps it, and a reader ignores what it does not know.
  if (typeof f.version !== "number" || f.version > ANALYSIS_FILE_VERSION)
    throw new Error(`This analysis file has version ${f.version}: a newer Hedge School wrote it. Reload the site and try again.`);
  if (f.version < ANALYSIS_FILE_VERSION) throw new Error(`This analysis file has version ${f.version}, which this site no longer reads.`);
  const b = f.board;
  const boardOk = !!b && b.version === 2 && Array.isArray(b.main) && b.main.every(m => typeof m === "string") && Array.isArray(b.nodes) &&
    b.nodes.every(n => Array.isArray(n) && typeof n[0] === "string" && typeof n[1] === "number");
  if (!boardOk) throw new Error("The analysis file's lines cannot be read.");
  const analyses = (Array.isArray(f.analyses) ? f.analyses : []).filter((e): e is [string, unknown] =>
    Array.isArray(e) && typeof e[0] === "string" && /^\d+\|[^|]*\|[0-9a-f]+\|\d+\|/.test(e[0]) && !!e[1] && typeof e[1] === "object");
  return { ...f, board: b, analyses } as AnalysisFile;
}

/** Keeps an analysis file's results in this browser: of the networks this site ships (`models`), since its engine never
 *  asks for another's. The board itself opens by its link (board.ts), as a shared analysis does. */
export async function keepAnalysisResults(file: AnalysisFile, models: Set<string> | null): Promise<number> {
  return dbPutMany(STORES.analysis, file.analyses.filter(([key]) => !models || models.has(readAnalysisKey(key).model)));
}
