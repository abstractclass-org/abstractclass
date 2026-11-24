// The game interface (docs/design/29-shared-packages.md): what a site gives the analysis and the review about its game.
// The shared code computes with the engine's replies: the win chances and scores of positions and candidates, the moves
// by their names, and the players by their turns. What a move, a position or a move played is, the site says: its
// types (GameTypes) and the few functions of the game (Game). The board's drawing, the notation's texts and the import
// stay in the site.
//
// The engine gives every value from the first player's side (KataGo's convention: Enclosure's Blue), and so do the
// shared types. They keep Hedge School's field names (`blueWin`, `edge`, `players.blue`): the browser's store and the
// review files hold them. So in the shared code, "edge" means a move and "blue" the first player.
//
// A turn is a run of one player's moves, of one move or two. The review judges a turn of two as Enclosure's rules
// make it: the same two moves in either order are the same turn, and the engine's best turn is its first choice and
// the next move of that choice's line (model.ts, judgeTurn). A game of longer turns, or one where the order within a
// turn matters, needs those rules changed first.
import type { EngineView } from "@abstractclass/engine/protocol.ts";
import type { GameResult } from "./result.ts";

/** A player: 0 moves first (Enclosure's Blue), 1 second (Red). */
export type Player = 0 | 1;

/** What the analysis reads of a position. */
export interface PositionInfo {
  player: Player; // who moves next
  over: boolean; // the game has ended here (the engine's outcome)
  scores: [number, number]; // each player's score: the result, where the game ends and `result` is absent
  // The game's own result, where the game ends and the scores do not decide it: a road, or a draw by a rule (Tak). It
  // has no margin, and a komi does not change it. None: the result by the scores (result.ts, resultAt).
  result?: GameResult;
  count?: number; // the moves played so far, as the notation counts them
}

/** A position with a komi (Hedge School's design 24): the komi is a starting score of the side that it favours, Red's
 *  above 0 and Blue's below, as the engine counts it (its inputs and its result). Each score then counts it from the
 *  first position, so the result and the game's end do too. The position itself at komi 0. */
export function withKomi<P extends { scores: readonly [number, number] }>(p: P, komi: number): P {
  return komi ? ({ ...p, scores: [p.scores[0] + Math.max(-komi, 0), p.scores[1] + Math.max(komi, 0)] } as P) : p;
}

/** A move played: who played it, and the move, or null for a pass. */
export interface Played<M> { player: Player; edge: M | null }

/** A game's types, as its site keeps them. */
export interface GameTypes {
  move: unknown; // a move, not a pass (Enclosure: an edge, [x1, y1, x2, y2])
  position: PositionInfo; // a position, as the board draws it
  played: Played<this["move"]>; // a move played, with what the board draws of it (Enclosure: with the edge it cuts)
  fields: unknown; // a position, as the engine's describe_game gives it
  described: unknown; // describe's reply: a position with its legal moves
  rules: unknown; // a position's rules, for the player's own moves (Enclosure: the legal edges and the mover's nodes)
  step: unknown; // a move of a line, played: what the board draws after it (Enclosure: the cut, the regions, the areas)
  walls: unknown; // a position's weak walls, as the engine gives them (Enclosure: the protocol's WeakWalls)
}

/** How the shared code tells moves apart and names them. */
export interface Moves<M> {
  /** Whether two values are one move. */
  equal(a: M, b: M): boolean;
  /** The move's name in the engine's notation, its one spelling: "pass" for null. The tree's paths, the engine's
   *  queries and the stored results' keys hold the names. So a move's name has no space (a path joins the names with
   *  spaces: tree.ts), is not "pass", and does not start with "@" (a key's mark of a set-up start: cache.ts, keyMoves). */
  moveName(move: M | null): string;
  /** The move of a name that is not "pass". */
  parseMove(name: string): M;
  /** The area map of a reply's ownership (in hundredths, as the engine indexes it), where the game's points are not
   *  fixed: Blueprints' ownership is of the view of the position, which moves with the play, so its map ends with the
   *  view's place (the engine's `view`). None: the map is the ownership. */
  mapOf?(ownership: number[], view: EngineView | undefined): number[];
}

/** A board size of a game that has several (Tak's 5x5 and 6x6: Mistak's design 34, "What the sites share", item 1):
 *  its name as the site writes it ("6x6"), and its empty board, the standard start of that size, in the position
 *  notation (Tak's TPS). */
export interface BoardSize { name: string; start: string }

/** A move's number in the notation, and whether the move is the first with it ("12."), not a later one ("12..."). */
export interface MoveNumber { turn: number; first: boolean }

/** A game, as the analysis and the review compute with it. */
export interface Game<G extends GameTypes> extends Moves<G["move"]> {
  /** The board sizes of a game that has several. Each game, a reviewed one too, keeps its size's empty board as its
   *  start, so that the engine's queries and the stored results' keys name the size (cache.ts, keyMoves): `a1` on 5x5
   *  and on 6x6 are two positions. The review passes that start where it passes the komi: ReviewFromStore
   *  (storedReview.ts), ReadGames (earlierResults.ts) and FileRecord (reviewFile.ts). None: the game has one board,
   *  and its standard start is written as no start (null). */
  sizes?: readonly BoardSize[];
  /** A position from the engine's fields. */
  position(fields: G["fields"]): G["position"];
  /** The move `name` played, from the position `before` to the position `after`. */
  played(name: string, before: G["fields"], after: G["fields"]): G["played"];
  /** A position's rules for the player's own moves, from describe's reply. */
  rules(described: G["described"]): G["rules"];
  /** A move of a line played, from the position after it. */
  step(after: G["fields"]): G["step"];
  /** The turn of the next move from a position with `count` moves played, and whether that move opens its turn: the
   *  notation's numbers, where the game gives no `numbers`. Enclosure's first turn has one edge, then each turn two. A
   *  game of one move a turn numbers each move. */
  turn(count: number): MoveNumber;
  /** The notation's number of the next move from a position with `count` moves played, and whether that move is the
   *  first with it, in a game of one move a turn whose notation numbers two moves a number, the first player's first
   *  (Tak's "12. e4 e5", as chess's: Mistak's design 34, "What the sites share", item 3). Each move counts one. The move
   *  list has a row a number, with both players' moves, and the moves are named by it. The review judges each move, so
   *  it has no choice between by turn and by move. None: a number is a turn (`turn`), and a row too. */
  numbers?(count: number): MoveNumber;
  /** The engine's points for one of Go's points (KataGame's SCORE_SCALE: Enclosure's 12), for the bands that KaTrain
   *  sets in Go's points. */
  scoreScale: number;
  /** The position that `move` gives from `before`, as a key: two moves with one key give one position, though their
   *  names differ (Blueprints' two edits that give one hand: Cyanotype's design 33, item 9). The review takes them as
   *  one move: a candidate's twins (model.ts, withTwins), and one node of the tree. None: each name gives a position of
   *  its own (Enclosure's edges). */
  afterKey?(move: G["move"], before: G["position"]): string;
  /** The engine's position (a query's `position`) for a set-up start in the notation: the board's start, a record's
   *  `Position` tag. The board keeps the notation's text, and the stored results' keys name it (cache.ts, keyMoves).
   *  Blueprints' notation writes a position in the site's coordinates, and the engine takes its own one-line position
   *  (Cyanotype's design 33, "Decision", item 10). None: the notation's position is the engine's (Enclosure's). */
  enginePosition?(start: string): string;
}
