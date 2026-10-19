// Entering an edge with two clicks: a first point, then a second. Clicking the first point again cancels.
//
// With the position's rules (the engine's describe: the legal edges and the mover's nodes), the first point must be
// one of the mover's nodes that begins a legal edge, as a new edge starts at the mover's node. The second point must
// complete a legal edge from it: the board marks those ends with dots. A click on another of those nodes makes it the
// first point. Any other click does nothing, and `refused` says why. Without the rules (a site with no engine, or before
// the engine answers), the second point is any point within 3 units (the rules' box), and a point farther away starts
// over from it.
import type { Edge } from "#lib/review/enclosure.ts";

export type Point = [number, number];
/** The position's rules: from the engine's describe reply, engine/position.ts's rulesOf. */
export interface EdgeRules { legal: Edge[]; nodes: Point[] }
const key = (x: number, y: number) => `${x},${y}`;

export class EdgeInput {
  pending = $state<Point | null>(null);
  /** The position's rules, or null when they are not known. */
  rules = $state<EdgeRules | null>(null);
  /** Why the last click did nothing: its point is not one of the mover's nodes ("start"), or it completes no legal
   *  edge from the first point ("end"). */
  refused = $state<"start" | "end" | null>(null);

  // For each of the mover's nodes that begins a legal edge, the points that complete one from it.
  #ends = $derived.by(() => {
    if (!this.rules) return null;
    const nodes = new Set(this.rules.nodes.map(p => key(...p)));
    const ends = new Map<string, Point[]>();
    const add = (a: Point, b: Point) => {
      const k = key(...a);
      if (!nodes.has(k)) return;
      if (!ends.has(k)) ends.set(k, []);
      ends.get(k)!.push(b);
    };
    for (const [ax, ay, bx, by] of this.rules.legal) { add([ax, ay], [bx, by]); add([bx, by], [ax, ay]); }
    return ends;
  });

  /** The points that complete a legal edge from the first point, or null (no first point, or no rules). */
  ends = $derived.by((): Point[] | null => (this.pending && this.#ends ? this.#ends.get(key(...this.pending)) ?? [] : null));
  /** The points a click acts on, or null for every point (no rules). */
  active = $derived.by((): Point[] | null => {
    if (!this.#ends) return null;
    const starts = [...this.#ends.keys()].map(k => k.split(",").map(Number) as Point);
    return this.pending ? [...starts, ...(this.ends ?? [])] : starts;
  });

  constructor(private onedge: (edge: Edge) => void) {}

  click = (x: number, y: number) => {
    this.refused = null;
    if (this.pending) {
      const [px, py] = this.pending;
      if (px === x && py === y) { this.pending = null; return; }
      const completes = this.ends ? this.ends.some(([ex, ey]) => ex === x && ey === y)
        : Math.max(Math.abs(px - x), Math.abs(py - y)) <= 3;
      if (completes) { this.pending = null; this.onedge([px, py, x, y]); return; }
    }
    if (this.#ends && !this.#ends.has(key(x, y))) { this.refused = this.pending ? "end" : "start"; return; }
    this.pending = [x, y];
  };

  reset = () => { this.pending = null; this.refused = null; };
}
