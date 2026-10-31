// Blueprints' part of the review's view (docs/design/29-shared-packages.md, item 9; the view's game interface,
// @abstractclass/review/game.ts): the board with the player's own moves, the moves as the lists write and draw them, who
// plays each move, the stars beside the points, the texts that say "move", the display settings, Stamp Duty's
// networks, and the area map of the engine's view. The pages give it to the view (@abstractclass/review/ReviewView.svelte)
// with Blueprints' game (blueprints.ts, `blueprints`), which it extends. Drawing Board has no sounds, no notes, no
// image of a line and no opening book yet (design 33), so the view offers none of them. The board's box fills the
// room that the side columns leave, with the hands in a panel over it, and under it in one column, as on Practice.
import type { ViewGame } from "@abstractclass/review/game.ts";
import { BlueprintInput } from "../board/blueprintInput.svelte.ts";
import { INPUT_CLICKS, inputStatus } from "../board/input.ts";
import { ONE_COLUMN_HEIGHT } from "../board/keptPanel.svelte.ts";
import { hexKey } from "../board/hex.ts";
import { STARS } from "../board/position.ts";
import { captureText, moveName } from "../game/notation.ts";
import { NETWORKS, networkMB, networkName } from "../analysis/engineSettings.ts";
import { blueprints, captureOf, endingText, lineMovers, playedText, shortNote, turnShortNote, type Blueprints } from "./blueprints.ts";
import { alignMap, boardState, mapIndex } from "./blueprintsMap.ts";
import { loadDisplay, saveDisplay } from "./display.ts";
import ReviewBoard from "./ReviewBoard.svelte";
import EmptyBoard from "./EmptyBoard.svelte";
import MoveLabel from "./MoveLabel.svelte";
import MoveShape from "./MoveShape.svelte";

/** A forecast of a hex's ownership against the board now, in the forecast styles' numbers: "Blue 0.62 · now Red's". */
const reading = (ownership: number, now: number) =>
  `forecast ${ownership ? `${ownership > 0 ? "Blue" : "Red"} ${(Math.abs(ownership) / 100).toFixed(2)}` : "even"} · ` +
  (now > 0 ? "now Blue's cell" : now < 0 ? "now Red's cell" : "empty now");

export const blueprintsView: ViewGame<Blueprints> = {
  ...blueprints,

  Board: ReviewBoard,
  EmptyBoard,
  box: { form: "fill", oneColumn: ONE_COLUMN_HEIGHT },
  layers: [],

  input: play => new BlueprintInput(play),
  // What the move begun needs next. With nothing begun, the status line shows the position, as Hedge School's does
  // (design 33, "How the board takes a move", item 7): the first text is Practice's.
  inputStatus,
  clicks: INPUT_CLICKS,

  notation: playedText,
  lineNotation: (move, step) => moveName(move) + (step ? captureText(captureOf(step)) : ""),
  MoveLabel,
  Shape: MoveShape,
  shape: {
    name: "Boxes",
    help: "Each move as its blueprint's number in a box (a placement) or in a hex (an edit), a dot, or its notation. In the engine's line, the boxes and dots carry the board's numbers.",
  },
  // A move's text: as wide as the widest move that MoveLabel shows (a box, -120,-110 and +216), in the monospaced font.
  moveText: "w-[16ch]",
  oneMoveALine: true, // a move is up to 19 characters: two do not fit a row of the side column
  // The table's name takes its cell's width: the longest names are edits (1:-12,-10>3:-11,-12, 19 characters), which
  // get smaller where the cell is narrower, down to 70% of their size, and are cut there. A placement's name is short.
  nameText: "w-full truncate text-[clamp(0.7em,8.5cqi,1em)]",

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

  map: {
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
  },
};
