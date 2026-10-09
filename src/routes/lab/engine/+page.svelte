<script lang="ts">
  // The engine lab: the engine module (protocol 1.0) in Web Workers. It draws the board from the engine's rules
  // (describe, before any network), analyses one position in slices with a stop, and reviews a whole game over a pool
  // of workers to measure the time a position on this machine.
  import { onMount } from "svelte";
  import Board from "#lib/board/Board.svelte";
  import { EngineWorker, type Manifest } from "#lib/engine/client.ts";
  import { edgeName, parseEdge, type Edge } from "#lib/engine/notation.ts";
  import type { AnalysisReply, DescribeReply, VersionReply, ModelInfo } from "#lib/engine/protocol.ts";
  import type { Position } from "#lib/review/model.ts";
  import data from "#lib/mock/review.json";

  const MOVES: string[] = data.moves.map(m => edgeName(m.edge as Edge));

  let manifest = $state<Manifest | null>(null);
  let modelId = $state("");
  let workers = $state(1);
  let visits = $state(256);
  let sliceVisits = $state(32);
  let edge = $state(40);
  let busy = $state("");
  let error = $state("");

  let version = $state<VersionReply | null>(null);
  let loaded = $state<{ model: ModelInfo; ms: number; memory: number } | null>(null);
  let initMs = $state(0);
  let described = $state<{ reply: DescribeReply; ms: number } | null>(null);
  let live = $state<{ reply: AnalysisReply; ms: number; final: boolean } | null>(null);
  let stopSearch = $state<(() => void) | null>(null);
  let review = $state<{ model: string; visits: number; workers: number; wallMs: number; meanMs: number; maxMs: number;
                        vps: number; memory: number; blueWin: number[] } | null>(null);

  let pool: { key: string; engines: EngineWorker[] } | null = null;
  const cores = typeof navigator === "undefined" ? 1 : navigator.hardwareConcurrency;
  const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
  const pts = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(0)}`;
  const fmt = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(0)} ms`);
  const mib = (b: number) => `${(b / 2 ** 20).toFixed(0)} MiB`;
  const url = (id: string) => manifest!.artifacts.find(a => a.id === id)!.url;
  const query = (k: number) => ({ moves: MOVES.slice(0, k) });

  onMount(async () => {
    workers = Math.max(1, Math.min(4, Math.floor(cores / 2)));
    const response = await fetch("/engine/manifest.json");
    if (!response.ok) { error = "No /engine/manifest.json. Run `npm run engine` first."; return; }
    manifest = await response.json();
    modelId = manifest!.artifacts.find(a => a.kind === "model")?.id ?? "";
    await guarded(showRules);
  });

  async function guarded(task: () => Promise<void>) {
    error = "";
    try { await task(); } catch (e) { error = String(e); } finally { busy = ""; }
  }

  /** The pool, with the module loaded in each worker. The network is loaded on first need. */
  async function getPool(size: number, withModel: boolean): Promise<EngineWorker[]> {
    const key = `${size}`;
    if (pool?.key !== key) {
      pool?.engines.forEach(e => e.terminate());
      loaded = null;
      busy = `loading the engine in ${size} worker${size > 1 ? "s" : ""}`;
      const module = manifest!.artifacts.find(a => a.kind === "module")!;
      const engines = Array.from({ length: size }, () => new EngineWorker());
      const t = await Promise.all(engines.map(e => e.init(module.url)));
      version = t[0].reply;
      initMs = Math.max(...t.map(x => x.ms));
      pool = { key, engines };
    }
    if (withModel && loaded?.model.name !== modelId) {
      busy = `loading the network ${modelId}`;
      const t = await Promise.all(pool!.engines.map(e => e.loadModel(url(modelId), modelId)));
      loaded = { model: t[0].reply.model, ms: Math.max(...t.map(x => x.ms)), memory: Math.max(...t.map(x => x.memory)) };
    }
    return pool!.engines;
  }

  async function showRules() {
    const [engine] = await getPool(workers, false);
    busy = "describing the position";
    const t = await engine.describe(query(edge));
    described = { reply: t.reply, ms: t.ms };
  }

  const analyseOne = () => guarded(async () => {
    const [engine] = await getPool(workers, true);
    await showRules();
    busy = `analysing the position after edge ${edge}`;
    live = null;
    const run = engine.analyse({ ...query(edge), maxVisits: visits, slice: { visits: sliceVisits } },
                               (reply, ms) => (live = { reply, ms, final: false }));
    stopSearch = run.stop;
    const t = await run.done;
    stopSearch = null;
    live = { reply: t.reply, ms: t.ms, final: true };
  });

  // The real workload: every position of the game, each worker taking the next when it is free.
  const reviewGame = () => guarded(async () => {
    const engines = await getPool(workers, true);
    const n = MOVES.length;
    const done: { ms: number; visits: number; blueWin: number; memory: number }[] = [];
    let next = 0;
    const t0 = performance.now();
    busy = `reviewing: 0 of ${n}`;
    await Promise.all(engines.map(async engine => {
      while (next < n) {
        const k = next++;
        const t = await engine.analyse({ ...query(k), maxVisits: visits }).done;
        done[k] = { ms: t.ms, visits: t.reply.rootInfo.visits, blueWin: t.reply.rootInfo.winrate, memory: t.memory };
        busy = `reviewing: ${done.filter(Boolean).length} of ${n}`;
      }
    }));
    const wallMs = performance.now() - t0;
    const busyMs = done.reduce((s, d) => s + d.ms, 0);
    review = {
      model: modelId, visits, workers: engines.length, wallMs, meanMs: busyMs / n, maxMs: Math.max(...done.map(d => d.ms)),
      vps: done.reduce((s, d) => s + d.visits, 0) / (busyMs / 1000), memory: Math.max(...done.map(d => d.memory)),
      blueWin: done.map(d => d.blueWin),
    };
    console.log("[lab] review", JSON.stringify({ ...review, blueWin: undefined, cores }));
  });

  /** The engine's description of a position, as the board draws it. */
  function boardPosition(d: DescribeReply): Position {
    const ring = (poly: [number, number][]) => ({ area: 0, rings: [poly] });
    return {
      edges: [d.edges.b.map(parseEdge), d.edges.r.map(parseEdge)],
      protected: d.protected.map(parseEdge), placed: d.placed.map(parseEdge),
      scores: d.scores, player: d.mover === "b" ? 0 : 1, movesLeft: d.movesLeft,
      regions: [d.regions.b.map(ring), d.regions.r.map(ring)],
    };
  }
  const board = $derived(described ? boardPosition(described.reply) : null);
  const lastEdge = $derived<Edge | null>(edge > 0 ? parseEdge(MOVES[edge - 1]) : null);
</script>

<svelte:head><title>Engine lab</title></svelte:head>

<main>
  <h1>Engine lab</h1>
  <p class="lead">
    The engine module in Web Workers, one instance a worker. All values are from Blue's side. The game: a bot game,
    {data.players.blue} (Blue) against {data.players.red} (Red), {MOVES.length} edges.
  </p>

  <fieldset disabled={!!busy || !manifest}>
    <label>Network
      <select bind:value={modelId}>
        {#each manifest?.artifacts.filter(a => a.kind === "model") ?? [] as a (a.id)}
          <option value={a.id}>{a.id} ({(a.bytes / 1e6).toFixed(1)} MB{a.released ? "" : ", local"})</option>
        {/each}
      </select>
    </label>
    <label>Visits <input type="number" min="1" step="1" bind:value={visits} /></label>
    <label>Slice <input type="number" min="1" step="1" bind:value={sliceVisits} /> visits</label>
    <label>Workers <input type="number" min="1" max={cores} bind:value={workers} /> of {cores} logical cores</label>
  </fieldset>
  <fieldset disabled={!!busy || !manifest}>
    <label>Position after edge
      <input type="range" min="0" max={MOVES.length - 1} bind:value={edge} onchange={() => guarded(showRules)} /> {edge}
    </label>
    <button onclick={analyseOne}>Analyse the position</button>
    <button onclick={reviewGame}>Review the whole game ({MOVES.length} positions)</button>
  </fieldset>

  {#if busy}
    <p class="status">{busy}… {#if stopSearch}<button onclick={() => stopSearch?.()}>Stop</button>{/if}</p>
  {/if}
  {#if error}<p class="error">{error}</p>{/if}

  <div class="cols">
    <section class="board">
      {#if board}
        <Board position={board} {lastEdge} layers={{ regions: true, protected: true, candidates: false, marks: false, coordinates: true }} />
        <p class="small">
          From the engine's rules, without a network: {described!.reply.position.length} characters of position,
          {described!.reply.legal.length} legal edges, described in {fmt(described!.ms)}.
          Scores {described!.reply.scores[0]} / {described!.reply.scores[1]}.
        </p>
      {/if}
    </section>

    <section class="info">
      {#if version}
        <h2>The engine</h2>
        <table class="kv">
          <tbody>
            <tr><td>Protocol</td><td>{version.protocol}</td></tr>
            <tr><td>Build</td><td>{version.build}</td></tr>
            <tr><td>Rules</td><td>{version.rules}</td></tr>
            <tr><td>Trained outputs</td><td>{version.trained.join(", ")}</td></tr>
            <tr><td>Module start</td><td>{fmt(initMs)}</td></tr>
            {#if loaded}
              <tr><td>Network</td><td>{loaded.model.name}, {(loaded.model.bytes / 1e6).toFixed(1)} MB, loaded in {fmt(loaded.ms)}</td></tr>
              <tr><td>SHA-256</td><td class="mono">{loaded.model.sha256.slice(0, 16)}…</td></tr>
              <tr><td>Memory</td><td>{mib(loaded.memory)} an instance</td></tr>
            {/if}
          </tbody>
        </table>
      {/if}

      {#if live}
        {@const r = live.reply.rootInfo}
        <h2>Position after edge {edge} {live.final ? "" : "(searching)"}</h2>
        <p>
          {r.currentPlayer === "b" ? "Blue" : "Red"} to play. Blue's win chance <strong>{pct(r.winrate)}</strong>,
          margin <strong>{pts(r.scoreSelfplay)} ± {r.scoreStdev.toFixed(0)}</strong>, lead {pts(r.scoreLead)}.
          Network alone: {pct(r.rawWinrate)}, {pts(r.rawScoreSelfplay)}.
          {r.visits} visits in {fmt(live.ms)} ({(r.visits / (live.ms / 1000)).toFixed(0)} a second).
        </p>
        <table class="cands">
          <thead><tr><th>#</th><th>Edge</th><th>Visits</th><th>Win</th><th>Margin</th><th>±</th><th>Lead</th><th>Prior</th></tr></thead>
          <tbody>
            {#each live.reply.moveInfos.slice(0, 10) as c (c.move)}
              <tr>
                <td>{c.order + 1}</td><td class="mono">{c.move}</td><td>{c.visits}</td><td>{pct(c.winrate)}</td>
                <td>{pts(c.scoreSelfplay)}</td><td>{c.scoreStdev.toFixed(0)}</td><td>{pts(c.scoreLead)}</td><td>{pct(c.prior)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        <p class="small">{live.reply.moveInfos.length} candidates visited. Engine tag: protocol {live.reply.engine.protocol},
          build {live.reply.engine.build}, model {live.reply.engine.model.slice(0, 12)}….</p>
      {/if}

      {#if review}
        <h2>Whole-game review</h2>
        <p>
          {MOVES.length} positions at {review.visits} visits with {review.workers} worker{review.workers > 1 ? "s" : ""}
          ({review.model}): <strong>{fmt(review.wallMs)}</strong> in all. A position: mean {fmt(review.meanMs)},
          slowest {fmt(review.maxMs)}. {review.vps.toFixed(0)} visits a second in each worker. Memory at most
          {mib(review.memory)} an instance.
        </p>
        <svg viewBox="0 0 {review.blueWin.length} 100" preserveAspectRatio="none" class="graph" aria-label="Blue's win chance by edge">
          <line x1="0" y1="50" x2={review.blueWin.length} y2="50" class="mid" />
          <polyline points={review.blueWin.map((w, i) => `${i},${100 - 100 * w}`).join(" ")} />
        </svg>
      {/if}
    </section>
  </div>
</main>

<style>
  main { max-width: 72rem; margin: 0 auto; padding: 1rem; }
  h1 { margin: 0 0 0.3rem; }
  h2 { font-size: 1.05rem; margin: 1rem 0 0.4rem; }
  .lead { color: var(--muted); margin-top: 0; }
  fieldset { display: flex; flex-wrap: wrap; gap: 0.6rem 1.2rem; align-items: center; border: none; padding: 0; margin: 0 0 0.8rem; }
  input[type="number"] { width: 4.5rem; font: inherit; }
  select { font: inherit; }
  .cols { display: grid; grid-template-columns: minmax(0, 480px) minmax(0, 1fr); gap: 1.5rem; align-items: start; }
  @media (max-width: 900px) { .cols { grid-template-columns: minmax(0, 1fr); } }
  .board { border-radius: 4px; overflow: hidden; }
  .small { font-size: 0.85em; color: var(--muted); }
  .kv td { padding: 0.1rem 0.8rem 0.1rem 0; vertical-align: top; }
  .kv td:first-child { color: var(--muted); }
  .mono { font-family: ui-monospace, monospace; }
  .cands { border-collapse: collapse; font-size: 0.9em; }
  .cands th, .cands td { padding: 0.15rem 0.5rem; text-align: right; border-bottom: 1px solid var(--border); font-variant-numeric: tabular-nums; }
  .cands th:nth-child(2), .cands td:nth-child(2) { text-align: left; }
  .error { color: var(--blunder); }
  .status { color: var(--muted); }
  .graph { width: 100%; height: 7rem; border: 1px solid var(--border); background: var(--panel); }
  .graph polyline { fill: none; stroke: var(--blue); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
  .graph .mid { stroke: var(--muted); stroke-dasharray: 2 2; vector-effect: non-scaling-stroke; }
</style>
