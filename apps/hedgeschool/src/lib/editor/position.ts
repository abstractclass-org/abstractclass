// The board editor's position (design 21): each player's edges, the edges of the turn (marked), the edge count and
// the scores, written as the notation's position (the /notation page, the engine repository's design 04). The editor
// writes the five fields. The engine checks that the position could occur in a game (protocol 0.5), so nothing here
// knows the rules: only the notation's form and its turn structure.
import { byPoints, canonical, edgeName, parseEdge, sameEdge, STANDARD_START } from "#lib/engine/notation.ts";
import { turnFromCount, type Edge, type Player } from "#lib/review/enclosure.ts";

/** An edge on the editor's board. `marked`: an edge of the turn, written `*` (invincible: the last turn's, of the player
 *  not to move) or `+` (placed: the turn being played, of the mover), as the edge's player and the mover decide. */
export interface EditorEdge { edge: Edge; player: Player; marked: boolean }
export interface EditorPosition { edges: EditorEdge[]; count: number; scores: [number, number] }

export const LAST_COUNT = 120; // a game's edges

/** The player to move and the edges left in the turn, from the edge count (model.ts, turnFromCount): Blue's first turn
 *  has one edge, then turns of two, and Blue's last turn one. A finished game (120 edges) has Red with none left
 *  (`r0`). */
export function moverOf(count: number): { player: Player; left: number } {
  if (count >= LAST_COUNT) return { player: 1, left: 0 };
  const { turn, first } = turnFromCount(count), single = turn === 1 || turn === 61;
  return { player: ((turn - 1) % 2) as Player, left: first && !single ? 2 : 1 };
}

/** Whether the editor can place an edge between two points: different points at most 3 apart in each direction (the
 *  engine's 48 directions). The engine's check then names what no game reaches. */
export const placeable = (ax: number, ay: number, bx: number, by: number) =>
  (ax !== bx || ay !== by) && Math.abs(ax - bx) <= 3 && Math.abs(ay - by) <= 3;

/** A number as the notation writes a score: exact to the rules' rounding, with no trailing zeros. */
const scoreText = (s: number) => String(Math.round(s * 1e9) / 1e9);

/** The position in the notation. */
export function writePosition(p: EditorPosition): string {
  const mover = moverOf(p.count);
  const field = (player: Player) => {
    const list = p.edges.filter(e => e.player === player).map(e => ({ ...e, edge: canonical(e.edge) })).sort((a, b) => byPoints(a.edge, b.edge));
    return list.length ? list.map(e => edgeName(e.edge) + (e.marked ? (player === mover.player ? "+" : "*") : "")).join(",") : "-";
  };
  return `${field(0)} ${field(1)} ${"br"[mover.player]}${mover.left} ${scoreText(p.scores[0])}/${scoreText(p.scores[1])} ${p.count}`;
}

/** A position in the notation, read. Throws an Error that says what is wrong with its form. The mover field is read
 *  for its form only: the edge count fixes the mover (moverOf). */
export function readPosition(text: string): EditorPosition {
  const fields = text.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error("a position has five fields: Blue's edges, Red's edges, the mover, the scores and the edge count");
  const [blue, red, mover, scores, count] = fields;
  const edges = (field: string, player: Player): EditorEdge[] =>
    field === "-" ? [] : field.split(",").map(item => {
      const marked = /[*+]$/.test(item), name = marked ? item.slice(0, -1) : item;
      if (!/^[A-HJ-T]\d{1,2}-[A-HJ-T]\d{1,2}$/.test(name)) throw new Error(`not an edge: ${item}`);
      return { edge: parseEdge(name), player, marked };
    });
  if (!/^[br][0-2]$/.test(mover)) throw new Error(`not a mover and its edges left: ${mover}`);
  const s = /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(scores);
  if (!s) throw new Error(`not two scores: ${scores}`);
  const n = Number(count);
  if (!/^\d+$/.test(count) || n > LAST_COUNT) throw new Error(`not an edge count from 0 to ${LAST_COUNT}: ${count}`);
  return { edges: [...edges(blue, 0), ...edges(red, 1)], count: n, scores: [Number(s[1]), Number(s[2])] };
}

/** The position after an edge drawn with a player's tool: a new edge, or the same edge again to remove it, or the other
 *  player's edge to give it to this one. */
export function drawEdge(p: EditorPosition, edge: Edge, player: Player): EditorPosition {
  const at = p.edges.findIndex(e => sameEdge(e.edge, edge));
  if (at < 0) return { ...p, edges: [...p.edges, { edge, player, marked: false }] };
  const old = p.edges[at];
  const edges = old.player === player ? p.edges.filter((_, i) => i !== at)
    : p.edges.map((e, i) => (i === at ? { edge, player, marked: false } : e));
  return { ...p, edges };
}

/** How the editor sets the edge count: from the board, or as the player typed it. From the board, the count is the
 *  edges drawn (`null`), or the first count from there with a chosen player to move. The edges drawn are the edges
 *  played when no edge was cut and no turn forfeited: neither follows from the board (the engine repository's design
 *  04), so a count typed stays. */
export type CountRule = Player | null | "typed";

const START_EDGES = readPosition(STANDARD_START).edges; // A10-D10 and Q10-T10, each player's edge before the first
/** The edges on the board that a game played: all but the start edges. */
const drawnCount = (p: EditorPosition) =>
  p.edges.filter(e => !START_EDGES.some(s => s.player === e.player && sameEdge(s.edge, e.edge))).length;

/** The first count from `count` on with `player` to move, or the last before it near the game's end. */
function nextCount(count: number, player: Player): number {
  for (let c = count; c < LAST_COUNT; c++) if (moverOf(c).player === player) return c;
  for (let c = count - 1; c > 0; c--) if (moverOf(c).player === player) return c;
  return count;
}

/** The position with the edge count that its rule gives. */
export function followBoard(p: EditorPosition, rule: CountRule): EditorPosition {
  if (rule === "typed") return p;
  const drawn = Math.min(drawnCount(p), LAST_COUNT);
  return { ...p, count: rule === null ? drawn : nextCount(drawn, rule) };
}

/** The position and its rule after the player chooses who is to move: a typed count moves on from itself, and a count
 *  from the board keeps the choice as edges are drawn. */
export function chooseMover(p: EditorPosition, rule: CountRule, player: Player): { pos: EditorPosition; rule: CountRule } {
  if (rule === "typed") return { pos: { ...p, count: nextCount(p.count, player) }, rule };
  return { pos: followBoard(p, player), rule: player };
}

/** The rule of a position read from the notation: from the board when its count is the one the board gives, else
 *  typed. */
export function ruleOf(p: EditorPosition): CountRule {
  for (const rule of [null, 0, 1] as const) if (followBoard(p, rule).count === p.count) return rule;
  return "typed";
}

/** The position with an edge's mark changed, or null when no edge is there. */
export function toggleMark(p: EditorPosition, edge: Edge): EditorPosition | null {
  const at = p.edges.findIndex(e => sameEdge(e.edge, edge));
  if (at < 0) return null;
  return { ...p, edges: p.edges.map((e, i) => (i === at ? { ...e, marked: !e.marked } : e)) };
}
