// A mistake explained by what happens next (design 30). At a Mistake or a Blunder, the position after the move has its
// stored search and the engine's line from it. The rules play that line (LineStep: the edge each move cuts, and the
// regions and areas after it), and the opponent's next turn in it gives the facts: the mover's edges that it cuts, the
// regions that it closes, and the area that each player gains or loses. The caption comes from a template on these
// facts alone (design 01, principle 11). Where that turn closes and cuts nothing, the opponent's later turns of the line
// are read, as far as the line goes: the caller gives the line as far as the search trusts it (trustedLine).
import { PLAYER_NAME, edgeName, lineMovers, otherPlayer, pointName, type Edge, type LineStep, type Player, type Position,
         type Region, type Unit } from "./enclosure.ts";
import { inRing } from "./ownership.ts";

/** What the opponent's turn explained does, in the engine's line from the position after the mistake. */
export interface Explanation {
  turn: number; // which of the opponent's turns in the line: 1 is the next, 0 when none closes or cuts
  turns: number; // the opponent's whole turns in the line that were read
  edges: number; // the line's edges that the board draws: up to the end of that turn (0 when none)
  waits: boolean; // the mover has edges left in the turn before the opponent's
  cuts: Edge[]; // the mover's edges that the turn cuts
  closed: number; // the area that the opponent gains in the turn
  opened: number; // the area that the mover loses in the turn
  at: [number, number] | null; // a point of the largest region that the turn closes: the lattice point nearest its centre
  outline: [number, number][][]; // the rings of the regions that the turn closes, to outline on the board
}

/** A region's rings as one key: the same polygon from another vertex has the same key. */
const regionKey = (r: Region) => r.rings.map(ring => ring.map(([x, y]) => `${x},${y}`).sort().join(" ")).sort().join("|");

/** A ring's area and centre (the shoelace formula). */
function ringShape(ring: [number, number][]): { area: number; cx: number; cy: number } {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xj, yj] = ring[j], [xi, yi] = ring[i], f = xj * yi - xi * yj;
    a += f; cx += (xj + xi) * f; cy += (yj + yi) * f;
  }
  return a ? { area: Math.abs(a / 2), cx: cx / (3 * a), cy: cy / (3 * a) } : { area: 0, cx: ring[0][0], cy: ring[0][1] };
}

/** The point of the largest of these regions nearest its centre: a lattice point inside it or a corner of it, so that
 *  the point named is the region's, whatever its shape. */
function placeOf(regions: Region[]): [number, number] | null {
  const rings = regions.flatMap(r => r.rings);
  if (!rings.length) return null;
  const big = rings.map(ring => ({ ring, ...ringShape(ring) })).reduce((a, b) => (b.area > a.area ? b : a));
  const points = [...big.ring];
  for (let x = 0; x < 19; x++) for (let y = 0; y < 19; y++) if (inRing(big.ring, x, y)) points.push([x, y]);
  const d = ([x, y]: [number, number]) => (x - big.cx) ** 2 + (y - big.cy) ** 2;
  return points.reduce((a, b) => (d(b) < d(a) ? b : a));
}

/** The explanation of a mistake by `mover` from the position after it, `from`, with the engine's `line` from there and
 *  its `steps` (the rules' play of the line, as far as it came). Null where the line holds no whole turn of the
 *  opponent's. */
export function explainMistake(from: Position, line: Edge[], steps: LineStep[], mover: Player): Explanation | null {
  const n = Math.min(line.length, steps.length), movers = lineMovers(from, n), opponent = otherPlayer(mover);
  const state = (k: number) => (k === 0 ? { regions: from.regions, areas: from.areas ?? [0, 0] } : steps[k - 1]);
  let turns = 0;
  for (let k = 0; k < n;) {
    if (movers[k] !== opponent) { k++; continue; }
    let end = k;
    while (end < n && movers[end] === opponent) end++;
    // A turn that the line cuts short is not read: its facts are not whole
    if (end === n && (lineMovers(from, n + 1)[n] === opponent)) break;
    turns++;
    const before = state(k), after = state(end);
    const cuts = steps.slice(k, end).flatMap(s => (s.cut ? [s.cut] : []));
    const closed = Math.max(0, after.areas[opponent] - before.areas[opponent]);
    const opened = Math.max(0, before.areas[mover] - after.areas[mover]);
    if (cuts.length || closed > 0) {
      const had = new Set(before.regions[opponent].map(regionKey));
      const fresh = closed > 0 ? after.regions[opponent].filter(r => !had.has(regionKey(r))) : [];
      return { turn: turns, turns, edges: end, waits: k > 0, cuts, closed, opened, at: placeOf(fresh),
               outline: fresh.flatMap(r => r.rings) };
    }
    k = end;
  }
  return turns ? { turn: 0, turns, edges: 0, waits: false, cuts: [], closed: 0, opened: 0, at: null, outline: [] } : null;
}

const ORDINAL = ["", "next", "second", "third", "fourth", "fifth", "sixth"];
const area = (a: number) => `${Math.round(a)} ${Math.round(a) === 1 ? "point" : "points"} of area`;

/** The caption of an explanation, from its facts alone: what the opponent's turn cuts and closes, and the area that the
 *  mover loses. */
export function explanationCaption(x: Explanation, mover: Player, unit: Unit): string {
  const opponent = PLAYER_NAME[otherPlayer(mover)];
  if (!x.turn)
    return (x.turns === 1 ? `${opponent}'s next turn in the engine's line closes and cuts nothing.`
      : `${opponent}'s next ${x.turns} turns in the engine's line close and cut nothing.`) +
      " The points lost are spread over the board.";
  const subject = x.turn === 1 ? `After this ${unit}, ${x.waits ? `${opponent}'s next turn` : opponent}`
    : `In the engine's line, ${opponent}'s ${ORDINAL[x.turn] ?? `${x.turn}th`} turn from here`;
  const verbs = [
    ...(x.cuts.length ? [`cuts ${x.cuts.map(edgeName).join(" and ")}`] : []),
    ...(x.closed > 0 ? [`closes ${area(x.closed)}${x.at ? ` at ${pointName(...x.at)}` : ""}`] : []),
  ];
  const lost = x.opened > 0 ? ` ${PLAYER_NAME[mover]} loses ${area(x.opened)}.` : "";
  return `${subject} ${verbs.join(" and ")}.${lost}`;
}
