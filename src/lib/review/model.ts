// The review's data and what the page derives from it: turns, losses, labels, accuracy, key moments.
//
// An edge's loss is measured as KaTrain and Lichess measure it: the mover's value before the edge (the position's
// analysis) less the mover's value after it (the next position's analysis), in win chance and, when the analysis has
// scores, in points. The labels are in labels.ts. Accuracy is Lichess's per-move formula on win% (AccuracyPercent.scala),
// averaged plainly. The analysis may be partial: an edge has no label until both its positions are analysed to at
// least `minVisits` (the label budget: docs/decisions/engine.md, "Label agreement against search budget").

import { edgeName, sameEdge, type Edge } from "#lib/engine/notation.ts";
import { BAD_LABELS, LABELS, ONLY_EDGE_GAP, classify, type Label } from "./labels.ts";
export { edgeName, pointName, sameEdge, type Edge } from "#lib/engine/notation.ts";
export { BAD_LABELS, LABELS, type Label } from "./labels.ts";

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
/** A move: an edge, or null for a timeout pass (the rest of the turn forfeited). */
export interface Move { player: Player; edge: Edge | null; cut: Edge | null }
/** Values from Blue's side. `lead` (the engine's scoreLead) and `margin` (scoreSelfplay) are in points. */
export interface Candidate { edge: Edge; visits: number; blueWin: number; lead?: number; margin?: number }
export interface Analysis { blueWin: number; visits: number; lead?: number; margin?: number; spread?: number; candidates: Candidate[] }
export interface ReviewData {
  players: { blue: string; red: string };
  result: { blue: number; red: number }; // the final scores
  moves: Move[];
  positions: Position[];
  analysis: (Analysis | undefined)[]; // by position; undefined until analysed
}
/** Which score measures points lost: the lead (KaTrain's choice) or the expected final margin. To be measured. */
export type ScoreKind = "lead" | "margin";

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

export const PLAYER_NAME = ["Blue", "Red"] as const;

// --- Derived review -------------------------------------------------------------------------------------------------
export interface EdgeReview {
  index: number; // the move's index: it leads from position index to position index + 1
  player: Player;
  edge: Edge | null; // null: a timeout pass
  cut: Edge | null;
  winBefore: number; // the mover's win chance before and after the edge (NaN until analysed)
  winAfter: number;
  loss: number; // the mover's loss of win chance, at least 0
  pointsLost: number | undefined; // the mover's loss of points, at least 0, when the analysis has scores
  label: Label | null; // null until both positions are analysed
  best: Candidate | undefined; // the engine's first choice in the position before the edge
}
export interface TurnReview { number: number; player: Player; edges: EdgeReview[]; loss: number; label: Label | null }
export interface PlayerSummary { counts: Record<Label, number>; accuracy: number; meanLoss: number; meanPointsLost: number | undefined }
export interface Review {
  data: ReviewData;
  edges: EdgeReview[];
  turns: TurnReview[];
  summary: [PlayerSummary, PlayerSummary];
  mistakes: EdgeReview[]; // every edge labelled Inaccuracy or worse after the opening, in game order
  keyMoments: EdgeReview[];
  blueWin: number[]; // by position (NaN until analysed), the last from the result
  blueScore: (number | undefined)[]; // by position, the score that measures points lost, from Blue's side
  analysed: number; // positions analysed
}

export const moverWin = (blueWin: number, p: Player) => (p === 0 ? blueWin : 1 - blueWin);
const moverScore = (blue: number, p: Player) => (p === 0 ? blue : -blue);
const scoreOf = (a: Analysis | Candidate | undefined, kind: ScoreKind) => (kind === "lead" ? a?.lead : a?.margin);

/** The engine's first choice is the only good edge: the second is at least ONLY_EDGE_GAP worse for the mover. */
export function onlyEdge(a: Analysis | undefined, p: Player): boolean {
  const [first, second] = a?.candidates ?? [];
  return !!first && !!second && moverWin(first.blueWin, p) - moverWin(second.blueWin, p) >= ONLY_EDGE_GAP;
}

// Lichess's accuracy of one move from the drop in win% (0-100).
const moveAccuracy = (dropPct: number) => Math.min(100, Math.max(0, 103.1668 * Math.exp(-0.04354 * dropPct) - 3.1669 + 1));
const severity = (e: EdgeReview) => (e.label ? LABELS.indexOf(e.label) : -1) * 1e6 + (e.pointsLost ?? 0) + e.loss;

export function review(data: ReviewData, kind: ScoreKind = "lead", minVisits = 0): Review {
  const blueResult = data.result.blue - data.result.red;
  const final = blueResult > 0 ? 1 : blueResult < 0 ? 0 : 0.5;
  const n = data.moves.length;
  // The position after the last edge is the end: its value is the result.
  const blueWin = data.positions.map((_, i) => (i === n ? final : data.analysis[i]?.blueWin ?? NaN));
  const blueScore = data.positions.map((_, i) => (i === n ? blueResult : scoreOf(data.analysis[i], kind)));
  const edges: EdgeReview[] = data.moves.map((m, i) => {
    const winBefore = moverWin(blueWin[i], m.player), winAfter = moverWin(blueWin[i + 1], m.player);
    const a = data.analysis[i], best = a?.candidates[0];
    const deepEnough = (j: number) => j === n || (data.analysis[j]?.visits ?? 0) >= minVisits;
    const known = !Number.isNaN(winBefore) && !Number.isNaN(winAfter) && deepEnough(i) && deepEnough(i + 1);
    const loss = known ? Math.max(0, winBefore - winAfter) : 0;
    const before = blueScore[i], after = blueScore[i + 1];
    const pointsLost = known && before !== undefined && after !== undefined
      ? Math.max(0, moverScore(before, m.player) - moverScore(after, m.player)) : undefined;
    const label = known ? classify(loss, pointsLost, !!best && !!m.edge && sameEdge(best.edge, m.edge), onlyEdge(a, m.player)) : null;
    return { index: i, player: m.player, edge: m.edge, cut: m.cut, winBefore, winAfter, loss, pointsLost, label, best };
  });
  const turns: TurnReview[] = [];
  for (const e of edges) {
    const last = turns.at(-1);
    if (last && last.player === e.player) last.edges.push(e);
    else turns.push({ number: turns.length + 1, player: e.player, edges: [e], loss: 0, label: null });
  }
  for (const t of turns) {
    const first = t.edges[0], last = t.edges.at(-1)!;
    if (t.edges.some(e => !e.label)) continue;
    t.loss = Math.max(0, first.winBefore - last.winAfter);
    const pts = t.edges.every(e => e.pointsLost !== undefined) ? t.edges.reduce((s, e) => s + e.pointsLost!, 0) : undefined;
    t.label = classify(t.loss, pts, t.edges.every(e => e.label === "best" || e.label === "great"), false);
  }
  const summary = ([0, 1] as Player[]).map(p => {
    const mine = edges.filter(e => e.player === p && e.label);
    const counts = Object.fromEntries(LABELS.map(l => [l, mine.filter(e => e.label === l).length])) as Record<Label, number>;
    const withPoints = mine.filter(e => e.pointsLost !== undefined);
    return {
      counts,
      accuracy: mine.length ? mine.reduce((s, e) => s + moveAccuracy(100 * e.loss), 0) / mine.length : NaN,
      meanLoss: mine.length ? mine.reduce((s, e) => s + e.loss, 0) / mine.length : NaN,
      meanPointsLost: withPoints.length ? withPoints.reduce((s, e) => s + e.pointsLost!, 0) / withPoints.length : undefined,
    };
  }) as [PlayerSummary, PlayerSummary];
  // Key moments: the worst edges, at least an inaccuracy, in game order (Lichess's evalSwings, chess.com's key moments).
  // The first turns are left out, as Regan and Haworth skip the opening (design 01): the values swing most there.
  const firstTurn = turns[Math.min(OPENING_TURNS, turns.length - 1)].edges[0].index;
  const mistakes = edges.filter(e => e.index >= firstTurn && e.label && BAD_LABELS.includes(e.label));
  const analysed = data.analysis.filter(Boolean).length;
  return { data, edges, turns, summary, mistakes, keyMoments: largest(mistakes), blueWin, blueScore, analysed };
}

/** The worst of these edges (by label, then points, then win chance), at most `n`, in game order. */
export function largest(edges: EdgeReview[], n = 8): EdgeReview[] {
  return [...edges].sort((a, b) => severity(b) - severity(a)).slice(0, n).sort((a, b) => a.index - b.index);
}

/** The loss as text: points when known, else win chance. */
export function lossText(e: EdgeReview): string {
  return e.pointsLost !== undefined ? `−${Math.round(e.pointsLost)} pts` : `−${(100 * e.loss).toFixed(0)}%`;
}

/** The move as text: its edge, or "pass". */
export const moveName = (edge: Edge | null) => (edge ? edgeName(edge) : "pass");

/** A sentence from facts only (design 04): what was played, and the engine's choice. */
export function explain(e: EdgeReview): string {
  const who = PLAYER_NAME[e.player];
  if (!e.edge) return `${who} passed (the clock ran out), and lost the rest of the turn.`;
  if (!e.label) return `${who} played ${edgeName(e.edge)}. Not analysed yet.`;
  if (e.label === "great") return `Great. ${who} found ${edgeName(e.edge)}, the only good edge here.`;
  if (e.label === "best") return `${who} played ${edgeName(e.edge)}, the engine's first choice.`;
  const better = e.best && !sameEdge(e.best.edge, e.edge) ? ` ${edgeName(e.best.edge)} was best.` : "";
  const lost = e.pointsLost !== undefined
    ? `${Math.round(e.pointsLost)} points and ${(100 * e.loss).toFixed(0)}% of win chance`
    : `${(100 * e.loss).toFixed(0)}% of win chance`;
  if (e.label === "excellent" || e.label === "good") return `${LABEL_TEXT[e.label]}. ${who} played ${edgeName(e.edge)}, ${lost} from the best.${better}`;
  return `${LABEL_TEXT[e.label]}. ${who} played ${edgeName(e.edge)} and lost ${lost}.${better}`;
}
