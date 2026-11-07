// The label snapshot of Cyanotype: its quality labels on its stored review (apps/hedgeschool/tests/fixtures/
// cyanotype-review.json, which apps/hedgeschool/scripts/cyanotype-review-fixture.mjs writes), by move and by turn, in a
// committed text file (apps/hedgeschool/tests/snapshots/review-labels/cyanotype.txt), as Hedge School's label snapshot
// (apps/hedgeschool/src/lib/review/labels.snapshot.test.ts). The labels come from the code that the review page runs
// (routes/review/+page.svelte), with no engine search: GameAnalysis with Blueprints' game and the engine's rules
// (describe_game, the CPU module with no network), the steps of storedReview.ts (openStored: the page takes its first
// steps, then reads the stored results as it does), then data() and review(). So a change of @abstractclass/analysis,
// @abstractclass/review or Blueprints' game that moves a quality label of the stored review fails here. The failure
// names the move and its quality labels, old and new.
//
// The game is the one that Cyanotype's browser tests review (apps/hedgeschool/tests/cyanotype-review.ts, testRecord):
// the review's test game, Stamp Duty against itself, to the end of turn 20, at Lite (512 visits a position). Its first
// note is a Mistake at turn 12. The last test fails when the stored review stops reaching a kind of quality label that
// it has now (REACHED): Best, Excellent, Good, Inaccuracy and Mistake, by move and by turn. The stored review reaches
// no Great and no Blunder, by move or by turn. It has no turn that plays the engine's best turn in the other order, and no
// two moves that give one position (twins, design 33, item 9). The snapshot's header counts these too (reaches), so a
// stored review written again that reaches one shows in its diff. Until then, this test does not cover them on
// Blueprints. Cyanotype's page takes them from the shared review's code (@abstractclass/analysis), and Hedge School's
// label snapshot covers the Greats, the Blunders and the turn order on Enclosure, which has no such twins.
//
// After a change that moves labels on purpose, update the label snapshot: run
//   node --test --test-update-snapshots src/lib/review/labels.snapshot.engine.test.ts
// in apps/cyanotype, read the diff of the snapshot file, and commit it with the change. The commit message says why
// each label moved. Without that flag, a missing snapshot file fails the test. The test reads the engine from
// static/engine (`npm run engine` first). Without it, the test skips, and in CI (the variable CI set) it fails: there
// the step `cyanotype-engine` of check:all fetches it before the step `cyanotype-test`, so a missing engine is a fault,
// not a skip. When Cyanotype's engine.lock.json takes a new release, write the stored review again (its script's
// header says how), then update the snapshot.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import "@abstractclass/analysis/testing/svelteModules.ts";
import type { PositionQuery } from "@abstractclass/engine/protocol.ts";
import type { EnginePool } from "@abstractclass/engine/pool.ts";
import { hasEngine, nodeEngine } from "@abstractclass/engine/node-engine.mjs";
import { LABEL_VISITS } from "@abstractclass/analysis/cache.ts";
import { review, type Review, type Unit } from "@abstractclass/analysis/model.ts";
import { LABELS, type Label } from "@abstractclass/analysis/labels.ts";
import { PLAYER_NAME } from "@abstractclass/review/game.ts";
import { STORES, dbPutMany } from "@abstractclass/storage/db.ts";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";
import { parseRecord, playerNames } from "../game/record.ts";
import { blueprints, playedText, type Blueprints } from "./blueprints.ts";
import { readStored, testRecord } from "../../../../hedgeschool/tests/cyanotype-review.ts";

memoryDb(queueMicrotask); // the store that fromStore reads
const { GameAnalysis } = await import("@abstractclass/analysis/analysis.svelte.ts");
const { openStored } = await import("./storedReview.ts");

const app = join(import.meta.dirname, "..", "..", "..");
const snapshot = join(app, "..", "hedgeschool", "tests", "snapshots", "review-labels", "cyanotype.txt");
/** The kinds of label that the stored review reaches now, by move and by turn. */
const REACHED: Label[] = ["best", "excellent", "good", "inaccuracy", "mistake"];

const missing = hasEngine(app) ? null : "no engine in static/engine: run `npm run engine` first";
const skip = missing && !process.env.CI ? missing : false;
const engine = missing ? null : await nodeEngine(app);
/** The engine's rules, as the pool's rules worker answers them (@abstractclass/engine/client.ts, describeGame). */
const rules = {
  describeGame: async (q: PositionQuery, from = 0) =>
    ({ reply: engine!.call({ id: "g", action: "describe_game", ...q, from }) }),
};

/** The stored review as the review page labels it from the store alone. */
async function labelled(): Promise<Review<Blueprints>> {
  if (missing) throw new Error(`${missing}. In CI, the label snapshot needs the engine and does not skip`);
  const stored = readStored(), record = parseRecord(testRecord());
  assert.equal(await dbPutMany(STORES.analysis, stored.analyses), stored.analyses.length);
  // How the record says the game ended, as the page gives it
  const ending = { result: record.result ?? record.tags.Result ?? null, termination: record.tags.Termination };
  const pool = { rules, cancel() {} } as unknown as EnginePool;
  const g = new GameAnalysis(blueprints, pool, record.moves, "labels-cyanotype");
  const problem = await openStored(g, record, stored.visits, stored.search, stored.model);
  assert.equal(problem, null, "the record's capture marks are the engine's");
  const d = g.data(playerNames(record.tags), ending); // none when the rules refuse the game
  assert.ok(d, `the rules refused the game: ${g.error}`);
  // fromStore passes over a position whose result the store lacks: each position before a move has its stored result
  const unread = record.moves.flatMap((_, i) => ((d.analysis[i]?.visits ?? 0) >= stored.visits ? [] : [i]));
  assert.deepEqual(unread, [], "the positions with no stored result at the review's depth");
  return review(blueprints, d, "lead", LABEL_VISITS);
}
let once: Promise<Review<Blueprints>> | undefined;
const labelledOnce = () => (once ??= labelled());

/** How many labels of each kind the review has, by move (`edge`) or by turn (`turn`): its summary, which the page
 *  shows, for both players. */
const counts = (R: Review<Blueprints>, unit: Unit) =>
  Object.fromEntries(LABELS.map(l => [l, R.summary[unit][0].counts[l] + R.summary[unit][1].counts[l]])) as
    Record<Label, number>;

/** What the stored review reaches of the rules that Hedge School's label snapshot reports too: the turns that play the
 *  engine's best turn in the other order (model.ts, sameTurn), and the twins (a candidate's `twinOf`: two moves that
 *  give one position, design 33, item 9). It reaches none of them now. A stored review that reaches one shows in the
 *  snapshot's diff. */
function reaches(R: Review<Blueprints>) {
  const twins = (i: number) => R.data.analysis[i]?.candidates.filter(c => c.twinOf) ?? [];
  return {
    swapped: R.turns.filter(({ label, edges: [a, b], best }) => label !== null && b && best?.length === 2
      && blueprints.equal(a.edge!, best[1]) && blueprints.equal(b.edge!, best[0])).length,
    twinPositions: R.data.analysis.flatMap((_, i) => (twins(i).length ? [i] : [])).join(" ") || "none",
    playedTwins: R.edges.filter(e => e.edge && twins(e.index).some(c => blueprints.equal(c.edge, e.edge!))).length,
  };
}

/** The text of the label snapshot: a header, then one line for each move with its label by move, and one for each
 *  turn with its label by turn. */
function snapshotOf(R: Review<Blueprints>): string {
  const reached = reaches(R);
  const tally = (unit: Unit) => {
    const n = counts(R, unit);
    return LABELS.filter(l => n[l]).map(l => `${l} ${n[l]}`).join(", ") || "none";
  };
  const side = (player: number) => PLAYER_NAME[player].padEnd(4);
  const byEdge = R.edges.map(e => `${String(e.index + 1).padStart(3)}`
    + `  turn ${String(R.turnOf[e.index].number).padStart(2)}  ${side(e.player)}  ${playedText(e).padEnd(16)}`
    + `  ${e.label ?? "-"}`);
  const byTurn = R.turns.map(t => `turn ${String(t.number).padStart(2)}  ${side(t.player)}`
    + `  ${t.edges.map(e => playedText(e)).join(" ").padEnd(33)}  ${t.label ?? "-"}`);
  return [
    `# Cyanotype's quality labels on apps/hedgeschool/tests/fixtures/cyanotype-review.json, the test game to the end of`,
    "# turn 20 (apps/cyanotype/src/lib/review/labels.snapshot.engine.test.ts).",
    "# Update this file only as the test's header says. The commit message says why each label moved.",
    `# "-": no label.`,
    `# Labels by move: ${tally("edge")}`,
    `# Labels by turn: ${tally("turn")}`,
    `# Turns of two moves in the other order than the engine's best turn: ${reached.swapped}`,
    `# Positions with a twin: ${reached.twinPositions}. Played moves that are a twin: ${reached.playedTwins}`,
    "", "[by move]", ...byEdge, "", "[by turn]", ...byTurn, "",
  ].join("\n");
}

test("every quality label of Cyanotype's stored review, by move and by turn, is the label snapshot's",
     { skip }, async t => {
  t.assert.fileSnapshot(snapshotOf(await labelledOnce()), snapshot, { serializers: [s => s] });
});

test("the stored review reaches each kind of label that the label snapshot is for, by move and by turn",
     { skip }, async () => {
  const R = await labelledOnce(), byEdge = counts(R, "edge"), byTurn = counts(R, "turn");
  for (const l of REACHED) {
    assert.ok(byEdge[l], `no ${l} by move: the stored review no longer reaches it`);
    assert.ok(byTurn[l], `no ${l} by turn: the stored review no longer reaches it`);
  }
});
