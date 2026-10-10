// The review's data and what the page derives from it: turns, losses, labels, accuracy, key moments.
//
// An edge's loss is measured as KaTrain and Lichess measure it: the mover's value before the edge (the position's
// analysis) less the mover's value after it (the next position's analysis), in win chance and, when the analysis has
// scores, in points. The labels are in labels.ts. Accuracy is Lichess's per-move formula on win% (AccuracyPercent.scala),
// averaged plainly. The analysis may be partial: an edge has no label until both its positions are analysed to at
// least `minVisits` (the label budget: docs/decisions/engine.md, "Label agreement against search budget").

import { edgeName, sameEdge, type Edge } from "#lib/engine/notation.ts";
import { BAD_LABELS, GOOD_POINTS, GOOD_WIN, LABELS, ONLY_EDGE_GAP, classify, type Label } from "./labels.ts";
export { edgeName, pointName, sameEdge, type Edge } from "#lib/engine/notation.ts";
export { BAD_LABELS, LABELS, type Label } from "./labels.ts";

export type Player = 0 | 1; // 0 Blue (first player), 1 Red

export interface Region { area: number; rings: [number, number][][] }
export interface Position {
  edges: [Edge[], Edge[]];
  protected: Edge[];
  placed: Edge[];
  scores: [number, number];
  areas?: [number, number]; // the area each player encloses now, added to the score at each turn's end (the engine's)
  player: Player;
  movesLeft: number;
  regions: [Region[], Region[]];
  over?: boolean; // the game has ended here (the engine's outcome)
}
/** A move: an edge, or null for a timeout pass (the rest of the turn forfeited). */
export interface Move { player: Player; edge: Edge | null; cut: Edge | null }
/** Values from Blue's side. `lead` (the engine's scoreLead) and `margin` (scoreSelfplay) are in points. `visits` is the
 *  visits through the move (KataGo's edgeVisits). `line` is the engine's expected continuation, the move first (KataGo's
 *  pv), up to a pass, and `lineVisits` the visits through each of its edges (KataGo's pvEdgeVisits). */
export interface Candidate {
  edge: Edge; visits: number; blueWin: number; lead?: number; margin?: number; line?: Edge[]; lineVisits?: number[];
}
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
/** A label's mark in its badge: a character, or an icon as an SVG path in a 24-unit square. */
export type Glyph = string | { path: string };
// Material Design Icons' thumb_up (Google, Apache License 2.0).
const THUMB_UP = "M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z";
// Chess.com's marks: a star for Best, a thumbs-up for Excellent, a check mark for Good.
export const LABEL_GLYPH: Record<Label, Glyph> = {
  great: "!", best: "★", excellent: { path: THUMB_UP }, good: "✓", inaccuracy: "?!", mistake: "?", blunder: "??",
};
const OPENING_TURNS = 8;

export const PLAYER_NAME = ["Blue", "Red"] as const;

/** An edge of a line, played: the edge it cuts (or null), and the regions and areas after it. */
export interface LineStep { cut: Edge | null; regions: Position["regions"]; areas: [number, number] }

/** Who plays each of the next `n` edges from a position: the mover for the edges left in this turn, then each player
 *  for a turn of two edges. */
export function lineMovers(p: Position, n: number): Player[] {
  const movers: Player[] = [];
  let player = p.player, left = p.movesLeft;
  for (let i = 0; i < n; i++) {
    movers.push(player);
    if (--left === 0) { player = (1 - player) as Player; left = 2; }
  }
  return movers;
}

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
export interface PlayerSummary { counts: Record<Label, number>; accuracy: number; meanPointsLost: number | undefined }
export interface Review {
  data: ReviewData;
  edges: EdgeReview[];
  turns: TurnReview[];
  turnOf: TurnReview[]; // by edge index: the turn the edge is in
  summary: [PlayerSummary, PlayerSummary];
  mistakes: EdgeReview[]; // every edge labelled Inaccuracy or worse after the opening, in game order
  keyMoments: EdgeReview[];
  blueWin: number[]; // by position (NaN until analysed), the last from the result
  blueScore: (number | undefined)[]; // by position, the score that measures points lost, from Blue's side
}

export const moverWin = (blueWin: number, p: Player) => (p === 0 ? blueWin : 1 - blueWin);
export const moverScore = (blue: number, p: Player) => (p === 0 ? blue : -blue);
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
  const turns: TurnReview[] = [], turnOf: TurnReview[] = [];
  for (const e of edges) {
    const last = turns.at(-1);
    if (last && last.player === e.player) last.edges.push(e);
    else turns.push({ number: turns.length + 1, player: e.player, edges: [e], loss: 0, label: null });
    turnOf.push(turns.at(-1)!);
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
      meanPointsLost: withPoints.length ? withPoints.reduce((s, e) => s + e.pointsLost!, 0) / withPoints.length : undefined,
    };
  }) as [PlayerSummary, PlayerSummary];
  // Key moments: the worst edges, at least an inaccuracy, in game order (Lichess's evalSwings, chess.com's key moments).
  // The first turns are left out, as Regan and Haworth skip the opening (design 01): the values swing most there.
  const firstTurn = turns[Math.min(OPENING_TURNS, turns.length - 1)].edges[0].index;
  const mistakes = edges.filter(e => e.index >= firstTurn && e.label && BAD_LABELS.includes(e.label));
  return { data, edges, turns, turnOf, summary, mistakes, keyMoments: largest(mistakes), blueWin, blueScore };
}

/** The worst of these edges (by label, then points, then win chance), at most `n`, in game order. */
export function largest(edges: EdgeReview[], n = 8): EdgeReview[] {
  return [...edges].sort((a, b) => severity(b) - severity(a)).slice(0, n).sort((a, b) => a.index - b.index);
}

/** A win chance as text, with one decimal wherever it shows. */
export const pct = (x: number) => `${(100 * x).toFixed(1)}%`;

/** The loss as text: points when known, else win chance. */
export function lossText(e: EdgeReview): string {
  return e.pointsLost !== undefined ? `−${Math.round(e.pointsLost)} pts` : `−${pct(e.loss)}`;
}

/** The loss as a phrase: "12 points and 3.4% of win chance", or the win chance alone when the analysis has no scores. */
export function lossPhrase(e: EdgeReview): string {
  return `${e.pointsLost !== undefined ? `${Math.round(e.pointsLost)} points and ` : ""}${pct(e.loss)} of win chance`;
}

/** The move as text: its edge, or "pass". */
export const moveName = (edge: Edge | null) => (edge ? edgeName(edge) : "pass");

/** The move in the record's notation: its edge with the cut mark when it cuts (`D10-G10x`), or "pass". */
export const moveNotation = (m: { edge: Edge | null; cut: Edge | null }) => `${moveName(m.edge)}${m.cut ? "x" : ""}`;

/** A sentence from facts only (design 04): what was played, and the engine's choice. */
export function explain(e: EdgeReview): string {
  const who = PLAYER_NAME[e.player];
  if (!e.edge) return `${who} passed (the clock ran out), and lost the rest of the turn.`;
  if (!e.label) return `${who} played ${edgeName(e.edge)}. Not analysed yet.`;
  if (e.label === "great") return `Great. ${who} found ${edgeName(e.edge)}, the only good edge here.`;
  if (e.label === "best") return `${who} played ${edgeName(e.edge)}, the engine's first choice.`;
  const better = e.best && !sameEdge(e.best.edge, e.edge) ? ` ${edgeName(e.best.edge)} was best.` : "";
  const lost = lossPhrase(e);
  if (e.label === "excellent" || e.label === "good") return `${LABEL_TEXT[e.label]}. ${who} played ${edgeName(e.edge)}, ${lost} from the best.${better}`;
  return `${LABEL_TEXT[e.label]}. ${who} played ${edgeName(e.edge)} and lost ${lost}.${better}`;
}

/** A note for the move list, in one line: the label, and the engine's choice when the edge was not it. */
export function shortNote(e: EdgeReview): string {
  if (e.label === "great") return "Great. The only good edge.";
  const better = e.best && e.edge && !sameEdge(e.best.edge, e.edge) ? ` ${edgeName(e.best.edge)} was best.` : "";
  return `${e.label ? LABEL_TEXT[e.label] : "Not analysed yet"}.${better}`;
}

// KataGo lets a move compete for its choice (by its lower confidence bound) only when the move has this share of the
// most visited move's weight (minVisitPropForLCB, its analysis_example.cfg; search/searchresults.cpp,
// getPlaySelectionValues). With fewer visits, its value is too uncertain to compare. The board uses the same rule,
// with visits for weight.
const MIN_VISIT_SHARE = 0.15;

/** The candidate has enough visits for its values and its line to be trusted: it is the engine's first choice, or it
 *  has MIN_VISIT_SHARE of the most visited candidate's visits. */
export function enoughVisits(a: Analysis, c: Candidate): boolean {
  return c === a.candidates[0] || c.visits >= MIN_VISIT_SHARE * Math.max(...a.candidates.map(x => x.visits));
}

// KaTrain trusts a candidate from LOW_VISITS visits: with fewer, it draws the candidate small and faint, without its
// numbers (trainer/low_visits in its config.json; gui/badukpan.py). A line is cut by the same count.
const LOW_VISITS = 25;

/** The part of the candidate's line that the search trusts: up to its first edge with fewer than LOW_VISITS visits.
 *  An analysis without the visits of its lines (older results) keeps the whole line. */
export function trustedLine(c: Candidate): Edge[] {
  const line = c.line ?? [];
  if (!c.lineVisits) return line;
  const thin = c.lineVisits.findIndex(v => v < LOW_VISITS);
  return thin < 0 ? line : line.slice(0, thin);
}

/** A candidate with its rank (1: the engine's first choice) and how much worse it is than number 1 for the mover: `gap`
 *  in win chance, `gapPts` in points when the analysis has scores. Negative when it is better than number 1. */
export interface RankedCandidate { c: Candidate; rank: number; gap: number; gapPts: number | undefined }

/** The engine's candidates on the board: its first choice, and every other candidate that has enough visits to compare
 *  (MIN_VISIT_SHARE of the most visited candidate's) and is within the Good band of the first choice (labels.ts). No
 *  limit on the count: in an open position the visits spread, and every move that earns them shows. The first choice
 *  is KataGo's order, its choice of move (the engine repository's design 04, "order"): by play selection value, where
 *  the move with the best lower confidence bound is raised as far as that bound justifies, at most fivefold. So the
 *  first choice is usually, not always, the best-LCB move, and it can have fewer visits than another candidate. */
export function shownCandidates(a: Analysis | undefined, p: Player): RankedCandidate[] {
  const first = a?.candidates[0];
  if (!first) return [];
  const best = moverWin(first.blueWin, p);
  const most = Math.max(...a.candidates.map(c => c.visits));
  return a.candidates
    .map((c, k) => ({
      c, rank: k + 1, gap: best - moverWin(c.blueWin, p),
      gapPts: first.lead !== undefined && c.lead !== undefined ? moverScore(first.lead, p) - moverScore(c.lead, p) : undefined,
    }))
    .filter(({ c, rank, gap, gapPts }) => rank === 1 || (c.visits >= MIN_VISIT_SHARE * most && gap <= GOOD_WIN
      && (gapPts === undefined || gapPts <= GOOD_POINTS)));
}
