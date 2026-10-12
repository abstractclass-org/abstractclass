// Constellation's game export (constellation.blueshrimp.uk, the analysis board's Export), turned into this site's
// game record (design 11, "Constellation's export"). The export is one line: the start, then one item for each turn.
//
//   [B:A10-D10 R:P10-S10] D10-A7 P10-M10-J7 A7-A10,A7-D4 …
//
// A turn is one edge (`D10-A7`), two edges that meet, as a path (`P10-M10-J7`: P10-M10, then M10-J7), or two edges
// apart, separated by a comma (`A7-A10,A7-D4`). Constellation's columns are A to S, with I. This site's are A to T
// without I (GTP's), so a column keeps its place: P is Q, M is N, J is K. Its rows count from the bottom, as this
// site's (checked on its board). Only games from the standard start are read.
import { canonicalEdge } from "./record.ts";

const START = /^\s*\[([^\]]*)\]/;
const STANDARD = { B: "A10-D10", R: "P10-S10" };
const OUR_COLUMNS = "ABCDEFGHJKLMNOPQRST";

/** Whether the text looks like Constellation's export: its start in brackets, with Blue's and Red's edges. */
export const isConstellation = (text: string) => /^\s*\[(?:[A-Z]:\S*\s+)*B:\S+\s+R:\S+\]/.test(text);

/** A point in Constellation's notation as this site writes it. */
function point(p: string): string {
  const m = /^([A-S])(\d{1,2})$/.exec(p.toUpperCase());
  const row = m ? Number(m[2]) : 0;
  if (!m || row < 1 || row > 19) throw new Error(`Not a point of Constellation's board: ${p}.`);
  return OUR_COLUMNS[m[1].charCodeAt(0) - 65] + row;
}

/** Constellation's export as this site's game record. Throws an Error that tells the player what is wrong. */
export function constellationRecord(text: string): string {
  const start = START.exec(text);
  if (!start) throw new Error("A Constellation export starts with its start position in brackets.");
  const fields = Object.fromEntries(start[1].trim().split(/\s+/).map(f => f.split(":")));
  if (fields.B !== STANDARD.B || fields.R !== STANDARD.R)
    throw new Error(`Only games from the standard start can be imported (Constellation's [B:${STANDARD.B} R:${STANDARD.R}]).`);
  const items = text.slice(start[0].length).trim().split(/\s+/).filter(Boolean);
  if (!items.length) throw new Error("The export has no moves.");
  const turns = items.map((item, k) => {
    const edges = item.split(",").flatMap(part => {
      const points = part.split("-").map(point);
      if (points.length < 2) throw new Error(`Turn ${k + 1}: not an edge: ${part}.`);
      return points.slice(1).map((p, i) => canonicalEdge(`${points[i]}-${p}`));
    });
    if (edges.length > 2) throw new Error(`Turn ${k + 1} has ${edges.length} edges: a turn has two at most.`);
    return `${k + 1}. ${edges.join(" ")}`;
  });
  return `[Site "Constellation"]\n\n${turns.join(" ")}`;
}
