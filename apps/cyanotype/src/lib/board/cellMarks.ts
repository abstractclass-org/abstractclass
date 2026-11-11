// A cell's size, and the kinds' marks (design 33, "The cells' marks"), for a pointy-top hex of radius 1 round (0, 0),
// as Cell.svelte draws a cell: a star cell's six-point star, and a wall's diagonal stripes. A Normal cell has no mark.
// The shapes, not the colours alone, tell the kinds apart: a shape against lines. Geometry only. The link preview
// picture (brand/card.ts) draws its cells at the board's size, with its own marks.

/** A cell's radius: a gap of 0.07 between two cells, so that each cell reads alone. */
export const CELL_SIZE = 0.93;

const SQRT3 = Math.sqrt(3);
type Point = [number, number];
/** A number as the paths write it, to three places. The rounding comes first, so that a path has no "-0.000". */
const num = (n: number) => (Math.round(n * 1000) / 1000).toFixed(3);
const closed = (ps: Point[]) => `M${ps.map(([x, y]) => `${num(x)} ${num(y)}`).join("L")}Z`;

/** Corner i of a pointy-top hex of radius r, clockwise from the top one, as hex.ts's hexPath. */
const corner = (r: number, i: number): Point => {
  const a = (Math.PI / 3) * i - Math.PI / 2;
  return [r * Math.cos(a), r * Math.sin(a)];
};

/** A six-point star of points `r` from the centre, each point towards one of the hex's corners: two equilateral
 *  triangles, as one outline of twelve points. */
const sixPointStar = (r: number) =>
  closed(Array.from({ length: 12 }, (_, i) => {
    const a = (Math.PI / 6) * i - Math.PI / 2, d = i % 2 ? r / SQRT3 : r;
    return [d * Math.cos(a), d * Math.sin(a)];
  }));

/** The part of a convex polygon on the side of the line where a·x + b·y ≤ c (Sutherland–Hodgman). */
function clipHalf(poly: Point[], a: number, b: number, c: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const dp = a * p[0] + b * p[1] - c, dq = a * q[0] + b * q[1] - c;
    if (dp <= 0) out.push(p);
    if (dp * dq < 0) {
      const t = dp / (dp - dq);
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return out;
}

/** Stripes at 45°, rising to the right, across a hex of radius r: bands of `width` with their middles at `offsets`
 *  from the centre. A band that misses the hex draws nothing. */
export function stripes(r: number, width: number, offsets: readonly number[]): string {
  const hex = Array.from({ length: 6 }, (_, i) => corner(r, i)), n = Math.SQRT1_2; // the bands' normal: (n, n)
  return offsets.map(o => {
    const band = clipHalf(clipHalf(hex, n, n, o + width / 2), -n, -n, -(o - width / 2));
    return band.length > 2 ? closed(band) : "";
  }).join("");
}

/** A star cell's mark: a six-point star, its points 0.64 from the centre. */
export const STAR = sixPointStar(0.64);
/** A wall's mark: three stripes 0.17 wide, their middles 0.38 apart, the middle one through the centre, across a hex
 *  of radius 0.76. */
export const STRIPES = stripes(0.76, 0.17, [-0.38, 0, 0.38]);
