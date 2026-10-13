<script lang="ts">
  // The Analysis board (docs/design/21-analysis.md): a free board in the browser, from the standard start or a line
  // brought by its ways in (docs/design/22-site-map.md): `#record=` (a record, checked as an import is), `#packed=` (a
  // shared analysis, or an analysis file opened on the home page), and `&at=`, the place on the main line. The engine searches the position on screen only, and the moves the player asks to
  // evaluate: no pass runs over the line (GameAnalysis's board form). The tree is the player's: its first line is the
  // main line, which "Make main line" changes. One board in each browser, kept as the player leaves it. The engine
  // settings are the review's (docs/design/09-engine-settings.md), and the GPU worker joins as it does there.
  import { onDestroy, onMount, untrack } from "svelte";
  import { Dialog } from "bits-ui";
  import { replaceState } from "$app/navigation";
  import ReviewView from "#lib/review/ReviewView.svelte";
  import { onlyJudged, review, type ReviewData, type Unit } from "#lib/review/model.ts";
  import { annotatedRecord } from "#lib/review/annotate.ts";
  import { EnginePool } from "#lib/analysis/pool.ts";
  import { GameAnalysis, LABEL_VISITS } from "#lib/analysis/game.svelte.ts";
  import { loadEngine, networkName, reviewVisits, saveEngine, type EngineSettings } from "#lib/analysis/engineSettings.ts";
  import { trackSettingChange } from "#lib/analysis/settingChanges.ts";
  import { GpuControl, gpuDownloadMB } from "#lib/analysis/gpu.svelte.ts";
  import { loadManifest, type Manifest } from "#lib/engine/client.ts";
  import { errorText } from "#lib/errors.ts";
  import { BOARD_ID, type KeptBoard } from "#lib/game/store.ts";
  import { boardLink, boardOfRecord, readBoardLink } from "#lib/game/board.ts";
  import { download, shippedModels, type ExportKind, type ExportResult } from "#lib/game/reviewFile.ts";
  import { analysisFileName, exportAnalysis } from "#lib/game/analysisFile.ts";
  import { holdsGame } from "#lib/game/importHash.ts";
  import { parseRecord } from "#lib/game/record.ts";
  import { variantProblem } from "#lib/game/import.ts";
  import { checkMoves } from "#lib/game/check.ts";
  import { STORES, dbGet, dbPut } from "#lib/storage/db.ts";
  import { mainIndex, pathKey } from "#lib/review/tree.ts";
  import { startAnalytics, track, trackOnce } from "#lib/analytics.svelte.ts";
  import { SITE_NAME, SITE_VERSION } from "#lib/edition.ts";
  import { EDGE_RANGES, range } from "#lib/measure.ts";

  const MESSAGE = "box-content max-w-[1100px] mx-auto my-8 px-4";
  const PLAYERS: ReviewData["players"] = { blue: "Blue", red: "Red" };
  // The position on screen, kept in this browser for the next visit (a convenience: the board opens at the start
  // without it).
  const AT_KEY = "hedge-school:board-at";
  // The Export menu's entries on the board (design 21), as the review's: the analysis by link, as a file with the
  // engine's results, or as the annotated record.
  const EXPORT_ITEMS: [ExportKind, string, string, string][] = [
    ["link", "Copy a link to share the analysis", "Its lines and the moves evaluated. The recipient's browser searches what it shows.", "Link copied"],
    ["file", "Analysis file, to open elsewhere", "With the engine's results: the analysis opens at once.", "Analysis file saved"],
    ["copy", "Copy the annotated record", "", "Annotated record copied"],
    ["text", "Annotated record as a file", "", "Annotated record saved"],
  ];

  let pool: EnginePool | null = null;
  let manifest = $state.raw<Manifest | null>(null);
  let network = ""; // the network of the pool in use, or of the pool that loads to replace it
  let game = $state<GameAnalysis | null>(null);
  let error = $state("");
  let notice = $state(""); // a line brought that could not open: the board kept here opens
  let start = $state<string[] | null>(null); // where the view opens
  let current = $state<string[]>([]); // the position on screen
  const engine = $state(loadEngine());
  $effect(() => saveEngine($state.snapshot(engine)));
  const budget = $derived(reviewVisits(engine)); // "Evaluate quality" searches to the review's depth

  const data = $derived(game?.data(PLAYERS) ?? null);
  // The review of the main line, with labels only on the moves evaluated (design 21).
  const R = $derived.by(() => {
    const g = game;
    if (!data || !g) return null;
    const judged = g.judgedMain, names = g.mainNames;
    return onlyJudged(review(data, "lead", LABEL_VISITS), i => !!judged[names.slice(0, i + 1).join(" ")]);
  });

  // The position on screen, kept for the next visit.
  $effect(() => {
    const key = pathKey(current);
    untrack(() => { if (game?.rulesReady) try { localStorage.setItem(AT_KEY, key); } catch { /* storage blocked: the start next time */ } });
  });

  // The engine's settings, given to the analysis as they change (the review page's way).
  $effect(() => {
    const g = game, off = !engine.on, visits = engine.visits, seconds = engine.seconds, labels = budget;
    if (!g) return;
    untrack(() => {
      g.setPaused(off);
      g.setDepth(visits, seconds);
      g.setReview(labels);
    });
  });
  $effect(() => {
    const workers = engine.workers;
    untrack(() => pool?.resize(workers));
  });
  $effect(() => {
    const id = engine.network;
    untrack(() => void useNetwork(id));
  });
  $effect(() => {
    const mode = engine.gpu;
    untrack(() => { if (game?.engineReady) void gpu?.apply(mode); });
  });
  let gpu = $state<GpuControl | null>(null);
  function controlGpu(p: EnginePool, id: string) {
    gpu?.end();
    gpu = manifest ? new GpuControl(p, manifest, id) : null;
    void gpu?.apply(engine.gpu);
  }
  // The position on screen is searched once the network is loaded, and again when the player moves, when the engine is
  // on again, or when its depth changes.
  $effect(() => {
    const g = game, path = current;
    if (!g?.engineReady || g.paused) return;
    void g.focusVisits; void g.focusSeconds;
    untrack(() => g.focus(path));
  });
  // The Greats of the moves evaluated, confirmed as results come (the review page's way).
  $effect(() => {
    const g = game;
    if (!g || !g.engineReady || g.paused) return;
    void [g.analysis, g.branches, g.judgedMain, g.labelVisits];
    untrack(() => g.confirmGreats());
  });

  /** Another network: a new pool loads it while the old one still answers the board's rules (the review page's way). */
  async function useNetwork(id: string) {
    const g = game;
    if (!pool || !manifest || !g || id === network) return;
    network = id;
    g.dropAnalysis();
    const next = new EnginePool(engine.workers);
    try {
      await next.start(manifest, id);
    } catch (e) {
      next.terminate();
      if (network === id) { error = errorText(e); track("engine_error", { error_kind: "load" }); }
      return;
    }
    if (network !== id) { next.terminate(); return; }
    next.releaseWhenIdle();
    pool = next;
    g.usePool(next);
    controlGpu(next, id);
    g.ready();
  }

  // A link's board, when the board kept here has moves of its own: the player chooses which to keep.
  let ask = $state<((open: boolean) => void) | null>(null);
  const choose = () => new Promise<boolean>(resolve => (ask = open => { ask = null; resolve(open); }));

  /** The board to open, and where: the kept place (`at`, a path), or a brought line's place on the main line
   *  (`atMain`). `via` is the way in, for the analytics: the page itself, the home page's Analyze, another record's
   *  link, a shared analysis, or an analysis file. */
  interface Opening { board: KeptBoard | null; at?: string[] | null; atMain?: number; via: "page" | "home" | "record" | "packed" | "file" }
  /** The board to open: one brought after the `#`, else the one kept in this browser. A brought one replaces the kept
   *  one, after the player agrees when the kept one has moves. It leaves the address at once, then the analytics start
   *  (design 22), and a reload keeps the board's own state. */
  async function chooseBoard(): Promise<Opening> {
    const kept = (await dbGet<KeptBoard>(STORES.branches, BOARD_ID)) ?? null;
    let keptAt: string[] | null = null;
    try { const k = localStorage.getItem(AT_KEY); keptAt = k ? k.split(" ") : []; } catch { /* storage blocked */ }
    const hash = location.hash.slice(1);
    if (!holdsGame(hash)) { startAnalytics(); return { board: kept, at: keptAt, via: "page" }; }
    const p = new URLSearchParams(hash), record = p.get("record");
    replaceState("/analysis", {});
    startAnalytics();
    const via = p.get("via") === "home" ? "home" : p.get("via") === "file" ? "file" : record !== null ? "record" : "packed";
    let brought: { board: KeptBoard; at: number };
    try {
      brought = record !== null ? await recordBoard(record, p.get("at")) : readBoardLink(p.get("packed") ?? "", p.get("at"));
    } catch (e) {
      notice = `${record !== null ? "This record" : "This link"} cannot be opened: ${errorText(e)}. Your own board is here instead.`;
      track("analysis_failed", { analysis_source: via });
      return { board: kept, at: keptAt, via };
    }
    if (kept?.nodes.length && !(await choose())) return { board: kept, at: keptAt, via };
    return { board: brought.board, atMain: brought.at, via };
  }
  /** A record brought to the board: checked as an import is (its variant, then its moves by the engine's rules), and its
   *  line becomes the main line. A record without moves is refused by its reader. */
  async function recordBoard(text: string, at: string | null): Promise<{ board: KeptBoard; at: number }> {
    const record = parseRecord(text), variant = variantProblem(record);
    if (variant) throw new Error(variant);
    const { problem } = await checkMoves(record);
    if (problem) throw new Error(problem);
    return { board: boardOfRecord(record), at: Math.max(0, Math.floor(Number(at)) || 0) };
  }

  onMount(async () => {
    try {
      manifest = await loadManifest();
      if (!manifest) throw new Error("no /engine/manifest.json: run `npm run engine` first");
      const chosen = await chooseBoard();
      const first = pool = new EnginePool(engine.workers);
      network = engine.network;
      const g = new GameAnalysis(first, [], true);
      g.setPaused(!engine.on);
      g.setDepth(engine.visits, engine.seconds);
      g.setReview(budget);
      try {
        await first.start(manifest, network, async () => {
          await g.start();
          if (chosen.board) await g.loadBoard(chosen.board);
          if (chosen.atMain !== undefined) await dbPut(STORES.branches, BOARD_ID, g.keptBoard()); // a link's board is now this browser's
          // The place to open: the link's on the main line, or the one kept here when it is still in the tree.
          const at = chosen.atMain !== undefined ? g.mainNames.slice(0, chosen.atMain)
            : chosen.at && (mainIndex(chosen.at, g.mainNames) !== null || pathKey(chosen.at) in g.branches) ? chosen.at : [];
          start = at;
          current = at;
          game = g;
        });
      } catch (e) {
        if (pool === first) throw e; // else another network took over while this one loaded
        return;
      }
      if (pool !== first) return;
      first.releaseWhenIdle();
      controlGpu(first, network);
      track("analysis_open", { analysis_source: chosen.via, edges: range(g.mainNames.length, EDGE_RANGES) });
      g.ready();
    } catch (e) {
      error = errorText(e);
      track("engine_error", { error_kind: "load" });
    }
  });
  onDestroy(() => { gpu?.end(); pool?.terminate(); });

  /** The board shared or exported (design 21): a link to it, or its record with the lines as variations. */
  async function exportAs(kind: ExportKind, unit: Unit): Promise<ExportResult | void> {
    const g = game, r = R;
    if (!g || !r) return;
    if (kind === "link") {
      const at = mainIndex(current, g.mainNames) ?? 0;
      const link = boardLink(location.origin, g.keptBoard(), at);
      await navigator.clipboard.writeText(link);
      return { linkLength: link.length };
    }
    if (kind === "file") {
      download(analysisFileName(), JSON.stringify(await exportAnalysis(g.keptBoard(), SITE_VERSION, shippedModels(manifest))));
      return;
    }
    const text = annotatedRecord({ R: r, unit, tags: {}, result: "*", branches: g.branches, annotator: SITE_NAME,
                                   note: `${SITE_NAME}'s analysis board, with ${networkName(network)} (the network ${network}).` });
    if (kind === "copy") await navigator.clipboard.writeText(text);
    else download("analysis.txt", text, "text/plain");
  }
</script>

<svelte:head><title>Analysis board</title></svelte:head>

{#if error}
  <p class="{MESSAGE} text-blunder">{error}</p>
{:else if game?.error && !game.rulesReady}
  <p class="{MESSAGE} text-blunder">The engine could not read this board: {game.error}</p>
{:else if R && game && start}
  {@const g = game}
  {#if notice}<p class="{MESSAGE} mb-0 text-blunder" role="alert">{notice}</p>{/if}
  <ReviewView {R} problem={g.error} deepVisits={engine.visits} onposition={path => (current = path)} {start}
              branches={g.branches} onplay={path => g.playLine(path)} rulesAt={path => g.rulesAt(path)}
              secondAt={path => g.secondAt(path)} otherAt={(path, turn) => g.otherAt(path, turn)}
              turnKeys={path => g.turnKeys(path)} pendingAt={path => g.pending(path)} reviewVisits={budget}
              ondelete={path => g.deleteFrom(path)} onpromote={path => g.promote(path)} onjudge={path => g.judge(path)}
              labelVisits={LABEL_VISITS} {engine} onengine={(change: Partial<EngineSettings>) => { trackSettingChange(change, engine, false); Object.assign(engine, change); }}
              onfeature={name => trackOnce(`board ${name}`, "feature", { feature_name: name })}
              gpu={{ status: gpu?.status ?? { state: "off" }, downloadMB: manifest ? gpuDownloadMB(manifest, engine.network) : "?" }}
              timedOut={g.stoppedByTime(current)} searching={g.focusing === pathKey(current)}
              lineSteps={(path, line) => g.lineSteps(path, line)}
              board={{ judged: g.judgedMain, onmain: path => g.setMain(path) }}
              onexport={exportAs} exportItems={EXPORT_ITEMS} />
{:else if !ask}
  <p class="{MESSAGE} text-muted">Setting up the board with the engine's rules…</p>
{/if}

<!-- A line brought by a link or a record, over the board kept here: the player chooses. -->
<Dialog.Root open={!!ask} onOpenChange={open => { if (!open) ask?.(false); }}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-20 bg-[rgb(0_0_0/0.45)]" />
    <Dialog.Content class="fixed z-30 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(94vw,28rem)]
                           px-5 py-4 bg-panel-2 border border-muted/50 rounded-md shadow-[0_6px_20px_rgb(0_0_0/0.4)]">
      <Dialog.Title class="mb-2 font-semibold">Replace your board?</Dialog.Title>
      <Dialog.Description class="text-sm">
        The line you brought replaces the board you left here, with all its lines. This browser keeps one board.
      </Dialog.Description>
      <div class="flex justify-end gap-2 mt-4">
        <button type="button" class="px-4 py-1 text-sm" onclick={() => ask?.(false)}>Keep mine</button>
        <button type="button" class="btn-primary px-4 py-1 text-sm" onclick={() => ask?.(true)}>Replace it</button>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
