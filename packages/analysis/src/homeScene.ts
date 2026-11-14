// The home page's board (Hedge School's design 22, Cyanotype's design 33): scenes from reviewed games, played on the
// board with the review's candidates and labels. Each site's scripts/home-replay.mjs writes its scenes from stored
// results, and this file holds what the two scripts share: the stored results that the review reads, the review of the
// game as the Review tab makes it from them, and the scene's moves. Each script gives its game's positions and moves,
// and writes each frame as its board draws it.
import type { Game, GameTypes } from "./game.ts";
import { readAnalysisKey } from "./cache.ts";
import { BAD_LABELS } from "./labels.ts";
import { otherCandidate, review, secondChoice, type Analysis, type MoveReview, type Review, type TurnReview } from "./model.ts";

/** The turns before a scene's labelled move. */
export const SCENE_BEFORE = 9;
/** The ranks of the engine's candidates that a scene shows before each move, the first three: a small board with no
 *  table beside it. */
export const SCENE_CANDIDATES = 3;

/** The stored results of the network `model`, each position's at `minVisits` or deeper, by the position's moves: the
 *  deepest of a position's results, as the review takes them (cacheGetAtLeast). An added area map is no result. */
export function storedResults<A>(analyses: [string, A][], model: string, minVisits: number): (moves: string[]) => A | undefined {
  const byMoves = new Map<string, { visits: number; value: A }>();
  for (const [key, value] of analyses) {
    const k = readAnalysisKey(key);
    if (k.map || k.model !== model || k.visits < minVisits) continue;
    const kept = byMoves.get(k.moves);
    if (!kept || kept.visits < k.visits) byMoves.set(k.moves, { visits: k.visits, value });
  }
  return moves => byMoves.get(moves.join(" "))?.value;
}

/** A game with its stored results: its moves' names, its positions (one more than its moves), its moves played, the
 *  analysis of each position as the review reads it, and the stored result of a position by its moves. */
export interface GameWithResults<G extends GameTypes> {
  moves: string[];
  positions: G["position"][];
  played: G["played"][];
  analysis: (Analysis<G["move"]> | undefined)[];
  resultOf(moves: string[]): Analysis<G["move"]> | undefined;
}

/** The game's review by its stored results, as the Review tab reads them (GameAnalysis.data): with the positions after
 *  each move's second choice and after each turn's other candidate, which confirm a Great. Nothing names the players. */
export function storedGameReview<G extends GameTypes>(game: Game<G>, g: GameWithResults<G>,
                                                      minVisits: number): Review<G> {
  const { moves, positions, played, analysis, resultOf } = g;
  const after = (i: number, c: { edge: G["move"] } | undefined) =>
    (c ? resultOf([...moves.slice(0, i), game.moveName(c.edge)]) : undefined);
  /** The moves of the turn that opens with move i, or none when move i does not open a turn. */
  const turnAt = (i: number) => {
    const m = played[i];
    if (!m || (i > 0 && played[i - 1].player === m.player)) return undefined;
    const next = played[i + 1];
    return next && next.player === m.player ? [m.edge, next.edge] : [m.edge];
  };
  const seconds = played.map((_, i) => (i + 1 < played.length ? after(i, secondChoice(analysis[i])) : undefined));
  const others = played.map((_, i) => {
    const t = turnAt(i);
    return t && i + t.length < played.length ? after(i, otherCandidate(game, analysis[i], t)) : undefined;
  });
  const end = positions.at(-1)!.scores;
  return review(game, { players: { blue: "", red: "" }, result: { blue: end[0], red: end[1] }, moves: played, positions,
                        analysis, seconds, others }, "lead", minVisits);
}

/** A scene of a reviewed game: its labelled move (`key`), the turn that the scene starts with (`first`, SCENE_BEFORE
 *  turns before the key move's), and the position after the key move (`last`), where it ends. */
export interface Scene<G extends GameTypes> { key: MoveReview<G>; first: TurnReview<G>; last: number }

/** The scene of a reviewed game of `moves` moves: the SCENE_BEFORE turns before the game's latest move with a bad
 *  label, away from its start and its end, and that move. The latest, so that the board is fuller: the bots' bad moves
 *  come early in their games. None when no move fits. */
export function sceneOf<G extends GameTypes>(R: Review<G>, moves: number): Scene<G> | undefined {
  const key = R.edges.filter(e => R.turns.indexOf(R.turnOf[e.index]) >= SCENE_BEFORE && e.index < moves - 2 && e.label
                                   && BAD_LABELS.includes(e.label)).at(-1);
  if (!key) return undefined;
  return { key, first: R.turns[R.turns.indexOf(R.turnOf[key.index]) - SCENE_BEFORE], last: key.index + 1 };
}

/** The hold of a scene's frame at position i (the shared Replay.svelte's ReplayFrame): before the labelled move, and
 *  on the position after it, where its label shows. None elsewhere. */
export const sceneHold = <G extends GameTypes>(s: Scene<G>, i: number): { hold?: "before" | "moment" } =>
  (i === s.key.index ? { hold: "before" } : i === s.last ? { hold: "moment" } : {});

/** The moves of the turn so far before position i, the last first: the indices of the last move and of an earlier one
 *  of its turn, as the review marks them on the board. None at the game's start (i = 0). */
export function turnSoFar<G extends GameTypes>(R: Review<G>, i: number): number[] {
  const out: number[] = [];
  for (let j = i - 1; j >= 0 && j >= R.turnOf[i - 1].start; j--) out.push(j);
  return out;
}
