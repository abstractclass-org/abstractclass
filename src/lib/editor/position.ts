// The board editor's position (design 21): each player's edges, the edges of the turn (marked), the edge count and
// the scores, written as the notation's position (the /notation page, the engine repository's design 04). The editor
// writes the five fields. The engine checks that the position could occur in a game (protocol 0.5), so nothing here
// knows the rules: only the notation's form and its turn structure.
import { edgeName, parseEdge, STANDARD_START } from "#lib/engine/notation.ts";
import type { Edge, Player } from "#lib/review/model.ts";

/** An edge on the editor's board. `marked`: an edge of the turn, written `*` (protected: the last turn's, of the player
 *  not to move) or `+` (placed: the turn being played, of the mover), as the edge's player and the mover decide. */
export interface EditorEdge { edge: Edge; player: Player; marked: boolean }
export interface EditorPosition { edges: EditorEdge[]; count: number; scores: [number, number] }

export { STANDARD_START };
export const LAST_COUNT = 120; // a game's edges

/** The player to move and the edges left in the turn, from the edge count: Blue's first turn has one edge, then turns
 *  of two, and Blue's last turn one. A finished game (120 edges) has Red with none left (`r0`). */
export function moverOf(count: number): { player: Player; left: number } {
  if (count >= LAST_COUNT) return { player: 1, left: 0 };
  const turn = count === 0 ? 0 : Math.floor((count - 1) / 2) + 1; // from 0
  const size = turn === 0 || turn === 60 ? 1 : 2;
  const played = turn === 0 || turn === 60 ? 0 : (count - 1) % 2;
  return { player: (turn % 2) as Player, left: size - played };
}

/** Whether the editor can place an edge between two points: different points at most 3 apart in each direction (the
 *  engine's 48 directions). The engine's check then names what no game reaches. */
export const placeable = (ax: number, ay: number, bx: number, by: number) =>
  (ax !== bx || ay !== by) && Math.abs(ax - bx) <= 3 && Math.abs(ay - by) <= 3;

/** The edge with its lower point first, by column, then by row (the notation's spelling). */
function canonical([ax, ay, bx, by]: Edge): Edge {
  return ax < bx || (ax === bx && ay < by) ? [ax, ay, bx, by] : [bx, by, ax, ay];
}
const byPoints = (a: Edge, b: Edge) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || a[3] - b[3];
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

/** The position with an edge's mark changed, or null when no edge is there. */
export function toggleMark(p: EditorPosition, edge: Edge): EditorPosition | null {
  const at = p.edges.findIndex(e => sameEdge(e.edge, edge));
  if (at < 0) return null;
  return { ...p, edges: p.edges.map((e, i) => (i === at ? { ...e, marked: !e.marked } : e)) };
}

const sameEdge = (a: Edge, b: Edge) => byPoints(canonical(a), canonical(b)) === 0;
