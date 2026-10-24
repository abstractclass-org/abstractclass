// Enclosure as the shared packages read it (docs/design/29-shared-packages.md), and its own part of the review. The
// packages' model and analysis compute with a game (@abstractclass/analysis/game.ts): `enclosure` is Enclosure's, from
// its notation (engine/notation.ts) and its engine's fields (engine/position.ts). The site imports the review's model
// from here: the shared model's names, its types named for Enclosure's, its functions that compare moves with
// Enclosure's game given, and Enclosure's own part: the board's position, a move with the edge it cuts, the turns of the
// notation, who plays each edge of a line, the threat's turn, the players' names and the texts that say "edge".
import * as shared from "@abstractclass/analysis/model.ts";
import type { Game, GameTypes, Player } from "@abstractclass/analysis/game.ts";
import type { BranchNode as SharedNode } from "@abstractclass/analysis/analysis.svelte.ts";
import { edgeName, parseEdge, sameEdge, type Edge } from "#lib/engine/notation.ts";
import { boardPosition, playerOf, rulesOf, type DescribeReply, type GamePosition } from "#lib/engine/position.ts";
import type { EdgeRules } from "#lib/board/edgeInput.svelte.ts";
import { turnFromCount } from "@abstractclass/record/turns.ts";
export * from "@abstractclass/analysis/model.ts";
export { edgeName, pointName, sameEdge, type Edge } from "#lib/engine/notation.ts";

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
  count?: number; // the edges played so far, forfeited ones too (the notation's edge count)
  notation?: string; // the position in the notation (the engine's describe)
}

// The turn of the next edge from a position with `count` edges played, and whether that edge opens its turn: the
// notation's turn structure (the /notation page), which Blueprints shares (@abstractclass/record/turns.ts). Blue's
// first turn has one edge, then turns of two, and Blue's last turn one. A pass counts the edges it forfeits, so the
// count alone fixes the turn.
export { turnFromCount };
/** A move: an edge, or null for a timeout pass (the rest of the turn forfeited), and the opponent's edge that it cut. */
export interface Move { player: Player; edge: Edge | null; cut: Edge | null }

export const PLAYER_NAME = ["Blue", "Red"] as const;
export const otherPlayer = (p: Player): Player => (1 - p) as Player;
const WHOLE = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
/** Points or an area as the players' cards and the image's caption show them: whole, with thousands separated. */
export const fmtScore = (s: number) => WHOLE.format(Math.round(s));

/** An edge of a line, played: the edge it cuts (or null), and the regions and areas after it. */
export interface LineStep { cut: Edge | null; regions: Position["regions"]; areas: [number, number] }

/** Who plays each of the next `n` edges from a position: the mover for the edges left in this turn, then each player
 *  for a turn of two edges. */
export function lineMovers(p: Position, n: number): Player[] {
  const movers: Player[] = [];
  let player = p.player, left = p.movesLeft;
  for (let i = 0; i < n; i++) {
    movers.push(player);
    if (--left === 0) { player = otherPlayer(player); left = 2; }
  }
  return movers;
}

/** The threat's turn (design 31): the line of the first choice `first` after a pass, as far as the search trusts it,
 *  cut to the turn of the side to move after the pass (`from`): what the opponent plays if the player does nothing. Its
 *  first edge where the search trusts none of the line. */
export function threatTurn(first: Candidate, from: Position): Edge[] {
  const turn = shared.trustedLine(first).slice(0, from.movesLeft);
  return turn.length ? turn : [first.edge];
}

/** The move as text: its edge, or "pass". */
export const moveName = (edge: Edge | null) => (edge ? edgeName(edge) : "pass");

/** The move in the record's notation: its edge with the cut mark when it cuts (`D10-G10x`), or "pass". */
export const moveNotation = (m: { edge: Edge | null; cut: Edge | null }) => `${moveName(m.edge)}${m.cut ? "x" : ""}`;

// --- Enclosure's game, as the packages take it ----------------------------------------------------------------------
/** Enclosure's types (GameTypes): a move is an edge, a position the board's, a move played has its cut, the engine's
 *  fields are describe_game's, the rules are the edge input's, and a line's step is its cut, regions and areas. */
export interface Enclosure extends GameTypes {
  move: Edge;
  position: Position;
  played: Move;
  fields: GamePosition;
  described: DescribeReply;
  rules: EdgeRules;
  step: LineStep;
}

/** A move's cut edge, from describe_game's `cuts`. */
const cutOf = (cuts: string | null) => (cuts === null ? null : parseEdge(cuts));

/** Enclosure's game. An edge's name puts its lower point first (edgeName), so two edges have one name exactly when
 *  sameEdge holds. Its engine's score is in its own points, 12 to one of Go's (KataGame's SCORE_SCALE). */
export const enclosure: Game<Enclosure> = {
  equal: sameEdge,
  moveName,
  parseMove: parseEdge,
  position: boardPosition,
  played: (name, before, after) =>
    ({ player: playerOf(before.mover), edge: name === "pass" ? null : parseEdge(name), cut: cutOf(after.cuts) }),
  rules: rulesOf,
  step: after => ({ cut: cutOf(after.cuts), regions: boardPosition(after).regions, areas: after.areas }),
  turn: turnFromCount,
  scoreScale: 12,
};

// --- The shared types and functions, for Enclosure --------------------------------------------------------------------
export type Candidate = shared.Candidate<Edge>;
export type Analysis = shared.Analysis<Edge>;
export type ReviewData = shared.ReviewData<Enclosure>;
export type EdgeReview = shared.EdgeReview<Enclosure>;
export type TurnReview = shared.TurnReview<Enclosure>;
export type Review = shared.Review<Enclosure>;
export type RankedCandidate = shared.RankedCandidate<Edge>;
/** A position of a branch, as the analysis keeps it (@abstractclass/analysis/analysis.svelte.ts). */
export type BranchNode = SharedNode<Enclosure>;

/** A shared function with Enclosure's game given: the site calls it as it called the review's model before. */
const withGame = <A extends unknown[], R>(f: (game: Game<Enclosure>, ...rest: A) => R) => (...rest: A): R => f(enclosure, ...rest);

export const review = withGame(shared.review<Enclosure>);
export const sameMove = withGame(shared.sameMove<Edge>);
export const twinsOf = withGame(shared.twinsOf<Edge>);
export const rankOf = withGame(shared.rankOf<Edge>);
export const otherCandidate = withGame(shared.otherCandidate<Edge>);
export const shownCandidates = withGame(shared.shownCandidates<Edge>);
export const judgeBranchEdge = withGame(shared.judgeBranchEdge<Edge>);
export const judgeTurn = withGame(shared.judgeTurn<Edge>);

// --- Enclosure's texts ----------------------------------------------------------------------------------------------
/** The note's word on what a Great does besides being the only good move (design 10): it keeps what the opponent's
 *  last turn gave. */
const KEPT_NOTE = "It keeps the gain from the opponent's last turn.";

/** A turn's note for the move list, in one line: its label, and the engine's best turn when the turn was not it. */
export function turnShortNote(t: TurnReview): string {
  if (t.label === "great") return `Great. The only good ${t.edges.length > 1 ? "edges" : "edge"}. ${KEPT_NOTE}`;
  const better = t.best && t.label !== "best" ? ` ${t.best.map(edgeName).join(" ")} was best.` : "";
  return `${t.label ? shared.LABEL_TEXT[t.label] : "Not analyzed yet"}.${better}`;
}

/** A note for the move list, in one line: the label, and the engine's choice when the edge was not it. */
export function shortNote(e: EdgeReview): string {
  if (e.label === "great") return `Great. The only good edge. ${KEPT_NOTE}`;
  // Not when the edge is Best: it may be the best edge's symmetric twin (sameMove), another edge with the same move.
  const better = e.best && e.edge && e.label !== "best" && !sameEdge(e.best.edge, e.edge) ? ` ${edgeName(e.best.edge)} was best.` : "";
  return `${e.label ? shared.LABEL_TEXT[e.label] : "Not analyzed yet"}.${better}`;
}

/** The game's outcome in words: by the scores when the rules ended the game, else as the record says it ended (a
 *  resignation, a forfeit, a result the record gives, or no end yet). */
export function endingText(data: ReviewData): string {
  const n = data.moves.length, overByRules = data.positions[n]?.over ?? true;
  const { blue, red } = data.result;
  if (overByRules)
    return blue === red ? "A draw" : `${PLAYER_NAME[blue > red ? 0 : 1]} won by ${Math.abs(blue - red).toFixed(1)} points`;
  const m = /^([br])\+(R|F|\d+(?:\.\d+)?)$/.exec(data.ending?.result ?? "");
  if (!m) return data.ending?.result === "0" ? "A draw" : `Unfinished after edge ${n}`;
  const winner: Player = m[1] === "b" ? 0 : 1, loser = PLAYER_NAME[winner === 0 ? 1 : 0];
  if (m[2] === "R") return `${PLAYER_NAME[winner]} won: ${loser} resigned after edge ${n}`;
  if (m[2] === "F") return `${PLAYER_NAME[winner]} won: ${loser} left the game after edge ${n}`;
  return `${PLAYER_NAME[winner]} won by ${Number(m[2]).toFixed(1)} points`;
}
