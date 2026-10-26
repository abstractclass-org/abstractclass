// The test book (design 32, "The book file"): the third prototype's book (beads abscls-tpaj.3, the variation's
// static/book-prototype/book.json, which its scripts/book-prototype/export.mjs wrote) in the site's own form
// (src/lib/book/form.ts), so that the explorer can be built before the engine repository's book comes (request 22).
// It is not the engine's book: the site's engine searched it in WebAssembly at 512 visits, with the site's network.
//
// It writes two books in tests/fixtures/test-book/, each an index.json and its parts. The dev and preview servers
// serve them at /test-book/ (vite.config.ts), and no build holds them.
// - prototype/: the prototype's 404 positions. The start's part holds the first two turns (the positions with 3 edges
//   or fewer). Each later position goes in the part of its first path's first edge: one part for each of Blue's first
//   moves.
// - cases/: hand-made cases for what the prototype's book lacks (CASES below), from a few of its positions and a few
//   added ones.
//
//   node scripts/test-book.mjs [book.json]   (in apps/hedgeschool; book.json: runs/book-prototype-3/book.json, a copy
//                                             of the prototype's file, which is not in Git)
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { BOOK_FORMAT, BOOK_VERSION } from "../src/lib/book/form.ts";
import { encodeArea, mirrorArea } from "../src/lib/book/area.ts";
import { mirrorEdge, mirrorPosition } from "../src/lib/engine/notation.ts";
import { turnFromCount } from "../src/lib/review/enclosure.ts";
import { isHard, moverWin } from "@abstractclass/analysis/model.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const input = process.argv[2] ?? join(root, "runs", "book-prototype-3", "book.json");
const prototype = JSON.parse(readFileSync(input, "utf8"));
if (prototype.format !== "hedge-school-book-prototype" || prototype.version !== 3)
  throw new Error(`${input}: not the third prototype's book`);
const OUT = "tests/fixtures/test-book"; // in apps/hedgeschool
const START_PART_EDGES = 3; // the start's part holds the positions with this many edges or fewer
const SHORT_VISITS = 32; // the prototype's short search for the traps (its grow.mjs, SHORT)

const nodes = prototype.nodes;
const r3 = x => Math.round(x * 1000) / 1000, r1 = x => Math.round(x * 10) / 10;
// The bounds cut to 0 to 1: the prototype's, as KataGo's, are the value less and plus its error times the error
// factor, and can pass them.
const valueOf = n => ({
  blueWin: r3(n.rv.w), low: r3(Math.max(0, n.rv.lo)), high: r3(Math.min(1, n.rv.hi)), lead: r1(n.rv.lead),
});

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
 *  position, through the enemy's turn after the trap. */
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
  const n = nodes[i], { turn, first } = turnFromCount(n.c);
  const best = n.e.find(e => e.m === n.best), win = e => moverWin(nodes[e.to].rv.w, n.p);
  return {
    position: n.k, mover: n.p === 0 ? "b" : "r", turn, edge: first ? 1 : 2,
    parents: parentsOf[i].map(p => ({ position: nodes[p.from].k, move: p.move })),
    value: valueOf(n), complexity: r3(n.cx),
    moves: [...n.e].sort((u, v) => (v === best) - (u === best) || win(v) - win(u)).map(e => ({
      move: e.m, to: nodes[e.to].k, value: valueOf(nodes[e.to]),
      end: { count: nodes[endOf[e.to]].c, complexity: r3(nodes[endOf[e.to]].cx) }, last: lastOf[e.to],
      trap: e.trap ? { short: r3(e.short), refutation: refutation(e.to, n.p) } : undefined,
    })),
    outside: n.tv ? { move: n.tv.m, blueWin: r3(n.tv.w) } : null,
    area: encodeArea(n.a.ownership),
  };
}

const NOTE = "A test book, not the engine's book: the third prototype's book (Hedge School, beads abscls-tpaj.3), " +
  "searched by the site's engine in WebAssembly at 512 visits.";
/** Writes a book: `parts` lists each part's positions, the start's part first. A part with `missing` is in the index
 *  only. JSON leaves out each field that is undefined. */
function writeBook(dir, name, note, parts) {
  const out = join(root, OUT, dir);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const index = JSON.stringify({
    format: BOOK_FORMAT, version: BOOK_VERSION,
    source: { name, made: prototype.made, network: prototype.network, visits: prototype.visits, shortVisits: SHORT_VISITS, note },
    start: parts[0].positions[0].position,
    parts: parts.map((p, i) => ({ file: `${i}.json`, positions: p.positions.map(q => q.position) })),
  });
  writeFileSync(join(out, "index.json"), index);
  let bytes = index.length;
  for (const [i, p] of parts.entries()) {
    if (p.missing) continue;
    const text = JSON.stringify({ format: BOOK_FORMAT, version: BOOK_VERSION, positions: p.positions });
    writeFileSync(join(out, `${i}.json`), text);
    bytes += text.length;
  }
  const count = parts.reduce((s, p) => s + p.positions.length, 0);
  console.log(`${OUT}/${dir}: ${count} positions in ${parts.length} parts, ${bytes} bytes`);
}

// --- The test book ----------------------------------------------------------------------------------------------
const book = nodes.map((_, i) => position(i));
const firstEdges = [...new Set(nodes.map(n => n.moves[0]).filter(Boolean))];
const parts = [{ positions: [] }, ...firstEdges.map(() => ({ positions: [] }))];
for (const [i, n] of nodes.entries())
  parts[n.c <= START_PART_EDGES ? 0 : 1 + firstEdges.indexOf(n.moves[0])].positions.push(book[i]);
writeBook("prototype", "Test book from the third prototype", NOTE, parts);

// Each position's symbol, from its values by the prototype's rule (its grow.mjs, `symbol`), as the prototype gave it:
// the form holds what the symbols need.
const CUTS = prototype.cuts;
function symbol(p) {
  const w = p.value.blueWin, d = Math.abs(w - 0.5), up = w > 0.5;
  if (d <= CUTS[0] - 0.5) return isHard(p.complexity) ? "∞" : "=";
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
// - A mirror image: the book stores LINE_B's position after MIRRORED edges as its mirror image. The move to it and its
//   move from it have `mirrored`.
// - A part that fails to load: the position after D10-G9 (a book move of the start) is in part 2, which the index
//   lists and no file holds.
// - A line that leaves the book and comes back: LINE_B in the test book (prototype/): only its start and its end are
//   there. The unit tests walk it (src/lib/book/book.test.ts).
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
const MIRRORED = 4; // the edges before LINE_B's position that the book stores as its mirror image
const FAILING = "D10-G9"; // the start's book move to the position in the part that fails

const byPosition = new Map(book.map(p => [p.position, p]));
/** The test book's positions along `moves` by its book moves: the start, then the position after each move. */
function line(moves) {
  const out = [book[0]];
  for (const move of moves) {
    const m = out.at(-1).moves.find(m => m.move === move);
    if (!m) throw new Error(`not in the prototype's book: ${moves.join(" ")}`);
    out.push(byPosition.get(m.to));
  }
  return out;
}

function writeCases() {
  // a[k]: LINE_A's position after k edges. b[k]: LINE_B's position after k edges, as the book stores it.
  const a = line(LINE_A), end = a[7], failing = line([FAILING])[1];
  const b = [book[0].position, ...ADDED.map((p, j) => (j + 1 === MIRRORED ? mirrorPosition(p) : p)), end.position];
  const kept = new Set([...a, failing].map(p => p.position).concat(b));
  const trimmed = p => ({ ...p, parents: p.parents.filter(q => kept.has(q.position)), moves: p.moves.filter(m => kept.has(m.to)) });
  // Each of LINE_B's moves has the values of LINE_A's position after as many edges, and the end and the depth of
  // LINE_A's last move.
  const { end: lineEnd, last } = a[6].moves.find(m => m.to === end.position);
  const flipped = k => k === MIRRORED;
  /** LINE_B's move from its position after k edges, in that position's stored orientation. */
  const moveB = k => ({
    move: flipped(k) ? mirrorEdge(LINE_B[k]) : LINE_B[k], to: b[k + 1], mirrored: flipped(k) !== flipped(k + 1) || undefined,
    value: a[k + 1].value, end: lineEnd, last,
  });
  const parentB = k => {
    const { move, mirrored } = moveB(k - 1);
    return { position: b[k - 1], move, mirrored };
  };
  const added = ADDED.map((_, j) => {
    const k = j + 1, like = a[k], turn = edge => (flipped(k) ? mirrorEdge(edge) : edge);
    return {
      ...like, position: b[k], parents: [parentB(k)], moves: [moveB(k)],
      outside: like.outside && { ...like.outside, move: turn(like.outside.move) },
      area: flipped(k) ? mirrorArea(like.area) : like.area,
    };
  });
  const start = trimmed(book[0]), joined = trimmed(end);
  // LINE_B's first edge goes among the start's moves after the best, by Blue's win chance (Blue moves)
  const first = moveB(0), at = start.moves.findIndex((m, i) => i > 0 && m.value.blueWin < first.value.blueWin);
  start.moves.splice(at < 0 ? start.moves.length : at, 0, first);
  joined.parents.push(parentB(7));
  writeBook("cases", "Test book: hand-made cases", `${NOTE} Hand-made cases for the explorer's tests: a few of its ` +
    "positions, each with only its parents and its moves among them, and six added ones, whose values are copied, not " +
    "searched (scripts/test-book.mjs, the cases).", [
    { positions: [start, ...a.slice(1, 4).map(trimmed), ...added.slice(0, 3)] },
    { positions: [...a.slice(4, 7).map(trimmed), joined, ...added.slice(3)] },
    { positions: [trimmed(failing)], missing: true },
  ]);
}
writeCases();
