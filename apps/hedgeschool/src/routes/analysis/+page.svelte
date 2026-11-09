<script lang="ts">
  // The Analysis board (docs/design/21-analysis.md): a free board in the browser, from the standard start, a set-up
  // position, or a line brought by its ways in (docs/design/22-site-map.md): `#record=` (a record, checked as an import
  // is), `#position=` (a set-up start, from the board editor or the Import; with `record=`, the record's start),
  // `#packed=` (a shared analysis, or an analysis file loaded), and `&at=`, the place on the main line. The engine searches the position on screen only, and the moves the player asks to
  // evaluate: no pass runs over the line (GameAnalysis's board form). The tree is the player's: its first line is the
  // main line, which "Make main line" changes. One board in each browser, kept as the player leaves it. The engine
  // settings are the review's (docs/design/09-engine-settings.md), and the GPU worker joins as it does there.
  import { onDestroy, onMount, untrack } from "svelte";
  import { replaceState } from "$app/navigation";
  import ReviewView, { reviewSkeleton } from "@abstractclass/review/ReviewView.svelte";
  import ReplaceAnalysis, { ReplaceQuestion } from "@abstractclass/review/ReplaceAnalysis.svelte";
  import { enclosureView } from "#lib/review/enclosureView.ts";
  import { loadDisplay } from "#lib/review/display.ts";
  import NewMenu from "@abstractclass/review/NewMenu.svelte";
  import ImportDialog from "@abstractclass/review/ImportDialog.svelte";
  import ExportMenu from "@abstractclass/review/ExportMenu.svelte";
  import Icon from "@abstractclass/site/Icon.svelte";
  import { STANDARD_START, setUpStart } from "#lib/engine/notation.ts";
  import { enclosure, onlyJudged, review, type Enclosure, type ReviewData, type Unit } from "#lib/review/enclosure.ts";
  import { annotatedRecord } from "#lib/review/annotate.ts";
  import { GameAnalysis } from "@abstractclass/analysis/analysis.svelte.ts";
  import { LABEL_VISITS } from "@abstractclass/analysis/cache.ts";
  import { EngineSession } from "@abstractclass/analysis/session.svelte.ts";
  import { modelOf } from "@abstractclass/engine/client.ts";
  import { loadEngine, networkName, reviewVisits, saveEngine, type EngineSettings } from "#lib/analysis/engineSettings.ts";
  import { trackSettingChange } from "#lib/analysis/settingChanges.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import { BOARD_ID, type KeptBoard } from "#lib/game/store.ts";
  import { boardLink, boardOfRecord, readBoardLink } from "#lib/game/board.ts";
  import { download, shippedModels, type ExportKind, type ExportResult } from "#lib/game/reviewFile.ts";
  import { BOARD_EXPORTS } from "@abstractclass/review/exports.ts";
  import { analysisFileName, exportAnalysis, fileKind, openAnalysisFile } from "#lib/game/analysisFile.ts";
  import { holdsGame } from "@abstractclass/import/importHash.ts";
  import { parseRecord, startTags, withStart } from "#lib/game/record.ts";
  import { givenStartProblem } from "@abstractclass/record/record.ts";
  import { variantProblem } from "#lib/game/import.ts";
  import { checkMoves, checkPosition } from "#lib/game/check.ts";
  import { STORES, dbGet, dbPut } from "@abstractclass/storage/db.ts";
  import { mainIndex, pathKey } from "@abstractclass/analysis/tree.ts";
  import { startAnalytics, track, trackOnce } from "#lib/analytics.svelte.ts";
  import { isImportSource, trackExport, trackImport, trackImportFailed, trackLoad, trackLoadFailed, type ImportSource,
           type LoadSource } from "#lib/game/sources.ts";
  import { readPasted } from "#lib/game/paste.ts";
  import { readLocal, writeLocal } from "@abstractclass/storage/local.ts";
  import { SITE_NAME, SITE_VERSION } from "#lib/edition.ts";
  import { EDGE_RANGES, range } from "@abstractclass/site/measure.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";

  const MESSAGE = "box-content max-w-[1100px] mx-auto my-8 px-4";
  const PLAYERS: ReviewData["players"] = { blue: "Blue", red: "Red" };
  // The position on screen, kept in this browser for the next visit (a convenience: the board opens at the start
  // without it).
  const AT_KEY = "hedge-school:board-at";

  let game = $state<GameAnalysis<Enclosure> | null>(null);
  let error = $state("");
  let notice = $state(""); // a line brought that could not open: the board kept here opens
  const sentence = (text: string) => text.replace(/\.?$/, "."); // an error's text, ended by one period
  let start = $state<string[] | null>(null); // where the view opens
  let current = $state<string[]>([]); // the position on screen
  const engine = $state(loadEngine());
  $effect(() => saveEngine($state.snapshot(engine)));
  const budget = $derived(reviewVisits(engine)); // "Evaluate quality" searches to the review's depth
  // The engine, with the review's settings, and the GPU worker as the review has it (session.svelte.ts).
  const session = new EngineSession({ settings: () => engine, game: () => game, position: () => current,
                                      tracker: { track, networkName } });
  const failure = $derived(error || session.error);

  const data = $derived(game?.data(PLAYERS) ?? null);
  // The review of the main line, with labels only on the moves evaluated (design 21).
  const fullReview = $derived(data && review(data, "lead", LABEL_VISITS)); // every move's labels
  const R = $derived.by(() => {
    const g = game;
    if (!fullReview || !g) return null;
    const judged = g.judgedMain, keys = g.mainKeys;
    // A move waits for the searches of its Great (awaitsGreat) and shows its label once they end.
    return onlyJudged(fullReview, i => !!judged[keys[i + 1]] && !g.awaitsGreat(keys[i + 1]));
  });

  // The position on screen, kept for the next visit.
  $effect(() => {
    const key = pathKey(current);
    untrack(() => { if (game?.rulesReady) writeLocal(AT_KEY, key); }); // storage blocked: the start next time
  });

  // A link's board, when the board kept here has moves of its own: the player chooses which to keep.
  const question = new ReplaceQuestion();

  /** The analysis to open, and where: the kept place (`at`, a path), or a brought line's place on the main line
   *  (`atMain`). How a brought line came (design 17): `imported` for a game from outside, `loaded` for saved work. None
   *  for the analysis kept here. */
  interface Opening { board: KeptBoard | null; at?: string[]; atMain?: number; imported?: ImportSource; loaded?: LoadSource }
  // The ways in that this site's own pages name in the address (`via`): a pasted record, Constellation export or
  // position, and a tool's game that the player chose to analyze (Arrival), which are imports (sources.ts), an
  // analysis file (a load), and the board editor's position, the New menu's standard start and Openings' "Open in
  // Analysis" (neither: the site's own, design 17). Without one, `record=` and `position=` are another site's link, and
  // `packed=` a shared analysis.
  const OWN: string[] = ["editor", "new", "openings", "practice", "your_games"];
  /** The analysis to open: one imported after the `#`, else the one kept in this browser. An imported one replaces the
   *  kept one, after the player agrees when the kept one has moves. It leaves the address at once, then the analytics
   *  start (design 22), and a reload keeps the analysis's own state. */
  async function chooseBoard(): Promise<Opening> {
    const kept = (await dbGet<KeptBoard>(STORES.branches, BOARD_ID)) ?? null;
    const at = readLocal(AT_KEY), keptAt = at ? at.split(" ") : [];
    const hash = location.hash.slice(1);
    if (!holdsGame(hash)) { startAnalytics(); return { board: kept, at: keptAt }; }
    const p = new URLSearchParams(hash), record = p.get("record"), position = p.get("position"), via = p.get("via");
    await replaceState("/analysis", {}); // async: the address changes only once it resolves
    startAnalytics();
    const brings = record !== null || position !== null; // moves or a start, not saved work
    const imported: ImportSource | undefined = !brings || OWN.includes(via ?? "") ? undefined
      : isImportSource(via) ? via : "site_link";
    const loaded: LoadSource | undefined = brings ? undefined : via === "analysis_file" ? via : "analysis_share_link";
    let brought: { board: KeptBoard; at: number };
    try {
      brought = record !== null ? await recordBoard(record, p.get("at"), position)
        : position !== null ? await positionBoard(position)
        : readBoardLink(p.get("packed") ?? "", p.get("at"));
    } catch (e) {
      if (brings) {
        notice = `The Analysis board cannot ${OWN.includes(via ?? "") ? "analyze" : "import"} this ${record !== null ? "record" : "position"}: ${sentence(errorText(e))} Your own analysis is here instead.`;
        if (imported)
          trackImportFailed("analysis", imported, e instanceof RecordProblem ? e.failure : "link");
      } else {
        notice = `The Analysis board cannot load this ${loaded === "analysis_file" ? "file" : "link"}: ${sentence(errorText(e))} Your own analysis is here instead.`;
        trackLoadFailed(loaded!, loaded === "analysis_file" ? "file" : "link");
      }
      return { board: kept, at: keptAt };
    }
    if (kept?.nodes.length && !(await question.ask())) return { board: kept, at: keptAt };
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
    try { record = parseRecord(withStart(text, position)); } catch (e) { throw new RecordProblem(errorText(e), "record"); }
    const mismatch = givenStartProblem(record.tags, position, setUpStart);
    if (mismatch) throw new RecordProblem(mismatch, "rejected");
    if (position) record = { ...record, tags: { ...record.tags, Position: position } };
    const variant = variantProblem(record, "analysis");
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
      await session.load();
      // The engine starts while the page chooses the board (an import may ask the player first): the analysis takes
      // the board's start once it is chosen.
      const opening = chooseBoard();
      // The board's start and komi (design 24) are the chosen board's.
      const g = await session.start(async pool => {
        const board = (await opening).board;
        return new GameAnalysis(enclosure, pool, [], BOARD_ID, board?.start ?? null, { komi: board?.komi });
      }, async (g, pool) => {
        const chosen = await opening;
        await g.start();
        if (chosen.board) await g.loadBoard(chosen.board);
        // The stored results of the board's lines, read before the board shows, as the review reads its own: the labels
        // and notes of the moves evaluated, and the hard positions' marks, come in the first frame, and do not move the
        // bar under the moves when they come (the layout shift). Reads only: the engine searches nothing more. The
        // search is the one that the rules worker names, the network the session's.
        const model = modelOf(session.manifest!, session.network)?.sha256;
        if (g.rulesReady && pool.search && model) await g.fromStore(pool.search, model).catch(() => {});
        if (chosen.atMain !== undefined) await dbPut(STORES.branches, BOARD_ID, g.keptBoard()); // a link's board is now this browser's
        // The place to open: the link's on the main line, or the one kept here when it is still in the tree.
        const at = chosen.atMain !== undefined ? g.mainNames.slice(0, chosen.atMain)
          : chosen.at && (mainIndex(chosen.at, g.mainNames) !== null || pathKey(chosen.at) in g.branches) ? chosen.at : [];
        start = at;
        current = at;
        game = g;
      });
      if (!g) return; // another network took over
      // The board opened, and an import or a load when a line came with it (design 17).
      const chosen = await opening;
      track("analysis_open", { edges: range(g.mainNames.length, EDGE_RANGES) });
      if (chosen.imported) trackImport("analysis", chosen.imported, g.mainNames.length);
      if (chosen.loaded) trackLoad(chosen.loaded, g.mainNames.length);
      await g.sweep(); // the board's sweep makes the engine ready, unless another network loads (GameAnalysis.sweep)
    } catch (e) {
      error = errorText(e);
      track("engine_error", { error_kind: "load" });
    }
  });
  onDestroy(() => session.end());

  // The board's Import and Load (designs 21 and 22): a position, moves or both pasted, checked here as an import is, or
  // an analysis file. Either goes after the `#`, and the page loads again, so that its opening checks it, asks before
  // it replaces the analysis kept here, and counts it.
  let importing = $state(false);
  // The position on screen in the notation, which the board editor starts from (Lichess's editor starts from its board).
  const onScreen = $derived.by(() => {
    const g = game;
    if (!g) return null;
    return g.positionAt(current)?.notation ?? null;
  });
  const editorHref = $derived(onScreen ? `/editor#${new URLSearchParams({ position: onScreen })}` : "/editor");
  // Practice from the position on screen (design 24): the board's set-up start when it has one, and the moves from the
  // start to the position on screen, as a record.
  const practiceHref = $derived.by(() => {
    if (!game) return null;
    const p = new URLSearchParams({ ...(game.startPosition ? { position: game.startPosition } : {}), ...(current.length ? { record: current.join(" ") } : {}) });
    return p.size ? `/practice#${p}` : "/practice";
  });
  /** The New menu's standard start: a new analysis, after the board asks when it has moves. */
  function newBoard() {
    importAddress(String(new URLSearchParams({ position: STANDARD_START, via: "new" })));
  }
  function importAddress(hash: string) {
    history.replaceState(null, "", `/analysis#${hash}`);
    location.reload();
  }
  /** The Import's position and moves (ImportDialog), checked: a problem throws, and the dialog shows it. */
  async function importPasted(position: string, pasted: string) {
    if (!pasted.trim()) {
      await positionBoard(position);
      importAddress(String(new URLSearchParams({ position, via: "pasted_position" })));
      return;
    }
    const read = readPasted(pasted, position || null);
    await recordBoard(read.recordText, null, position || null);
    importAddress(String(new URLSearchParams({ record: read.recordText, ...(position ? { position } : {}), via: position ? "pasted_position" : read.source })));
  }
  async function loadFile(file: File) {
    notice = "";
    const content = await file.text();
    try {
      if (fileKind(content) === "review") throw new Error("this is a review file: load it in the Review tab");
      importAddress((await openAnalysisFile(content, session.manifest)).split("#")[1]);
    } catch (e) {
      notice = `The Analysis board cannot load this file: ${sentence(errorText(e))}`;
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
      download(analysisFileName(), JSON.stringify(await exportAnalysis(g.keptBoard(), SITE_VERSION, shippedModels(session.manifest))));
      return;
    }
    const tags = startTags(g.startPosition, g.komi);
    const text = annotatedRecord({ R: r, unit, tags, result: "*", branches: g.branches, annotator: SITE_NAME,
                                   note: `${SITE_NAME}'s Analysis board, with ${networkName(session.network)} (the network ${session.network}).` });
    if (kind === "record_copy") await navigator.clipboard.writeText(text);
    else download("analysis.txt", text, "text/plain");
  }
</script>

<PageMeta title="Analysis board · Hedge School"
          description="A free Enclosure Analysis board: play any line or a set-up position, and the engine in your browser searches the position on screen." />

{#if failure}
  <p class="{MESSAGE} text-blunder">{failure}</p>
{:else if game?.error && !game.rulesReady}
  <p class="{MESSAGE} text-blunder">The engine could not read this board: {game.error}</p>
{:else if R && game && start}
  {@const g = game}
  {#if notice}<p class="{MESSAGE} mb-0 text-blunder" role="alert">{notice}</p>{/if}
  <ReviewView view={enclosureView} {R} game={g} deepVisits={engine.visits} onposition={path => (current = path)} {start}
              onplay={path => g.playLine(path)} reviewVisits={budget} labelVisits={LABEL_VISITS} {engine}
              onengine={(change: Partial<EngineSettings>) => { trackSettingChange(change, engine, false); Object.assign(engine, change); }}
              onfeature={name => trackOnce(`board ${name}`, "feature", { feature_name: name })} gpu={session.gpuView}
              board={{ judged: g.judgedMain, onmain: path => g.setMain(path) }}>
      {#snippet tools(unit)}
        <!-- Practice from the position on screen (design 24), as Lichess's "Continue from here": not a new board, so
             beside New, not in it. A robot's head, since the forward triangle is the step forward (design 06, item 4).
             Off on a set-up start, which the bot cannot take yet (request 20). -->
        <button class="btn-icon" disabled={!practiceHref} onclick={() => practiceHref && location.assign(practiceHref)}
                aria-label="Play the bot from here" title="Play the bot from here"><Icon name="bot" /></button>
        <NewMenu site={SITE_NAME} editor={editorHref} onstart={newBoard} onload={loadFile}
                 importer={{ open: () => (importing = true), hint: "A game record, finished or not, a list of edges, or a position." }} />
        <!-- Export (design 21): the analysis by link, as a file with the engine's results, or as the annotated record,
             labelled by the view's unit (@abstractclass/review/exports.ts, BOARD_EXPORTS). -->
        <ExportMenu icon run={kind => exportAs(kind, unit)} items={BOARD_EXPORTS} ontrack={trackExport} />
      {/snippet}
    </ReviewView>
{:else}
  <!-- The board's skeleton until the board shows, from the prerendered page on (the review's, in its board form). -->
  {@render reviewSkeleton(enclosureView, false, loadDisplay().win === "gauge", PLAYERS, true)}
{/if}

<ReplaceAnalysis {question} />

<!-- The board's Import: a position, moves, or both pasted (design 21). An analysis file has its own Load. -->
<ImportDialog bind:open={importing} editor={editorHref} positionExample="A10-D10 Q10-T10 b1 0/0 0"
              movesExample={'1. D10-G10 2. N11-Q10 L10-N11 …'} moveWord="edges" onimport={importPasted} />
