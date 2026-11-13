// The view's game interface (docs/design/29-shared-packages.md, item 9): what a site gives the review's and the
// Analysis board's view (ReviewView.svelte) about its game. It extends the analysis's game interface
// (@abstractclass/analysis/game.ts), which compares and names the moves and numbers the turns. The view computes with
// the engine's results, the game's tree and the moves by their names, and draws the lists, the tables, the charts and
// the settings. The site draws the board, takes the player's own moves, writes its moves and its texts, and gives its
// display settings, its sounds, its engine's networks and its own tools (the area map, the image of a line, the
// opening book). The page gives its own menus (the Export menu, the New menu) in the step bar (`tools`).
//
// Each part is shaped for both boards: Enclosure's (Hedge School's review/enclosureView.ts) and Blueprints'
// (Cyanotype's board/Board.svelte). Blueprints' moves are placements and edits, named by strategyjam.org's strings, and
// two edits can give the same hand (docs/design/33-cyanotype.md, items 5 and 9). The view compares the engine's moves
// (the candidates, their twins, a line's steps) with the game's `equal`. The game's tree, the engine's queries and the
// stored results know a move by its name: there, two names are two moves.
import type { Component, Snippet } from "svelte";
import type { Game, GameTypes, Player } from "@abstractclass/analysis/game.ts";
import type { Label } from "@abstractclass/analysis/labels.ts";
import { resultOfRecord, resultOfScores, type ScoreResult } from "@abstractclass/analysis/result.ts";
import type { MoveReview, ReviewData, TurnReview, Unit } from "@abstractclass/analysis/model.ts";
import type { AreaMark, MapStyle } from "./ownership.ts";

/** The players, in every game (the glossary): Blue moves first, Red second. */
export const PLAYER_NAME = ["Blue", "Red"] as const;
/** A whole number, with thousands separated. Made once: a formatter is costly to make. */
export const WHOLE = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
/** A score as the players' cards, the Report and an image's caption show it: whole, with thousands separated. */
export const fmtScore = (s: number) => WHOLE.format(Math.round(s));
// The one rule for a draw (the analysis's result.ts), passed on with the view's words below for their importers.
export { resultOfRecord, resultOfScores } from "@abstractclass/analysis/result.ts";
/** A win's margin that one decimal writes as 0.0, with as many decimals as it needs, up to the record's six: "0.03".
 *  Undefined for a margin that one decimal writes as a number. Each format of a margin starts with it, so that a win
 *  never reads "won by 0.0". */
export function smallMargin(m: number): string | undefined {
  if (Number(m.toFixed(1)) !== 0) return undefined;
  let digits = 2;
  while (digits < 6 && Number(m.toFixed(digits)) === 0) digits++;
  return m.toFixed(digits);
}
/** A result in words: "A draw", or the winner and the margin with no unit (the glossary's "Score"): "Blue won by 28.5".
 *  `fmtMargin` writes the margin in the game's format (ViewGame `fmtMargin`). */
export const resultText = (r: ScoreResult, fmtMargin: (m: number) => string): string =>
  r.winner === null ? "A draw" : `${PLAYER_NAME[r.winner]} won by ${fmtMargin(r.margin)}`;
/** A game's outcome in words, for each game's `ending`: by the scores when the rules ended the game (`overByRules`),
 *  else as the record says it ended (a result by the scores, a resignation, a forfeit, or no end yet). `move`: the
 *  game's word for a move ("edge"). */
export function endingWords(data: Pick<ReviewData<GameTypes>, "moves" | "result" | "ending">, overByRules: boolean,
                            move: string, fmtMargin: (m: number) => string): string {
  if (overByRules) return resultText(resultOfScores([data.result.blue, data.result.red]), fmtMargin);
  const result = data.ending?.result ?? "", byScores = resultOfRecord(result), n = data.moves.length;
  if (byScores) return resultText(byScores, fmtMargin);
  const m = /^([br])\+([RF])$/.exec(result);
  if (!m) return `Unfinished after ${move} ${n}`;
  const winner: Player = m[1] === "b" ? 0 : 1, loser = PLAYER_NAME[winner === 0 ? 1 : 0];
  return `${PLAYER_NAME[winner]} won: ${loser} ${m[2] === "R" ? "resigned" : "left the game"} after ${move} ${n}`;
}
/** The class of a number in a shape or a badge: trimmed to the digits' height (cap height to baseline), so that flex
 *  centring centres the digits in any font. */
export const DIGITS = "block [text-box:trim-both_cap_alphabetic]";

/** The board's layers that the view's own settings turn on and off: the candidates, and the quality labels on the
 *  turn just played. A game's board has others (Enclosure's regions): the game's `layers` lists them. */
export type BoardLayers = { candidates: boolean; marks: boolean };

/** The display settings that the view reads and changes. The site keeps them, under its own key (Hedge School's
 *  review/display.ts), with the board's layers and the sounds of its game. */
export interface Display {
  judge: Unit; // what the quality labels judge: each turn as a whole, or each move ("edge", the stored name, design 10)
  // Whose moves the review explains: both players, or one: its labels, numbers, notes and the engine's lines show, the
  // other's do not
  reviewFor: "both" | "blue" | "red";
  win: "bar" | "gauge"; // the win chance: a bar above the board (Blue left, Red right), or a vertical gauge beside it
  layers: BoardLayers;
  areaMap: { review: boolean; board: boolean }; // the area map (design 30), on each page: the key t shows or hides it
  // The map's style: the engine's ownership of each point ("Forecast", as KaTrain's territory), the forecast against
  // the board now ("Forecast vs board"), or the forecast after the last move or the line drawn against the forecast
  // before it ("After vs before", KaTrain's loss grid with the rises)
  mapStyle: MapStyle;
  mapMin: Record<MapStyle, number>; // each style's smallest value marked, in hundredths: 0 marks every point with one
  // The weak walls (a prototype, Hedge School's design 30, "The weak walls"), on each page: each point of a player's
  // edges marked by the chance that an edge there is cut before the game ends. They show only in a game that has them
  // (the view game's `walls`): a game with none keeps both off
  weakWalls: { review: boolean; board: boolean };
  scoreLine: boolean; // the Advantage chart's score line (Blue − Red)
  areaLine: boolean; // the Advantage chart's line of the players' second number (the game's `second`), Blue − Red
  lineSteps: boolean; // "Lines on the board": the engine's line and a variation's preview drawn one move at a time
  // A move in the variations and the listed line: the game's shape (`Shape`), a dot (Go's way), or its notation. In the
  // line, the shapes and the dots carry the board's numbers.
  branchForm: "pills" | "dots" | "text";
  // A label in the move list and the variations: a badge, or its mark alone in the label's colour, as Lichess's move
  // list shows it
  marks: "badges" | "text";
  // A book move's quality label in the move list (design 32, item 4): the label on the book's brown (its badge's disc,
  // or its quality mark alone, in --book), or an open book in the label's colour, in the place of its quality mark
  bookMoves: "label" | "book";
  notes: boolean; // the move list's one-line notes on Great moves, mistakes and blunders
  // How the lists write a move, where the game has glyphs (the view's `glyphs`): its glyphs, or its notation as text.
  // The move list, its notes, the status line, and the variations and lines in notation follow it. None: the notation
  notation?: "glyphs" | "text";
  previewMoves: boolean; // the position after a played move on the board, while the pointer is on the move (design 07)
  previewBranches: boolean; // a variation's line on the board, while the pointer is on one of its moves (design 07)
  sound: boolean; // move sounds (design 08)
  moveSound: string; // which set of sounds: the game's
  volume: number; // the move sounds' volume, 0 to 1
}

/** A game's types for the view: the analysis's (GameTypes), and the board's own. */
export interface ViewTypes extends GameTypes {
  display: Display; // the display settings, as the site keeps them
  note: unknown; // a note that the player draws on a position (Enclosure: a ring round a point, or a line)
  input: MoveInput<this["rules"]>; // the player's own moves on the board (Enclosure: the edge input)
  point: unknown; // a place on the board that the area map marks (Enclosure: a point, [x, y])
  book: ViewBook<this["move"]>; // the opening book where the view shows it (Hedge School's book/place.svelte.ts)
}

/** The player's own moves on the board: the position's rules that the site takes them by, and the move begun. */
export interface MoveInput<R> {
  rules: R | null;
  readonly pending: unknown; // a move begun (Enclosure: an edge's first point): Escape cancels it
  reset(): void;
}

/** A candidate on the board: its move, its rank (1: the engine's first choice), and the note shown on hover. */
export interface BoardCandidate<M> { move: M; rank: number; note: string }
/** A quality label on a move played, with its note. Labels of one `group` are one label: a turn's, on each of its
 *  moves (design 10). */
export interface BoardMark<M> { move: M; label: Label; note?: string; group?: number }
/** A move of a line on the board: its mover, and, once the rules have played it, what the board draws after it. */
export interface LineMove<G extends GameTypes> { move: G["move"]; player: Player; step?: G["step"] }

/** What the view gives the site's board. */
export interface BoardProps<G extends ViewTypes> {
  position: G["position"];
  last: G["played"] | null; // the move that led to the position: the board draws what it did (Enclosure: its cut)
  // The moves of the same turn before `last`, the first first: the board marks them with it, so that the moves of the
  // turn so far show together, by turn and by move alike (Enclosure's board marks them from its position: `placed`)
  earlier: G["played"][];
  candidates: BoardCandidate<G["move"]>[];
  // The candidate pointed at from outside the board (a row of the table), or else the pinned one: the board lights
  // it, as it lights the candidate under its own pointer
  pointed: G["move"] | null;
  line: LineMove<G>[] | null; // a line from the position, as far as drawn, numbered from 1
  lineShape: "circle" | "triangle"; // the line's numbers: in circles, or in warning triangles (the threat)
  preview: G["move"] | null; // a move shown faintly: the candidate pointed at, or the move that → plays at a fork
  previewPlayer: Player;
  marks: BoardMark<G["move"]>[];
  layers: G["display"]["layers"];
  input: G["input"]; // the player's own moves
  inputOn: boolean; // the board takes them: the rules have come, and no preview shows
  areaMap: (AreaMark | null)[] | null; // the area map, by point (the game's `map.index`)
  // The map that the area map's marks come from: a game whose maps carry their place reads it there (Blueprints' view)
  areaOf: number[] | null;
  walls: G["walls"] | null; // the weak walls of the position shown (Display's weakWalls)
  notes: G["note"][];
  onnotes?: (notes: G["note"][]) => void; // a note drawn, changed or removed, or all cleared: none while a preview shows
  oncandidate: (move: G["move"] | null) => void; // the candidate under the board's pointer
  oncandidateclick: (move: G["move"]) => void;
  oncandidatedblclick?: (move: G["move"]) => void;
  onpointat: (point: G["point"] | null) => void; // the point under a mouse's pointer, for the area map's numbers
  mapControls?: Snippet; // the area map's switch and legend, which the board places in its margin
}

/** A move's shape in the variations and the engine's line, in its mover's colour: hollow where the move is in the
 *  tree already, and with the board's number in the line (`n`), which a game may leave out (Blueprints': its number
 *  would read as the blueprint's). Null: a pass. `before`: what the board showed before
 *  the move, where the view knows it: the position (a variation's move, the line's first), or the step of the line's
 *  move before it, once the rules have played it. */
export interface ShapeProps<M, B = unknown> { move: M | null; player: Player; hollow: boolean; n: number | null; class: string; before?: B }

/** A part of a note in the move list: its text, or a move that it names, which the lists write as they write a move
 *  (by the display setting `notation`). */
export type NotePart<G extends ViewTypes> = string | G["played"];

/** What stands between a turn's two moves side by side in glyphs: in a note, and in the variations and the engine's
 *  lines (ReviewView's turnDots). A move in glyphs has spaces of its own (Blueprints': its box, then its hex), so a
 *  space does not show where the first move ends. A comma would meet the hexes' commas. */
export const GLYPH_SEPARATOR = " · ";
/** A note's parts as the lists write them in glyphs: a space between two moves becomes GLYPH_SEPARATOR, in the note's
 *  own text colour. The note itself keeps the record's space: its text (its title), the text form and the exports. */
export const inGlyphs = <G extends ViewTypes>(note: readonly NotePart<G>[]): NotePart<G>[] =>
  note.map((p, k) => (typeof p === "string" && !p.trim() && typeof note[k - 1] === "object" && typeof note[k + 1] === "object"
    ? GLYPH_SEPARATOR : p));

/** A number of each player's beside the score, in the cards, on the Advantage chart and in an image's caption
 *  (Enclosure: the area each player encloses now, which each turn's end adds to the score). */
export interface SecondNumber<G extends GameTypes> {
  /** Each player's number in a position, or after a line's move once the rules have played it (`step`). */
  of(position: G["position"], step?: G["step"]): readonly [number, number] | undefined;
  word: string; // after the number in a card: "area"
  title: string; // the card's number's title
  after: string; // its title while a line shows, before "the threat" or "the engine's line": "The area after"
  name: string; // in the chart's note: "Area"
  /** The Advantage chart's line of Blue's number less Red's: its name in the legend, its setting and the setting's
   *  help, its colour in the legend and its box's colour (classes). */
  chart: { legend: string; setting: string; help: string; swatch: string; tint: string };
}

/** The game's own layer of the board in the display settings (`key`: its name in the display's layers): before the
 *  area map's settings, or after them. */
export interface LayerSetting<K extends string = string> { key: K; label: string; help: string; afterMap?: boolean }

/** The sounds' settings (@abstractclass/site/SoundSettings.svelte), in the display settings. `move`: the game's word
 *  for a move (`words.move`). */
export interface SoundSettingsProps<D extends Display> {
  sound: boolean;
  moveSound: D["moveSound"];
  volume: number;
  move: string;
  set: (v: Partial<Pick<D, "sound" | "moveSound" | "volume">>) => void;
}

/** The area map's part that is the board's (design 30): how its points are named and indexed, and the board's state
 *  that the "Forecast vs board" style compares with. A map is a position's ownership as the game keeps it (the analysis
 *  game's `mapOf`): where the game's points are not fixed, as Blueprints' view moves with the play, a map holds its own
 *  place, and two maps are compared at their common points (`align`). */
export interface MapParts<G extends ViewTypes> {
  index(point: G["point"], map: number[]): number; // the point's place in a map: −1 where the map does not hold it
  name(point: G["point"]): string; // the point's name in the notation
  /** The state of each of a map's points on the board as drawn after a line's moves, from Blue's side: 1 Blue's, −1
   *  Red's, 0 neither. */
  now(from: G["position"], drawn: LineMove<G>[], map: number[]): number[];
  /** The map's values at the points of the map `to`, in `to`'s form, NaN where it holds no value: the forecast before
   *  a move, against the forecast after it. None: every map holds the same points. */
  align?(map: number[], to: number[]): number[];
  /** A point's numbers in the forecast styles: its ownership (from Blue's side, in hundredths) and its state now. */
  reading(ownership: number, now: number): string;
  point: string; // the word for a point: "point"
  close: string; // the change style's mark for open area that a side will probably take: "will be closed"
  lose: string; // its mark for area that its owner will probably lose: "will be lost"
  help: string; // the area map's setting
  styleHelp: string; // the setting of its style
}

/** The weak walls' part that is the board's (Display's weakWalls): the point's chance under the pointer, and the
 *  texts. */
export interface WallParts<G extends ViewTypes> {
  name: string; // the layer's name, on its switch, its setting and its notes: "Weak walls"
  reading(point: G["point"], walls: G["walls"]): string | null; // the point's chance, or null where no edge passes
  help: string; // the setting
  legend(walls: G["walls"]): string; // the legend's words while the weak walls show: what the marks mean, or that none shows
}

/** A board drawn for an image of a line: the position where the line starts, the move that led there (drawn while
 *  no move of the line is), the line's moves drawn, the player's notes, and the board's layers. */
export interface ImageBoard<G extends ViewTypes> {
  position: G["position"];
  last: G["played"] | null;
  line: LineMove<G>[];
  notes: G["note"][];
  layers: G["display"]["layers"];
}

/** The image of a line (design 07, item 17): the move menu's "Generate image". */
export interface ImageParts<G extends ViewTypes> {
  draw(board: ImageBoard<G>, caption: string[], width: number): Promise<Blob>;
  animate(frames: { board: ImageBoard<G>; ms: number }[], caption: string[], width: number): Promise<Blob>;
  /** The caption: the turn and who plays where the line starts, then the numbers there and after its last move. */
  caption(start: { position: G["position"]; turn: number; first: boolean }, end: G["position"] | null, moves: number): string[];
  name(start: string[], moves: number, animated: boolean): string; // the saved file's name
  copy(file: Promise<Blob>): Promise<boolean>; // copies a PNG: false where the browser cannot
  download(name: string, file: Blob): void;
}

/** The opening book where the view shows it (Hedge School's book/place.svelte.ts, BookPlace). */
export interface ViewBook<M> {
  readonly ready: boolean; // its index has loaded: the table and its switch show
  readonly showsBook: boolean; // the table shows the book, in the candidates' place
  // The position's rows, the best first: each a book move, or by turn a whole turn (its two moves)
  readonly rows: readonly { edges: string[] }[];
  readonly line: M[] | null; // the line of the row pointed at, as the board draws it
  readonly numbers: BoardCandidate<M>[]; // the board's numbers for the rows: each row's first move
  pointed: string | null; // the name of the row pointed at, in the table or by its number on the board
  readonly numbered: string | null; // the name of the move whose number is lit: the first move of the row pointed at
  point(move: string | null): void; // points at the row of a number on the board, by the move's name
  movesAt(move: string): string[]; // the moves that a click on a number plays: its row's
  toggle(): void; // the key o: the book or the candidates
  showForNow(): void; // the book, for this page only
}
/** A game's book move, for the move list's mark (design 32, item 4): the edge's index, and the words of the position
 *  symbol after it. */
export interface BookMoveMark { index: number; after: string }
/** The game's opening in the book (design 32, item 4): the position that the Report's row goes to, the game's book
 *  moves that the move list marks, and the traps that it played. */
export interface BookOpening { at: number; bookMoves: BookMoveMark[]; traps: unknown[] }
/** The review's judgment of a move: its quality label and its loss in win chance. */
export interface BookJudgment { label: Label; loss: number }
export interface BookParts<G extends ViewTypes> {
  /** The book's place on a page, from the notation of each position on the path, and "Review by" (`unit`), which its
   *  rows follow. `more`: the path's moves by their names, the page's count of a feature's first use (design 17), and
   *  the game's komi (Hedge School's design 24). Null where the site has no book. */
  place(page: "review" | "board", notations: () => (string | undefined)[], unit: () => Unit,
        more?: { path: () => string[]; used: (name: string) => void; komi: () => number }): G["book"] | null;
  notation(position: G["position"]): string | undefined; // the position's notation, by which the book finds it
  /** The game's opening, once every part of the book that the game's positions need has loaded. The view asks only
   *  where the analysis takes the book (GameAnalysis.takesBook): not on the board, nor at a komi other than 0 (Hedge
   *  School's design 24). */
  opening(notations: (string | undefined)[], moves: string[]): BookOpening | null;
  /** The Report's row, with the position that it goes to. By turn it names the turn that left the book. `label`: the
   *  review's label of the move or turn that left the book. `judged`: the review's judgment of the move that starts at
   *  an edge's index, or by turn of the turn that starts there; null where the review has none. */
  openingRow(opening: BookOpening, moves: string[], label: Label | null, unit: Unit,
             judged: (index: number) => BookJudgment | null): { text: string; at: number } | null;
  trapRows(opening: BookOpening): { at: number; text: string }[]; // the Report's rows on the traps
  /** The book's table, with the engine's table (`candidates`) under its switch, and alone outside the book. */
  Table: Component<{ place: G["book"]; onplay: (moves: string[], refutation: boolean) => void; candidates: Snippet }>;
}

/** The site's engine: its networks (design 09). */
export interface NetworkParts {
  offered: readonly { id: string }[]; // the networks that the settings offer, the default first
  name(id: string): string; // "HedgeFund 0.2 Lite"
  mb(id: string): string; // its download, in MB
  help(board: boolean): string; // the Network setting's help, on the Analysis board or on the review
}

/** What a site gives the view about its game. */
export interface ViewGame<G extends ViewTypes> extends Game<G> {
  // --- The board
  /** The board: the site's component, with the view's props. */
  Board: Component<BoardProps<G>>;
  /** The board while the page loads, in the board's place: its empty grid (Enclosure's points). */
  EmptyBoard: Component;
  /** The board's box. None: a square, the window's height less the row above it and the charts, or the width that the
   *  side columns leave at their least (design 06: Enclosure's board). "fill": the window's height less the row and the
   *  charts, and as wide as high within the widths that the side columns leave at their widest and at their least, and
   *  in one column the height `oneColumn` (a CSS length): a board with no edge, which fits its cells into the box that
   *  it gets (Blueprints', design 33). */
  box?: { form: "fill"; oneColumn: string };
  /** The board's own layers in the display settings: the display's layers beside the view's own. */
  layers: LayerSetting<Exclude<keyof G["display"]["layers"] & string, keyof BoardLayers>>[];
  /** The notes' colours, and the keys held for each, for the list of keys and clicks: groups of keys held together,
   *  each met by any one of its keys. None: the board takes no notes. */
  noteKeys?: readonly (readonly [string, readonly (readonly string[])[]])[];

  // --- The player's own moves
  /** The player's own moves on the board, which call `play` with a move. */
  input(play: (move: G["move"]) => void): G["input"];
  /** What the move begun needs next, or why a click did nothing, for the status line: null when nothing is begun. */
  inputStatus(input: G["input"], mover: Player): string | null;
  /** The clicks on the board, for the list of keys and clicks: the player's own moves, and the notes. */
  clicks: [string, string][];

  // --- A move in the lists
  /** A move played, as the move list writes it: its name with its marks (Enclosure's cut mark, D10-G10x). */
  notation(played: G["played"]): string;
  /** The moves in glyphs, where their notation alone is not the game's look (Blueprints' blueprint number in a box,
   *  design 33, item 8): the second form of the display setting `notation`, whose help `help` gives. None: the lists
   *  write the notation, and the settings offer no choice.
   *  - `Label`: a move played, as wide as `moveText`. Its root sets itself on the middle of the line (`vertical-align:
   *    middle`): a glyph that begins with a picture stands on its lower edge, and on the line's baseline it would
   *    make the line taller. The lists put it in a line with no rule of their own for it.
   *  - `asPlayed`: a move not played as a move played, for its glyphs: a candidate, a line's move, a note's move. From
   *    the position before it, or the line's step before it, where the view knows it, and from its own step once the
   *    rules have played it (a line's). */
  glyphs?: {
    Label: Component<{ played: G["played"] }>;
    asPlayed(move: G["move"], player: Player, before?: G["position"] | G["step"], step?: G["step"]): G["played"];
    help: string;
  };
  /** A move of a line, as the line's list writes it: its name, and its mark once the rules have played it. */
  lineNotation(move: G["move"], step: G["step"] | undefined): string;
  /** A move's shape in the variations and the line (Enclosure's pill along the edge). */
  Shape: Component<ShapeProps<G["move"], G["position"] | G["step"]>>;
  /** Its choice in the display settings: the choice's name and its help. `turnDot`: in that choice, a middle dot
   *  (GLYPH_SEPARATOR's) between a turn's two shapes in the variations and the engine's lines, where two shapes side by
   *  side can read as one move (Blueprints': an edit's arrow ends at the placement's hex beside it). None: the shapes
   *  stand as they are (Enclosure's pills). */
  shape: { name: string; help: string; turnDot?: boolean };
  moveText: string; // the class of a move's text in the move list: as wide as the widest move
  // Each move on a line of its own in the move list, the turn's number at its first: moves too long for two to a row
  // (Blueprints', as on Cyanotype's Practice). None: two to a row, as Lichess's
  oneMoveALine?: boolean;
  nameText: string; // the class of a candidate's name in the table: as wide as the widest move's name
  /** Each candidate's name in the table as large as its cell allows, measured: its full size, or smaller where it is
   *  wider than the cell, down to this share of its size, where it is cut. For names whose widths differ much
   *  (Blueprints' edits and placements, and their glyphs). None: `nameText` gives the size. */
  fitName?: number;
  /** The words before a candidate's twins in the title of the table's mark ⇅: what the twins are to it (model.ts,
   *  Candidate `twinOf`). None: "Mirror", Enclosure's symmetric twins. */
  twinWords?: string;

  // --- Who plays each move
  /** The moves left in the turn from a position, for its mover. */
  movesLeft(position: G["position"]): number;
  /** Who plays each of the next `n` moves from a position, by the turns. */
  lineMovers(position: G["position"], n: number): Player[];
  /** What the board draws after a move of the game's tree, from the move played and the position after it, for a
   *  variation's preview and an image (Enclosure: the edge that it cut, and the regions after it). */
  treeStep(played: G["played"], after: G["position"]): G["step"];

  // --- The players
  /** The number of each player's beside the score. None: the cards show the score alone. */
  second?: SecondNumber<G>;

  // --- The texts
  words: { move: string; moves: string; Move: string }; // the game's word for a move: "edge", "edges", "Edge"
  /** The game's outcome in words. */
  ending(data: ReviewData<G>): string;
  /** A margin in the game's format, with no unit, for the result's words (resultText): Enclosure's with one decimal,
   *  "27.5", and Blueprints' whole points, "24", or "24.5" from a half komi. Each takes smallMargin first ("0.03"). */
  fmtMargin(m: number): string;
  /** A move's note in the move list, in one line: its label, and the engine's choice when the move was not it. Its text,
   *  or its parts, where the note names moves that the lists write in glyphs (`NotePart`). `before`: the position
   *  before the move. */
  shortNote(e: MoveReview<G>, before: G["position"]): string | NotePart<G>[];
  /** A turn's note, by turn. `before`: the position at the turn's start. */
  turnShortNote(t: TurnReview<G>, before: G["position"]): string | NotePart<G>[];

  // --- The display settings and the sounds
  display: { load(): G["display"]; save(d: G["display"]): void };
  /** The move sounds and their settings. None: the site has no sounds, and the settings do not offer them. */
  sounds?: {
    Settings: Component<SoundSettingsProps<G["display"]>>;
    /** A move's sound, at a volume from 0 to 1: the set's sound for the move played (a move's, or a removal's). */
    play(volume: number, set: G["display"]["moveSound"], played: G["played"] | undefined): void;
    preload(set: G["display"]["moveSound"]): void; // fetches a set's sounds ahead
  };

  // --- The site's engine and tools
  networks: NetworkParts;
  map?: MapParts<G>;
  walls?: WallParts<G>;
  image?: ImageParts<G>;
  book?: BookParts<G>;
}
