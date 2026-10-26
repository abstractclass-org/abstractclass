// The Learn section's course, a prototype. After Lichess Learn (ui/learn): short stages, each a few small tasks on the
// board, with progress. The rules come from the engine repository's games/enclosure/README.md.
//
// Each step's board is a line of the position notation (the /notation page), and the engine's rules play on it, as on
// the puzzles page: the engine reads the line (the query's `position`), gives the edge input the legal edges and the
// mover's nodes, plays the visitor's edge and gives the board after it (describe_game). The boards are teaching
// boards that no game reaches: only the edges that a step needs. So the page ignores describe's check. A step's task
// test reads the engine's boards before and after the edge, not the edge's points.
import { moverOf, readPosition } from "#lib/editor/position.ts";
import { parseEdge } from "#lib/engine/notation.ts";
import type { GamePosition } from "#lib/engine/position.ts";
import { otherPlayer, type Edge, type Player, type Position } from "#lib/review/enclosure.ts";

/** A legal edge as the engine played it: the step's board before it and the board after it (describe_game). */
export interface Played { before: GamePosition; after: GamePosition }

export interface Step {
  title: string;
  text: string; // what the rule is
  goal: string; // what to do
  view: [number, number, number, number];
  position: string; // the board, a line of the position notation
  targets?: Edge[]; // a hint drawn on the board
  /** Whether a legal edge does the step's task: null when it does, else the hint. A step without a task takes no
   *  edge. */
  task?: (p: Played) => string | null;
  done?: string; // what the board after the edge shows
}
export interface Lesson { id: string; title: string; steps: Step[] }
export interface Stage { title: string; about: string; lessons: Lesson[]; ready: boolean }

/** A step's board as its line gives it, for the page before the engine draws it, or without the engine: the edges and
 *  their marks, with no regions. The edge count fixes the mover (editor/position.ts, readPosition). */
export function lineBoard(line: string): Position {
  const { edges, count, scores } = readPosition(line), { player, left } = moverOf(count);
  const of = (p: Player) => edges.filter(e => e.player === p);
  const marked = (p: Player) => of(p).filter(e => e.marked).map(e => e.edge);
  return {
    edges: [of(0).map(e => e.edge), of(1).map(e => e.edge)], protected: marked(otherPlayer(player)),
    placed: marked(player), scores, player, movesLeft: left, regions: [[], []],
  };
}

// The boards: Blue to move at the start of a turn of two edges (`b2`, with 3 edges played, as at a game's third turn).
// So the board after a step's edge is still in Blue's turn: the scores have not changed, and Red's invincible edge is
// still invincible.
export const COURSE: Stage[] = [
  {
    title: "The rules",
    about: "Edges, regions, cuts and turns: everything a game needs.",
    ready: true,
    lessons: [
      {
        id: "edges",
        title: "Edges",
        steps: [
          {
            title: "Draw an edge",
            text: "Blue starts with one edge, A10-D10. A new edge starts at one of your nodes and reaches up to 3 " +
                  "points away, in any direction.",
            goal: "Draw a new edge from one of Blue's nodes.",
            view: [0, 5, 8, 13],
            position: "A10-D10 - b2 0/0 3",
            task: () => null, // every legal edge is a new edge from one of Blue's nodes
            done: "Every new edge adds a node at its far end, so you reach further each turn.",
          },
          {
            title: "Close a region",
            text: "When your edges close a region, its area counts for you. After every turn, the game adds each " +
                  "player's enclosed area to their score.",
            goal: "Close the square with one edge.",
            view: [0, 4, 8, 11],
            position: "C7-F7,C10-F10,F7-F10 - b2 0/0 3",
            targets: [parseEdge("C7-C10")],
            // Blue's area (`areas[0]`) grows by the square's 9. A diagonal closes a triangle of 4.5.
            task: ({ before, after }) => (after.areas[0] - before.areas[0] >= 9 ? null : "Join the square's two open ends."),
            done: "The square encloses an area of 9. Blue's score gains 9 after this turn, and again after every " +
                  "turn while it stays closed.",
          },
        ],
      },
      {
        id: "cuts",
        title: "Cuts",
        steps: [
          {
            title: "Cut an enemy edge",
            text: "An edge that crosses or touches an enemy edge cuts it, and the enemy edge disappears. One edge can " +
                  "cut at most one enemy edge.",
            goal: "Cut the red edge with an edge from C7.",
            view: [0, 3, 8, 10],
            position: "A7-C7 E6-E9 b2 0/0 3",
            task: ({ after }) => (after.cuts ? null : "Your edge must cross or touch the red edge."),
            done: "The red edge is gone. Red's nodes with no edges left disappear too.",
          },
          {
            title: "Invincible edges",
            text: "The edges a player places in a turn are invincible during the enemy's next turn. You cannot " +
                  "cut an invincible edge.",
            goal: "Cut the red edge that is not invincible.",
            view: [0, 3, 8, 10],
            position: "A7-C7 A9-D9,F5-F8* b2 0/0 3",
            // The engine takes no edge that cuts a invincible one.
            task: ({ before, after }) => (after.cuts && !before.protected.includes(after.cuts) ? null
              : "Cross the red edge without the glow: A9-D9."),
            done: "The invincibility lasts one turn. Next turn, you can cut Red's other edge too.",
          },
        ],
      },
      {
        id: "turns",
        title: "Turns",
        steps: [
          {
            title: "Two edges a turn",
            text: "Blue's first turn is a single edge. Every later turn has two edges, and the game ends after 120 " +
                  "edges. The two edges of a turn work together: prepare with the first, close with the second.",
            goal: "Read, then continue.",
            view: [0, 4, 8, 11],
            position: "C7-F7,F7-F10 - b2 0/0 3",
            targets: [parseEdge("C10-F10"), parseEdge("C7-C10")],
          },
        ],
      },
    ],
  },
  {
    title: "First ideas",
    about: "Walls, reach and tempo: why a region is worth more early.",
    ready: false,
    lessons: [{ id: "tempo", title: "Tempo", steps: [] }, { id: "reach", title: "Reach", steps: [] }],
  },
  {
    title: "Structures",
    about: "The community's names for strong shapes: guards, spears, stitches.",
    ready: false,
    lessons: [{ id: "guards", title: "Guards", steps: [] }, { id: "spears", title: "Spears", steps: [] }],
  },
];
