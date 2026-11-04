// Blueprints' part of the review's view (docs/design/29-shared-packages.md, item 9; the view's game interface,
// @abstractclass/review/game.ts): the board with the player's own moves, the moves as the lists write and draw them, who
// plays each move, the stars beside the points, the texts that say "move", the display settings and Stamp Duty's
// networks. The pages give it to the view (@abstractclass/review/ReviewView.svelte) with Blueprints' game
// (blueprints.ts, `blueprints`), which it extends. The player's notes are Hedge School's, in its colours, at hexes of
// the board, with the board's own keys (`NOTE_KEYS`, design 33, "The player's notes"). Cyanotype has no sounds, no
// image of a line and no opening book yet (design 33), so the view offers none of them, and no area map (`AREA_MAP`).
// The board's box fills the room that the side columns leave, with the hands in a panel over it, and under it in one
// column, as on Practice.
import type { ViewGame } from "@abstractclass/review/game.ts";
import { held } from "@abstractclass/review/ownership.ts";
import { BlueprintInput } from "../board/blueprintInput.svelte.ts";
import { INPUT_CLICKS, inputStatus } from "../board/input.ts";
import { ONE_COLUMN_HEIGHT } from "../board/keptPanel.svelte.ts";
import { NOTE_KEYS } from "../board/Board.svelte";
import { hexKey } from "../board/hex.ts";
import { STARS } from "../board/position.ts";
import { moveName, moveText } from "../game/notation.ts";
import { NETWORKS, networkMB, networkName } from "../analysis/engineSettings.ts";
import { asPlayed, blueprints, captureOf, endingText, lineMovers, playedText, shortNote, turnShortNote, type Blueprints } from "./blueprints.ts";
import { alignMap, boardState, mapIndex } from "./blueprintsMap.ts";
import { loadDisplay, saveDisplay } from "./display.ts";
import ReviewBoard from "./ReviewBoard.svelte";
import EmptyBoard from "./EmptyBoard.svelte";
import MoveLabel from "./MoveLabel.svelte";
import { NAME_LEAST } from "./table.ts";
import MoveShape from "./MoveShape.svelte";

/** A forecast of a hex's ownership against the board now, in the forecast styles' numbers: "Blue 0.62 · now Red's". */
const reading = (ownership: number, now: number) =>
  `forecast ${held(ownership)} · ${now > 0 ? "now Blue's cell" : now < 0 ? "now Red's cell" : "empty now"}`;

export const blueprintsView: ViewGame<Blueprints> = {
  ...blueprints,

  Board: ReviewBoard,
  EmptyBoard,
  box: { form: "fill", oneColumn: ONE_COLUMN_HEIGHT },
  layers: [],
  noteKeys: NOTE_KEYS,

  input: play => new BlueprintInput(play),
  // What the move begun needs next. With nothing begun, the status line shows the position, as Hedge School's does
  // (design 33, "How the board takes a move", item 7): the first text is Practice's.
  inputStatus,
  clicks: [
    ...INPUT_CLICKS,
    // The player's notes (design 33, "The player's notes"). "Highlight", not "mark": a marked hex is a place of the
    // player's own move (INPUT_CLICKS).
    ["Right-click a hex, or right-drag to another hex", "Highlight the hex, or draw an arrow, as a note. Do it again to remove the note. Do it in another colour (below) to change the colour of the note"],
    ["Hold Shift and right-drag across hexes", "Highlight each hex that the drag goes across, in the colour (below). If the first hex has a highlight of that colour, the drag removes the highlights of that colour"],
    ["Click the board", "Clear the position's notes"],
  ],

  notation: playedText,
  lineNotation: (move, step) => moveText(moveName(move), step ? captureOf(step) : null),
  glyphs: {
    Label: MoveLabel,
    asPlayed,
    help: "Glyphs: each move as the hands show it, the blueprint's number in a box, and for an edit the cell that it moves. Text: each move as the Notation page writes it. The move list, its notes, the status line, and the variations and lines in notation follow this setting.",
  },
  Shape: MoveShape,
  shape: {
    name: "Pictures",
    help: "Each move as a small picture, a dot, or its notation. A placement is a hex with the number of its blueprint. An edit is the cell that it moves, with an arrow. In the engine's line, the dots show the numbers of the board.",
  },
  // A move's text: as wide as its own (its glyphs: a box, the hex and +N). Moves run from 5 to 19 characters, so two do
  // not fit a row of the side column: each move has a row of its own.
  moveText: "",
  oneMoveALine: true,
  // The table's name takes its cell's width, in the move list's monospaced font. Each name is as large as its cell
  // allows (`fitName`): the longest names are edits (1:-12,-10>3:-11,-12, 19 characters), which get smaller where the
  // cell is narrower, down to NAME_LEAST (table.ts), and are cut there. A placement's name is short, and keeps its
  // full size. The Move header shows a cut name in full.
  nameText: "w-full truncate font-mono",
  fitName: NAME_LEAST,
  // A candidate's twins are the moves that give the same position (blueprints.ts, afterKey)
  twinWords: "Same position",

  movesLeft: p => p.movesLeft,
  lineMovers,
  treeStep: m => m.did, // what the move did, with the hands and the stars after it

  second: {
    of: (p, step) => (step ? step.stars : p.stars),
    word: STARS.word,
    title: STARS.title,
    after: "The stars after",
    name: "Stars",
    chart: {
      legend: "Star difference",
      setting: "Star line",
      help: "Shown when a review opens: the difference of the players' stars on the board, above the middle when Blue has more. Its box under the chart shows or hides it for the moment.",
      swatch: "bg-area",
      tint: "accent-area",
    },
  },

  words: { move: "move", moves: "moves", Move: "Move" },
  ending: endingText,
  shortNote,
  turnShortNote,

  display: { load: loadDisplay, save: saveDisplay },

  networks: {
    offered: NETWORKS,
    name: networkName,
    mb: networkMB,
    help: board => `The network that ${board ? "searches the positions" : "reviews the game"}. A change ${board ? "searches the positions again" : "reviews the game again"}. A network downloads once, and the browser keeps it.`,
  },
};

/** The area map of the engine's view (Hedge School's design 30), which the view does not offer: design 33 says why
 *  ("No area map yet"). Kept for a later study, which may offer it as one option: as the view's `map`. */
export const AREA_MAP: NonNullable<ViewGame<Blueprints>["map"]> = {
  index: (hex, map) => mapIndex(hex, map),
  name: hex => hexKey(hex),
  now: (from, drawn, map) => boardState(from, drawn.map(l => ({ player: l.player, ...l.step })), map),
  align: alignMap,
  reading,
  point: "hex",
  close: "will be filled",
  lose: "will be captured",
  help: "Shades or marks each hex of the engine's view from its forecast, in the style below. The engine sees the hexes round the last placements: a hex outside its view has no mark. While a line or a preview shows, the map shows the position after its last drawn move. The key t shows or hides the map.",
  styleHelp: "Forecast: who the engine expects to hold each hex at the game's end, and how surely. A small hex on a cell shows a cell that the other player will probably capture. Forecast vs board: what the engine expects to happen next, whoever moves. Dots show empty hexes that a player will probably fill. Hatching shows cells that their owner will probably lose. After vs before: how the last move, or the line on the board, changed the forecast for the player who moved. A plus in that player's colour shows a rise. A minus in the opponent's colour shows a fall.",
};
