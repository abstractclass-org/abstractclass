// A snapshot of Hedge School's labels on its stored reviews (tests/fixtures/*-review.json), by move and by turn. The
// labels come from the code that the review page runs, with no engine search: GameAnalysis reads the stored results
// (fromStore), data() gives the review's input, and review() labels it (routes/review/+page.svelte). So a change of
// @abstractclass/analysis or @abstractclass/review that moves one label of a stored review fails here, and the failure
// names the move and the label. Cyanotype's shared code is the same, but this test does not cover its game.
//
// The stored reviews: hedgefund-review.json (the layout test's game: the Greats, and turns of two edges that play the
// engine's best turn in the other order) and the book games (more of the same, and one played edge that is a symmetric
// twin). None of them reaches a symmetric twin at the start of a turn of two edges, which the turn rule must not take
// as the same turn. twin-turn-review.json does: it opens D10-G10, a symmetric position, and Red plays the first choice's
// mirror image and the line's second edge (scripts/test-fixture.mjs 2 --opening D10-G10,O11-Q10,N9-Q10 --edges 12 --out
// twin-turn-review.json). The last test fails if the stored reviews stop reaching one of these.
//
// The engine's rules only give a position's mover, scores and end, which a game's moves decide: they come from the
// notation (labelGame). The page's own `enclosure` gives every other part of the game that the labels read (the
// moves' names and equality, the turns, the score scale). The opening book is left out: the page gives it the book of
// its edition (reviewBook.ts), which is not in this repository.
//
// To update the snapshot on purpose, after a change that is meant to move labels: run
//   UPDATE_LABEL_SNAPSHOT=1 node --test src/lib/review/labels.snapshot.test.ts
// in apps/hedgeschool, read the diff of tests/snapshots/review-labels/, and commit it with the change. The commit
// message says why each label moved. A missing snapshot file fails the test: it is never written without the variable,
// and never in CI. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import "@abstractclass/analysis/testing/svelteModules.ts";
import type { PositionQuery } from "@abstractclass/engine/protocol.ts";
import type { EnginePool } from "@abstractclass/engine/pool.ts";
import { LABEL_VISITS, readAnalysisKey } from "@abstractclass/analysis/cache.ts";
import type { Game } from "@abstractclass/analysis/game.ts";
import { STORES, dbPutMany } from "@abstractclass/storage/db.ts";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";
import { moverOf } from "#lib/editor/position.ts";
import { edgeName, sameEdge } from "#lib/engine/notation.ts";
import { parseRecord, playerNames } from "#lib/game/record.ts";
import { readReviewFile } from "#lib/game/reviewFile.ts";
import { enclosure, review, type Enclosure, type Review, type TurnReview } from "./enclosure.ts";

memoryDb(); // the store that fromStore reads
const { GameAnalysis } = await import("@abstractclass/analysis/analysis.svelte.ts");

const root = fileURLToPath(new URL("../../..", import.meta.url));
const fixtures = join(root, "tests", "fixtures"), snapshots = join(root, "tests", "snapshots", "review-labels");
/** The stored reviews, by file name: each reaches what the header of its snapshot counts (reaches). */
const REVIEWS = ["hedgefund", "book-left", "book-never", "book-trap", "book-turn-label", "twin-turn"];

/** A position as the engine's describe gives it, to the little that the labels read of it. */
interface Fields { mover: 0 | 1; scores: [number, number]; over: boolean; count: number }

/** The page's Enclosure with the parts that draw the board left out: a position is its mover, scores, end and edge
 *  count, a move played its player and edge. The review reads nothing else (model.ts, review). */
const labelGame = {
  ...enclosure,
  position: (f: Fields) => ({ player: f.mover, scores: f.scores, over: f.over, count: f.count }),
  played: (name: string, before: Fields) => ({ player: before.mover, edge: name === "pass" ? null : enclosure.parseMove(name) }),
  rules: () => null,
  step: () => null,
} as unknown as Game<Enclosure>;

/** The scores a record's result tag gives ("r+377.651497": Red by 377.65), or none while the game goes on. */
function finalScores(result: string | undefined): [number, number] | null {
  if (result === undefined || result === "*") return null;
  const m = /^([br])\+(\d+(?:\.\d+)?)$/.exec(result);
  if (!m) throw new Error(`the test reads no result ${result}`);
  return m[1] === "b" ? [Number(m[2]), 0] : [0, Number(m[2])];
}

/** The rules of a game of `moves` edges, from the notation: no passes, which no stored review has. */
function rulesOf(moves: number, result: string | undefined) {
  const end = finalScores(result);
  return {
    describeGame: async (q: PositionQuery) => ({
      reply: {
        positions: Array.from({ length: q.moves.length + 1 }, (_, count): Fields => ({
          mover: moverOf(count).player, count, over: count === moves && !!end, scores: count === moves && end ? end : [0, 0],
        })),
      },
    }),
  };
}

/** The review of a stored review file, as the review page makes it from the store alone. */
async function reviewOf(name: string): Promise<Review> {
  const file = readReviewFile(readFileSync(join(fixtures, `${name}-review.json`), "utf8"));
  const record = parseRecord(file.record);
  assert.ok(!record.moves.includes("pass"), `${name} has a pass: rulesOf reads none`);
  // The results go to the store under a search of this review's own, so that no other review's results answer.
  const search = `snapshot-${name}`;
  const entries = file.analyses.map(([key, value]): [string, unknown] => {
    const k = readAnalysisKey(key);
    return [key.replace(`${k.shape}|${k.search}|`, `${k.shape}|${search}|`), value];
  });
  assert.equal(await dbPutMany(STORES.analysis, entries), entries.length);
  const model = readAnalysisKey(file.analyses[0][0]).model;
  const pool = { search, model: { sha256: model }, rules: rulesOf(record.moves.length, record.tags.Result),
                 cancel() {} } as unknown as EnginePool;
  const game = new GameAnalysis(labelGame, pool, record.moves, `snapshot-${name}`);
  game.setReview(file.review!.visits);
  await game.start();
  assert.equal(game.error, "");
  await game.fromStore(search, model);
  const data = game.data(playerNames(record.tags), { result: record.result ?? record.tags.Result ?? null, termination: record.tags.Termination });
  assert.ok(data, `${name}: the rules did not run`);
  return review(data, "lead", LABEL_VISITS);
}

const label = (l: string | null) => l ?? "-";
const side = (player: number) => (player === 0 ? "Blue" : "Red ");
const edgeText = (e: { edge: Parameters<typeof edgeName>[0] | null }) => (e.edge ? edgeName(e.edge) : "pass");

/** What a review reaches of the rules that the snapshot is for: counted, so that a stored review that stops reaching
 *  one shows in the diff, and the test below it fails. `swapped`: the turns that play the engine's best turn in the
 *  other order (sameTurn). */
function reaches(R: Review) {
  const judged = R.turns.filter(t => t.label !== null);
  const twoEdge = judged.filter(t => t.edges.length === 2);
  const swapped = twoEdge.filter(t => t.best && t.best.length === 2
    && sameEdge(t.edges[0].edge!, t.best[1]) && sameEdge(t.edges[1].edge!, t.best[0]));
  const inOrder = twoEdge.filter(t => t.best && t.best.length === 2
    && sameEdge(t.edges[0].edge!, t.best[0]) && sameEdge(t.edges[1].edge!, t.best[1]));
  // The twins: the positions of the game whose results list a symmetric twin, and the played edges that are one
  const twinned = R.data.analysis.flatMap((a, i) => (a?.candidates.some(c => c.twinOf) ? [i] : []));
  const playedTwin = R.edges.filter(e => e.edge && R.data.analysis[e.index]?.candidates.some(c => c.twinOf && sameEdge(c.edge, e.edge!)));
  const great = (l: string | null) => l === "great";
  return {
    edges: R.edges.length, turns: R.turns.length, judgedTurns: judged.length, twoEdge: twoEdge.length,
    swapped: swapped.length, inOrder: inOrder.length,
    twinPositions: twinned, playedTwins: playedTwin.length,
    greatEdges: R.edges.filter(e => great(e.label)).length, greatTurns: R.turns.filter(t => great(t.label)).length,
    twinStarts: twoEdge.filter(t => R.data.analysis[t.start]?.candidates.some(c => c.twinOf)).length,
  };
}

/** The snapshot text of a review: a header of what it reaches, then one line for each move by edge, and one for each
 *  turn. */
function snapshotOf(name: string, R: Review): string {
  const r = reaches(R);
  const head = [
    `# Hedge School's labels on tests/fixtures/${name}-review.json, as the review page labels it (labels.snapshot.test.ts).`,
    `# Update on purpose only: see the test's header. The commit says why a label moved.`,
    `# edges ${r.edges}, turns ${r.turns} (judged ${r.judgedTurns}, of two edges ${r.twoEdge}: the engine's best turn in the same order ${r.inOrder}, in the other order ${r.swapped})`,
    `# positions with a symmetric twin (by index): ${r.twinPositions.join(" ") || "none"}; played edges that are a twin: ${r.playedTwins}; turns of two edges that start at one: ${r.twinStarts}; Greats: ${r.greatEdges} by edge, ${r.greatTurns} by turn`,
    `# "-": no label (the review lacks a result there).`,
  ];
  const byEdge = R.edges.map(e => `${String(e.index + 1).padStart(3)}  turn ${String(R.turnOf[e.index].number).padStart(2)}  ${side(e.player)}  ${edgeText(e).padEnd(8)}  ${label(e.label)}`);
  const turnText = (t: TurnReview) => t.edges.map(e => edgeText(e)).join(" ");
  const byTurn = R.turns.map(t => `turn ${String(t.number).padStart(2)}  ${side(t.player)}  ${turnText(t).padEnd(17)}  ${label(t.label)}`);
  return [...head, "", "[by edge: the label of each edge]", ...byEdge, "", "[by turn: the label of each turn]", ...byTurn, ""].join("\n");
}

/** The lines where two texts differ, for a failure's message: the move or turn and its label in the snapshot and now. */
function differences(expected: string, actual: string): string {
  const a = expected.split("\n"), b = actual.split("\n"), out: string[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    if (a[i] !== b[i]) out.push(`line ${i + 1}:\n  snapshot: ${a[i] ?? "(none)"}\n  now:      ${b[i] ?? "(none)"}`);
  return out.slice(0, 20).join("\n") + (out.length > 20 ? `\n… and ${out.length - 20} more` : "");
}

const updating = process.env.UPDATE_LABEL_SNAPSHOT === "1";
if (updating && process.env.CI) throw new Error("UPDATE_LABEL_SNAPSHOT writes snapshots: not in CI");

const reached = new Map<string, ReturnType<typeof reaches>>();
for (const name of REVIEWS) {
  test(`${name}-review.json: every label, by edge and by turn, is the snapshot's`, async () => {
    const R = await reviewOf(name);
    reached.set(name, reaches(R));
    const actual = snapshotOf(name, R), file = join(snapshots, `${name}.txt`);
    if (updating) {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, actual);
      return;
    }
    assert.ok(existsSync(file), `no snapshot ${file}: run with UPDATE_LABEL_SNAPSHOT=1 (see this test's header) and commit it`);
    const expected = readFileSync(file, "utf8");
    assert.ok(expected === actual, `the labels of ${name}-review.json moved from the snapshot (${file}). If the change is meant `
      + `to move them, update the snapshot (see this test's header) and say why in the commit message.\n${differences(expected, actual)}`);
  });
}

test("the stored reviews reach the turn rules, the twins and the Greats that the snapshot is for", () => {
  const all = [...reached.values()];
  const total = (f: (r: ReturnType<typeof reaches>) => number) => all.reduce((s, r) => s + f(r), 0);
  assert.equal(all.length, REVIEWS.length, "the snapshot tests ran first");
  assert.ok(total(r => r.twoEdge) > 0, "no judged turn of two edges");
  assert.ok(total(r => r.swapped) > 0, "no turn plays the engine's best turn in the other order");
  assert.ok(total(r => r.twinPositions.length) > 0, "no position with a symmetric twin");
  assert.ok(total(r => r.twinStarts) > 0, "no turn of two edges starts at a position with a symmetric twin");
  assert.ok(total(r => r.greatEdges) > 0 && total(r => r.greatTurns) > 0, "no Great, by edge and by turn");
});
