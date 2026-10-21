// The review's data and what the page derives from it: turns, losses, labels, accuracy, key moments.
//
// An edge's loss is measured as KaTrain and Lichess measure it: the mover's value before the edge (the position's
// analysis) less the mover's value after it (the next position's analysis), in win chance and, when the analysis has
// scores, in points. A turn's loss is the mover's value at its start less the mover's value after its last edge: the sum
// of its edges' losses, with the value between them cancelled (design 10). The page
// judges by turn or by edge (a display setting), so the review gives both. The labels are in labels.ts. Accuracy is
// Lichess's per-move formula on win% (AccuracyPercent.scala), weighed by KaTrain's weights (design 14). The analysis
// may be partial: an edge or a turn has no label until both its ends are analysed to at least `minVisits` (the label
// budget: docs/decisions/engine.md, "Label agreement against search budget").
//
// The model is every game's (design 29): an edge is one move (Enclosure's moves are edges), and a turn is a run of one
// player's moves. A move's type is the game's (`M`, or the GameTypes `G`), and a function that compares moves takes the
// game (game.ts, Moves). Enclosure's own part (its positions, its turn numbers, its texts) is in Hedge School's
// src/lib/review/enclosure.ts.

import type { Game, GameTypes, Moves, Player, PositionInfo } from "./game.ts";
import { BAD_LABELS, GOOD_WIN, HARD, LABELS, METER_GROUPS, ONLY_EDGE_GAP, accuracyWeight, classify, meterGroup, type Label,
         type MeterGroup } from "./labels.ts";
export { BAD_LABELS, HARD, LABELS, METER_GROUPS, type Label, type MeterGroup } from "./labels.ts";
export type { Player } from "./game.ts";

/** Values from Blue's side. `lead` (the engine's scoreLead) and `margin` (scoreSelfplay) are in points, and `spread`
 *  (scoreStdev) the spread of the final score after the move. `visits` is the visits through the move (KataGo's
 *  edgeVisits). `line` is the engine's expected continuation, the move first (KataGo's pv), up to a pass, and
 *  `lineVisits` the visits through each of its edges (KataGo's pvEdgeVisits). */
export interface Candidate<M> {
  edge: M; visits: number; blueWin: number; lead?: number; margin?: number; line?: M[];
  prior?: number; // the network's policy for the move: KaTrain's complexity weighs the candidates by it
  lineVisits?: number[];
  // A symmetric twin (protocol 0.4): in a position that is its own image, the searched edge of which this edge is the
  // mirror image. The engine lists the twin right after it, with its values and visits.
  twinOf?: M;
}
export interface Analysis<M> { blueWin: number; visits: number; lead?: number; margin?: number; spread?: number; candidates: Candidate<M>[] }
export interface ReviewData<G extends GameTypes> {
  players: { blue: string; red: string };
  result: { blue: number; red: number }; // the scores after the last edge
  ending?: GameEnding; // how the record says the game ended, for a game that the rules did not end
  moves: G["played"][];
  positions: G["position"][];
  analysis: (Analysis<G["move"]> | undefined)[]; // by position; undefined until analysed
  // By edge: the position after the engine's second choice, searched to confirm a Great (confirmedOnly)
  seconds?: (Analysis<G["move"]> | undefined)[];
  // By the index of a turn's first edge: the position after the turn's other candidate (otherCandidate), searched to
  // confirm a Great by turn
  others?: (Analysis<G["move"]> | undefined)[];
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
export const THUMB_UP = "M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z";
// Chess.com's marks: a star for Best, a thumbs-up for Excellent, a check mark for Good.
export const LABEL_GLYPH: Record<Label, Glyph> = {
  great: "!", best: "★", excellent: { path: THUMB_UP }, good: "✓", inaccuracy: "?!", mistake: "?", blunder: "??",
};

// --- Derived review -------------------------------------------------------------------------------------------------
/** A move's judgment, beside the move played (the game's, with its player and its edge). */
export interface MoveJudgment<M> {
  index: number; // the move's index: it leads from position index to position index + 1
  winBefore: number; // the mover's win chance before and after the edge, the engine's (NaN until analysed)
  winAfter: number;
  loss: number; // the mover's loss of win chance, at least 0
  pointsLost: number | undefined; // the mover's loss of points, at least 0, when the analysis has scores
  // The same before the clamp at 0, below 0 for a gain: the notes give them (costText), so that a turn's parts add up
  rawLoss: number;
  rawPoints: number | undefined;
  label: Label | null; // null until both positions are analysed
  best: Candidate<M> | undefined; // the engine's first choice in the position before the edge
  complexity: number | undefined; // KaTrain's complexity of the position before the edge, in win chance (complexity)
  hard: boolean; // a hard position: complexity HARD or more. On the board, the moves evaluated only (onlyJudged)
}
/** An edge of the review: the move played (`player`, `edge`, and what the game keeps of it), and its judgment. */
export type EdgeReview<G extends GameTypes> = G["played"] & MoveJudgment<G["move"]>;
export interface TurnReview<G extends GameTypes> {
  number: number;
  continued?: boolean; // the line starts in this turn's middle: its first edge was played before the start
  player: Player;
  edges: EdgeReview<G>[];
  start: number; // the turn leads from position start to position end
  end: number;
  loss: number; // the mover's loss of win chance from the turn's start to its end, at least 0
  pointsLost: number | undefined; // the mover's loss of points, at least 0, when the analysis has scores
  rawLoss: number; // the same before the clamp at 0, below 0 for a gain
  rawPoints: number | undefined;
  label: Label | null; // null until both ends are analysed
  best: G["move"][] | undefined; // the engine's best turn at the start: its first choice, and the next edge of its line
  complexity: number | undefined; // the larger of its positions' complexities: a turn is as hard as its harder decision
  hard: boolean;
}
/** The unit the page judges (design 10): the turn, by default, or each edge. */
export type Unit = "turn" | "edge";
/** A turn or an edge, labelled, by the indices of its first and last edges. */
export interface KeyMoment { first: number; last: number; label: Label }
export interface PlayerSummary { counts: Record<Label, number>; accuracy: number; meanPointsLost: number | undefined }
export interface Review<G extends GameTypes> {
  data: ReviewData<G>;
  edges: EdgeReview<G>[];
  turns: TurnReview<G>[];
  turnOf: TurnReview<G>[]; // by edge index: the turn the edge is in
  summary: Record<Unit, [PlayerSummary, PlayerSummary]>;
  keyMoments: Record<Unit, KeyMoment[]>;
  blueWin: number[]; // the engine's win chance by position (NaN until analysed), the last from the result
  blueScore: (number | undefined)[]; // by position, the score that measures points lost, from Blue's side
}

export const moverWin = (blueWin: number, p: Player) => (p === 0 ? blueWin : 1 - blueWin);
export const moverScore = (blue: number, p: Player) => (p === 0 ? blue : -blue);
const scoreOf = <M>(a: Analysis<M> | Candidate<M> | undefined, kind: ScoreKind) => (kind === "lead" ? a?.lead : a?.margin);

/** KaTrain's complexity of a position (katrain/core/ai.py, game_report), in win chance: the mean loss of the searched
 *  candidates for the mover, each weighed by the network's prior, from the root's win chance. KaTrain measures it in
 *  points, capped at 1 Go point. In Enclosure's points, 70% of the archive's positions would reach that cap times 12;
 *  in win chance it rises with the players' errors at every rating (decisions/engine.md, "Complexity on the archive").
 *  Undefined without the priors (an analysis stored before they were kept). */
export function complexity<M>(a: Analysis<M> | undefined, p: Player): number | undefined {
  if (!a) return undefined;
  let sum = 0, weight = 0;
  for (const c of a.candidates) {
    if (c.prior === undefined) continue;
    weight += c.prior;
    sum += c.prior * Math.max(0, moverWin(a.blueWin, p) - moverWin(c.blueWin, p));
  }
  return weight > 0 ? sum / weight : undefined;
}

/** The engine's first choice is the only good edge: the second is at least ONLY_EDGE_GAP worse for the mover. */
export function onlyEdge<M>(a: Analysis<M> | undefined, p: Player): boolean {
  const [first, second] = a ? distinctCandidates(a) : [];
  return !!first && !!second && moverWin(first.blueWin, p) - moverWin(second.blueWin, p) >= ONLY_EDGE_GAP;
}

/** The depth that makes a Great's confirmation an equal search: the position after the second choice searched as deep
 *  as the position after the played move (`afterVisits`), which the player may have searched deeper than the label
 *  budget (the position on screen, design 09). The depths step by doublings, so it is the largest doubling of the
 *  budget within `afterVisits`: a search still running, or stopped at its time limit, asks for no more than it has. */
export function equalDepth(minVisits: number, afterVisits: number | undefined): number {
  if (minVisits <= 0 || !afterVisits || afterVisits < 2 * minVisits) return minVisits;
  return minVisits * 2 ** Math.floor(Math.log2(afterVisits / minVisits));
}

/** The first choice, played, is the only good edge (Great), confirmed by an equal search: the position after the second
 *  choice, searched to `minVisits` at least (equalDepth: as deep as the position after the played edge), is
 *  ONLY_EDGE_GAP worse for the mover than the position after the played edge (`winAfter`, the mover's). The gap within
 *  one search (onlyEdge) only asks for that search: the second choice there rests on few visits
 *  (GameAnalysis.confirmGreats). */
export function confirmedOnly<M>(winAfter: number, second: Analysis<M> | undefined, p: Player, minVisits = 0): boolean {
  return !!second && second.visits >= minVisits && winAfter - moverWin(second.blueWin, p) >= ONLY_EDGE_GAP;
}

/** The first candidate that is not an edge of the played turn: the start of the best other turn, which confirms a
 *  Great by turn (design 10). The edges of the played turn are left out, because the best turn that starts with one of
 *  them is often the played turn in the other order. */
export function otherCandidate<M>(game: Moves<M>, a: Analysis<M> | undefined, played: (M | null)[]): Candidate<M> | undefined {
  return a && distinctCandidates(a).find(c => !played.some(e => e != null && sameMove(game, a, e, c.edge)));
}

/** The engine's distinct choices: its candidates without the symmetric twins, which repeat another candidate's move
 *  (protocol 0.4). A second choice, or a count of the search's visits, reads these. */
export const distinctCandidates = <M>(a: Analysis<M>): Candidate<M>[] => a.candidates.filter(c => !c.twinOf);

/** A searched candidate's symmetric twins: the candidates that are its mirror images, the same move (protocol 0.4). */
export const twinsOf = <M>(game: Moves<M>, a: Analysis<M>, c: Candidate<M>): Candidate<M>[] =>
  a.candidates.filter(t => !!t.twinOf && game.equal(t.twinOf, c.edge));

/** An edge's rank among the engine's distinct choices (1: the first, distinctCandidates): a twin has its searched
 *  edge's rank, as the table and the board show it. 0 when the edge is not a candidate. */
export function rankOf<M>(game: Moves<M>, a: Analysis<M> | undefined, edge: M): number {
  const c = a?.candidates.find(x => game.equal(x.edge, edge));
  if (!a || !c) return 0;
  const searched = c.twinOf ?? c.edge;
  return distinctCandidates(a).findIndex(x => game.equal(x.edge, searched)) + 1;
}

/** The engine's second choice: its next distinct move after the first (distinctCandidates). */
export const secondChoice = <M>(a: Analysis<M> | undefined): Candidate<M> | undefined => (a ? distinctCandidates(a)[1] : undefined);

/** Whether two edges are one move in the analysed position: the same edge, or symmetric twins (protocol 0.4), as the
 *  start's mirror pairs are. */
export function sameMove<M>(game: Moves<M>, a: Analysis<M> | undefined, x: M, y: M): boolean {
  if (game.equal(x, y)) return true;
  const searched = (e: M) => a?.candidates.find(c => game.equal(c.edge, e))?.twinOf ?? e;
  return game.equal(searched(x), searched(y));
}

/** The same turn: the same edges, in either order. */
function sameTurn<M>(game: Moves<M>, played: (M | null)[], turn: M[]): boolean {
  if (played.length !== turn.length || played.some(e => e == null)) return false;
  const [a, b] = played as M[];
  return turn.length === 1 ? game.equal(a, turn[0])
    : (game.equal(a, turn[0]) && game.equal(b, turn[1])) || (game.equal(a, turn[1]) && game.equal(b, turn[0]));
}

/** An edge's loss and label, from the mover's values before and after it: win chance, and score when both are known.
 *  `playedBest`: the edge was the engine's first choice; `only`: the first choice was the only good edge. */
export function judgeEdge(winBefore: number, winAfter: number, scoreBefore: number | undefined, scoreAfter: number | undefined,
                          playedBest: boolean, only: boolean): { loss: number; pointsLost: number | undefined; label: Label } {
  const loss = Math.max(0, winBefore - winAfter);
  const pointsLost = scoreBefore !== undefined && scoreAfter !== undefined ? Math.max(0, scoreBefore - scoreAfter) : undefined;
  return { loss, pointsLost, label: classify(loss, playedBest, only) };
}

/** A branch edge's label, judged as the game's edges are: from the analysis before it and the values after it (an
 *  analysis, or the result where the game ends), each analysis to at least `minVisits`, and `second`, the position after
 *  the engine's second choice, which confirms a Great. Null until both are known. */
export function judgeBranchEdge<M>(game: Moves<M>, before: Analysis<M> | undefined,
                                   after: { blueWin: number; blueScore: number | undefined; visits?: number } | undefined,
                                   mover: Player, edge: M | null, kind: ScoreKind = "lead", minVisits = 0,
                                   second?: Analysis<M>): Label | null {
  if (!before || before.visits < minVisits || !after) return null;
  const best = before.candidates[0], s = scoreOf(before, kind), winAfter = moverWin(after.blueWin, mover);
  return judgeEdge(moverWin(before.blueWin, mover), winAfter,
                   s !== undefined ? moverScore(s, mover) : undefined,
                   after.blueScore !== undefined ? moverScore(after.blueScore, mover) : undefined,
                   !!best && edge != null && sameMove(game, before, best.edge, edge),
                   onlyEdge(before, mover) && confirmedOnly(winAfter, second, mover, equalDepth(minVisits, after.visits))).label;
}

/** Blue's win chance at the game's end, from the score difference (Blue less Red): 1, 0, or 0.5 for a draw. */
export const resultWin = (blueLead: number) => (blueLead > 0 ? 1 : blueLead < 0 ? 0 : 0.5);

/** The engine's best turn from a position's first choice: its edge, and the next edge of its line for a turn of two. */
const bestTurn = <M>(first: Candidate<M> | undefined, twoEdges: boolean): M[] | undefined =>
  first && (twoEdges && (first.line?.length ?? 0) >= 2 ? [first.edge, first.line![1]] : [first.edge]);

/** The values after a position, for judging the edge into it: the result where the game ends, else its analysis once
 *  it has `minVisits`. */
export function valuesAfter<M>(p: PositionInfo, a: Analysis<M> | undefined, kind: ScoreKind = "lead", minVisits = 0) {
  if (p.over) {
    const d = p.scores[0] - p.scores[1];
    return { blueWin: resultWin(d), blueScore: d };
  }
  return a && a.visits >= minVisits ? { blueWin: a.blueWin, blueScore: scoreOf(a, kind), visits: a.visits } : undefined;
}

// Lichess's accuracy of one move from the drop in win% (0-100).
const moveAccuracy = (dropPct: number) => Math.min(100, Math.max(0, 103.1668 * Math.exp(-0.04354 * dropPct) - 3.1669 + 1));
/** A hard position's complexity: HARD or more (design 14). */
export const isHard = (c: number | undefined) => c !== undefined && c >= HARD;
/** A turn's complexity: its harder position's, of those with one (design 14). */
export function turnComplexity(cs: (number | undefined)[]): number | undefined {
  const known = cs.filter((c): c is number => c !== undefined);
  return known.length ? Math.max(...known) : undefined;
}
const hardness = (c: number | undefined) => ({ complexity: c, hard: isHard(c) });

/** What every judged turn or edge has. */
interface Judged { player: Player; label: Label | null; loss: number; pointsLost: number | undefined; complexity: number | undefined }
const severity = (e: Judged) => (e.label ? LABELS.indexOf(e.label) : -1) * 1e6 + (e.pointsLost ?? 0) + e.loss;

const weightedMean = (xs: [number, number][]) => xs.reduce((s, [x, w]) => s + x * w, 0) / xs.reduce((s, [, w]) => s + w, 0);

/** Each player's counts, accuracy and mean points lost, over the judged turns or edges. */
function summarize(items: Judged[]): [PlayerSummary, PlayerSummary] {
  return ([0, 1] as Player[]).map(p => {
    const mine = items.filter(e => e.player === p && e.label);
    const counts = Object.fromEntries(LABELS.map(l => [l, mine.filter(e => e.label === l).length])) as Record<Label, number>;
    const withPoints = mine.filter(e => e.pointsLost !== undefined);
    return {
      counts,
      // Lichess's accuracy of each move, weighed as KaTrain weighs its moves (labels.ts, accuracyWeight): a move of a hard
      // position or a large loss counts in full, an easy one of no loss little
      accuracy: mine.length ? weightedMean(mine.map(e => [moveAccuracy(100 * e.loss), accuracyWeight(e.complexity, e.loss)])) : NaN,
      meanPointsLost: withPoints.length ? withPoints.reduce((s, e) => s + e.pointsLost!, 0) / withPoints.length : undefined,
    };
  }) as [PlayerSummary, PlayerSummary];
}

export function review<G extends GameTypes>(game: Game<G>, data: ReviewData<G>, kind: ScoreKind = "lead", minVisits = 0): Review<G> {
  const blueResult = data.result.blue - data.result.red;
  const final = resultWin(blueResult);
  const n = data.moves.length, over = data.positions[n]?.over ?? true;
  // The position after the last edge is the end when the game is over: its value is the result. A line that stops
  // before (an unfinished game, the Analysis board's line) has a search there, as any position.
  const end = (i: number) => i === n && over;
  const blueWin = data.positions.map((_, i) => (end(i) ? final : data.analysis[i]?.blueWin ?? NaN));
  const blueScore = data.positions.map((_, i) => (end(i) ? blueResult : scoreOf(data.analysis[i], kind)));
  const deepEnough = (j: number) => end(j) || (data.analysis[j]?.visits ?? 0) >= minVisits;
  // Both ends of an edge or a turn analysed, to the label budget.
  const known = (i: number, j: number) => !Number.isNaN(blueWin[i]) && !Number.isNaN(blueWin[j]) && deepEnough(i) && deepEnough(j);
  const scoreAt = (i: number, p: Player) => (blueScore[i] !== undefined ? moverScore(blueScore[i]!, p) : undefined);
  const edges: EdgeReview<G>[] = data.moves.map((m, i) => {
    const winBefore = moverWin(blueWin[i], m.player), winAfter = moverWin(blueWin[i + 1], m.player);
    const a = data.analysis[i], best = a?.candidates[0];
    const before = scoreAt(i, m.player), after = scoreAt(i + 1, m.player);
    const j = known(i, i + 1) ? judgeEdge(winBefore, winAfter, before, after,
                                          !!best && m.edge != null && sameMove(game, a, best.edge, m.edge),
                                          onlyEdge(a, m.player) && confirmedOnly(winAfter, data.seconds?.[i], m.player,
                                                                                 equalDepth(minVisits, data.analysis[i + 1]?.visits))) : null;
    return { ...m, index: i, winBefore, winAfter, loss: j?.loss ?? 0,
             pointsLost: j?.pointsLost, rawLoss: j ? winBefore - winAfter : 0,
             rawPoints: j && before !== undefined && after !== undefined ? before - after : undefined,
             label: j?.label ?? null, best, ...hardness(complexity(a, m.player)) };
  });
  const turns: TurnReview<G>[] = [], turnOf: TurnReview<G>[] = [];
  const from = game.turn(data.positions[0]?.count ?? 0); // a line from a set-up position numbers from its turn
  for (const e of edges) {
    const last = turns.at(-1);
    if (last && last.player === e.player) { last.edges.push(e); last.end = e.index + 1; }
    else turns.push({ number: from.turn + turns.length, ...(!turns.length && !from.first ? { continued: true } : {}),
                      player: e.player, edges: [e], start: e.index, end: e.index + 1, loss: 0,
                      pointsLost: undefined, rawLoss: 0, rawPoints: undefined, label: null, best: undefined, complexity: undefined, hard: false });
    turnOf.push(turns.at(-1)!);
  }
  for (const t of turns) {
    Object.assign(t, hardness(turnComplexity(t.edges.map(e => e.complexity))));
    const p = t.player, first = data.analysis[t.start]?.candidates[0], played = t.edges.map(e => e.edge);
    t.best = bestTurn(first, t.edges.length > 1);
    // By edge too, the engine's best turn in the other order is Best: the same two edges make the same turn, so its
    // first edge, the second of the engine's line, is not judged by the search between them.
    if (t.edges.length > 1 && t.best && sameTurn(game, played, t.best))
      for (const e of t.edges) if (e.label && e.label !== "great") e.label = "best";
    if (!known(t.start, t.end)) continue;
    const j = judgeTurn(game, p, played, data.analysis[t.start], played.length > 1 ? data.analysis[t.start + 1] : undefined,
                        { blueWin: blueWin[t.end], blueScore: blueScore[t.end], visits: data.analysis[t.end]?.visits }, end(t.end), data.others?.[t.start],
                        data.seconds?.[t.start + 1], kind, minVisits);
    if (j) Object.assign(t, j);
  }
  // Key moments: the worst turns or edges, at least an inaccuracy, in game order, from the first turn on with no turn
  // count (Lichess's evalSwings, chess.com's key moments, design 10).
  const bad = (x: Judged) => !!x.label && BAD_LABELS.includes(x.label);
  return {
    data, edges, turns, turnOf, blueWin, blueScore,
    summary: { turn: summarize(turns), edge: summarize(edges) },
    keyMoments: {
      turn: largest(turns.filter(bad), t => t.start)
        .map(t => ({ first: t.start, last: t.end - 1, label: t.label! })),
      edge: largest(edges.filter(bad), e => e.index)
        .map(e => ({ first: e.index, last: e.index, label: e.label! })),
    },
  };
}

/** A turn's judgment: its loss from its two ends, before the clamp at 0 too, and its label. */
export interface TurnJudgment {
  loss: number; pointsLost: number | undefined; rawLoss: number; rawPoints: number | undefined; label: Label;
}

/** A turn's label, the game's or a branch's (design 10), from its searches: `start`, the position before it, to
 *  `minVisits` at least; `middle`, the position after its first edge, for a turn of two; `after`, the values after it
 *  (valuesAfter); `ends`, the game ends after it (no Great: nothing confirms it); `other`, the position after its other
 *  candidate, and `second`, the position after the middle's second choice, which confirm a Great. Null until the start
 *  and the values after are known. */
export function judgeTurn<M>(game: Moves<M>, mover: Player, played: (M | null)[], start: Analysis<M> | undefined,
                             middle: Analysis<M> | undefined,
                             after: { blueWin: number; blueScore: number | undefined; visits?: number } | undefined, ends: boolean,
                             other: Analysis<M> | undefined, second: Analysis<M> | undefined, kind: ScoreKind = "lead",
                             minVisits = 0): TurnJudgment | null {
  if (!start || start.visits < minVisits || !after || Number.isNaN(start.blueWin) || Number.isNaN(after.blueWin)) return null;
  const p = mover, first = start.candidates[0], top = middle?.candidates[0];
  const best = bestTurn(first, played.length > 1);
  // Best: the turn reaches the engine's best turn: each edge the first choice of its own search, or the same edges as the
  // first choice and the next edge of its line, in either order.
  const firstChoices = !!first && played[0] != null && sameMove(game, start, first.edge, played[0])
    && (played.length === 1 || (!!middle && middle.visits >= minVisits && !!top && played[1] != null && sameMove(game, middle, top.edge, played[1])));
  const playedBest = firstChoices || (!!best && sameTurn(game, played, best));
  // `after.blueWin` is the win chance that labels read (valuesAfter).
  const winBefore = moverWin(start.blueWin, p), winAfter = moverWin(after.blueWin, p);
  const s = scoreOf(start, kind), before = s !== undefined ? moverScore(s, p) : undefined;
  const afterScore = after.blueScore !== undefined ? moverScore(after.blueScore, p) : undefined;
  // Great: the only good turn, confirmed by equal searches. From the start: the other candidate (otherCandidate) looks
  // ONLY_EDGE_GAP worse there, and the position after it, searched as deep, is that much worse than the position after
  // the turn. From the middle, for a turn of two edges: the played second edge is the first choice there, and its second
  // choice is that much worse, confirmed as for an edge.
  const otherFirst = otherCandidate(game, start, played), confirmDepth = equalDepth(minVisits, after.visits);
  const fromStart = !!first && !!otherFirst
    && moverWin(first.blueWin, p) - moverWin(otherFirst.blueWin, p) >= ONLY_EDGE_GAP
    && confirmedOnly(winAfter, other, p, confirmDepth);
  const fromMiddle = played.length === 1 || (!!top && played[1] != null && sameMove(game, middle, top.edge, played[1]) && onlyEdge(middle, p)
    && confirmedOnly(winAfter, second, p, confirmDepth));
  const j = judgeEdge(winBefore, winAfter, before, afterScore, playedBest, playedBest && !ends && fromStart && fromMiddle);
  return { ...j, rawLoss: winBefore - winAfter, rawPoints: before !== undefined && afterScore !== undefined ? before - afterScore : undefined };
}

/** The worst of these turns or edges (by label, then points, then win chance), at most `n`, in game order. */
export function largest<T extends Judged>(items: T[], order: (x: T) => number, n = 8): T[] {
  return [...items].sort((a, b) => severity(b) - severity(a)).slice(0, n).sort((a, b) => order(a) - order(b));
}

/** A win chance as text, with one decimal wherever it shows. */
export const pct = (x: number) => `${(100 * x).toFixed(1)}%`;

/** A hard position's tooltip: the mark's meaning, in two words. The Difficulty chart and the engine header's second
 *  line show how hard (design 14). */
export const HARD_NOTE = "Hard position";

/** The network's likely edges in a position, as Maia's Blunder Meter shows a human's likely moves
 *  (maia-platform-frontend, calculateBlunderMeter): the network's prior summed by the group of each searched edge's loss
 *  against the best one's win chance, for the mover. `unsearched` is the prior of the edges the search did not visit:
 *  their loss is not known. Undefined without the priors. */
export function likelyEdges<M>(a: Analysis<M> | undefined, p: Player): (Record<MeterGroup, number> & { unsearched: number }) | undefined {
  const searched = a?.candidates.filter(c => c.prior !== undefined) ?? [];
  if (!searched.length) return undefined;
  const best = Math.max(...searched.map(c => moverWin(c.blueWin, p)));
  const out = { good: 0, inaccuracy: 0, mistake: 0, blunder: 0, unsearched: 1 };
  for (const c of searched) out[meterGroup(best - moverWin(c.blueWin, p))] += c.prior!;
  out.unsearched = Math.max(0, 1 - METER_GROUPS.reduce((s, g) => s + out[g], 0));
  return out;
}

/** A cost against the engine's best, as every note writes it: the win chance first, then the points when the analysis
 *  has scores, each with its sign and one decimal ("−4.0% · −26.3 pts"). `win` and `points` are losses: a minus marks a
 *  loss, a plus a gain (a candidate after number 1 that looks a little better), and a value that rounds to 0 has no
 *  sign. The other places round the points whole (design 06). */
export function costText(win: number, points?: number): string {
  const w = Math.abs(100 * win).toFixed(1);
  return `${w === "0.0" ? w : (win > 0 ? "−" : "+") + w}%${points === undefined ? "" : ` · ${pointsText(points)}`}`;
}

/** Points lost as every note writes them, to one decimal: "−45.2 pts", "+3.0 pts" for a gain, "0.0 pts". */
function pointsText(points: number): string {
  const p = Math.abs(points).toFixed(1);
  return `${p === "0.0" ? p : (points > 0 ? "−" : "+") + p} pts`;
}

/** A turn's cost (design 10): the turn's own, then each edge's points in the turn's order, so that one turn can be read
 *  by edge: "−27.1% · −150.2 pts (−45.0 pts, −105.2 pts)". An edge that gained has a plus. The parts are rounded
 *  together, in tenths, so that they add up to the turn's points (the largest remainders round up). The engine's own
 *  turn (Best, Great) has no parts: its edges have nothing to explain, and their losses would show only the search
 *  between them. */
export function turnCost<G extends GameTypes>(t: TurnReview<G>): string {
  const parts = t.edges.map(e => e.rawPoints);
  if (t.edges.length < 2 || t.label === "best" || t.label === "great" || t.rawPoints === undefined
      || t.edges.some(e => !e.label) || parts.some(x => x === undefined)) return costText(t.rawLoss, t.rawPoints);
  const tenths = roundTogether((parts as number[]).map(x => 10 * x)).map(x => x / 10);
  return `${costText(t.rawLoss, tenths.reduce((a, b) => a + b, 0))} (${tenths.map(pointsText).join(", ")})`;
}

/** Whole numbers that add up to the rounded sum of `parts` (Hamilton's largest remainders): each part rounded down, then
 *  one more for the parts with the largest remainders. The sum is rounded as costText rounds it, away from 0 at half. */
export function roundTogether(parts: number[]): number[] {
  const sum = parts.reduce((a, b) => a + b, 0), total = Math.sign(sum) * Math.round(Math.abs(sum));
  const down = parts.map(Math.floor), more = total - down.reduce((a, b) => a + b, 0);
  const order = parts.map((x, k) => k).sort((a, b) => (parts[b] - down[b]) - (parts[a] - down[a]));
  for (const k of order.slice(0, more)) down[k]++;
  return down;
}

// KataGo lets a move compete for its choice (by its lower confidence bound) only when the move has this share of the
// most visited move's weight (minVisitPropForLCB, its analysis_example.cfg; search/searchresults.cpp,
// getPlaySelectionValues). With fewer visits, its value is too uncertain to compare. The board uses the same rule,
// with visits for weight.
const MIN_VISIT_SHARE = 0.15;
/** How far below the first choice a candidate on the board may be, in the engine's win chance and in Go's points: the
 *  Good bands that the labels had until they moved to a human's win chance (chess.com's 0.05, KaTrain's 3 Go points,
 *  which the game's scoreScale turns into its own points: 36 in Enclosure). A candidate in a decided game, where every
 *  win chance is near 1, is held by the points. */
const CANDIDATE_GAP = { win: GOOD_WIN, goPoints: 3 };

/** The candidate has enough visits for its values and its line to be trusted: it is the engine's first choice, or it
 *  has MIN_VISIT_SHARE of the most visited candidate's visits. */
export function enoughVisits<M>(a: Analysis<M>, c: Candidate<M>): boolean {
  return c === a.candidates[0] || c.visits >= MIN_VISIT_SHARE * Math.max(...a.candidates.map(x => x.visits));
}

// KaTrain trusts a candidate from LOW_VISITS visits: with fewer, it draws the candidate small and faint, without its
// numbers (trainer/low_visits in its config.json; gui/badukpan.py). A line is cut by the same count.
const LOW_VISITS = 25;

/** The part of the candidate's line that the search trusts: up to its first edge with fewer than LOW_VISITS visits.
 *  An analysis without the visits of its lines (older results) keeps the whole line. */
export function trustedLine<M>(c: Candidate<M>): M[] {
  const line = c.line ?? [];
  if (!c.lineVisits) return line;
  const thin = c.lineVisits.findIndex(v => v < LOW_VISITS);
  return thin < 0 ? line : line.slice(0, thin);
}

/** A candidate with its rank (1: the engine's first choice) and how much worse it is than number 1 for the mover: `gap`
 *  in win chance, `gapPts` in points when the analysis has scores. Negative when it is better than number 1. `twins`:
 *  its symmetric twins, the same move with the same numbers, which share its rank. */
export interface RankedCandidate<M> { c: Candidate<M>; rank: number; gap: number; gapPts: number | undefined; twins: Candidate<M>[] }

/** The engine's candidates on the board: its first choice, and every other candidate that has enough visits to compare
 *  (MIN_VISIT_SHARE of the most visited candidate's) and is within CANDIDATE_GAP of the first choice. They are the
 *  engine's view, so `gap` is the engine's own win chance below the first choice's, and `gapPts` the points (design 07).
 *  No limit on the count: in an open position the visits spread, and every move that earns them shows. The first choice
 *  is KataGo's order, its choice of move (the engine repository's design 04, "order"): by play selection value, where
 *  the move with the best lower confidence bound is raised as far as that bound justifies, at most fivefold. So the
 *  first choice is usually, not always, the best-LCB move, and it can have fewer visits than another candidate. */
export function shownCandidates<M>(game: Moves<M> & { scoreScale: number }, a: Analysis<M> | undefined, p: Player): RankedCandidate<M>[] {
  const first = a?.candidates[0];
  if (!first) return [];
  const best = moverWin(first.blueWin, p);
  const most = Math.max(...a.candidates.map(c => c.visits));
  const gapPoints = CANDIDATE_GAP.goPoints * game.scoreScale;
  // One rank for each distinct move: a symmetric twin is the same move, and comes with it (twinsOf).
  return distinctCandidates(a)
    .map((c, k) => ({
      c, rank: k + 1, gap: best - moverWin(c.blueWin, p),
      gapPts: first.lead !== undefined && c.lead !== undefined ? moverScore(first.lead, p) - moverScore(c.lead, p) : undefined,
      twins: twinsOf(game, a, c),
    }))
    .filter(({ c, rank, gap, gapPts }) => rank === 1 || (c.visits >= MIN_VISIT_SHARE * most && gap <= CANDIDATE_GAP.win
      && (gapPts === undefined || gapPts <= gapPoints)));
}

/** The review with labels only on the moves judged (the Analysis board, design 21): another move keeps its move and
 *  numbers, and loses its label, its loss and its hard-position mark, so that the annotated record names neither. It
 *  keeps its complexity: the move list marks a hard position wherever it has a result (design 14). A turn keeps its
 *  own when each of its edges is judged. */
export function onlyJudged<G extends GameTypes>(R: Review<G>, judged: (edge: number) => boolean): Review<G> {
  const plain = <T extends EdgeReview<G> | TurnReview<G>>(x: T): T =>
    ({ ...x, label: null, loss: 0, pointsLost: undefined, rawLoss: 0, rawPoints: undefined, hard: false });
  const edges = R.edges.map(e => (judged(e.index) ? e : plain(e)));
  const turns = R.turns.map(t => {
    const own = t.edges.map(e => edges[e.index]);
    return t.edges.every(e => judged(e.index)) ? { ...t, edges: own } : { ...plain(t), edges: own };
  });
  return { ...R, edges, turns, turnOf: R.edges.map(e => turns[R.turns.indexOf(R.turnOf[e.index])]) };
}

/** Whether edge `i` opens its turn, as the move list writes it: "12." for the first edge, "12..." for the second. */
export const opensTurn = <G extends GameTypes>(t: TurnReview<G>, i: number) => t.edges[0].index === i && !t.continued;

/** How a record says its game ended (the notation's result and Termination tag): `b+28.5`, `r+R` (resigned), `b+F`
 *  (forfeited: left the game), `0` (a draw), `*` (not over, or not known). */
export interface GameEnding { result: string | null; termination?: string }
