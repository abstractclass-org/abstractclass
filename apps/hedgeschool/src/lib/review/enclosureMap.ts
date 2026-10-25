// The area map (design 30), Enclosure's part: each point's state on the board now, which the "Forecast vs board" style
// compares the forecast with, the board as drawn after a line's edges, and a point's numbers in that style. The map's
// styles, its marks and the difference style's numbers are the review package's (@abstractclass/review/ownership.ts).
import type { BoardLineEdge } from "#lib/board/Board.svelte";
import { held, valueText } from "@abstractclass/review/ownership.ts";
import { PLAYER_NAME, sameEdge, type Position } from "./enclosure.ts";

const N = 19;

/** The lattice points on a player's edges: an edge's end points and the points between them. */
function edgePoints(edges: Position["edges"][number]): Set<number> {
  const out = new Set<number>();
  for (const [ax, ay, bx, by] of edges) {
    const dx = bx - ax, dy = by - ay, g = gcd(Math.abs(dx), Math.abs(dy));
    for (let s = 0; s <= g; s++) out.add((ay + (dy * s) / g) * N + ax + (dx * s) / g);
  }
  return out;
}
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** Whether the point (x, y) is inside the ring: the crossings of a ray to the right. A point on the ring can come out
 *  either way. */
function inRing(ring: [number, number][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < xi + ((y - yi) * (xj - xi)) / (yj - yi)) inside = !inside;
  }
  return inside;
}

/** Each point's state now, by point (index y * 19 + x), from Blue's side: 1 strictly inside Blue's regions, −1 strictly
 *  inside Red's, 0 elsewhere. A point on a player's edge is not inside that player's region: the engine's ownership
 *  target counts the lattice points strictly inside (its planes.enclosed_points). */
export function occupancy(position: Pick<Position, "edges" | "regions">): number[] {
  const out = new Array<number>(N * N).fill(0);
  for (const p of [0, 1] as const) {
    const walls = edgePoints(position.edges[p]), sign = p === 0 ? 1 : -1;
    for (let i = 0; i < N * N; i++) {
      const x = i % N, y = Math.floor(i / N);
      if (!walls.has(i) && position.regions[p].some(r => r.rings.some(ring => inRing(ring, x, y)))) out[i] += sign;
    }
  }
  return out;
}

const STATE: Record<number, string> = { 1: "Blue's region", 0: "open", [-1]: "Red's region" };
/** A point's numbers, for the point under the pointer: its ownership `o` (from Blue's side, in hundredths), its state
 *  `now` (occupancy: 1, 0 or −1), and the change from the one to the other. */
export function pointReading(o: number, now: number): string {
  const change = o - 100 * now;
  return `${held(o)} · now ${STATE[now]} · ` +
    (change ? `change ${valueText(change)} to ${PLAYER_NAME[change > 0 ? 0 : 1]}` : "no change");
}

/** The board as drawn after a line's edges, for the change style's "now": the position's edges less the ones that the
 *  line cuts, with the line's own edges, and the regions after its last edge, as the board draws them. While the rules
 *  have not played the line, the position's regions. */
export function drawnBoard(from: Pick<Position, "edges" | "regions">, drawn: BoardLineEdge[]): Pick<Position, "edges" | "regions"> {
  if (!drawn.length) return from;
  const cuts = drawn.flatMap(l => (l.cut ? [l.cut] : []));
  const edges = ([0, 1] as const).map(p => [...from.edges[p].filter(e => !cuts.some(c => sameEdge(c, e))),
                                            ...drawn.filter(l => l.player === p).map(l => l.edge)]) as Position["edges"];
  return { edges, regions: drawn.at(-1)!.regions ?? from.regions };
}
