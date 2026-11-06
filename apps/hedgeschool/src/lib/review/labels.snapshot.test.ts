// The label snapshot: Hedge School's quality labels on its stored reviews (tests/fixtures/*-review.json), by move and
// by turn, in committed text files. The labels come from the code that the review page runs (routes/review/
// +page.svelte), with no engine search: GameAnalysis with the page's `enclosure` game and the engine's rules
// (describe_game, the CPU module with no network), the stored results (fromStore), data() and review(). So a change of
// @abstractclass/analysis or @abstractclass/review that moves a label of a stored review fails here. The failure names
// the move and the label. Cyanotype's game has its own label snapshot
// (apps/cyanotype/src/lib/review/labels.snapshot.engine.test.ts).
//
// Each line holds two labels. The first is the label with no book: no deployed site serves a book, so its review
// searches every position. The second is the label with the test book (tests/fixtures/test-book/prototype). The dev
// and preview servers serve that book, and the early edition's review reads it (book/place.svelte.ts). The test gives
// the review the book's values with reviewBook.ts's giveBook, with the book read from disk. Both labels come from the
// steps of storedReview.ts, which the review page's review snapshot and the annotated record of a stored game take too.
//
// The stored reviews: hedgefund-review.json (the layout test's game: the Greats, and turns of two edges that play the
// engine's best turn in the other order), the book games, which meet the test book (scripts/test-fixture.mjs), and
// twin-turn-review.json. The other reviews have a symmetric twin at the start only, which is a turn of one edge. The
// turn rule must not take a twin at the start of a turn of two edges as the same turn. twin-turn-review.json opens
// D10-G10, a symmetric position, and Red plays the first choice's mirror image and the line's second edge
// (scripts/test-fixture.mjs 2 --opening D10-G10,O11-Q10,N9-Q10 --edges 12 --out twin-turn-review.json). The last test
// fails if the stored reviews stop reaching one of these, or the book.
//
// After a change that moves labels on purpose, update the label snapshot: run
//   node --test --test-update-snapshots src/lib/review/labels.snapshot.test.ts
// in apps/hedgeschool, read the diff of tests/snapshots/review-labels/, and commit it with the change. The commit
// message says why each label moved. Without that flag, a missing snapshot file fails the test. The test reads the
// engine from static/engine (`npm run engine` first). Without it, the test skips, and in CI (the variable CI set) it
// fails: there the step `engine` of check:all fetches it first, so a missing engine is a fault, not a skip.
// Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import "@abstractclass/analysis/testing/svelteModules.ts";
import type { PositionQuery } from "@abstractclass/engine/protocol.ts";
import type { EnginePool } from "@abstractclass/engine/pool.ts";
import { hasEngine, nodeEngine } from "@abstractclass/engine/node-engine.mjs";
import { LABEL_VISITS, analysisKey, readAnalysisKey } from "@abstractclass/analysis/cache.ts";
import { STORES, dbPutMany } from "@abstractclass/storage/db.ts";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";
import { parseRecord, playerNames } from "#lib/game/record.ts";
import { readReviewFile } from "#lib/game/reviewFile.ts";
import { enclosure, moveName, PLAYER_NAME, review, sameEdge, type Review } from "./enclosure.ts";

memoryDb(queueMicrotask); // the store that fromStore reads
const { GameAnalysis } = await import("@abstractclass/analysis/analysis.svelte.ts");
const { OpeningBook } = await import("#lib/book/lookup.svelte.ts");
const { openStored } = await import("./storedReview.ts");

const root = fileURLToPath(new URL("../../..", import.meta.url));
const fixtures = join(root, "tests", "fixtures"), snapshots = join(root, "tests", "snapshots", "review-labels");
/** The stored reviews, by file name. */
const REVIEWS = ["hedgefund", "book-left", "book-never", "book-trap", "book-turn-label", "twin-turn"];

const missing = hasEngine(root) ? null : "no engine in static/engine: run `npm run engine` first";
const skip = missing && !process.env.CI ? missing : false;
const engine = missing ? null : await nodeEngine(root);
/** The engine's rules, as the pool's rules worker answers them (@abstractclass/engine/client.ts, describeGame). */
const rules = {
  describeGame: async (q: PositionQuery, from = 0) =>
    ({ reply: engine!.call({ id: "g", action: "describe_game", ...q, from }) }),
};
const readJson = async (url: string) => JSON.parse(readFileSync(join(fixtures, url), "utf8"));
const testBook = new OpeningBook("/test-book/prototype/index.json", readJson);

/** A stored review's quality labels, with no book (`plain`) and with the test book (`booked`). `inBook`: the positions
 *  that take the book's values. */
interface Labelled { plain: Review; booked: Review; inBook: boolean[] }

/** A stored review as the review page labels it from the store alone. */
async function labelled(name: string): Promise<Labelled> {
  if (missing) throw new Error(`${missing}. In CI, the label snapshot needs the engine and does not skip`);
  const file = readReviewFile(readFileSync(join(fixtures, `${name}-review.json`), "utf8"));
  const record = parseRecord(file.record), { model, visits } = file.review!;
  // How the record says the game ended, as the page gives it
  const ending = { result: record.result ?? record.tags.Result ?? null, termination: record.tags.Termination };
  // The results go to the store under a search of this review's own: the reviews share positions (the start, the
  // book's lines), and another review's deeper result would answer there. The labels read no area map (`map|` keys).
  const search = `labels-${name}`;
  const entries = file.analyses.map(([key, value]): [string, unknown] => {
    const k = readAnalysisKey(key);
    assert.ok(!k.map, `${name}: the test reads no area map`);
    return [analysisKey(search, k.model, k.moves.split(" "), k.visits, k.shape), value];
  });
  assert.equal(await dbPutMany(STORES.analysis, entries), entries.length);
  const pool = { rules, cancel() {} } as unknown as EnginePool;
  /** The review with this book, or with none, and its labels. */
  const labels = async (book: typeof testBook | null) => {
    const g = new GameAnalysis(enclosure, pool, record.moves, search);
    await openStored(g, visits, search, model, book);
    const d = g.data(playerNames(record.tags), ending); // none when the rules refuse the game
    assert.ok(d, `${name}: the rules refused the game: ${g.error}`);
    return { g, R: review(d, "lead", LABEL_VISITS) };
  };
  const [plain, booked] = await Promise.all([labels(null), labels(testBook)]);
  return { plain: plain.R, booked: booked.R, inBook: booked.g.positions.map((_, i) => !!booked.g.bookResults[i]) };
}
const reviews = new Map<string, Promise<Labelled>>();
const labelledOnce = (name: string) => reviews.get(name) ?? reviews.set(name, labelled(name)).get(name)!;

/** What a review with no book reaches of the rules that the label snapshot is for, and the positions that take the
 *  book's values: so that a stored review that stops reaching one shows in the diff, and the last test fails. */
function reaches({ plain: R, inBook }: Labelled) {
  const twins = (i: number) => R.data.analysis[i]?.candidates.filter(c => c.twinOf) ?? [];
  const twoEdge = R.turns.filter(t => t.label !== null && t.edges.length === 2);
  return {
    // The turns that play the engine's best turn in the other order (model.ts, sameTurn)
    swapped: twoEdge.filter(({ edges: [a, b], best }) => best?.length === 2
      && sameEdge(a.edge!, best[1]) && sameEdge(b.edge!, best[0])).length,
    twinPositions: R.data.analysis.flatMap((_, i) => (twins(i).length ? [i] : [])),
    twinStarts: twoEdge.filter(t => twins(t.start).length).length,
    playedTwins: R.edges.filter(e => e.edge && twins(e.index).some(c => sameEdge(c.edge, e.edge!))).length,
    greatEdges: R.edges.filter(e => e.label === "great").length,
    greatTurns: R.turns.filter(t => t.label === "great").length,
    bookPositions: inBook.flatMap((b, i) => (b ? [i] : [])),
  };
}

/** The text of a review's label snapshot: a header, then one line for each edge with its labels by edge, and one for
 *  each turn with its labels by turn. */
function snapshotOf(name: string, labels: Labelled): string {
  const { plain, booked, inBook } = labels, reached = reaches(labels), list = (l: number[]) => l.join(" ") || "none";
  const both = (a: string | null, b: string | null, at: number) =>
    `${(a ?? "-").padEnd(10)}  ${(b ?? "-").padEnd(10)}  ${inBook[at] ? "(book)" : ""}`.trimEnd();
  const side = (player: number) => PLAYER_NAME[player].padEnd(4);
  const byEdge = plain.edges.map((e, i) => `${String(e.index + 1).padStart(3)}`
    + `  turn ${String(plain.turnOf[e.index].number).padStart(2)}  ${side(e.player)}  ${moveName(e.edge).padEnd(8)}`
    + `  ${both(e.label, booked.edges[i].label, e.index)}`);
  const byTurn = plain.turns.map((t, i) => `turn ${String(t.number).padStart(2)}  ${side(t.player)}`
    + `  ${t.edges.map(e => moveName(e.edge)).join(" ").padEnd(17)}  ${both(t.label, booked.turns[i].label, t.start)}`);
  return [
    `# Hedge School's quality labels on tests/fixtures/${name}-review.json (labels.snapshot.test.ts).`,
    "# Update this file only as the test's header says. The commit message says why each label moved.",
    "# Each line: the label with no book (a deployed site), then with the test book (the dev and preview servers).",
    `# "(book)": the position before the move takes the book's values. "-": no label.`,
    `# Turns of two edges in the other order than the engine's best turn: ${reached.swapped}`,
    `# Positions with a symmetric twin: ${list(reached.twinPositions)}. Turns of two edges that start at one:`
      + ` ${reached.twinStarts}. Played edges that are a twin: ${reached.playedTwins}`,
    `# Greats: ${reached.greatEdges} by edge, ${reached.greatTurns} by turn`,
    `# Positions that take the book's values: ${list(reached.bookPositions)}`,
    "", "[by edge]", ...byEdge, "", "[by turn]", ...byTurn, "",
  ].join("\n");
}

for (const name of REVIEWS) {
  test(`${name}-review.json: every quality label, by edge and by turn, with no book and with the test book, is the `
       + "label snapshot's", { skip }, async t => {
    t.assert.fileSnapshot(snapshotOf(name, await labelledOnce(name)), join(snapshots, `${name}.txt`),
                          { serializers: [s => s] });
  });
}

test("the stored reviews reach the turn rules, the twins, the Greats and the book that the label snapshot is for",
     { skip }, async () => {
  const all = await Promise.all(REVIEWS.map(async name => reaches(await labelledOnce(name))));
  const some = (f: (r: ReturnType<typeof reaches>) => number) => all.some(r => f(r) > 0);
  assert.ok(some(r => r.swapped), "no turn plays the engine's best turn in the other order");
  assert.ok(some(r => r.twinPositions.length), "no position with a symmetric twin");
  assert.ok(some(r => r.twinStarts), "no turn of two edges starts at a position with a symmetric twin");
  assert.ok(some(r => r.greatEdges) && some(r => r.greatTurns), "no Great, by edge and by turn");
  assert.ok(some(r => r.bookPositions.length), "no position takes the test book's values");
});
