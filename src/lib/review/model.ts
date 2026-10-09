// The review's data and what the page derives from it: turns, labels, accuracy, key moments.
//
// Placeholders until the engine reports scores (docs/requests/02-engine-protocol.md):
// - labels come from the mover's loss of win chance, in chess.com's bands of expected points (Excellent to 0.02,
//   Good to 0.05, Inaccuracy to 0.10, Mistake to 0.20, then Blunder), which also give the positive labels. Best is
//   the engine's first choice. Great is the first choice when the second is at least 0.10 worse: the only good
//   edge (En Croissant's "!" rule, utils/score.ts). Enclosure's thresholds are to be fitted in points (design 01,
//   principle 3).
// - accuracy is Lichess's per-move formula on win% (AccuracyPercent.scala), averaged plainly.

import { edgeName, sameEdge, type Edge } from "#lib/engine/notation.ts";
export { edgeName, pointName, sameEdge, type Edge } from "#lib/engine/notation.ts";
export type Player = 0 | 1; // 0 Blue (first player), 1 Red

export interface Region { area: number; rings: [number, number][][] }
export interface Position {
  edges: [Edge[], Edge[]];
  protected: Edge[];
  placed: Edge[];
  scores: [number, number];
  player: Player;
  movesLeft: number;
  regions: [Region[], Region[]];
}
export interface Move { player: Player; edge: Edge; cut: Edge | null }
export interface Candidate { edge: Edge; visits: number; blueWin: number }
export interface Analysis { blueWin: number; visits: number; candidates: Candidate[] }
export interface ReviewData {
  players: { blue: string; red: string };
  result: { blue: number; red: number };
  moves: Move[];
  positions: Position[];
  analysis: Analysis[];
}

export type Label = "great" | "best" | "excellent" | "good" | "inaccuracy" | "mistake" | "blunder";
export const LABELS: Label[] = ["great", "best", "excellent", "good", "inaccuracy", "mistake", "blunder"];
export const BAD_LABELS: Label[] = ["inaccuracy", "mistake", "blunder"];
export const LABEL_TEXT: Record<Label, string> = {
  great: "Great", best: "Best", excellent: "Excellent", good: "Good",
  inaccuracy: "Inaccuracy", mistake: "Mistake", blunder: "Blunder",
};
export const LABEL_PLURAL: Record<Label, string> = {
  great: "Great edges", best: "Best edges", excellent: "Excellent edges", good: "Good edges",
  inaccuracy: "Inaccuracies", mistake: "Mistakes", blunder: "Blunders",
};
export const LABEL_GLYPH: Record<Label, string> = {
  great: "!", best: "★", excellent: "✓", good: "✓", inaccuracy: "?!", mistake: "?", blunder: "??",
};
const OPENING_TURNS = 8;
const BANDS: [Label, number][] = [["excellent", 0.02], ["good", 0.05], ["inaccuracy", 0.10], ["mistake", 0.20]];
const ONLY_EDGE_GAP = 0.10;

export const PLAYER_NAME = ["Blue", "Red"] as const;

// --- Derived review -------------------------------------------------------------------------------------------------
export interface EdgeReview {
  index: number; // the move's index: it leads from position index to position index + 1
  player: Player;
  edge: Edge;
  cut: Edge | null;
  winBefore: number; // the mover's win chance before and after the edge
  winAfter: number;
  loss: number; // winBefore - winAfter, at least 0
  label: Label;
  best: Candidate | undefined; // the engine's choice in the position before the edge
}
export interface TurnReview { number: number; player: Player; edges: EdgeReview[]; loss: number; label: Label }
export interface PlayerSummary { counts: Record<Label, number>; accuracy: number; meanLoss: number }
export interface Review {
  data: ReviewData;
  edges: EdgeReview[];
  turns: TurnReview[];
  summary: [PlayerSummary, PlayerSummary];
  mistakes: EdgeReview[]; // every edge labelled Inaccuracy or worse after the opening, in game order
  keyMoments: EdgeReview[];
  blueWin: number[]; // by position, the last from the result
}

export const moverWin = (blueWin: number, p: Player) => (p === 0 ? blueWin : 1 - blueWin);

function labelOf(loss: number, playedBest: boolean, isOnly: boolean): Label {
  if (playedBest) return isOnly ? "great" : "best";
  for (const [label, upTo] of BANDS) if (loss <= upTo) return label;
  return "blunder";
}

/** The engine's first choice is the only good edge: the second is at least ONLY_EDGE_GAP worse for the mover. */
export function onlyEdge(a: Analysis | undefined, p: Player): boolean {
  const [first, second] = a?.candidates ?? [];
  return !!first && !!second && moverWin(first.blueWin, p) - moverWin(second.blueWin, p) >= ONLY_EDGE_GAP;
}

// Lichess's accuracy of one move from the drop in win% (0-100).
const moveAccuracy = (dropPct: number) => Math.min(100, Math.max(0, 103.1668 * Math.exp(-0.04354 * dropPct) - 3.1669 + 1));

export function review(data: ReviewData): Review {
  const final = data.result.blue > data.result.red ? 1 : data.result.blue < data.result.red ? 0 : 0.5;
  const blueWin = [...data.analysis.map(a => a.blueWin), final];
  const edges: EdgeReview[] = data.moves.map((m, i) => {
    const winBefore = moverWin(blueWin[i], m.player), winAfter = moverWin(blueWin[i + 1], m.player);
    const best = data.analysis[i]?.candidates[0];
    // When the played edge is one of the search's candidates, its loss comes from that one search (best against
    // played), which is less noisy than two searches of two positions at a small budget. Otherwise: the drop from
    // this position to the next (Lichess, KaTrain).
    const played = data.analysis[i]?.candidates.find(c => sameEdge(c.edge, m.edge));
    const loss = Math.max(0, best && played ? moverWin(best.blueWin, m.player) - moverWin(played.blueWin, m.player)
                                            : winBefore - winAfter);
    return { index: i, player: m.player, edge: m.edge, cut: m.cut, winBefore, winAfter, loss, best,
             label: labelOf(loss, !!best && sameEdge(best.edge, m.edge), onlyEdge(data.analysis[i], m.player)) };
  });
  const turns: TurnReview[] = [];
  for (const e of edges) {
    const last = turns.at(-1);
    if (last && last.player === e.player) last.edges.push(e);
    else turns.push({ number: turns.length + 1, player: e.player, edges: [e], loss: 0, label: "good" });
  }
  for (const t of turns) {
    const first = t.edges[0], last = t.edges.at(-1)!;
    t.loss = Math.max(0, first.winBefore - last.winAfter);
    t.label = labelOf(t.loss, t.edges.every(e => e.label === "best" || e.label === "great"), false);
  }
  const summary = ([0, 1] as Player[]).map(p => {
    const mine = edges.filter(e => e.player === p);
    const counts = Object.fromEntries(LABELS.map(l => [l, mine.filter(e => e.label === l).length])) as Record<Label, number>;
    return {
      counts,
      accuracy: mine.reduce((s, e) => s + moveAccuracy(100 * e.loss), 0) / mine.length,
      meanLoss: mine.reduce((s, e) => s + e.loss, 0) / mine.length,
    };
  }) as [PlayerSummary, PlayerSummary];
  // Key moments: the largest drops, at least an inaccuracy, in game order (Lichess's evalSwings, chess.com's key moments).
  // The first turns are left out, as Regan and Haworth skip the opening (design 01): the values swing most there.
  const firstTurn = turns[Math.min(OPENING_TURNS, turns.length - 1)].edges[0].index;
  const mistakes = edges.filter(e => e.index >= firstTurn && BAD_LABELS.includes(e.label));
  return { data, edges, turns, summary, mistakes, keyMoments: largest(mistakes), blueWin };
}

/** The largest of these losses, at most `n`, in game order. */
export function largest(edges: EdgeReview[], n = 8): EdgeReview[] {
  return [...edges].sort((a, b) => b.loss - a.loss).slice(0, n).sort((a, b) => a.index - b.index);
}

/** A sentence from facts only (design 04): what was played, and the engine's choice. */
export function explain(e: EdgeReview): string {
  const who = PLAYER_NAME[e.player];
  const pct = (x: number) => `${(100 * x).toFixed(0)}%`;
  if (e.label === "great") return `Great. ${who} found ${edgeName(e.edge)}, the only good edge here.`;
  if (e.label === "best") return `${who} played ${edgeName(e.edge)}, the engine's first choice.`;
  const better = e.best && !sameEdge(e.best.edge, e.edge) ? ` ${edgeName(e.best.edge)} was best.` : "";
  if (e.label === "excellent" || e.label === "good")
    return `${LABEL_TEXT[e.label]}. ${who} played ${edgeName(e.edge)}, ${pct(e.loss)} of win chance from the best.${better}`;
  return `${LABEL_TEXT[e.label]}. ${who} played ${edgeName(e.edge)} and lost ${pct(e.loss)} of win chance.${better}`;
}
