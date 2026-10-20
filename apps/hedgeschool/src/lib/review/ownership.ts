// The area map (design 30): where the engine expects the board to change. Ownership is KataGo's, as the engine
// repository defines it for Enclosure (games/enclosure/docs/design/06-ownership-and-spatial-targets.md): for each point,
// the mean over the turn ends left of +1 inside Blue's regions and -1 inside Red's. The review keeps it in hundredths,
// from Blue's side (@abstractclass/analysis/reply.ts). The map shows the forecast less the board now: a point that its
// region holds now and keeps gets nothing, so the map never looks like a region.
import type { Player, Position } from "./enclosure.ts";

const N = 19;

/** A point that the map marks: open area that `side` will probably close, or closed area that the other side holds now
 *  and will probably lose to `side`. */
export interface ChangeMark { kind: "close" | "lose"; side: Player }

/** The change that the map points at, in hundredths: a point's forecast less its state now, from −200 to 200. */
const CHANGE = 50;

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
export function inRing(ring: [number, number][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < xi + ((y - yi) * (xj - xi)) / (yj - yi)) inside = !inside;
  }
  return inside;
}

/** Each point's state now, from Blue's side: 1 strictly inside Blue's regions, −1 strictly inside Red's, 0 elsewhere.
 *  A point on a player's edge is not inside that player's region: the engine's ownership target counts the lattice
 *  points strictly inside (its planes.enclosed_points). */
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

/** The area map: by point (index y * 19 + x), the change that the engine expects, where it is large enough to point
 *  at (CHANGE), or null. `ownership` is the engine's, from Blue's side in hundredths. */
export function changeMap(ownership: number[], position: Pick<Position, "edges" | "regions">): (ChangeMark | null)[] {
  const now = occupancy(position);
  return ownership.map((o, i) => {
    const change = o - 100 * now[i];
    if (Math.abs(change) < CHANGE) return null;
    const side: Player = change > 0 ? 0 : 1;
    if (now[i] === 0) return { kind: "close", side };
    // A closed point only marks a loss: a change toward its owner is no change
    return (now[i] > 0) === (side === 1) ? { kind: "lose", side } : null;
  });
}
