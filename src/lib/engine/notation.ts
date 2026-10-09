// The engine repository's notation for points and edges (its docs/design/04-notation-and-protocol.md): points as GTP
// (columns A-T without I, rows 1-19 from the bottom), an edge as two points with the lower one first (by column,
// then by row): "D10-E11". The board works in numbers, [x1, y1, x2, y2] with 0-18 and y up; these convert.

/** An edge as its two points: [x1, y1, x2, y2], 0-18, y up. */
export type Edge = [number, number, number, number];

const COLUMNS = "ABCDEFGHJKLMNOPQRST"; // GTP: no I

export const pointName = (x: number, y: number) => `${COLUMNS[x]}${y + 1}`;

export function parsePoint(s: string): [number, number] {
  const x = COLUMNS.indexOf(s[0]), y = Number(s.slice(1)) - 1;
  if (x < 0 || !(y >= 0 && y <= 18)) throw new Error(`not a point: ${s}`);
  return [x, y];
}

/** The edge's one spelling: the lower point first. */
export function edgeName([ax, ay, bx, by]: Edge): string {
  const [p, q] = ax < bx || (ax === bx && ay < by) ? [[ax, ay], [bx, by]] : [[bx, by], [ax, ay]];
  return `${pointName(p[0], p[1])}-${pointName(q[0], q[1])}`;
}

export function parseEdge(s: string): Edge {
  const [a, b] = s.split("-");
  return [...parsePoint(a), ...parsePoint(b)] as Edge;
}

export const sameEdge = (a: Edge, b: Edge) =>
  (a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]) ||
  (a[0] === b[2] && a[1] === b[3] && a[2] === b[0] && a[3] === b[1]);
