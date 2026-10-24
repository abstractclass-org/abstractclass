// The engine repository's notation for points and edges (its docs/design/04-notation-and-protocol.md): points as GTP
// (columns A-T without I, rows 1-19 from the bottom), an edge as two points with the lower one first (by column,
// then by row): "D10-E11". The board works in numbers, [x1, y1, x2, y2] with 0-18 and y up; these convert. The mirror
// image of an edge and of a position, for the opening book (design 32), is here too.

/** An edge as its two points: [x1, y1, x2, y2], 0-18, y up. */
export type Edge = [number, number, number, number];

const COLUMNS = "ABCDEFGHJKLMNOPQRST"; // GTP: no I

/** The standard start in the position notation (the /notation page). */
export const STANDARD_START = "A10-D10 Q10-T10 b1 0/0 0";
/** A set-up start as the site keeps it: its fields one space apart, or undefined for none or for the standard start,
 *  which is no set-up start (a board from it keeps the standard start's stored results). */
export function setUpStart(position: string | null | undefined): string | undefined {
  const p = position?.trim().replace(/\s+/g, " ");
  return p && p !== "?" && p !== "-" && p !== STANDARD_START ? p : undefined;
}

export const pointName = (x: number, y: number) => `${COLUMNS[x]}${y + 1}`;

export function parsePoint(s: string): [number, number] {
  const x = COLUMNS.indexOf(s[0]), y = Number(s.slice(1)) - 1;
  if (x < 0 || !(y >= 0 && y <= 18)) throw new Error(`not a point: ${s}`);
  return [x, y];
}

/** The edge with its lower point first, by column, then by row (the notation's spelling). */
export function canonical([ax, ay, bx, by]: Edge): Edge {
  return ax < bx || (ax === bx && ay < by) ? [ax, ay, bx, by] : [bx, by, ax, ay];
}
/** The order of a position's list of edges, each canonical: by their first points, then by their second points. */
export const byPoints = (a: Edge, b: Edge) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || a[3] - b[3];

/** The edge's one spelling: the lower point first. */
export function edgeName(edge: Edge): string {
  const [ax, ay, bx, by] = canonical(edge);
  return `${pointName(ax, ay)}-${pointName(bx, by)}`;
}

export function parseEdge(s: string): Edge {
  const [a, b] = s.split("-");
  return [...parsePoint(a), ...parsePoint(b)] as Edge;
}

// The mirror image: row r to row 20 - r (y to 18 - y), the symmetry that the start has (protocol 0.4's twins,
// @abstractclass/engine/protocol.ts). A position's mirror image is the same position for the rules and the engine.
const mirrorY = ([ax, ay, bx, by]: Edge): Edge => [ax, 18 - ay, bx, 18 - by];
/** An edge's mirror image, in its one spelling. */
export const mirrorEdge = (s: string) => edgeName(mirrorY(parseEdge(s)));
/** A position's mirror image, in the position notation's one spelling: each list's edges mirrored with their marks,
 *  then sorted again (`byPoints`). */
export function mirrorPosition(position: string): string {
  const [blue, red, ...rest] = position.split(" ");
  const list = (field: string) => field === "-" ? field : field.split(",")
    .map(item => {
      const [, name, mark] = /^(.+?)([*+]?)$/.exec(item)!;
      return { edge: canonical(mirrorY(parseEdge(name))), mark };
    })
    .sort((u, v) => byPoints(u.edge, v.edge))
    .map(({ edge, mark }) => edgeName(edge) + mark).join(",");
  return [list(blue), list(red), ...rest].join(" ");
}

export const sameEdge = (a: Edge, b: Edge) =>
  (a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]) ||
  (a[0] === b[2] && a[1] === b[3] && a[2] === b[0] && a[3] === b[1]);
