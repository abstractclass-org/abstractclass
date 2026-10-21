// The area map (design 30). Ownership is KataGo's, as the engine repository defines it for Enclosure
// (games/enclosure/docs/design/06-ownership-and-spatial-targets.md): for each point, the mean over the turn ends left of
// +1 inside Blue's regions and -1 inside Red's. The review keeps it in hundredths, from Blue's side
// (@abstractclass/analysis/reply.ts). The map has two styles: the ownership itself, each point shaded for the side that
// holds it as KaTrain shades its territory, or the change from the board now to it, where a point that its region holds
// now and keeps gets nothing.
import { PLAYER_NAME, type Player, type Position } from "./enclosure.ts";

const N = 19;

/** The map's style: the engine's ownership, or the change from the board now to it. */
export type MapStyle = "ownership" | "change";

/** A point that the map marks. The ownership style: `side` holds it, as strongly as `strength` says, from 0 to 1
 *  (shade). The change style: open area that `side` will probably close, or closed area that the other side holds now
 *  and will probably lose to `side`. */
export type AreaMark = { kind: "hold"; side: Player; strength: number } | { kind: "close" | "lose"; side: Player };

/** KaTrain's gamma on its territory's alpha (gui/theme.py, OWNERSHIP_GAMMA): a point held weakly still shows. */
const OWNERSHIP_GAMMA = 1.33;
/** How strongly the map shades a point of value `v` in hundredths, from 0 to 1, whatever its side: KaTrain's
 *  |v| ^ (1 / gamma), with the value capped at 1 as KaTrain caps it. */
export const shade = (v: number) => Math.min(1, Math.abs(v) / 100) ** (1 / OWNERSHIP_GAMMA);

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

/** The area map: by point (index y * 19 + x), the style's mark where its value (the ownership, or the change, in
 *  hundredths) is not 0 and at least `min`, or null. `ownership` is the engine's, from Blue's side in hundredths. */
export function areaMap(style: MapStyle, ownership: number[], position: Pick<Position, "edges" | "regions">,
                        min: number): (AreaMark | null)[] {
  if (style === "ownership") {
    return ownership.map(o => (o && Math.abs(o) >= min ? { kind: "hold", side: o > 0 ? 0 : 1, strength: shade(o) } : null));
  }
  const now = occupancy(position);
  return ownership.map((o, i) => {
    const change = o - 100 * now[i];
    if (!change || Math.abs(change) < min) return null;
    const side: Player = change > 0 ? 0 : 1;
    if (now[i] === 0) return { kind: "close", side };
    // A closed point only marks a loss: a change toward its owner is no change
    return (now[i] > 0) === (side === 1) ? { kind: "lose", side } : null;
  });
}

const fmt = (v: number) => (Math.abs(v) / 100).toFixed(2);
const STATE: Record<number, string> = { 1: "Blue's region", 0: "open", [-1]: "Red's region" };
/** A point's numbers, for the point under the pointer: its ownership `o` (from Blue's side, in hundredths), its state
 *  `now` (occupancy: 1, 0 or −1), and the change from the one to the other. */
export function pointReading(o: number, now: number): string {
  const change = o - 100 * now;
  return `${o ? `${PLAYER_NAME[o > 0 ? 0 : 1]} ${fmt(o)}` : "even"} · now ${STATE[now]} · ` +
    (change ? `change ${fmt(change)} to ${PLAYER_NAME[change > 0 ? 0 : 1]}` : "no change");
}
