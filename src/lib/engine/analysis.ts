// The engine's analysis reply (protocol.ts, AnalysisReply) as the review reads it (review/model.ts, Analysis). A module of
// its own, with nothing of the engine's workers, so that a script in Node can store results as the site stores them
// (scripts/test-fixture.mjs).
import { parseEdge, type Edge } from "./notation.ts";
import type { AnalysisReply, MoveInfo } from "./protocol.ts";
import type { Analysis } from "#lib/review/model.ts";

/** An analysis reply as the review reads it: values from Blue's side, the candidates in the engine's order. */
export function toAnalysis(r: AnalysisReply): Analysis {
  return {
    blueWin: r.rootInfo.winrate, visits: r.rootInfo.visits, lead: r.rootInfo.scoreLead, margin: r.rootInfo.scoreSelfplay,
    spread: r.rootInfo.scoreStdev,
    candidates: [...r.moveInfos].sort((a, b) => a.order - b.order).map(c => ({
      edge: parseEdge(c.move), visits: c.edgeVisits, blueWin: c.winrate, lead: c.scoreLead, margin: c.scoreSelfplay, prior: c.prior,
      ...withLine(c), ...(c.isSymmetryOf ? { twinOf: parseEdge(c.isSymmetryOf) } : {}),
    })),
  };
}

/** A candidate's line (KataGo's pv, the move first), up to its first pass, with the visits through each of its edges. */
function withLine(c: MoveInfo): { line: Edge[]; lineVisits?: number[] } {
  const line: Edge[] = [];
  for (const m of c.pv) {
    if (!m.includes("-")) break; // a pass ends the turn: the line stops there
    line.push(parseEdge(m));
  }
  return { line, ...(c.pvEdgeVisits ? { lineVisits: c.pvEdgeVisits.slice(0, line.length) } : {}) };
}
