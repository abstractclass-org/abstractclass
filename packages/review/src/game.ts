// The view's game interface (docs/design/29-shared-packages.md, item 9): what a site gives the review's and the
// Analysis board's view (ReviewView.svelte) about its game. It extends the analysis's game interface
// (@abstractclass/analysis/game.ts), which compares and names the moves and numbers the turns. The view computes with
// the engine's results, the game's tree and the moves by their names, and draws the lists, the tables, the charts and
// the settings. The site draws the board, takes the player's own moves, writes its moves and its texts, and gives its
// display settings, its sounds, its engine's networks and its own tools (the area map, the image of a line, the
// opening book). The page gives its own menus (the Export menu, the New menu) in the step bar (`tools`).
//
// Each part is shaped for both boards: Enclosure's (Hedge School's review/enclosureView.ts) and Blueprints' (Drawing
// Board's board/Board.svelte). Blueprints' moves are placements and edits, named by strategyjam.org's strings, and two
// edits can give the same hand (docs/design/33-drawing-board.md, items 5 and 9). The view compares the engine's moves
// (the candidates, their twins, a line's steps) with the game's `equal`. The game's tree, the engine's queries and the
// stored results know a move by its name: there, two names are two moves.
import type { Component, Snippet } from "svelte";
import type { Game, GameTypes, Player } from "@abstractclass/analysis/game.ts";
import type { Label } from "@abstractclass/analysis/labels.ts";
import type { MoveReview, ReviewData, TurnReview, Unit } from "@abstractclass/analysis/model.ts";
import type { AreaMark, MapStyle } from "./ownership.ts";

/** The players, in every game (the glossary): Blue moves first, Red second. */
export const PLAYER_NAME = ["Blue", "Red"] as const;
/** A whole number, with thousands separated. Made once: a formatter is costly to make. */
export const WHOLE = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
/** A score as the players' cards, the Report and an image's caption show it: whole, with thousands separated. */
export const fmtScore = (s: number) => WHOLE.format(Math.round(s));
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
  scoreLine: boolean; // the Advantage chart's score line (Blue − Red)
  areaLine: boolean; // the Advantage chart's line of the players' second number (the game's `second`), Blue − Red
  lineSteps: boolean; // "Lines on the board": the engine's line and a variation's preview drawn one move at a time
  // A move in the variations and the listed line: the game's shape (`Shape`), a dot (Go's way), or its notation. In the
  // line, the shapes and the dots carry the board's numbers.
  branchForm: "pills" | "dots" | "text";
  // A label in the move list and the variations: a badge, or its mark alone in the label's colour, as Lichess's move
  // list shows it
  marks: "badges" | "text";
  notes: boolean; // the move list's one-line notes on Great moves, mistakes and blunders
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
  notes: G["note"][];
  onnotes?: (notes: G["note"][]) => void; // a note drawn, changed or removed, or all cleared: none while a preview shows
  oncandidate: (move: G["move"] | null) => void; // the candidate under the board's pointer
  oncandidateclick: (move: G["move"]) => void;
  oncandidatedblclick?: (move: G["move"]) => void;
  onpointat: (point: G["point"] | null) => void; // the point under a mouse's pointer, for the area map's numbers
  mapControls?: Snippet; // the area map's switch and legend, which the board places in its margin
}

/** A move's shape in the variations and the engine's line, in its mover's colour: hollow where the move is in the
 *  tree already, and with the board's number in the line (`n`). Null: a pass. */
export interface ShapeProps<M> { move: M | null; player: Player; hollow: boolean; n: number | null; class: string }

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

/** The sounds' settings (Hedge School's ui/SoundSettings.svelte), in the display settings. */
export interface SoundSettingsProps<D extends Display> {
  sound: boolean;
  moveSound: D["moveSound"];
  volume: number;
  set: (v: Partial<Pick<D, "sound" | "moveSound" | "volume">>) => void;
}

/** The area map's part that is the board's (design 30): how its points are named and indexed, and the board's state
 *  that the "Forecast vs board" style compares with. */
export interface MapParts<G extends ViewTypes> {
  index(point: G["point"]): number; // the point's place in the engine's ownership
  name(point: G["point"]): string; // the point's name in the notation
  /** Each point's state on the board as drawn after a line's moves, from Blue's side: 1 Blue's, −1 Red's, 0
   *  neither. */
  now(from: G["position"], drawn: LineMove<G>[]): number[];
  /** A point's numbers in the forecast styles: its ownership (from Blue's side, in hundredths) and its state now. */
  reading(ownership: number, now: number): string;
  point: string; // the word for a point: "point"
  close: string; // the change style's mark for open area that a side will probably take: "will be closed"
  lose: string; // its mark for area that its owner will probably lose: "will be lost"
  help: string; // the area map's setting
  styleHelp: string; // the setting of its style
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
  readonly inBook: boolean; // the position on screen is in the book: elsewhere the column shows the candidates alone
  readonly showsBook: boolean; // the table shows the book, in the candidates' place
  readonly rows: readonly { move: string }[]; // the position's book moves, the best first
  readonly line: M[] | null; // the line of the row pointed at, as the board draws it
  readonly numbers: BoardCandidate<M>[]; // the board's numbers for the rows
  pointed: string | null; // the name of the move pointed at, in the table or by its number on the board
  toggle(): void; // the key o: the book or the candidates
  showForNow(): void; // the book, for this page only
}
/** The game's opening in the book, for the Report (design 32, item 4): the position that its row goes to, the game's
 *  moves that the move list marks, and the traps that it played. */
export interface BookOpening { at: number; marks: number[]; traps: unknown[] }
export interface BookParts<G extends ViewTypes> {
  /** The book's place on a page, from the notation of each position on the path. Null where the site has no book. */
  place(page: "review" | "board", notations: () => (string | undefined)[]): G["book"] | null;
  notation(position: G["position"]): string | undefined; // the position's notation, by which the book finds it
  /** The game's opening, once every part of the book that the game's positions need has loaded. */
  opening(notations: (string | undefined)[], moves: string[]): BookOpening | null;
  openingRow(opening: BookOpening, moves: string[], label: Label | null): string | null; // the Report's row
  trapRows(opening: BookOpening): { at: number; text: string }[]; // the Report's rows on the traps
  /** The book's table at a book position, with the engine's table (`candidates`) under its switch. */
  Table: Component<{ place: G["book"]; onplay: (moves: string[]) => void; candidates: Snippet }>;
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
  /** A move of a line, as the line's list writes it: its name, and its mark once the rules have played it. */
  lineNotation(move: G["move"], step: G["step"] | undefined): string;
  /** A move's shape in the variations and the line (Enclosure's pill along the edge). */
  Shape: Component<ShapeProps<G["move"]>>;
  shape: { name: string; help: string }; // its choice's name in the display settings, and the choice's help
  moveText: string; // the class of a move's text in the move list: as wide as the widest move
  nameText: string; // the class of a candidate's name in the table: as wide as the widest move's name

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
  /** A move's note in the move list, in one line: its label, and the engine's choice when the move was not it. */
  shortNote(e: MoveReview<G>): string;
  /** A turn's note, by turn. */
  turnShortNote(t: TurnReview<G>): string;

  // --- The display settings and the sounds
  display: { load(): G["display"]; save(d: G["display"]): void };
  sounds: {
    Settings: Component<SoundSettingsProps<G["display"]>>;
    /** A move's sound, at a volume from 0 to 1: the set's sound for the move played. */
    play(volume: number, set: G["display"]["moveSound"], played: G["played"] | undefined): void;
    preload(set: G["display"]["moveSound"]): void; // fetches a set's sounds ahead
  };

  // --- The site's engine and tools
  networks: NetworkParts;
  map?: MapParts<G>;
  image?: ImageParts<G>;
  book?: BookParts<G>;
}
