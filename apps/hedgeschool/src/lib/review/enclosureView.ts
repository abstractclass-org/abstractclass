// Enclosure's part of the review's view (docs/design/29-shared-packages.md, item 9; the view's game interface,
// @abstractclass/review/game.ts): the board with the edge input, the edges as the lists write and draw them, who plays
// each edge, the area, the texts that say "edge", the display settings and the sounds, Hedge School's networks, and its
// tools: the area map's points, the image of a line and the opening book. The pages give it to the view
// (@abstractclass/review/ReviewView.svelte) with Enclosure's game (enclosure.ts, `enclosure`), which it extends.
import type { ImageBoard, ViewGame } from "@abstractclass/review/game.ts";
import { EdgeInput } from "#lib/board/edgeInput.svelte.ts";
import { BRUSH_KEYS } from "#lib/board/notes.ts";
import { animatedBoardImage, boardImage, copyPng } from "#lib/board/boardImage.ts";
import { pointName } from "#lib/engine/notation.ts";
import { playMove, preload } from "#lib/sound.ts";
import SoundSettings from "#lib/ui/SoundSettings.svelte";
import { download } from "#lib/game/reviewFile.ts";
import { EARLY_ACCESS } from "#lib/edition.ts";
import { BookPlace, siteBook } from "#lib/book/place.svelte.ts";
import { OUT, type BookAt } from "#lib/book/lookup.svelte.ts";
import { gameOpening, openingSentence, trapRows } from "#lib/book/game.ts";
import ReviewBookTable from "#lib/book/ReviewBookTable.svelte";
import { NETWORKS, networkMB, networkName } from "#lib/analysis/engineSettings.ts";
import { loadDisplay, saveDisplay } from "./display.ts";
import { drawnBoard, occupancy, pointReading } from "./enclosureMap.ts";
import { imageCaption, imageName } from "./enclosureImage.ts";
import EnclosureBoard, { boardLine } from "./EnclosureBoard.svelte";
import EdgePill from "./EdgePill.svelte";
import EmptyBoard from "./EmptyBoard.svelte";
import { AREA, enclosure, endingText, LAYERS, lineMovers, MOVE_TEXT, moveNotation, PLAYER_NAME, shortNote, turnShortNote,
         type Enclosure } from "./enclosure.ts";

/** The board of an image of a line, as boardImage.ts draws it: the regions always shown, and the edge cut by the move
 *  that led to the position while no edge of the line is drawn. */
const imageBoard = (b: ImageBoard<Enclosure>) =>
  ({ position: b.position, cut: b.last?.cut ?? null, line: boardLine(b.line), notes: b.notes, layers: { ...b.layers, regions: true } });

export const enclosureView: ViewGame<Enclosure> = {
  ...enclosure,

  Board: EnclosureBoard,
  EmptyBoard,
  layers: LAYERS,
  noteKeys: BRUSH_KEYS,

  input: play => new EdgeInput(play),
  inputStatus: (input, mover) =>
    input.refused === "start" ? `Start an edge at one of ${PLAYER_NAME[mover]}'s nodes.`
    : input.refused === "end" ? `Finish the edge at a marked point, or click another of ${PLAYER_NAME[mover]}'s nodes.`
    : input.pending ? "Now the edge's second point: a marked point."
    : null,
  clicks: [
    ["Click a node, then a marked point", "Play your own edge"],
    ["Drag from a node to a marked point", "Play your own edge"],
    ["Right-click a point, or right-drag to another", "Draw a ring, or a line, as a note. Drawing it again removes it, and in another colour (below) changes its colour"],
    ["Click the board", "Clear the position's notes"],
  ],

  notation: moveNotation,
  lineNotation: (edge, step) => moveNotation({ edge, cut: step?.cut ?? null }),
  Shape: EdgePill,
  shape: {
    name: "Pills",
    help: "Each edge as a pill along its direction, a dot, or its notation. In the engine's line, the pills and dots carry the board's numbers.",
  },
  // The table's name has a slot as wide as the widest edge (M13-O16: 4 em in the first row's semibold). Where the
  // column is narrower than the longest name (7 characters, about 4.4em), the text gets smaller instead of being cut,
  // down to 70% of its size.
  moveText: MOVE_TEXT,
  nameText: "w-[4.1em] truncate text-[clamp(0.7em,22cqi,1em)]",

  movesLeft: p => p.movesLeft,
  lineMovers,
  treeStep: (m, after) => ({ cut: m.cut, regions: after.regions, areas: after.areas }),

  second: {
    of: (p, step) => (step ? step.areas : p.areas),
    word: AREA.word,
    title: AREA.title,
    after: "The area after",
    name: "Area",
    chart: {
      legend: "Area difference",
      setting: "Area line",
      help: "Shown when a review opens: the difference of the areas each player encloses, above the middle when Blue's is larger. Its box under the chart shows or hides it for the moment.",
      swatch: "bg-area",
      tint: "accent-area",
    },
  },

  words: { move: "edge", moves: "edges", Move: "Edge" },
  ending: endingText,
  shortNote,
  turnShortNote,

  display: { load: loadDisplay, save: saveDisplay },
  sounds: {
    Settings: SoundSettings,
    // An edge that cuts has a sound of its own (design 08)
    play: (volume, set, played) => void playMove(volume, set, !!played?.cut),
    preload,
  },

  networks: {
    offered: NETWORKS,
    name: networkName,
    mb: networkMB,
    help: board => `Lite has ${NETWORKS[0].params} parameters, the other ${NETWORKS[1].params}: stronger per visit but about 3× slower. A change ${board ? "searches the positions again" : "reviews the game again"}. A network downloads once, and the browser keeps it.`,
  },

  map: {
    index: ([x, y]) => y * 19 + x,
    name: ([x, y]) => pointName(x, y),
    now: (from, drawn) => occupancy(drawnBoard(from, boardLine(drawn))),
    reading: pointReading,
    point: "point",
    close: "will be closed",
    lose: "will be lost",
    help: "Shades or marks each point from the engine's forecast, in the style below. While a line or a preview shows, the map shows the position after its last drawn edge. The key t shows or hides the map.",
    styleHelp: "Forecast: who the engine expects to hold each point, and how surely. Forecast vs board: what the engine expects to happen next, whoever moves. Dots show open area that a player will probably close. Hatching shows closed area that its owner will probably lose. After vs before: how the last move, or the line on the board, changed the forecast for the player who moved. A plus in that player's colour shows a rise. A minus in the enemy's colour shows a fall.",
  },

  image: {
    draw: (b, caption, width) => boardImage(imageBoard(b), caption, width),
    animate: (frames, caption, width) =>
      animatedBoardImage(frames.map(f => ({ props: imageBoard(f.board), ms: f.ms })), caption, width),
    caption: ({ position, turn, first }, end, moves) => imageCaption({ ...position, turn, first }, end, moves),
    name: imageName,
    copy: copyPng,
    download: (name, file) => download(name, file, file.type),
  },

  // The opening book (design 32): the test book, in the early edition only (book/place.svelte.ts, siteBook)
  book: EARLY_ACCESS ? {
    place: (page, notations) => {
      const book = siteBook();
      return book && new BookPlace(book, page, notations);
    },
    notation: p => p.notation,
    opening: (notations, edges) => {
      const book = siteBook();
      if (!book) return null;
      const at = notations.map((n): BookAt => (n ? book.at(n) : OUT));
      if (at.some(a => a.state === "loading" || a.state === "failed")) return null;
      return gameOpening(at.map(a => (a.state === "in" ? a.position : null)), edges);
    },
    openingRow: openingSentence,
    trapRows,
    Table: ReviewBookTable,
  } : undefined,
};
