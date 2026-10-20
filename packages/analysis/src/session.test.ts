// Checks the session's change of network while a review starts its pool (EngineSession.start): on a snapshot's Review
// again, before the review's analysis shows, and while its first network loads. The network chosen is the one that
// searches the review, the session names it (the game's mark, markReviewed, reads it), no other analysis searches,
// and the GPU's control goes to that network's pool alone. Run: npm test.
import { afterEach, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import "./testing/svelteModules.ts";
import type { AnalysisReply, PositionQuery } from "@abstractclass/engine/protocol.ts";
import type { EnginePool, Work } from "@abstractclass/engine/pool.ts";
import type { Manifest } from "@abstractclass/engine/client.ts";
import { wordFields, words, type Words } from "./testing/game.ts";
import { readAnalysisKey } from "./cache.ts";
import { STORES } from "@abstractclass/storage/db.ts";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";

const store = memoryDb(queueMicrotask); // its transactions complete in microtasks: the tests mock setTimeout

const { GameAnalysis } = await import("./analysis.svelte.ts");
const { TestPage } = await import("./testing/page.svelte.ts");
type Analysis = InstanceType<typeof GameAnalysis<Words>>;

const MOVES = ["a", "b", "c"]; // a game of the test game (testing/game.ts)
const MANIFEST: Manifest = { artifacts: [] }; // the test's pools read none of it

/** A pool in EnginePool's place. Its rules work at once, and its network loads when the test says (`load`), or fails
 *  (`fail`). Each engine search waits for the test (`end`). It keeps what the session asked of it: its release when
 *  idle, its end, and the GPU's control (gpu.svelte.ts, GpuControl), which sets its `onGpuLost`. */
class FakePool {
  readonly size: number;
  search: string | null = null;
  model: { sha256: string } | null = null;
  searches: { visits: number; end(): void }[] = [];
  released = false;
  terminated = false;
  onGpuLost: ((error: unknown) => void) | null = null;
  onBacklog: (() => void) | null = null;
  onRelease: (() => void) | null = null;
  readonly hasGpu = false;
  readonly backlogged = false;
  readonly workerSpeed = null;
  private running = 0;
  private sha: (network: string) => string;
  private loaded: Promise<void>;
  private settle!: { load(): void; fail(e: Error): void };

  /** A pool of `size` search workers. A network's SHA-256 is `sha` of its id. */
  constructor(size: number, sha: (network: string) => string) {
    this.size = size;
    this.sha = sha;
    this.loaded = new Promise((load, fail) => { this.settle = { load, fail }; });
  }

  async start(_manifest: Manifest, network: string, onRules?: () => Promise<void>) {
    await Promise.all([
      (async () => {
        this.search = "test";
        await onRules?.();
      })(),
      this.size ? this.loaded.then(() => { this.model = { sha256: this.sha(network) }; }) : undefined,
    ]);
  }
  load() { this.settle.load(); }
  fail(e: Error) { this.settle.fail(e); }

  readonly rules = {
    describeGame: async (q: PositionQuery) => ({ reply: { positions: Array.from({ length: q.moves.length + 1 }, (_, k) => wordFields(k)) } }),
  };
  private engine = {
    analyse: (query: { maxVisits: number }) => {
      let end!: (t: { reply: AnalysisReply }) => void;
      const done = new Promise<{ reply: AnalysisReply }>(resolve => { end = resolve; });
      const visits = query.maxVisits;
      this.searches.push({ visits, end: () => end({ reply: reply(visits) }) });
      return { done, stop() {} };
    },
  };
  run<T>(_priority: number, _tag: string, work: Work<T>): Promise<T> {
    this.running++;
    return work(this.engine as never, () => {}).finally(() => this.running--);
  }
  get idle() { return this.running === 0; }
  cancel() {}
  halt() {}
  resize() {}
  dropGpu() {}
  releaseWhenIdle() { this.released = true; }
  terminate() { this.terminated = true; }
}

const reply = (visits: number) => ({
  rootInfo: { visits, winrate: 0.5, scoreLead: 0, scoreSelfplay: 0, scoreStdev: 0 }, moveInfos: [],
}) as unknown as AnalysisReply;
const asPool = (p: FakePool) => p as unknown as EnginePool;

/** Lets the promises in flight settle: the rules' answers, and the store's reads and writes. */
const settle = async () => { for (let k = 0; k < 20; k++) await new Promise(resolve => setImmediate(resolve)); };

let pages = 0;
/** A page whose settings name the network n1, with the manifest read, and the pools that its session makes. Each page's
 *  networks have SHA-256s of their own (`sha`): the store's results outlive a test. `written` gives the networks of
 *  the page's results written to the store, by their SHA-256. */
function page() {
  const pools: FakePool[] = [], n = ++pages, sha = (network: string) => `${network}p${n}`;
  const p = new TestPage("n1", size => {
    const pool = new FakePool(size, sha);
    pools.push(pool);
    return asPool(pool);
  });
  p.session.manifest = MANIFEST;
  const written = () => new Set(store.puts(STORES.analysis).map(k => readAnalysisKey(String(k)).model).filter(m => m.endsWith(`p${n}`)));
  return { page: p, pools, sha, written };
}

/** A review by an earlier engine shown as it was (design 20): the rules alone, no network, as the review's page opens
 *  it (openSnapshot). */
async function openSnapshot(p: InstanceType<typeof TestPage>): Promise<Analysis> {
  const rules = new FakePool(0, network => network);
  await rules.start(MANIFEST, p.settings.network);
  const g = new GameAnalysis(words, asPool(rules), MOVES, "g");
  await g.start();
  p.session.pool = asPool(rules);
  p.session.network = p.settings.network;
  p.show(g, true);
  return g;
}

/** The review's start, as the review's page runs it (startReview): the analysis shows once the rules work, and the
 *  passes start once the session answers it. */
function startReview(p: InstanceType<typeof TestPage>) {
  let made: Analysis | null = null;
  const answered = p.session.start(pool => (made = new GameAnalysis(words, pool, MOVES, "g")), async g => {
    await g.start();
    p.show(g);
  }).then(g => {
    void g?.sweep();
    return g;
  });
  return { answered, made: () => made! };
}

/** Ends every search of the pool that waits, each at the visits it asked for. */
async function endSearches(pool: FakePool) {
  for (const s of pool.searches) s.end();
  await settle();
}

beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
afterEach(() => { mock.timers.reset(); store.release(); });

test("a network chosen while the review starts its pool searches the review, and the session names it", async () => {
  // On a snapshot's Review again, or on the review's first start: before the review's analysis shows. Either pool's
  // network can load first.
  for (const snapshot of [true, false]) for (const firstLoads of [true, false]) {
    const at = `${snapshot ? "Review again" : "the first start"}, the ${firstLoads ? "first" : "next"} pool loaded first`;
    const { page: p, pools, sha, written } = page();
    const shown = snapshot ? await openSnapshot(p) : null;
    if (shown) p.reviewAgain();
    const review = startReview(p);
    p.choose("n2"); // the review's analysis does not show yet
    await settle();
    const g = review.made();
    assert.equal(p.game, g, at);
    assert.equal(pools.length, 2, at); // the first pool, with n1, and the next, with n2
    const [first, next] = pools;
    for (const pool of firstLoads ? [first, next] : [next, first]) {
      pool.load();
      await settle();
    }
    await review.answered;
    // The snapshot's analysis searches nothing. The review's searches every position, and the position on screen, with
    // n2 alone.
    assert.deepEqual([shown?.engineReady ?? false, g.engineReady], [false, true], at);
    assert.deepEqual([first.searches.length, next.searches.length], [0, g.passCount + 1], at);
    assert.deepEqual([p.session.pool, p.session.network], [asPool(next), "n2"], at);
    await endSearches(next);
    assert.deepEqual(written(), new Set([sha("n2")]), at);
    p.end();
  }
});

test("a network chosen while the first network loads: the first pool gets no GPU control and is not released", async () => {
  const { page: p, pools } = page();
  const review = startReview(p);
  await settle();
  const g = review.made();
  assert.equal(p.game, g); // the review shows, from the rules
  p.choose("n2");
  const [first, next] = pools;
  first.load();
  await settle();
  assert.equal(await review.answered, g);
  assert.deepEqual([p.session.gpu, first.onGpuLost, first.released], [null, null, false]);
  next.load();
  await settle();
  assert.notEqual(next.onGpuLost, null); // the GPU's control is the next pool's
  assert.deepEqual([first.searches.length, next.searches.length, first.terminated], [0, g.passCount + 1, true]);
  assert.equal(p.session.network, "n2");
  p.end();
});

test("the first network failing to load after another was chosen is no error: the other takes over", async () => {
  const { page: p, pools } = page();
  const review = startReview(p);
  await settle();
  const g = review.made();
  p.choose("n2");
  const [first, next] = pools;
  first.fail(new Error("n1 did not load"));
  await settle();
  assert.equal(await review.answered, g);
  next.load();
  await settle();
  assert.deepEqual([p.session.error, p.session.network, g.engineReady], ["", "n2", true]);
  assert.deepEqual([first.searches.length, next.searches.length], [0, g.passCount + 1]);
  p.end();
});
