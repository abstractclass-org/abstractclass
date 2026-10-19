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

/** A player: 0 moves first (Enclosure's Blue), 1 second (Red). */
export type Player = 0 | 1;

/** What the analysis reads of a position. */
export interface PositionInfo {
  player: Player; // who moves next
  over?: boolean; // the game has ended here (the engine's outcome)
  scores: [number, number]; // each player's score: the result, where the game ends
  count?: number; // the moves played so far, as the notation counts them
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
}

/** A game, as the analysis and the review compute with it. */
export interface Game<G extends GameTypes> extends Moves<G["move"]> {
  /** A position from the engine's fields. */
  position(fields: G["fields"]): G["position"];
  /** The move `name` played, from the position `before` to the position `after`. */
  played(name: string, before: G["fields"], after: G["fields"]): G["played"];
  /** A position's rules for the player's own moves, from describe's reply. */
  rules(described: G["described"]): G["rules"];
  /** A move of a line played, from the position after it. */
  step(after: G["fields"]): G["step"];
  /** The turn of the next move from a position with `count` moves played, and whether that move opens its turn: the
   *  notation's numbers. Enclosure's first turn has one edge, then each turn two. A game of one move a turn numbers
   *  each move. */
  turn(count: number): { turn: number; first: boolean };
  /** The engine's points for one of Go's points (KataGame's SCORE_SCALE: Enclosure's 12), for the bands that KaTrain
   *  sets in Go's points. */
  scoreScale: number;
}
