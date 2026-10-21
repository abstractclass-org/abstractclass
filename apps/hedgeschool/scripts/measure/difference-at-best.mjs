// How much the area map's "After vs before" style (design 30) marks after the engine's best moves: on the test
// fixture's game (tests/fixtures/hedgefund-review.json), each edge that was the engine's first choice, the difference
// of the stored maps before and after it from its mover's side (ownership.ts, differenceMap), and the points marked at
// the smallest values 0, 0.1, 0.3 and 0.5; the strongest change; and the sum of the falls and of the rises, in points of
// the forecast. By edge: the stored results are by position.
//
//   node scripts/measure/difference-at-best.mjs
import { readFileSync } from "node:fs";
import { parseRecord } from "../../src/lib/game/record.ts";
import { edgeName, turnFromCount } from "../../src/lib/review/enclosure.ts";
import { differenceMap } from "../../src/lib/review/ownership.ts";
import { FIXTURE, median } from "./speed.mjs";

const fixture = JSON.parse(readFileSync(FIXTURE, "utf8")), moves = parseRecord(fixture.record).moves;
// Each position's deepest result, by its moves
const at = new Map();
for (const [key, a] of fixture.analyses) {
  const m = key.split("|").slice(4).join("|");
  if (!at.has(m) || a.visits > at.get(m).visits) at.set(m, a);
}
const rows = [];
for (let i = 0; i + 1 < moves.length; i++) {
  const a = at.get(moves.slice(0, i).join(" ")), b = at.get(moves.slice(0, i + 1).join(" "));
  if (!a?.ownership || !b?.ownership || edgeName(a.candidates[0].edge) !== moves[i]) continue;
  const mover = turnFromCount(i).turn % 2 === 1 ? 0 : 1; // Blue plays the odd turns
  const fall = a.ownership.map((o, k) => (mover === 0 ? 1 : -1) * (o - b.ownership[k]) / 100);
  const marked = min => differenceMap(a.ownership, b.ownership, mover, min).filter(Boolean).length;
  rows.push({ marks: [0, 10, 30, 50].map(marked), most: Math.max(...fall.map(Math.abs)),
              fell: fall.filter(x => x > 0).reduce((s, x) => s + x, 0), rose: -fall.filter(x => x < 0).reduce((s, x) => s + x, 0) });
}
console.log(`${rows.length} edges that were the engine's first choice`);
[0, 0.1, 0.3, 0.5].forEach((min, k) => console.log(`smallest value ${min}: points marked, median ${median(rows.map(r => r.marks[k]))}, ` +
                                                 `most ${Math.max(...rows.map(r => r.marks[k]))}`));
for (const key of ["most", "fell", "rose"])
  console.log(`${key}: median ${median(rows.map(r => r[key])).toFixed(2)}, most ${Math.max(...rows.map(r => r[key])).toFixed(2)}`);
