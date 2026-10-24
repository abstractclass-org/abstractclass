// The test book (design 32, "The book file"): the third prototype's book (beads abscls-tpaj.3, the branch's
// static/book-prototype/book.json, which its scripts/book-prototype/export.mjs wrote) in the site's own form
// (src/lib/book/form.ts), so that the explorer can be built before the engine repository's book comes (request 22).
// It is not the engine's book: the site's engine searched it in WebAssembly at 512 visits, with the site's network.
//
// It writes two books, each an index.json and its parts:
// - static/test-book/prototype/: the prototype's 404 positions. The start's part holds the first two turns (the
//   positions with 3 edges or fewer). Each later position goes in the part of its first path's first edge: one part
//   for each of Blue's first moves.
// - static/test-book/cases/: hand-made cases for what the prototype's book lacks (CASES below), from a few of its
//   positions and a few added ones.
//
//   node scripts/test-book.mjs [book.json]   (in apps/hedgeschool; book.json: runs/book-prototype-3/book.json)
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { BOOK_FORMAT, BOOK_VERSION } from "../src/lib/book/form.ts";
import { encodeArea, mirrorArea } from "../src/lib/book/area.ts";
import { mirrorEdge, mirrorPosition } from "../src/lib/engine/notation.ts";
import { turnFromCount } from "../src/lib/review/enclosure.ts";
import { HARD } from "@abstractclass/analysis/labels.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const input = process.argv[2] ?? join(root, "runs", "book-prototype-3", "book.json");
const prototype = JSON.parse(readFileSync(input, "utf8"));
if (prototype.format !== "hedge-school-book-prototype" || prototype.version !== 3)
  throw new Error(`${input}: not the third prototype's book`);
const START_PART = 3; // the start's part: the positions with this many edges or fewer
const SHORT_VISITS = 32; // the prototype's short search for the traps (its grow.mjs, SHORT)

const nodes = prototype.nodes;
const r3 = x => Math.round(x * 1000) / 1000, r1 = x => Math.round(x * 10) / 10;
const moverWin = (blueWin, mover) => (mover === "b" ? blueWin : 1 - blueWin);
const valueOf = n => ({ blueWin: r3(n.rv.w), low: r3(n.rv.lo), high: r3(n.rv.hi), lead: r1(n.rv.lead) });

// The prototype keeps a node's moves in the order of its growth, and its parents only as its first path (`moves`).
const parentsOf = nodes.map(() => []);
nodes.forEach((n, i) => n.e.forEach(e => parentsOf[e.to].push({ from: i, move: e.m })));
for (const [i, ps] of parentsOf.entries()) {
  const first = ps.findIndex(p => nodes[p.from].moves.join(" ") === nodes[i].moves.slice(0, -1).join(" "));
  if (i > 0 && first < 0) throw new Error(`${nodes[i].k}: no parent on its first path`);
  if (first > 0) ps.unshift(...ps.splice(first, 1));
}
// The end of the main line under each node (its best move while that move is in the book), and its deepest position.
// The nodes come parents first.
const endOf = [], lastOf = [];
for (let i = nodes.length - 1; i >= 0; i--) {
  const n = nodes[i], best = n.e.find(e => e.m === n.best);
  endOf[i] = best ? endOf[best.to] : i;
  lastOf[i] = Math.max(n.c, ...n.e.map(e => lastOf[e.to]));
}
/** A trap's refutation: from the position after it, the book's refutation edge or else its best move at each
 *  position, through the opponent's turn after the trap. */
function refutation(at, trapper) {
  const line = [];
  for (let n = nodes[at]; ;) {
    const e = n.e.find(k => k.kind === "refute") ?? n.e.find(k => k.m === n.best);
    if (!e) return line;
    line.push(e.m);
    const next = nodes[e.to];
    if (n.p !== trapper && next.p === trapper) return line;
    n = next;
  }
}

/** A prototype's node in the site's form. */
function position(i) {
  const n = nodes[i], mover = n.p === 0 ? "b" : "r", { turn, first } = turnFromCount(n.c);
  const best = n.e.find(e => e.m === n.best), byWin = e => moverWin(nodes[e.to].rv.w, mover);
  const order = [...(best ? [best] : []), ...n.e.filter(e => e !== best).sort((u, v) => byWin(v) - byWin(u))];
  return {
    position: n.k, mover, turn, edge: first ? 1 : 2,
    parents: parentsOf[i].map(p => ({ position: nodes[p.from].k, move: p.move })),
    value: valueOf(n), complexity: r3(n.cx),
    moves: order.map(e => ({
      move: e.m, to: nodes[e.to].k, value: valueOf(nodes[e.to]),
      end: { count: nodes[endOf[e.to]].c, complexity: r3(nodes[endOf[e.to]].cx) }, last: lastOf[e.to],
      ...(e.trap ? { trap: { short: r3(e.short), refutation: refutation(e.to, n.p) } } : {}),
    })),
    outside: n.tv ? { move: n.tv.m, blueWin: r3(n.tv.w) } : null,
    area: encodeArea(n.a.ownership),
  };
}

const NOTE = "A test book, not the engine's book: the third prototype's book (Hedge School, beads abscls-tpaj.3), " +
  "searched by the site's engine in WebAssembly at 512 visits.";
const source = (name, note) => ({
  name, made: prototype.made, network: prototype.network, visits: prototype.visits, shortVisits: SHORT_VISITS, note,
});
/** Writes a book: `parts` lists each part's positions, the start's part first. A part with `missing` is in the index
 *  only. */
function writeBook(dir, name, note, parts) {
  const out = join(root, "static", "test-book", dir);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const files = parts.map((_, i) => `${i}.json`);
  const index = {
    format: BOOK_FORMAT, version: BOOK_VERSION, source: source(name, note), start: parts[0].positions[0].position,
    parts: parts.map((p, i) => ({ file: files[i], positions: p.positions.map(q => q.position) })),
  };
  writeFileSync(join(out, "index.json"), JSON.stringify(index));
  let bytes = JSON.stringify(index).length;
  for (const [i, p] of parts.entries()) {
    if (p.missing) continue;
    const text = JSON.stringify({ format: BOOK_FORMAT, version: BOOK_VERSION, positions: p.positions });
    writeFileSync(join(out, files[i]), text);
    bytes += text.length;
  }
  const count = parts.reduce((s, p) => s + p.positions.length, 0);
  console.log(`static/test-book/${dir}: ${count} positions in ${parts.length} parts, ${bytes} bytes`);
}

// --- The test book ----------------------------------------------------------------------------------------------
const book = nodes.map((_, i) => position(i));
const firstEdges = [...new Set(nodes.map(n => n.moves[0]).filter(Boolean))];
const parts = [{ positions: [] }, ...firstEdges.map(() => ({ positions: [] }))];
for (const [i, n] of nodes.entries())
  parts[n.c <= START_PART ? 0 : 1 + firstEdges.indexOf(n.moves[0])].positions.push(book[i]);
writeBook("prototype", "Test book from the third prototype", NOTE, parts);

// Each position's symbol, from its values by the prototype's rule (its grow.mjs, `symbol`), as the prototype gave it:
// the form holds what the symbols need.
const CUTS = prototype.cuts;
function symbol(p) {
  const w = p.value.blueWin, d = Math.abs(w - 0.5), up = w > 0.5;
  if (d <= CUTS[0] - 0.5) return p.complexity >= HARD ? "∞" : "=";
  if (d <= CUTS[1] - 0.5) return up ? "⩲" : "⩱";
  if (d <= CUTS[2] - 0.5) return up ? "±" : "∓";
  return up ? "+−" : "−+";
}
const differ = book.filter((p, i) => symbol(p) !== nodes[i].s).length;
console.log(`symbols from the values: ${book.length - differ} as the prototype's, ${differ} not (at a cut-off: its file rounds)`);

// --- The hand-made cases ----------------------------------------------------------------------------------------
// - Move orders from different turns: LINE_B reaches the end of LINE_A, a position of the prototype's book, with
//   Blue's edges of turns 1 and 3 swapped. Its positions after 1 to 6 edges are not in the prototype's book (ADDED):
//   they are added here, each with the values of LINE_A's position after as many edges (not searched). So the end of
//   LINE_A has two parents, and LINE_B's first edge is a book move of the start.
// - A mirror image: the book stores LINE_B's position after 4 edges as its mirror image. The move to it and its move
//   from it have `mirrored`.
// - A part that fails to load: the position after D10-G9 (a book move of the start) is in part 2, which the index
//   lists and no file holds.
// - A line that leaves the book and comes back: LINE_B in the test book (static/test-book/prototype): only its start
//   and its end are there. The unit tests walk it (src/lib/book/book.test.ts).
// Each other position keeps only its parents and its moves among the cases' positions.
const LINE_A = ["A10-D9", "O9-Q10", "L10-O9", "D10-G12", "D9-E11", "H11-L10", "G14-H11"];
const LINE_B = ["D10-G12", "O9-Q10", "L10-O9", "A10-D9", "D9-E11", "H11-L10", "G14-H11"];
// LINE_B's positions after 1 to 6 edges, as the engine's describe_game gives them (the unit tests check them).
const ADDED = [
  "A10-D10,D10-G12* Q10-T10 r2 0/0 1",
  "A10-D10,D10-G12* O9-Q10+,Q10-T10 r1 0/0 2",
  "A10-D10,D10-G12 L10-O9*,O9-Q10*,Q10-T10 b2 0/0 3",
  "A10-D9+,A10-D10,D10-G12 L10-O9*,O9-Q10*,Q10-T10 b1 0/0 4",
  "A10-D9*,A10-D10,D9-E11*,D10-G12 L10-O9,O9-Q10,Q10-T10 r2 1.875/0 5",
  "A10-D9*,A10-D10,D9-E11*,D10-G12 H11-L10+,L10-O9,O9-Q10,Q10-T10 r1 1.875/0 6",
];
const MIRRORED = 3; // the index in ADDED of the position that the book stores as its mirror image
const FAILING = "D10-G9"; // the start's book move to the position in the part that fails

/** The test book's position after `moves` from the start, by its book moves. */
function after(moves) {
  const byPosition = new Map(book.map(p => [p.position, p]));
  let p = book[0];
  for (const move of moves) {
    const m = p.moves.find(m => m.move === move);
    if (!m) throw new Error(`not in the prototype's book: ${moves.join(" ")}`);
    p = byPosition.get(m.to);
  }
  return p;
}

function writeCases() {
  const lineA = LINE_A.map((_, k) => after(LINE_A.slice(0, k + 1))), end = lineA[6], failing = after([FAILING]);
  if (lineA.length !== 7 || ADDED.length !== 6) throw new Error("the cases' lines changed");
  const stored = ADDED.map((p, k) => (k === MIRRORED ? mirrorPosition(p) : p));
  const kept = new Set([book[0], failing, ...lineA].map(p => p.position).concat(stored));
  const copy = p => ({ ...p, parents: p.parents.filter(q => kept.has(q.position)), moves: p.moves.filter(m => kept.has(m.to)) });
  // LINE_B's positions from the start to its end: the move from each to the next, as the next is stored, and its
  // values. The end and the depth of each move are those of the line's end.
  const lineB = [book[0].position, ...stored, end.position];
  const valuesAt = k => (k === 7 ? end : lineA[k - 1]); // the values of LINE_B's position after k edges
  const mirroredAt = k => k - 1 === MIRRORED; // whether the book stores LINE_B's position after k edges mirrored
  const at = book.indexOf(end), lineEnd = { count: nodes[endOf[at]].c, complexity: r3(nodes[endOf[at]].cx) };
  const lineLast = lastOf[at];
  const moveB = k => { // LINE_B's move from its position after k edges, in that position's stored orientation
    const turned = mirroredAt(k) !== mirroredAt(k + 1);
    return {
      move: mirroredAt(k) ? mirrorEdge(LINE_B[k]) : LINE_B[k], to: lineB[k + 1], ...(turned ? { mirrored: true } : {}),
      value: valuesAt(k + 1).value, end: lineEnd, last: lineLast,
    };
  };
  const parentB = k => {
    const { move, mirrored } = moveB(k - 1);
    return { position: lineB[k - 1], move, ...(mirrored ? { mirrored } : {}) };
  };
  const added = stored.map((position, j) => {
    const k = j + 1, like = valuesAt(k), mirrored = mirroredAt(k);
    return {
      ...like, position, parents: [parentB(k)], moves: [moveB(k)],
      outside: like.outside && { ...like.outside, move: mirrored ? mirrorEdge(like.outside.move) : like.outside.move },
      area: mirrored ? mirrorArea(like.area) : like.area,
    };
  });
  const start = copy(book[0]);
  start.moves.push(moveB(0));
  const joined = copy(end);
  joined.parents.push(parentB(7));
  writeBook("cases", "Test book: hand-made cases", `${NOTE} Hand-made cases for the explorer's tests: a few of its ` +
    "positions, each with only its parents and its moves among them, and six added ones, whose values are copied, not " +
    "searched (scripts/test-book.mjs, the cases).", [
    { positions: [start, ...lineA.slice(0, 3).map(copy), ...added.slice(0, 3)] },
    { positions: [...lineA.slice(3, 6).map(copy), joined, ...added.slice(3)] },
    { positions: [copy(failing)], missing: true },
  ]);
}
writeCases();
