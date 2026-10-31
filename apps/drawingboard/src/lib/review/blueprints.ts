// Blueprints as the shared packages read it (docs/design/29-shared-packages.md, docs/design/33-drawing-board.md), and
// its own part of the review. The packages' model and analysis compute with a game (@abstractclass/analysis/game.ts):
// `blueprints` is Blueprints', from its notation (game/notation.ts) and the engine's describe and describe_game
// (board/described.ts). The site has no rules: a position, its legal moves and what each move did come from the
// engine. This module gives Blueprints' types, its game, who plays each move of a line, the players' stars, the area
// map of the engine's ownership, and the texts that name a move. Its view (blueprintsView.ts) gives the rest of the
// view's game interface: the board, the lists' looks, the settings and the engine's networks.
import * as shared from "@abstractclass/analysis/model.ts";
import type { Game, Player } from "@abstractclass/analysis/game.ts";
import type { EngineView } from "@abstractclass/engine/protocol.ts";
import { turnFromCount } from "@abstractclass/analysis/turns.ts";
import { PLAYER_NAME, WHOLE, type ViewTypes } from "@abstractclass/review/game.ts";
import { captureText, moveName, moves, type Capture, type Move } from "../game/notation.ts";
import { boardMove, playerOf, sitePosition, stepOf, type DescribeReply, type EngineStep, type GamePosition } from "../board/described.ts";
import type { BlueprintInput } from "../board/blueprintInput.svelte.ts";
import type { InputRules } from "../board/input.ts";
import { starsOf, type BoardMove, type Hand, type Kind, type SitePosition } from "../board/position.ts";
import type { Display } from "./display.ts";
import { mapWithView } from "./blueprintsMap.ts";

/** A position, as the board draws it (SitePosition) and the analysis reads it: who moves next with the moves left in
 *  that player's turn, the scores, whether the game has ended, the moves played, and each player's stars on the
 *  board. */
export interface Position extends SitePosition {
  player: Player;
  movesLeft: number;
  scores: [number, number];
  over?: boolean;
  count: number;
  stars: [number, number];
}

/** What a move of the game's tree or of a line did, as describe_game gives it from the position after it: the hexes
 *  that a placement filled, the opponent's cells that it captured (as they were before it), its points, the hands
 *  after it, and the stars on the board after it. */
export interface Step {
  footprint: string[];
  captured: Record<string, [Player, Kind]>;
  points: number;
  blueprints: [Hand, Hand];
  stars: [number, number];
}

/** A move played: its player and its move (null for a pass), what it did, and what the board draws of it, in the
 *  frames of the hands after it. */
export interface Played { player: Player; edge: Move | null; did: Step; drawn: BoardMove }

/** Blueprints' types (GameTypes): a move is a placement or an edit (notation.ts), a position the board's with the
 *  analysis's fields, the engine's fields are describe_game's and describe's, the rules are the board's input's, and a
 *  line's step is what the move did. And the view's (ViewTypes, blueprintsView.ts): the display settings (display.ts),
 *  the board's input, a hex of the board for the area map, and no notes and no book. */
export interface Blueprints extends ViewTypes {
  move: Move;
  position: Position;
  played: Played;
  fields: GamePosition;
  described: DescribeReply;
  rules: InputRules;
  step: Step;
  display: Display;
  note: never;
  input: BlueprintInput;
  point: readonly [number, number];
  book: never;
}

/** A position from the engine's fields. */
export const positionOf = (f: GamePosition | DescribeReply): Position => ({
  ...sitePosition(f), player: playerOf(f.mover), movesLeft: f.movesLeft, scores: f.scores, count: f.moveCount,
  stars: starsOf(f.cells), ...(f.outcome ? { over: true } : {}),
});

/** What a move did, from the position after it. */
const stepOfAfter = (after: GamePosition): Step => ({
  footprint: after.footprint ?? [], captured: after.captured ?? {}, points: after.points ?? 0, blueprints: after.blueprints,
  stars: starsOf(after.cells),
});

/** The engine's step of a move, for the board's drawing (described.ts). */
export const engineStep = (name: string, player: Player, s: Step): EngineStep => ({ move: name, player, ...s });

/** A move's capture mark from what it did: `x` when it captured opponent cells, `x+N` when it scored N points. */
export const captureOf = (s: Pick<Step, "captured" | "points">): Capture | null =>
  Object.keys(s.captured).length || s.points ? { points: s.points } : null;

/** A move as the record and the move list write it: its name and its capture mark (`2@-3,1x+24`), or "pass". */
export const playedText = (m: Pick<Played, "edge" | "did">) => moveName(m.edge) + (m.edge ? captureText(captureOf(m.did)) : "");

/** Who plays each of the next `n` moves from a position: the mover for the moves left in this turn, then each player
 *  for a turn of two moves. */
export function lineMovers(p: Position, n: number): Player[] {
  const movers: Player[] = [];
  let player = p.player, left = p.movesLeft;
  for (let i = 0; i < n; i++) {
    movers.push(player);
    if (--left === 0) { player = (1 - player) as Player; left = 2; }
  }
  return movers;
}

/** Blueprints' game. A move's name is its one spelling (notation.ts), so two moves have one name exactly when
 *  sameMove holds. Two edits that give one hand are two moves here (design 33, item 9). The engine's score is in its
 *  own unit, 12 to one of Go's points (the engine repository's port, SCORE_SCALE). The area map of an ownership holds
 *  the view's place (blueprintsMap.ts). */
export const blueprints: Game<Blueprints> = {
  ...moves,
  mapOf: (ownership, view) => mapWithView(ownership, view as EngineView | undefined),
  position: positionOf,
  played: (name, before, after) => {
    const did = stepOfAfter(after), player = playerOf(before.mover);
    return { player, edge: name === "pass" ? null : moves.parseMove(name), did,
             drawn: boardMove(stepOf(name, before, after), before.blueprints, "after") };
  },
  rules: d => ({ position: sitePosition(d), mover: playerOf(d.mover), legal: d.legal }),
  step: stepOfAfter,
  turn: turnFromCount,
  scoreScale: 12,
};

// --- The shared types, for Blueprints -------------------------------------------------------------------------------
export type ReviewData = shared.ReviewData<Blueprints>;
export type MoveReview = shared.MoveReview<Blueprints>;
export type TurnReview = shared.TurnReview<Blueprints>;

// --- Blueprints' texts ----------------------------------------------------------------------------------------------
/** The note's word on what a Great does besides being the only good move (design 10): it keeps what the opponent's
 *  last turn gave. */
const KEPT_NOTE = "It keeps the gain from the opponent's last turn.";

/** A turn's note for the move list, in one line: its label, and the engine's best turn when the turn was not it. */
export function turnShortNote(t: TurnReview): string {
  if (t.label === "great") return `Great. The only good ${t.edges.length > 1 ? "moves" : "move"}. ${KEPT_NOTE}`;
  const better = t.best && t.label !== "best" ? ` ${t.best.map(moveName).join(" ")} was best.` : "";
  return `${t.label ? shared.LABEL_TEXT[t.label] : "Not analyzed yet"}.${better}`;
}

/** A note for the move list, in one line: the label, and the engine's choice when the move was not it. */
export function shortNote(e: MoveReview): string {
  if (e.label === "great") return `Great. The only good move. ${KEPT_NOTE}`;
  const better = e.best && e.edge && e.label !== "best" && !moves.equal(e.best.edge, e.edge) ? ` ${moveName(e.best.edge)} was best.` : "";
  return `${e.label ? shared.LABEL_TEXT[e.label] : "Not analyzed yet"}.${better}`;
}

/** The game's outcome in words: by the scores when the rules ended the game, else as the record says it ended (a
 *  resignation, a forfeit, a result that the record gives, or no end yet). Blueprints' points are whole. */
export function endingText(data: ReviewData): string {
  const n = data.moves.length, overByRules = data.positions[n]?.over ?? false;
  const { blue, red } = data.result;
  if (overByRules)
    return blue === red ? "A draw" : `${PLAYER_NAME[blue > red ? 0 : 1]} won by ${WHOLE.format(Math.abs(blue - red))}`;
  const m = /^([br])\+(R|F|\d+(?:\.\d+)?)$/.exec(data.ending?.result ?? "");
  if (!m) return data.ending?.result === "0" ? "A draw" : `Unfinished after move ${n}`;
  const winner: Player = m[1] === "b" ? 0 : 1, loser = PLAYER_NAME[winner === 0 ? 1 : 0];
  if (m[2] === "R") return `${PLAYER_NAME[winner]} won: ${loser} resigned after move ${n}`;
  if (m[2] === "F") return `${PLAYER_NAME[winner]} won: ${loser} left the game after move ${n}`;
  return `${PLAYER_NAME[winner]} won by ${WHOLE.format(Number(m[2]))}`;
}

/** A candidate or a line's move that the rules have not played yet, as the board draws it: a placement's footprint on
 *  its anchor hex, with no captures known, or an edit in the frames of `hands`, the hands before it. */
export function moveBefore(move: Move, player: Player, hands: readonly [Hand, Hand]): BoardMove {
  return boardMove({ move: moveName(move), player, footprint: [], captured: {}, points: 0, blueprints: [...hands] as [Hand, Hand] },
                   hands, "before");
}
