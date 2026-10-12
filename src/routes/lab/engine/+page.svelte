<script lang="ts">
  // The engine lab: the engine module (protocol 0.1) in Web Workers. It draws the board from the engine's rules
  // (describe, before any network), analyses one position in slices with a stop, and reviews a whole game over a pool
  // of workers to measure the time a position on this machine.
  import { onMount } from "svelte";
  import Board from "#lib/board/Board.svelte";
  import { EngineWorker, loadManifest, megabytes, modelOf, type Manifest } from "#lib/engine/client.ts";
  import { parseEdge, type Edge } from "#lib/engine/notation.ts";
  import type { AnalysisReply, DescribeReply, VersionReply, ModelInfo } from "#lib/engine/protocol.ts";
  import { SWEEP_VISITS, boardPosition } from "#lib/analysis/game.svelte.ts";
  import { NETWORKS, REVIEW_PRESETS } from "#lib/analysis/engineSettings.ts";
  import { defaultPoolSize } from "#lib/analysis/pool.ts";
  import { errorText } from "#lib/errors.ts";
  import { pct, PLAYER_NAME } from "#lib/review/model.ts";
  import { SAMPLE, SAMPLE_MOVES as MOVES } from "#lib/mock/sample.ts";

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
  let initMs = $state(0); // the slowest worker's start, measured in the worker
  let start = $state({ ms: 0, workers: 0 }); // from creating the workers until every one has started, on the page
  let described = $state<{ reply: DescribeReply; ms: number } | null>(null);
  let live = $state<{ reply: AnalysisReply; ms: number; final: boolean; memory?: number } | null>(null);
  let stopSearch = $state<(() => void) | null>(null);
  let review = $state<{ model: string; visits: number; workers: number; wallMs: number; meanMs: number; maxMs: number;
                        vps: number; memory: number; blueWin: number[] } | null>(null);

  let pool: { key: string; engines: EngineWorker[] } | null = null;
  const cores = typeof navigator === "undefined" ? 1 : navigator.hardwareConcurrency;
  const pts = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(0)}`;
  const FIELDS = "flex flex-wrap items-center gap-x-5 gap-y-2.5 mb-3";
  const SMALL = "my-3 text-xs text-muted";
  const fmt = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(0)} ms`);
  const mib = (b: number) => `${(b / 2 ** 20).toFixed(0)} MiB`;
  const query = (k: number) => ({ moves: MOVES.slice(0, k) });

  onMount(async () => {
    workers = defaultPoolSize();
    manifest = await loadManifest();
    if (!manifest) { error = "No /engine/manifest.json. Run `npm run engine` first."; return; }
    modelId = manifest!.artifacts.find(a => a.kind === "model")?.id ?? "";
    await guarded(showRules);
  });

  async function guarded(task: () => Promise<void>) {
    error = "";
    try { await task(); } catch (e) { error = errorText(e); } finally { busy = ""; }
  }

  /** The pool, with the module loaded in each worker. The network is loaded on first need. */
  async function getPool(size: number, withModel: boolean): Promise<EngineWorker[]> {
    const key = `${size}`;
    if (pool?.key !== key) {
      pool?.engines.forEach(e => e.terminate());
      loaded = null;
      busy = `loading the engine in ${size} worker${size > 1 ? "s" : ""}`;
      const t0 = performance.now();
      const engines = Array.from({ length: size }, () => new EngineWorker());
      const t = await Promise.all(engines.map(e => e.init(manifest!)));
      start = { ms: performance.now() - t0, workers: size };
      version = t[0].reply;
      initMs = Math.max(...t.map(x => x.ms));
      pool = { key, engines };
    }
    if (withModel && loaded?.model.name !== modelId) {
      busy = `loading the network ${modelId}`;
      const model = modelOf(manifest!, modelId)!;
      const t = await Promise.all(pool!.engines.map(e => e.loadModel(model)));
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
    live = { reply: t.reply, ms: t.ms, final: true, memory: t.memory };
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

  // The speed on this machine, for the review's defaults (decisions/open-items.md, "Speed on a visitor's machine"):
  // every sixth position of the game at 256 visits, for each network and 1, 2, 4 and 8 workers (no more than the
  // machine's cores). The same positions in every run, after one short search in each worker, so that the timed
  // searches start warm. The result is text to copy, with the machine's description.
  const SWEEP = { step: 6, visits: 256, workers: [1, 2, 4, 8] };
  type SweepRow = { model: string; workers: number; positions: number; wallMs: number; vps: number; perWorker: number };
  let sweep = $state<{ rows: SweepRow[]; machine: string[] } | null>(null);
  let copied = $state(false);
  const params = (id: string) => NETWORKS.find(n => n.id === id)?.params ?? id;
  // A Lite review of the whole game: the sweep and the label pass of every position.
  const liteMinutes = (vps: number) => (MOVES.length * (SWEEP_VISITS + REVIEW_PRESETS.lite)) / vps / 60;

  async function machine(): Promise<string[]> {
    type GpuInfo = { vendor?: string; architecture?: string; description?: string };
    type Gpu = { requestAdapter(o?: object): Promise<{ info?: GpuInfo } | null> };
    const nav = navigator as Navigator & { gpu?: Gpu; deviceMemory?: number; getBattery?: () => Promise<{ charging: boolean }> };
    const adapter = await nav.gpu?.requestAdapter({ powerPreference: "high-performance" }).catch(() => null);
    const info = adapter?.info;
    const battery = await nav.getBattery?.().catch(() => null);
    return [
      `${cores} logical cores${nav.deviceMemory ? `, at least ${nav.deviceMemory} GB of memory` : ""}` +
        (battery ? `, ${battery.charging ? "on mains power" : "on battery"}` : ""),
      `WebGPU: ${!nav.gpu ? "none" : !adapter ? "no adapter" : [info?.vendor, info?.architecture, info?.description].filter(Boolean).join(" ") || "an adapter, not described"}`,
      navigator.userAgent,
    ];
  }

  const runSweep = () => guarded(async () => {
    const sizes = SWEEP.workers.filter(k => k <= cores);
    const models = manifest!.artifacts.filter(a => a.kind === "model").map(a => a.id);
    const positions = MOVES.map((_, k) => k).filter(k => k % SWEEP.step === 0);
    sweep = { rows: [], machine: await machine() };
    copied = false;
    for (const model of models)
      for (const size of sizes) {
        modelId = model;
        const engines = await getPool(size, true);
        busy = `sweep: ${params(model)}, ${size} worker${size > 1 ? "s" : ""}, warming up`;
        await Promise.all(engines.map(e => e.analyse({ moves: [], maxVisits: 32 }).done));
        let next = 0, finished = 0, visitsDone = 0, searchMs = 0;
        const t0 = performance.now();
        await Promise.all(engines.map(async engine => {
          while (next < positions.length) {
            const k = positions[next++];
            const t = await engine.analyse({ ...query(k), maxVisits: SWEEP.visits }).done;
            visitsDone += t.reply.rootInfo.visits;
            searchMs += t.ms;
            busy = `sweep: ${params(model)}, ${size} worker${size > 1 ? "s" : ""}, ${++finished} of ${positions.length} positions`;
          }
        }));
        const wallMs = performance.now() - t0;
        sweep.rows.push({ model, workers: size, positions: positions.length, wallMs,
                          vps: visitsDone / (wallMs / 1000), perWorker: visitsDone / (searchMs / 1000) });
      }
  });

  const sweepText = $derived(sweep && [
    `Engine lab speed sweep, ${new Date().toISOString().slice(0, 10)}: every ${SWEEP.step}th position at ${SWEEP.visits} visits`,
    ...sweep.machine,
    "",
    "| Network | Workers | Visits a second, all workers | Each worker | A Lite review of the game |",
    "|---|---|---|---|---|",
    ...sweep.rows.map(r => `| ${params(r.model)} | ${r.workers} | ${r.vps.toFixed(0)} | ${r.perWorker.toFixed(0)} | ` +
                           `${liteMinutes(r.vps).toFixed(1)} min |`),
  ].join("\n"));

  const board = $derived(described ? boardPosition(described.reply) : null);
  const lastEdge = $derived<Edge | null>(edge > 0 ? parseEdge(MOVES[edge - 1]) : null);
</script>

<svelte:head><title>Engine lab</title></svelte:head>

<main class="box-content max-w-288 mx-auto p-4">
  <h1 class="mb-1 text-3xl font-bold">Engine lab</h1>
  <p class="mb-4 text-muted">
    The engine module in Web Workers, one instance a worker. All values are from Blue's side. The game: a bot game,
    {SAMPLE.players.blue} (Blue) against {SAMPLE.players.red} (Red), {MOVES.length} edges.
  </p>

  <fieldset class={FIELDS} disabled={!!busy || !manifest}>
    <label>Network
      <select bind:value={modelId}>
        {#each manifest?.artifacts.filter(a => a.kind === "model") ?? [] as a (a.id)}
          <option value={a.id}>{a.id} ({megabytes(a.bytes)} MB{a.released ? "" : ", local"})</option>
        {/each}
      </select>
    </label>
    <label>Visits <input type="number" class="w-18" min="1" step="1" bind:value={visits} /></label>
    <label>Slice <input type="number" class="w-18" min="1" step="1" bind:value={sliceVisits} /> visits</label>
    <label>Workers <input type="number" class="w-18" min="1" max={cores} bind:value={workers} /> of {cores} logical cores</label>
  </fieldset>
  <fieldset class={FIELDS} disabled={!!busy || !manifest}>
    <label>Position after edge
      <input type="range" min="0" max={MOVES.length - 1} bind:value={edge} onchange={() => guarded(showRules)} /> {edge}
    </label>
    <button onclick={analyseOne}>Analyse the position</button>
    <button onclick={reviewGame}>Review the whole game ({MOVES.length} positions)</button>
    <button onclick={runSweep}>Speed sweep (both networks, 1 to {Math.min(8, cores)} workers)</button>
  </fieldset>

  {#if busy}
    <p class="my-3.75 text-muted">{busy}… {#if stopSearch}<button onclick={() => stopSearch?.()}>Stop</button>{/if}</p>
  {/if}
  {#if error}<p class="my-3.75 text-blunder">{error}</p>{/if}

  {#if sweep}
    <section class="mb-6">
      <h2>Speed sweep</h2>
      <p class={SMALL}>
        Every {SWEEP.step}th position of the game at {SWEEP.visits} visits. "A Lite review": {MOVES.length} positions at
        32 and 512 visits, at the speed of all the workers.
      </p>
      <table class="my-2 text-sm tabular-nums">
        <thead><tr><th>Network</th><th>Workers</th><th>Visits a second, all workers</th><th>Each worker</th><th>A Lite review</th></tr></thead>
        <tbody>
          {#each sweep.rows as r (`${r.model} ${r.workers}`)}
            <tr><td>{params(r.model)}</td><td>{r.workers}</td><td>{r.vps.toFixed(0)}</td><td>{r.perWorker.toFixed(0)}</td>
                <td>{liteMinutes(r.vps).toFixed(1)} min</td></tr>
          {/each}
        </tbody>
      </table>
      {#if sweepText && !busy}
        <textarea readonly rows="6" class="w-full font-mono text-xs" aria-label="The sweep's result, to copy">{sweepText}</textarea>
        <button onclick={() => navigator.clipboard.writeText(sweepText).then(() => (copied = true)).catch(e => (error = errorText(e)))}>
          {copied ? "Copied" : "Copy the result"}</button>
      {/if}
    </section>
  {/if}

  <div class="grid items-start gap-6 min-[901px]:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
    <section class="rounded overflow-hidden">
      {#if board}
        <Board position={board} {lastEdge} layers={{ candidates: false, marks: false }} />
        <p class={SMALL}>
          From the engine's rules, without a network: {described!.reply.position.length} characters of position,
          {described!.reply.legal.length} legal edges, described in {fmt(described!.ms)}.
          Scores {described!.reply.scores[0]} / {described!.reply.scores[1]}.
        </p>
      {/if}
    </section>

    <section class="[&_h2]:mt-4 [&_h2]:mb-1.5 [&_h2]:text-[1.05rem] [&_h2]:font-bold">
      {#if version}
        <h2>The engine</h2>
        <table class="[&_td]:pr-3 [&_td]:py-0.5 [&_td]:align-top [&_td:first-child]:text-muted">
          <tbody>
            <tr><td>Protocol</td><td>{version.protocol}</td></tr>
            <tr><td>Build</td><td>{version.build}</td></tr>
            <tr><td>Rules</td><td>{version.rules}</td></tr>
            <tr><td>Trained outputs</td><td>{version.trained.join(", ")}</td></tr>
            <tr><td>Module start</td><td>{fmt(initMs)} in a worker, {fmt(start.ms)} until all {start.workers} workers started</td></tr>
            {#if loaded}
              <tr><td>Network</td><td>{loaded.model.name}, {megabytes(loaded.model.bytes)} MB, loaded in {fmt(loaded.ms)}</td></tr>
              <tr><td>SHA-256</td><td class="font-mono">{loaded.model.sha256.slice(0, 16)}…</td></tr>
              <tr><td>Memory</td><td>{mib(loaded.memory)} an instance</td></tr>
            {/if}
          </tbody>
        </table>
      {/if}

      {#if live}
        {@const r = live.reply.rootInfo}
        <h2>Position after edge {edge} {live.final ? "" : "(searching)"}</h2>
        <p class="my-3.75">
          {PLAYER_NAME[r.currentPlayer === "b" ? 0 : 1]} to play. Blue's win chance <strong>{pct(r.winrate)}</strong>,
          margin <strong>{pts(r.scoreSelfplay)} ± {r.scoreStdev.toFixed(0)}</strong>, lead {pts(r.scoreLead)}.
          Network alone: {pct(r.rawWinrate)}, {pts(r.rawScoreSelfplay)}.
          {r.visits} visits in {fmt(live.ms)} ({(r.visits / (live.ms / 1000)).toFixed(0)} a second).
          {#if live.memory}The worker's memory after the search: {mib(live.memory)}.{/if}
        </p>
        <table class="text-sm tabular-nums [&_:is(th,td)]:px-2 [&_:is(th,td)]:py-0.5 [&_:is(th,td)]:text-right [&_:is(th,td)]:border-b [&_:is(th,td)]:border-line [&_:is(th,td):nth-child(2)]:text-left">
          <thead><tr><th>#</th><th>Edge</th><th>Visits</th><th>Win</th><th>Margin</th><th>±</th><th>Lead</th><th>Prior</th></tr></thead>
          <tbody>
            {#each live.reply.moveInfos.slice(0, 10) as c (c.move)}
              <tr>
                <td>{c.order + 1}</td><td class="font-mono">{c.move}</td><td>{c.edgeVisits}</td><td>{pct(c.winrate)}</td>
                <td>{pts(c.scoreSelfplay)}</td><td>{c.scoreStdev.toFixed(0)}</td><td>{pts(c.scoreLead)}</td><td>{pct(c.prior)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        <p class={SMALL}>{live.reply.moveInfos.length} candidates visited. Engine tag: protocol {live.reply.engine.protocol},
          build {live.reply.engine.build}, model {live.reply.engine.model.slice(0, 12)}….</p>
      {/if}

      {#if review}
        <h2>Whole-game review</h2>
        <p class="my-3.75">
          {MOVES.length} positions at {review.visits} visits with {review.workers} worker{review.workers > 1 ? "s" : ""}
          ({review.model}): <strong>{fmt(review.wallMs)}</strong> in all. A position: mean {fmt(review.meanMs)},
          slowest {fmt(review.maxMs)}. {review.vps.toFixed(0)} visits a second in each worker. Memory at most
          {mib(review.memory)} an instance.
        </p>
        <svg viewBox="0 0 {review.blueWin.length} 100" preserveAspectRatio="none" class="w-full h-28 bg-panel border border-line" aria-label="Blue's win chance by edge">
          <line x1="0" y1="50" x2={review.blueWin.length} y2="50" class="stroke-muted" stroke-dasharray="2 2" vector-effect="non-scaling-stroke" />
          <polyline points={review.blueWin.map((w, i) => `${i},${100 - 100 * w}`).join(" ")} class="fill-none stroke-blue" stroke-width="1.5" vector-effect="non-scaling-stroke" />
        </svg>
      {/if}
    </section>
  </div>
</main>
