<script lang="ts">
  // The Analysis board (docs/design/21-analysis.md): a free board in the browser, from the standard start, a set-up
  // position, or a line brought by its ways in (docs/design/22-site-map.md): `#record=` (a record, checked as an import
  // is), `#position=` (a set-up start, from the board editor or the Import; with `record=`, the record's start),
  // `#packed=` (a shared analysis, or an analysis file loaded), and `&at=`, the place on the main line. The engine searches the position on screen only, and the moves the player asks to
  // evaluate: no pass runs over the line (GameAnalysis's board form). The tree is the player's: its first line is the
  // main line, which "Make main line" changes. One board in each browser, kept as the player leaves it. The engine
  // settings are the review's (docs/design/09-engine-settings.md), and the GPU worker joins as it does there.
  import { onDestroy, onMount, untrack } from "svelte";
  import { Dialog } from "bits-ui";
  import { replaceState } from "$app/navigation";
  import ReviewView from "#lib/review/ReviewView.svelte";
  import NewMenu from "#lib/analysis/NewMenu.svelte";
  import { STANDARD_START, setUpStart } from "#lib/engine/notation.ts";
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
  import { Dialog as ImportDialog } from "bits-ui";
  import { holdsGame } from "#lib/game/importHash.ts";
  import { parseRecord } from "#lib/game/record.ts";
  import { variantProblem } from "#lib/game/import.ts";
  import { checkMoves, checkPosition } from "#lib/game/check.ts";
  import { STORES, dbGet, dbPut } from "#lib/storage/db.ts";
  import { mainIndex, pathKey } from "#lib/review/tree.ts";
  import { startAnalytics, track, trackOnce } from "#lib/analytics.svelte.ts";
  import { trackImport, trackImportFailed, trackLoad, trackLoadFailed, type ImportSource, type LoadSource } from "#lib/game/importEvents.ts";
  import { readPasted } from "#lib/game/paste.ts";
  import { fileKind, keepAnalysisResults, readAnalysisFile } from "#lib/game/analysisFile.ts";
  import { SITE_NAME, SITE_VERSION } from "#lib/edition.ts";
  import { EDGE_RANGES, range } from "#lib/measure.ts";
  import PageMeta from "#lib/PageMeta.svelte";

  const MESSAGE = "box-content max-w-[1100px] mx-auto my-8 px-4";
  const PLAYERS: ReviewData["players"] = { blue: "Blue", red: "Red" };
  // The position on screen, kept in this browser for the next visit (a convenience: the board opens at the start
  // without it).
  const AT_KEY = "hedge-school:board-at";
  // The Export menu's entries on the board (design 21), as the review's: the analysis by link, as a file with the
  // engine's results, or as the annotated record.
  const EXPORT_ITEMS: [ExportKind, string, string, string][] = [
    ["share_link", "Copy a link to share the analysis", "Its lines and the moves evaluated. The recipient's browser searches what it shows.", "Link copied"],
    ["analysis_file", "Analysis file, to load later or elsewhere", "With the engine's results: the analysis opens at once.", "Analysis file saved"],
    ["record_copy", "Copy the annotated record", "", "Annotated record copied"],
    ["record_file", "Annotated record as a file", "", "Annotated record saved"],
  ];

  let pool: EnginePool | null = null;
  let manifest = $state.raw<Manifest | null>(null);
  let network = ""; // the network of the pool in use, or of the pool that loads to replace it
  let game = $state<GameAnalysis | null>(null);
  let error = $state("");
  let notice = $state(""); // a line brought that could not open: the board kept here opens
  const sentence = (text: string) => text.replace(/\.?$/, "."); // an error's text, ended by one period
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

  /** The analysis to open, and where: the kept place (`at`, a path), or a brought line's place on the main line
   *  (`atMain`). How a brought line came (design 17): `imported` for a game from outside, `loaded` for saved work. None
   *  for the analysis kept here. */
  interface Opening { board: KeptBoard | null; at?: string[] | null; atMain?: number; imported?: ImportSource; loaded?: LoadSource }
  // The ways in that this site's own pages name in the address (`via`): a pasted record, Constellation export or
  // position (imports), an analysis file (a load), and the board editor's position and the New menu's standard start
  // (neither: the site's own, design 17). Without one, `record=` and `position=` are another site's link, and `packed=`
  // a shared analysis.
  const PASTED: string[] = ["pasted_record", "pasted_constellation", "pasted_position"];
  const OWN: string[] = ["editor", "new"];
  /** The analysis to open: one imported after the `#`, else the one kept in this browser. An imported one replaces the
   *  kept one, after the player agrees when the kept one has moves. It leaves the address at once, then the analytics
   *  start (design 22), and a reload keeps the analysis's own state. */
  async function chooseBoard(): Promise<Opening> {
    const kept = (await dbGet<KeptBoard>(STORES.branches, BOARD_ID)) ?? null;
    let keptAt: string[] | null = null;
    try { const k = localStorage.getItem(AT_KEY); keptAt = k ? k.split(" ") : []; } catch { /* storage blocked */ }
    const hash = location.hash.slice(1);
    if (!holdsGame(hash)) { startAnalytics(); return { board: kept, at: keptAt }; }
    const p = new URLSearchParams(hash), record = p.get("record"), position = p.get("position"), via = p.get("via");
    replaceState("/analysis", {});
    startAnalytics();
    const brings = record !== null || position !== null; // moves or a start, not saved work
    const imported: ImportSource | undefined = !brings || OWN.includes(via ?? "") ? undefined
      : PASTED.includes(via ?? "") ? (via as ImportSource) : "site_link";
    const loaded: LoadSource | undefined = brings ? undefined : via === "analysis_file" ? via : "analysis_share_link";
    let brought: { board: KeptBoard; at: number };
    try {
      brought = record !== null ? await recordBoard(record, p.get("at"), position)
        : position !== null ? await positionBoard(position)
        : readBoardLink(p.get("packed") ?? "", p.get("at"));
    } catch (e) {
      if (brings) {
        notice = `This ${record !== null ? "record" : "position"} cannot be ${OWN.includes(via ?? "") ? "analyzed" : "imported"}: ${sentence(errorText(e))} Your own analysis is here instead.`;
        if (imported)
          trackImportFailed("analysis", imported, e instanceof RecordProblem ? e.failure : "link");
      } else {
        notice = `This ${loaded === "analysis_file" ? "file" : "link"} cannot be loaded: ${sentence(errorText(e))} Your own analysis is here instead.`;
        trackLoadFailed(loaded!, loaded === "analysis_file" ? "file" : "link");
      }
      return { board: kept, at: keptAt };
    }
    if (kept?.nodes.length && !(await choose())) return { board: kept, at: keptAt };
    return { board: brought.board, atMain: brought.at, imported, loaded };
  }
  /** A record that cannot be imported: unreadable (`record`), or refused by the rules or as a variant (`rejected`). */
  class RecordProblem extends Error {
    failure: "record" | "rejected";
    constructor(message: string, failure: "record" | "rejected") { super(message); this.failure = failure; }
  }
  /** A record brought to the board: checked as an import is (its variant, its start, then its moves by the engine's
   *  rules), and its line becomes the main line. `position` is its start when given apart, as the Import's position
   *  field gives it: the record's `Position` tag then must be the same or absent. A record without moves is refused by
   *  its reader. */
  async function recordBoard(text: string, at: string | null, position: string | null = null): Promise<{ board: KeptBoard; at: number }> {
    let record: ReturnType<typeof parseRecord>;
    try { record = parseRecord(text); } catch (e) { throw new RecordProblem(errorText(e), "record"); }
    const tagged = record.tags.Position?.trim();
    const given = setUpStart(position) ?? (position ? STANDARD_START : undefined);
    if (given && tagged && (setUpStart(tagged) ?? STANDARD_START) !== given)
      throw new RecordProblem("the record starts from another position than the one given (its Position tag)", "rejected");
    if (position) record = { ...record, tags: { ...record.tags, Position: position } };
    const variant = variantProblem(record, true);
    if (variant) throw new RecordProblem(variant, "rejected");
    const { problem } = await checkMoves(record);
    if (problem) throw new RecordProblem(problem, "rejected");
    return { board: boardOfRecord(record), at: Math.max(0, Math.floor(Number(at)) || 0) };
  }
  /** A position brought to the board, with no moves: the engine checks that it could occur (design 21). The standard
   *  start is no set-up start. */
  async function positionBoard(position: string): Promise<{ board: KeptBoard; at: number }> {
    const start = setUpStart(position);
    const problem = start ? await checkPosition(start) : null;
    if (problem) throw new RecordProblem(problem, "rejected");
    return { board: { version: 2, main: [], nodes: [], ...(start ? { start } : {}) }, at: 0 };
  }

  onMount(async () => {
    try {
      manifest = await loadManifest();
      if (!manifest) throw new Error("no /engine/manifest.json: run `npm run engine` first");
      const chosen = await chooseBoard();
      const first = pool = new EnginePool(engine.workers);
      network = engine.network;
      const g = new GameAnalysis(first, [], true, chosen.board?.start ?? null);
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
      // The board opened, and an import or a load when a line came with it (design 17).
      track("analysis_open", { edges: range(g.mainNames.length, EDGE_RANGES) });
      if (chosen.imported) trackImport("analysis", chosen.imported, g.mainNames.length);
      if (chosen.loaded) trackLoad(chosen.loaded, g.mainNames.length);
      g.ready();
    } catch (e) {
      error = errorText(e);
      track("engine_error", { error_kind: "load" });
    }
  });
  onDestroy(() => { gpu?.end(); pool?.terminate(); });

  // The board's Import and Load (designs 21 and 22): a position, moves or both pasted, checked here as an import is, or
  // an analysis file. Either goes after the `#`, and the page loads again, so that its opening checks it, asks before
  // it replaces the analysis kept here, and counts it.
  let importing = $state(false), pasted = $state(""), pastedPosition = $state(""), importProblem = $state(""), checkingImport = $state(false);
  // The position on screen in the notation, which the board editor starts from (Lichess's editor starts from its board).
  const onScreen = $derived.by(() => {
    const g = game;
    if (!g) return null;
    const i = mainIndex(current, g.mainNames);
    return (i !== null ? g.positions[i] : g.branches[pathKey(current)]?.position)?.notation ?? null;
  });
  const editorHref = $derived(onScreen ? `/editor#${new URLSearchParams({ position: onScreen })}` : "/editor");
  /** The New menu's standard start: a new analysis, after the board asks when it has moves. */
  function newBoard() {
    importAddress(String(new URLSearchParams({ position: STANDARD_START, via: "new" })));
  }
  function importAddress(hash: string) {
    history.replaceState(null, "", `/analysis#${hash}`);
    location.reload();
  }
  async function importPasted(event: SubmitEvent) {
    event.preventDefault();
    importProblem = "";
    checkingImport = true;
    try {
      const position = pastedPosition.trim().replace(/\s+/g, " ");
      if (!pasted.trim()) {
        await positionBoard(position);
        importAddress(String(new URLSearchParams({ position, via: "pasted_position" })));
        return;
      }
      const read = readPasted(pasted);
      await recordBoard(read.recordText, null, position || null);
      importAddress(String(new URLSearchParams({ record: read.recordText, ...(position ? { position } : {}), via: position ? "pasted_position" : read.source })));
    } catch (e) {
      importProblem = (e as Error).message;
    } finally {
      checkingImport = false;
    }
  }
  async function loadFile(file: File) {
    notice = "";
    const content = await file.text();
    try {
      if (fileKind(content) === "review") throw new Error("this is a review file: load it in the Review tab");
      const analysis = readAnalysisFile(content);
      await keepAnalysisResults(analysis, shippedModels(manifest));
      importAddress(boardLink("", analysis.board, 0, "analysis_file").split("#")[1]);
    } catch (e) {
      notice = `This file cannot be loaded: ${sentence(errorText(e))}`;
      trackLoadFailed("analysis_file", "file");
    }
  }

  /** The board shared or exported (design 21): a link to it, or its record with the lines as variations. */
  async function exportAs(kind: ExportKind, unit: Unit): Promise<ExportResult | void> {
    const g = game, r = R;
    if (!g || !r) return;
    if (kind === "share_link") {
      const at = mainIndex(current, g.mainNames) ?? 0;
      const link = boardLink(location.origin, g.keptBoard(), at);
      await navigator.clipboard.writeText(link);
      return { linkLength: link.length };
    }
    if (kind === "analysis_file") {
      download(analysisFileName(), JSON.stringify(await exportAnalysis(g.keptBoard(), SITE_VERSION, shippedModels(manifest))));
      return;
    }
    const text = annotatedRecord({ R: r, unit, tags: g.startPosition ? { Position: g.startPosition } : {}, result: "*", branches: g.branches, annotator: SITE_NAME,
                                   note: `${SITE_NAME}'s analysis board, with ${networkName(network)} (the network ${network}).` });
    if (kind === "record_copy") await navigator.clipboard.writeText(text);
    else download("analysis.txt", text, "text/plain");
  }
</script>

<PageMeta title="Analysis board · Hedge School"
          description="A free Enclosure analysis board: play any line or a set-up position, and the engine in your browser searches the position on screen." />

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
              onexport={exportAs} exportItems={EXPORT_ITEMS}>
      {#snippet tools()}<NewMenu editor={editorHref} onstart={newBoard} onimport={() => (importing = true)} onload={loadFile} />{/snippet}
    </ReviewView>
{:else if !ask}
  <p class="{MESSAGE} text-muted">Setting up the board with the engine's rules…</p>
{/if}

<!-- A line brought, over the analysis kept here: the player chooses. -->
<Dialog.Root open={!!ask} onOpenChange={open => { if (!open) ask?.(false); }}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-20 bg-[rgb(0_0_0/0.45)]" />
    <Dialog.Content class="fixed z-30 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(94vw,28rem)]
                           px-5 py-4 bg-panel-2 border border-muted/50 rounded-md shadow-[0_6px_20px_rgb(0_0_0/0.4)]">
      <Dialog.Title class="mb-2 font-semibold">Replace your analysis?</Dialog.Title>
      <Dialog.Description class="text-sm">
        This replaces the analysis you left here, with all its lines. This browser keeps one analysis.
      </Dialog.Description>
      <div class="flex justify-end gap-2 mt-4">
        <button type="button" class="px-4 py-1 text-sm" onclick={() => ask?.(false)}>Keep mine</button>
        <button type="button" class="btn-primary px-4 py-1 text-sm" onclick={() => ask?.(true)}>Replace it</button>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<!-- The board's Import: a position, moves, or both pasted (design 21). An analysis file has its own Load. -->
<ImportDialog.Root bind:open={importing}>
  <ImportDialog.Portal>
    <ImportDialog.Overlay class="fixed inset-0 z-20 bg-[rgb(0_0_0/0.45)]" />
    <ImportDialog.Content class="fixed z-30 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(94vw,34rem)]
                                 px-5 py-4 bg-panel-2 border border-muted/50 rounded-md shadow-[0_6px_20px_rgb(0_0_0/0.4)]">
      <ImportDialog.Title class="mb-2 font-semibold">Import a position or moves</ImportDialog.Title>
      <form onsubmit={importPasted}>
        <!-- Lichess's analysis board takes a FEN and a PGN apart: here a position and the moves from it, both in the
             notation. -->
        <label for="board-position" class="block text-sm">Position</label>
        <p class="mb-1 text-xs text-muted">Leave it empty for the standard start. Or set one up in the
          <a href={editorHref}>board editor</a>.</p>
        <input id="board-position" bind:value={pastedPosition} spellcheck="false" autocomplete="off"
               class="w-full mb-3 px-2.5 py-1.5 font-mono text-sm bg-page text-ink border border-line rounded focus:outline-2 focus:outline-accent"
               placeholder="A10-D10 Q10-T10 b1 0/0 0" />
        <label for="board-record" class="block text-sm">Moves</label>
        <p class="mb-1 text-xs text-muted">The moves played from the position: a game record, finished or not, or a plain
          list of edges, in the <a href="/notation" target="_blank" rel="noopener noreferrer">notation</a>.</p>
        <textarea id="board-record" rows="4" bind:value={pasted} spellcheck="false"
                  class="w-full px-2.5 py-2 font-mono text-sm/[1.4] bg-page text-ink border border-line rounded resize-y focus:outline-2 focus:outline-accent"
                  placeholder={'1. D10-G10 2. N11-Q10 L10-N11 …'}></textarea>
        {#if importProblem}<p class="mt-1.5 text-sm text-blunder" role="alert">{importProblem}</p>{/if}
        <div class="flex flex-wrap items-center gap-3 mt-2">
          <button class="btn-primary" type="submit" disabled={(!pasted.trim() && !pastedPosition.trim()) || checkingImport}>{checkingImport ? "Checking…" : "Import"}</button>
          <ImportDialog.Close class="ml-auto px-3 py-1 text-sm">Cancel</ImportDialog.Close>
        </div>
      </form>
    </ImportDialog.Content>
  </ImportDialog.Portal>
</ImportDialog.Root>
