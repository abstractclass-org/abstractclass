// The label snapshot of Cyanotype: its quality labels on its stored review (apps/hedgeschool/tests/fixtures/
// cyanotype-review.json, which apps/hedgeschool/scripts/cyanotype-review-fixture.mjs writes), by move and by turn, in a
// committed text file (apps/hedgeschool/tests/snapshots/review-labels/cyanotype.txt), as Hedge School's label snapshot
// (apps/hedgeschool/src/lib/review/labels.snapshot.test.ts). The labels come from the code that the review page runs
// (routes/review/+page.svelte), with no engine search: GameAnalysis with Blueprints' game and the engine's rules
// (describe_game, the CPU module with no network), the steps of storedReview.ts (openStored), which the page takes
// too, then data() and review(). So a change of @abstractclass/analysis, @abstractclass/review or Blueprints' game that
// moves a label of the stored review fails here. The failure names the move and the label.
//
// The game is the one that Cyanotype's browser tests review (apps/hedgeschool/tests/cyanotype-review.ts, testRecord):
// the review's test game, Stamp Duty against itself, to the end of turn 20, at Lite (512 visits a position). Its first
// note is a Mistake at turn 15. The last test fails when the stored review stops reaching a kind of label that it has
// now (REACHED): Best, Excellent, Good, Inaccuracy and Mistake, by move and by turn. The stored review reaches no Great
// and no Blunder, by move or by turn: this test does not cover them on Blueprints. Cyanotype's page shows them as Hedge
// School's does (@abstractclass/review), and Hedge School's label snapshot covers both on Enclosure.
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
import { review, type Review } from "@abstractclass/analysis/model.ts";
import type { Label } from "@abstractclass/analysis/labels.ts";
import { PLAYER_NAME } from "@abstractclass/review/game.ts";
import { STORES, dbPutMany } from "@abstractclass/storage/db.ts";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";
import { parseRecord, playerNames } from "../game/record.ts";
import { blueprints, playedText, type Blueprints } from "./blueprints.ts";
import { STORED, readStored, testRecord } from "../../../../hedgeschool/tests/cyanotype-review.ts";

memoryDb(queueMicrotask); // the store that fromStore reads
const { GameAnalysis } = await import("@abstractclass/analysis/analysis.svelte.ts");
const { openStored } = await import("./storedReview.ts");

const app = join(import.meta.dirname, "..", "..", "..");
const snapshot = join(app, "..", "hedgeschool", "tests", "snapshots", "review-labels", "cyanotype.txt");
/** The kinds of label that the stored review reaches now, by move and by turn. */
const REACHED: Record<"edges" | "turns", Label[]> = {
  edges: ["best", "excellent", "good", "inaccuracy", "mistake"],
  turns: ["best", "excellent", "good", "inaccuracy", "mistake"],
};

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
  const problem = await openStored(g, record, stored.visits, { search: stored.search, model: stored.model });
  assert.equal(problem, null, "the record's capture marks are the engine's");
  const d = g.data(playerNames(record.tags), ending); // none when the rules refuse the game
  assert.ok(d, `the rules refused the game: ${g.error}`);
  // fromStore drops a failed read of the store: each position before a move has its stored result
  const unread = record.moves.flatMap((_, i) => ((d.analysis[i]?.visits ?? 0) >= stored.visits ? [] : [i]));
  assert.deepEqual(unread, [], "the positions with no stored result at the review's depth");
  return review(blueprints, d, "lead", LABEL_VISITS);
}
let once: Promise<Review<Blueprints>> | undefined;
const labelledOnce = () => (once ??= labelled());

/** How many labels of each kind the review has, by move (`edges`) and by turn (`turns`). */
function counts(R: Review<Blueprints>) {
  const count = (labels: (Label | null)[]) => {
    const n = new Map<Label, number>();
    for (const l of labels) if (l) n.set(l, (n.get(l) ?? 0) + 1);
    return n;
  };
  return { edges: count(R.edges.map(e => e.label)), turns: count(R.turns.map(t => t.label)) };
}

/** The text of the label snapshot: a header, then one line for each move with its label by move, and one for each
 *  turn with its label by turn. */
function snapshotOf(R: Review<Blueprints>): string {
  const n = counts(R);
  const tally = (m: Map<Label, number>) => [...m].map(([l, k]) => `${l} ${k}`).join(", ") || "none";
  const side = (player: number) => PLAYER_NAME[player].padEnd(4);
  const label = (l: Label | null) => l ?? "-";
  const byEdge = R.edges.map(e => `${String(e.index + 1).padStart(3)}`
    + `  turn ${String(R.turnOf[e.index].number).padStart(2)}  ${side(e.player)}  ${playedText(e).padEnd(16)}`
    + `  ${label(e.label)}`);
  const byTurn = R.turns.map(t => `turn ${String(t.number).padStart(2)}  ${side(t.player)}`
    + `  ${t.edges.map(e => playedText(e)).join(" ").padEnd(33)}  ${label(t.label)}`);
  return [
    `# Cyanotype's quality labels on apps/hedgeschool/tests/fixtures/cyanotype-review.json, the test game to the end of`,
    "# turn 20 (apps/cyanotype/src/lib/review/labels.snapshot.engine.test.ts).",
    "# Update this file only as the test's header says. The commit message says why each label moved.",
    `# "-": no label.`,
    `# Labels by move: ${tally(n.edges)}`,
    `# Labels by turn: ${tally(n.turns)}`,
    "", "[by move]", ...byEdge, "", "[by turn]", ...byTurn, "",
  ].map(l => l.trimEnd()).join("\n");
}

test(`${STORED}: every quality label of Cyanotype's review, by move and by turn, is the label snapshot's`,
     { skip }, async t => {
  t.assert.fileSnapshot(snapshotOf(await labelledOnce()), snapshot, { serializers: [s => s] });
});

test("the stored review reaches each kind of label that the label snapshot is for, by move and by turn",
     { skip }, async () => {
  const n = counts(await labelledOnce());
  for (const unit of ["edges", "turns"] as const)
    for (const l of REACHED[unit])
      assert.ok(n[unit].get(l), `no ${l} by ${unit === "edges" ? "move" : "turn"}: the stored review no longer reaches it`);
});
