// The engine's analysis reply (@abstractclass/engine/protocol.ts, AnalysisReply) as the review reads it (model.ts,
// Analysis), with the moves as the game keeps them (game.ts). A module of its own, with nothing of the engine's
// workers, so that a script in Node can store results as the site stores them (scripts/test-fixture.mjs).
import type { AnalysisReply, MoveInfo } from "@abstractclass/engine/protocol.ts";
import type { Moves } from "./game.ts";
import type { Analysis } from "./model.ts";

/** An analysis reply as the review reads it: values from Blue's side, the candidates in the engine's order. */
export function toAnalysis<M>(game: Moves<M>, r: AnalysisReply): Analysis<M> {
  return {
    blueWin: r.rootInfo.winrate, visits: r.rootInfo.visits, lead: r.rootInfo.scoreLead, margin: r.rootInfo.scoreSelfplay,
    spread: r.rootInfo.scoreStdev,
    candidates: [...r.moveInfos].sort((a, b) => a.order - b.order).map(c => ({
      edge: game.parseMove(c.move), visits: c.edgeVisits, blueWin: c.winrate, lead: c.scoreLead, margin: c.scoreSelfplay, prior: c.prior,
      ...withLine(game, c), ...(c.isSymmetryOf ? { twinOf: game.parseMove(c.isSymmetryOf) } : {}),
    })),
    ...(r.ownership ? { ownership: r.ownership.map(hundredths) } : {}),
  };
}

/** An ownership in whole hundredths: the map needs no finer steps, and a stored result keeps 361 small numbers. Never
 *  −0, which JSON writes as 0. */
export const hundredths = (v: number) => Math.round(100 * v) || 0;

/** A candidate's line (KataGo's pv, the move first), up to its first pass, with the visits through each of its edges. */
function withLine<M>(game: Moves<M>, c: MoveInfo): { line: M[]; lineVisits?: number[] } {
  const line: M[] = [];
  for (const m of c.pv) {
    if (m === "pass") break; // a pass ends the turn: the line stops there
    line.push(game.parseMove(m));
  }
  return { line, ...(c.pvEdgeVisits ? { lineVisits: c.pvEdgeVisits.slice(0, line.length) } : {}) };
}
