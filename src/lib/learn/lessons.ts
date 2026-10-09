// The Learn section's course, a prototype. After Lichess Learn (ui/learn): short stages, each a few small tasks on the
// board, with progress. The rules come from the engine repository's enclosure/README.md.
//
// Placeholder: each task checks the visitor's edge with a small hand-written test for its one position, and shows a
// hand-made result. Real lessons will play the edge in the engine's rules (docs/requests/02-engine-protocol.md).
import type { Edge, Position, Region } from "#lib/review/model.ts";

export interface Step {
  title: string;
  text: string; // what the rule is
  goal: string; // what to do
  view: [number, number, number, number];
  position: Position;
  targets?: Edge[]; // a hint drawn on the board
  check?: (e: Edge) => string | null; // null when the edge does the task, else what is wrong
  result?: (e: Edge) => { position: Position; cut?: Edge; text: string };
}
export interface Lesson { id: string; title: string; steps: Step[] }
export interface Stage { title: string; about: string; lessons: Lesson[]; ready: boolean }

const pos = (blue: Edge[], red: Edge[] = [], extra: Partial<Position> = {}): Position => ({
  edges: [blue, red], protected: [], placed: [], scores: [0, 0], player: 0, movesLeft: 2,
  regions: [[], []], ...extra,
});
const square = (x0: number, y0: number, x1: number, y1: number): Region =>
  ({ area: (x1 - x0) * (y1 - y0), rings: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1]]] });
const cheb = (e: Edge) => Math.max(Math.abs(e[2] - e[0]), Math.abs(e[3] - e[1]));
const startsAt = (e: Edge, x: number, y: number) => (e[0] === x && e[1] === y) || (e[2] === x && e[3] === y);
const from = (e: Edge, x: number, y: number): Edge => (e[0] === x && e[1] === y ? e : [e[2], e[3], e[0], e[1]]);
// Do two segments cross or touch? (The rules: an edge that crosses or touches an enemy edge cuts it.)
function meets(a: Edge, b: Edge): boolean {
  const o = (p: number[], q: number[], r: number[]) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  const on = (p: number[], q: number[], r: number[]) =>
    Math.min(p[0], r[0]) <= q[0] && q[0] <= Math.max(p[0], r[0]) && Math.min(p[1], r[1]) <= q[1] && q[1] <= Math.max(p[1], r[1]);
  const [p1, p2, p3, p4] = [[a[0], a[1]], [a[2], a[3]], [b[0], b[1]], [b[2], b[3]]];
  const [d1, d2, d3, d4] = [o(p3, p4, p1), o(p3, p4, p2), o(p1, p2, p3), o(p1, p2, p4)];
  if (d1 !== d2 && d3 !== d4) return true;
  return (d1 === 0 && on(p3, p1, p4)) || (d2 === 0 && on(p3, p2, p4)) || (d3 === 0 && on(p1, p3, p2)) || (d4 === 0 && on(p1, p4, p2));
}

const START: Edge = [0, 9, 3, 9];
const U3: Edge[] = [[2, 6, 5, 6], [5, 6, 5, 9], [5, 9, 2, 9]];
const RED_WALL: Edge = [4, 5, 4, 8];
const PROTECTED: Edge = [5, 4, 5, 7];
const OPEN: Edge = [0, 8, 3, 8];

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
            position: pos([START]),
            check: e => {
              if (!startsAt(e, 0, 9) && !startsAt(e, 3, 9)) return "Start at one of Blue's nodes: A10 or D10.";
              if (e[1] === 9 && e[3] === 9 && Math.min(e[0], e[2]) < 3 && Math.max(e[0], e[2]) > 0)
                return "A new edge must not run along your own edge.";
              return null;
            },
            result: e => ({ position: pos([START, e]), text: "Every new edge adds a node at its far end, so you reach further each turn." }),
          },
          {
            title: "Close a region",
            text: "When your edges close a region, its area counts for you. After every turn, each player's enclosed " +
                  "area is added to their score.",
            goal: "Close the square with one edge.",
            view: [0, 4, 8, 11],
            position: pos(U3),
            targets: [[2, 6, 2, 9]],
            check: e => (cheb(e) === 3 && ((startsAt(e, 2, 6) && startsAt(e, 2, 9))) ? null : "Join the square's two open ends."),
            result: e => ({
              position: pos([...U3, e], [], { regions: [[square(2, 6, 5, 9)], []] }),
              text: "The square encloses 9 points of area. Blue gains 9 points after this turn, and again after every " +
                    "turn while it stays closed.",
            }),
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
            position: pos([[0, 6, 2, 6]], [RED_WALL], { player: 0 }),
            check: e => {
              if (!startsAt(e, 2, 6)) return "Start at Blue's node C7.";
              return meets(e, RED_WALL) ? null : "Your edge must cross or touch the red edge.";
            },
            result: e => ({
              position: pos([[0, 6, 2, 6], from(e, 2, 6)], []),
              cut: RED_WALL,
              text: "The red edge is gone. Red's nodes with no edges left disappear too.",
            }),
          },
          {
            title: "Protected edges",
            text: "The edges a player places in a turn are protected during the opponent's next turn. A protected edge " +
                  "cannot be cut.",
            goal: "Cut the red edge that is not protected.",
            view: [0, 3, 8, 10],
            position: pos([[0, 6, 2, 6]], [PROTECTED, OPEN], { protected: [PROTECTED] }),
            check: e => {
              if (!startsAt(e, 2, 6)) return "Start at Blue's node C7.";
              if (meets(e, PROTECTED)) return "That edge crosses the protected one, so it is not allowed.";
              return meets(e, OPEN) ? null : "Cross the red edge without the glow: A9-D9.";
            },
            result: e => ({
              position: pos([[0, 6, 2, 6], from(e, 2, 6)], [PROTECTED]),
              cut: OPEN,
              text: "The protection lasts one turn. Next turn, Red's other edge can be cut too.",
            }),
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
                  "edges. The two edges of a turn work together: set up with the first, close with the second.",
            goal: "Read, then continue.",
            view: [0, 4, 8, 11],
            position: pos(U3.slice(0, 2), [], { regions: [[], []] }),
            targets: [[5, 9, 2, 9], [2, 9, 2, 6]],
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
