// Checks the analysis's batch (BATCH_MS in analysis.svelte.ts): a search's results so far and its final result are
// applied together, at most once a batch, the deepest for each position, with what follows a search's end (the passes'
// progress, its mark). And the order of a search's end: the engine takes its next search at once, and the result shows
// in the batch after its write to the store, or once it is stored when no search runs or waits. And another network:
// no pass searches on the old network's pool for the new network's analysis. Run: npm test.
import { afterEach, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import "./testing/svelteModules.ts";
import type { AnalysisReply } from "@abstractclass/engine/protocol.ts";
import type { EnginePool, Work } from "@abstractclass/engine/pool.ts";
import { BOARD_ID } from "./kept.ts";
import { reply, wordRules, words } from "./testing/game.ts";
import { SWEEP_VISITS, analysisKey, cachePut, readAnalysisKey } from "./cache.ts";
import { toAnalysis } from "./reply.ts";
import { STORES } from "@abstractclass/storage/db.ts";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";

const store = memoryDb(queueMicrotask); // its transactions complete in microtasks: the tests mock setTimeout

const { BATCH_MS, GameAnalysis, momentVisits } = await import("./analysis.svelte.ts");

const MOVES = ["a", "b", "c"]; // a game of the test game (testing/game.ts)

let models = 0;
/** A pool of `engines` engines (by default, as many as the tasks), whose searches end when the test says: `partial`
 *  posts a result so far, `end` the final result, `fail` an engine error. `stopped` once the page stops the search. A
 *  task runs when an engine is free, first come first served. `idle` when no task runs or waits. */
function fakePool(engines = Infinity) {
  const searches: { partial(visits: number): void; end(visits: number): void; fail(e: Error): void; stopped: boolean }[] = [];
  const engine = {
    analyse(_query: unknown, onPartial: (r: AnalysisReply) => void) {
      let end!: (t: { reply: AnalysisReply }) => void, fail!: (e: Error) => void;
      const done = new Promise((resolve, reject) => { end = resolve; fail = reject; });
      const search = { partial: (v: number) => onPartial(reply(v)), end: (v: number) => end({ reply: reply(v) }), fail: (e: Error) => fail(e), stopped: false };
      searches.push(search);
      return { done, stop() { search.stopped = true; } };
    },
  };
  let busy = 0;
  const waiting: (() => void)[] = [];
  const pool = {
    search: "test", model: { sha256: `m${++models}` }, // a network of its own: the cache's memory outlives a test
    rules: wordRules,
    run: (_priority: number, _tag: string, work: Work<unknown>) => new Promise((resolve, reject) => {
      const start = () => {
        busy++;
        work(engine as never, () => {}).then(resolve, reject).finally(() => { busy--; waiting.shift()?.(); });
      };
      if (busy < engines) start(); else waiting.push(start);
    }),
    cancel() {}, halt() {}, terminate() {},
    get idle() { return busy === 0 && waiting.length === 0; },
  };
  return { pool: pool as unknown as EnginePool, searches };
}

/** Lets the promises in flight settle: the reads of the store, and the writes that it does not hold. */
const settle = () => new Promise(resolve => setImmediate(resolve));
/** Lets the tasks in flight run too, such as a message on a channel. */
const turns = async () => { for (let k = 0; k < 20; k++) await settle(); };

/** A game whose sweep has started on `engines` engines: a search of each position, which waits for the test. */
async function sweeping(engines?: number) {
  const { pool, searches } = fakePool(engines);
  const game = new GameAnalysis(words, pool, MOVES, "g");
  await game.start();
  void game.sweep();
  await settle();
  return { game, pool, searches, written: () => store.puts(STORES.analysis).filter(k => readAnalysisKey(String(k)).model === pool.model!.sha256) };
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

test("the passes end with the old network: no label search starts on its pool or reads its results", async () => {
  const { game, pool, searches } = await sweeping();
  const n = game.passCount, visits = game.labelVisits;
  // The start's label result by the old network, in the store.
  await cachePut(analysisKey(pool.search!, pool.model!.sha256, [], visits), toAnalysis(words, reply(visits)));
  game.dropAnalysis();
  for (const s of searches) s.end(SWEEP_VISITS); // the sweep's searches finish their few visits, as a halt lets them
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.equal(searches.length, n);
  assert.deepEqual([game.analysis.filter(a => a).length, game.labelled], [0, 0]);
  const next = fakePool(); // the next network's pool, loaded
  game.usePool(next.pool);
  void game.sweep();
  await settle();
  assert.equal(next.searches.length, n); // every position, the start too
});

test("a sweep after another network was chosen waits for that network's pool", async () => {
  for (const id of ["g", BOARD_ID]) { // the review's passes, and the board's searches
    const { pool, searches } = fakePool();
    const game = new GameAnalysis(words, pool, MOVES, id);
    await game.start();
    game.dropAnalysis(); // another network, chosen while the pool loads its first
    void game.sweep(); // the first network loaded
    game.focus([]);
    await settle();
    assert.deepEqual([searches.length, game.engineReady], [0, false], id);
    const next = fakePool();
    game.usePool(next.pool);
    void game.sweep();
    game.focus([]);
    await settle();
    // The focus's search, and the review's sweep of every position.
    assert.deepEqual([next.searches.length, game.engineReady], [game.board ? 1 : game.passCount + 1, true], id);
  }
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
  const game = new GameAnalysis(words, pool, MOVES, BOARD_ID); // the board: only its searches make a position pending
  await game.start();
  await game.sweep();
  game.focus([]);
  void pool.run(0, "other", () => new Promise(() => {})); // another task runs: the result waits for the batch
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
  const game = new GameAnalysis(words, pool, MOVES, BOARD_ID);
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

test("once no search runs or waits, the last results show when they are stored, without the batch's timer", async () => {
  const { game, searches } = await sweeping(1);
  const n = game.passCount;
  for (let k = 0; k < 2 * n - 1; k++) { // the sweep, then the label pass but its last search, one at a time
    searches[k].end(k < n ? SWEEP_VISITS : game.labelVisits);
    await settle();
  }
  await turns();
  assert.equal(game.labelled, 0); // the engine had the next search: the results wait for the batch
  searches[2 * n - 1].end(game.labelVisits);
  await turns();
  assert.equal(game.labelled, n); // the label pass's last: the key moments, which wait for it, do not wait for the timer
});

test("the key moments' step waits for a search whose position left them, until its result is stored", async () => {
  const { game, searches } = await sweeping();
  const depth = momentVisits(game.labelVisits);
  game.deepen([1]);
  await settle();
  const deep = searches.at(-1)!;
  deep.partial(depth - 32);
  mock.timers.tick(BATCH_MS);
  // The page's key moments lack position 1 now, as when its result so far changed the labels: its search still runs.
  assert.deepEqual(game.momentChecks([]), { total: 1, done: 0 });
  store.hold();
  deep.end(depth);
  await settle();
  mock.timers.tick(BATCH_MS);
  assert.deepEqual(game.momentChecks([]), { total: 1, done: 0 }); // its write has not committed
  store.release();
  await settle();
  assert.deepEqual(game.momentChecks([]), { total: 1, done: 0 }); // stored: its end shows with its result, in the batch
  mock.timers.tick(BATCH_MS);
  // Searched to the depth, it still counts, though it is no key moment: the step's count does not go back.
  assert.deepEqual([game.momentChecks([]), game.momentChecks([1])], [{ total: 1, done: 1 }, { total: 1, done: 1 }]);
  game.setReview(2 * game.labelVisits); // another depth: the position has not got the new depth
  assert.deepEqual(game.momentChecks([]), { total: 0, done: 0 });
});

test("the key moments' step does not wait for a search that ends with no result", async () => {
  const { game, searches } = await sweeping();
  game.deepen([1]);
  await settle();
  searches.at(-1)!.fail(new Error("engine error"));
  await settle();
  assert.deepEqual(game.momentChecks([]), { total: 1, done: 0 }); // until the batch after its end
  mock.timers.tick(BATCH_MS);
  assert.deepEqual(game.momentChecks([]), { total: 0, done: 0 });
  assert.equal(game.error, "engine error");
});

test("a focus with a time limit stops at its first result past the limit, though its timer has not run", async () => {
  mock.timers.reset();
  mock.timers.enable({ apis: ["setTimeout", "Date"] }); // the clock moves, the timers wait: a hidden tab runs them late
  const { pool, searches } = fakePool();
  const game = new GameAnalysis(words, pool, MOVES, BOARD_ID);
  await game.start();
  await game.sweep();
  game.setDepth(4096, 2);
  game.focus([]);
  await settle();
  searches[0].partial(32);
  assert.equal(searches[0].stopped, false);
  mock.timers.setTime(Date.now() + 2000);
  searches[0].partial(64);
  assert.equal(searches[0].stopped, true);
  searches[0].end(96);
  await turns();
  mock.timers.tick(BATCH_MS);
  assert.equal(game.stoppedByTime([]), true);
});
