// Checks the analysis's batch (BATCH_MS in game.svelte.ts): a search's results so far and its final result are applied
// together, at most once a batch, the deepest for each position, with what follows a search's end (the passes'
// progress, its mark). And the order of a search's end: the engine takes its next search at once, and the result shows
// in the batch after its write to the store. Run: npm test.
import { afterEach, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import "#lib/testing/svelteModules.ts";
import type { AnalysisReply, PositionQuery } from "@abstractclass/engine/protocol.ts";
import type { GamePosition } from "#lib/engine/position.ts";
import type { EnginePool, Work } from "@abstractclass/engine/pool.ts";
import { SWEEP_VISITS, readAnalysisKey } from "./cache.ts";
import { STORES } from "@abstractclass/storage/db.ts";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";

const store = memoryDb(queueMicrotask); // its transactions complete in microtasks: the tests mock setTimeout

const { BATCH_MS, GameAnalysis } = await import("./game.svelte.ts");
const { BOARD_ID } = await import("#lib/game/store.ts");

const MOVES = ["A10-D9", "D10-G9", "G10-J9"];

const position = (k: number): GamePosition => ({
  position: `p${k}`, edges: { b: [], r: [] }, protected: [], placed: [], regions: { b: [], r: [] }, areas: [0, 0],
  scores: [0, 0], mover: k % 2 ? "r" : "b", movesLeft: 1, moveCount: k, outcome: null, cuts: null,
});
const reply = (visits: number) => ({
  rootInfo: { visits, winrate: 0.5, scoreLead: 0, scoreSelfplay: 0, scoreStdev: 0 }, moveInfos: [],
}) as unknown as AnalysisReply;

let models = 0;
/** A pool of `engines` engines (by default, as many as the tasks), whose searches end when the test says: `partial`
 *  posts a result so far, `end` the final result, `fail` an engine error. A task runs when an engine is free, first
 *  come first served. */
function fakePool(engines = Infinity) {
  const searches: { partial(visits: number): void; end(visits: number): void; fail(e: Error): void }[] = [];
  const engine = {
    analyse(_query: unknown, onPartial: (r: AnalysisReply) => void) {
      let end!: (t: { reply: AnalysisReply }) => void, fail!: (e: Error) => void;
      const done = new Promise((resolve, reject) => { end = resolve; fail = reject; });
      searches.push({ partial: v => onPartial(reply(v)), end: v => end({ reply: reply(v) }), fail: e => fail(e) });
      return { done, stop() {} };
    },
  };
  let free = engines;
  const waiting: (() => void)[] = [];
  const pool = {
    search: "test", model: { sha256: `m${++models}` }, // a network of its own: the cache's memory outlives a test
    rules: { describeGame: async (q: PositionQuery) => ({ reply: { positions: Array.from({ length: q.moves.length + 1 }, (_, k) => position(k)) } }) },
    run: (_priority: number, _tag: string, work: Work<unknown>) => new Promise((resolve, reject) => {
      const start = () => {
        free--;
        work(engine as never, () => {}).then(resolve, reject).finally(() => { free++; waiting.shift()?.(); });
      };
      if (free > 0) start(); else waiting.push(start);
    }),
    cancel() {}, halt() {},
  };
  return { pool: pool as unknown as EnginePool, searches };
}

/** Lets the promises in flight settle: the reads of the store, and the writes that it does not hold. */
const settle = () => new Promise(resolve => setImmediate(resolve));

/** A game whose sweep has started on `engines` engines: a search of each position, which waits for the test. */
async function sweeping(engines?: number) {
  const { pool, searches } = fakePool(engines);
  const game = new GameAnalysis(pool, MOVES, "g");
  await game.start();
  void game.sweep();
  await settle();
  return { game, searches, written: () => store.puts(STORES.analysis).filter(k => readAnalysisKey(String(k)).model === pool.model!.sha256) };
}

beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
afterEach(() => { mock.timers.reset(); store.release(); });

test("a search's final results wait for the batch, and the sweep's progress comes with them", async () => {
  const { game, searches } = await sweeping();
  assert.equal(searches.length, game.passCount);
  searches[0].end(SWEEP_VISITS);
  searches[1].end(SWEEP_VISITS);
  await settle();
  assert.equal(game.analysis[0], undefined);
  assert.equal(game.swept, 0);
  mock.timers.tick(BATCH_MS);
  assert.deepEqual(game.analysis.slice(0, 2).map(a => a?.visits), [SWEEP_VISITS, SWEEP_VISITS]);
  assert.equal(game.swept, 2);
});

test("a final result is not replaced by a shallower result of the same batch", async () => {
  const { game, searches } = await sweeping();
  game.focus([]); // the start, on screen: searched in slices, beside the sweep's search of it
  await settle();
  const focus = searches.at(-1)!;
  searches[0].end(SWEEP_VISITS);
  await settle();
  focus.partial(SWEEP_VISITS / 2); // the focus's first slice, after the sweep's final result
  mock.timers.tick(BATCH_MS);
  assert.equal(game.analysis[0]?.visits, SWEEP_VISITS);
});

test("a search of the previous network adds nothing to the analysis or the progress, and writes nothing", async () => {
  const { game, searches, written } = await sweeping();
  searches[0].end(SWEEP_VISITS); // before the change: its result waits for the batch
  await settle();
  game.dropAnalysis();
  searches[1].end(SWEEP_VISITS); // after it
  await settle();
  mock.timers.tick(BATCH_MS);
  assert.deepEqual(game.analysis.slice(0, 2), [undefined, undefined]);
  assert.equal(game.swept, 0);
  assert.equal(written().length, 1); // the first search's alone
});

test("the engine takes its next search while a result's write commits, and the result shows once it is stored", async () => {
  const { game, searches, written } = await sweeping(1);
  const shown = () => [game.analysis[0]?.visits, game.swept];
  assert.equal(searches.length, 1);
  store.hold();
  searches[0].end(SWEEP_VISITS);
  await settle();
  assert.equal(searches.length, 2);
  mock.timers.tick(BATCH_MS);
  assert.deepEqual(shown(), [undefined, 0]);
  store.release();
  await settle();
  assert.deepEqual(shown(), [undefined, 0]); // stored: the result and the sweep's progress wait for the batch
  mock.timers.tick(BATCH_MS);
  assert.deepEqual(shown(), [SWEEP_VISITS, 1]);
  assert.equal(written().length, 1);
});

test("a result whose write fails shows, with its progress", async () => {
  const { game, searches } = await sweeping();
  store.hold();
  searches[0].end(SWEEP_VISITS);
  await settle();
  store.release(false);
  await settle();
  mock.timers.tick(BATCH_MS);
  assert.equal(game.analysis[0]?.visits, SWEEP_VISITS);
  assert.equal(game.swept, 1);
});

test("a position stays pending, and its focus runs, until the batch after its result's write", async () => {
  const { pool, searches } = fakePool();
  const game = new GameAnalysis(pool, MOVES, BOARD_ID); // the board: only its searches make a position pending
  await game.start();
  await game.sweep();
  game.focus([]);
  await settle();
  store.hold();
  searches[0].end(game.focusVisits);
  await settle();
  mock.timers.tick(BATCH_MS);
  const shown = () => [game.analysis[0]?.visits, game.pending([]), game.focusing];
  assert.deepEqual(shown(), [undefined, true, ""]);
  store.release();
  await settle();
  assert.deepEqual(shown(), [undefined, true, ""]);
  mock.timers.tick(BATCH_MS);
  assert.deepEqual(shown(), [game.focusVisits, false, null]);
});

test("a search that fails ends its marks in the next batch, and the page gets the error", async () => {
  const { pool, searches } = fakePool();
  const game = new GameAnalysis(pool, MOVES, BOARD_ID);
  await game.start();
  await game.sweep();
  game.focus([]);
  await settle();
  searches[0].fail(new Error("the engine failed"));
  await settle();
  const shown = () => [game.pending([]), game.focusing];
  assert.deepEqual(shown(), [true, ""]);
  mock.timers.tick(BATCH_MS);
  assert.deepEqual(shown(), [false, null]);
  assert.equal(game.analysis[0], undefined);
  assert.match(game.error, /the engine failed/);
});
